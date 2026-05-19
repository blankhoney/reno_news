import json
from dataclasses import dataclass, field
from time import perf_counter
from typing import Callable

import psycopg
from psycopg.rows import dict_row


SCHEMA_VERSION = "summary_blocks.v1"
PURPOSE = "summary_blocks"

SUMMARY_BLOCKS_JSON_SCHEMA: dict[str, object] = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "oneSentence",
        "detailedSummary",
        "whyItMatters",
        "sourceNote",
        "chinaRelevance",
        "relatedTopics",
    ],
    "properties": {
        "oneSentence": {"type": "string"},
        "detailedSummary": {"type": "string"},
        "whyItMatters": {"type": "string"},
        "sourceNote": {"type": "string"},
        "chinaRelevance": {"type": "string"},
        "relatedTopics": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
}


@dataclass(frozen=True)
class SummaryInput:
    raw_entry_id: int
    extraction_id: int
    ai_evaluation_id: int
    translation_id: int | None
    title: str
    extracted_text: str
    evaluation: dict[str, object]
    translated_text: str | None


@dataclass(frozen=True)
class SummaryAdapterResult:
    provider: str
    model: str
    output: dict[str, object]
    request_redacted: dict[str, object] = field(default_factory=dict)
    response_redacted: dict[str, object] = field(default_factory=dict)
    latency_ms: int | None = None


@dataclass(frozen=True)
class SummaryResult:
    raw_entry_id: int
    status: str
    model_call_id: int | None = None
    summary_block_id: int | None = None
    error_code: str | None = None
    message: str | None = None


SummaryAdapter = Callable[[SummaryInput], SummaryAdapterResult]


def fake_summary_adapter(_input: SummaryInput) -> SummaryAdapterResult:
    return SummaryAdapterResult(
        provider="fake",
        model="fake-summarizer",
        output={
            "oneSentence": "One sentence fixture summary.",
            "detailedSummary": "Detailed fixture summary.",
            "whyItMatters": "Why it matters fixture.",
            "sourceNote": "Source note fixture.",
            "chinaRelevance": "China relevance fixture.",
            "relatedTopics": [],
        },
        request_redacted={"adapter": "fake"},
        response_redacted={"fixture": True},
        latency_ms=0,
    )


@dataclass(frozen=True)
class OpenAISummaryAdapter:
    client: object
    model: str

    def __call__(self, input: SummaryInput) -> SummaryAdapterResult:
        request = build_summary_responses_request(input, self.model)
        started = perf_counter()
        response = self.client.responses.create(**request)
        latency_ms = int((perf_counter() - started) * 1000)
        output = parse_response_output(response)
        validate_summary_output(output)
        return SummaryAdapterResult(
            provider="openai",
            model=self.model,
            output=output,
            request_redacted={"rawEntryId": input.raw_entry_id, "schemaVersion": SCHEMA_VERSION},
            response_redacted={"schemaVersion": SCHEMA_VERSION},
            latency_ms=latency_ms,
        )


def build_summary_responses_request(input: SummaryInput, model: str) -> dict[str, object]:
    return {
        "model": model,
        "input": [
            {
                "role": "system",
                "content": "Create structured explanatory summary blocks for one evaluated Reno News item.",
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "rawEntryId": input.raw_entry_id,
                        "extractionId": input.extraction_id,
                        "aiEvaluationId": input.ai_evaluation_id,
                        "translationId": input.translation_id,
                        "title": input.title,
                        "extractedText": input.extracted_text,
                        "evaluation": input.evaluation,
                        "translatedText": input.translated_text,
                    },
                    ensure_ascii=True,
                ),
            },
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "summary_blocks",
                "schema": SUMMARY_BLOCKS_JSON_SCHEMA,
                "strict": True,
            }
        },
    }


def parse_response_output(response: object) -> dict[str, object]:
    output_text = getattr(response, "output_text", None)
    if isinstance(output_text, str) and output_text.strip():
        parsed = json.loads(output_text)
        if isinstance(parsed, dict):
            return parsed

    raise ValueError("OpenAI response did not include structured output text")


def generate_summary_blocks(
    database_url: str,
    raw_entry_id: int,
    adapter: SummaryAdapter = fake_summary_adapter,
) -> SummaryResult:
    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        input_row = read_summary_input(connection, raw_entry_id)

        if input_row is None:
            raise ValueError(f"Raw entry not found: {raw_entry_id}")

        skip_reason = prefilter_skip_reason(input_row)
        if skip_reason:
            model_call_id = record_model_call(
                connection,
                provider="internal",
                model="prefilter",
                status="skipped",
                error_code="prefilter",
                request_redacted={"rawEntryId": raw_entry_id},
                response_redacted={"reason": skip_reason},
            )
            connection.commit()
            return SummaryResult(
                raw_entry_id=raw_entry_id,
                status="skipped",
                model_call_id=model_call_id,
                error_code="prefilter",
                message=skip_reason,
            )

        summary_input = SummaryInput(
            raw_entry_id=raw_entry_id,
            extraction_id=int(input_row["extraction_id"]),
            ai_evaluation_id=int(input_row["ai_evaluation_id"]),
            translation_id=optional_int(input_row["translation_id"]),
            title=str(input_row["title"] or ""),
            extracted_text=str(input_row["extracted_text"]),
            evaluation={
                "scores": input_row["scores_json"],
                "rationale": input_row["rationale_json"],
                "evidence": input_row["evidence_json"],
                "summary": input_row["evaluation_summary_json"],
            },
            translated_text=optional_text(input_row["translated_text"]),
        )

        try:
            adapter_result = adapter(summary_input)
            validate_summary_output(adapter_result.output)
        except ValueError as error:
            model_call_id = record_model_call(
                connection,
                provider="adapter",
                model="unknown",
                status="failure",
                error_code="schema_error",
                request_redacted={"rawEntryId": raw_entry_id},
                response_redacted={"error": str(error)},
            )
            connection.commit()
            return SummaryResult(
                raw_entry_id=raw_entry_id,
                status="failure",
                model_call_id=model_call_id,
                error_code="schema_error",
                message=str(error),
            )
        except Exception as error:
            model_call_id = record_model_call(
                connection,
                provider="adapter",
                model="unknown",
                status="failure",
                error_code="adapter_error",
                request_redacted={"rawEntryId": raw_entry_id},
                response_redacted={"error": str(error)},
            )
            connection.commit()
            return SummaryResult(
                raw_entry_id=raw_entry_id,
                status="failure",
                model_call_id=model_call_id,
                error_code="adapter_error",
                message=str(error),
            )

        model_call_id = record_model_call(
            connection,
            provider=adapter_result.provider,
            model=adapter_result.model,
            status="success",
            latency_ms=adapter_result.latency_ms,
            request_redacted=adapter_result.request_redacted,
            response_redacted=adapter_result.response_redacted,
        )
        summary_block_id = record_summary_block(
            connection,
            raw_entry_id=raw_entry_id,
            extraction_id=summary_input.extraction_id,
            ai_evaluation_id=summary_input.ai_evaluation_id,
            translation_id=summary_input.translation_id,
            model_call_id=model_call_id,
            output=adapter_result.output,
        )
        connection.commit()
        return SummaryResult(
            raw_entry_id=raw_entry_id,
            status="success",
            model_call_id=model_call_id,
            summary_block_id=summary_block_id,
        )


def read_summary_input(connection: psycopg.Connection, raw_entry_id: int) -> dict[str, object] | None:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            select
              re.id::int as raw_entry_id,
              coalesce(rex.title, re.title, '') as title,
              rex.id::int as extraction_id,
              rex.extracted_text,
              ae.id::int as ai_evaluation_id,
              ae.scores_json,
              ae.rationale_json,
              ae.evidence_json,
              ae.summary_json as evaluation_summary_json,
              tr.id::int as translation_id,
              tr.translated_text
            from raw_entries re
            left join raw_entry_extractions rex on rex.raw_entry_id = re.id
            left join lateral (
              select *
              from ai_evaluations
              where raw_entry_id = re.id
              order by id desc
              limit 1
            ) ae on true
            left join lateral (
              select *
              from translations
              where raw_entry_id = re.id
              order by id desc
              limit 1
            ) tr on true
            where re.id = %s
            """,
            (raw_entry_id,),
        )
        return cursor.fetchone()


def prefilter_skip_reason(input_row: dict[str, object]) -> str | None:
    text = input_row["extracted_text"]
    if input_row["extraction_id"] is None or text is None or not str(text).strip():
        return "Raw entry has no extracted text"

    if input_row["ai_evaluation_id"] is None:
        return "Raw entry has no AI evaluation"

    return None


def validate_summary_output(output: dict[str, object]) -> None:
    required = (
        "oneSentence",
        "detailedSummary",
        "whyItMatters",
        "sourceNote",
        "chinaRelevance",
        "relatedTopics",
    )
    missing = [key for key in required if key not in output]
    if missing:
        raise ValueError(f"Summary block output missing fields: {', '.join(missing)}")

    for key in required[:-1]:
        if not isinstance(output[key], str) or not output[key].strip():
            raise ValueError(f"Summary block field must be a non-empty string: {key}")

    if not isinstance(output["relatedTopics"], list):
        raise ValueError("Summary block related topics must be a list")


def record_model_call(
    connection: psycopg.Connection,
    *,
    provider: str,
    model: str,
    status: str,
    latency_ms: int | None = None,
    error_code: str | None = None,
    request_redacted: dict[str, object] | None = None,
    response_redacted: dict[str, object] | None = None,
) -> int:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            insert into model_calls (
              provider,
              model,
              purpose,
              schema_version,
              status,
              latency_ms,
              error_code,
              request_redacted_json,
              response_redacted_json
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb)
            returning id::int
            """,
            (
                provider,
                model,
                PURPOSE,
                SCHEMA_VERSION,
                status,
                latency_ms,
                error_code,
                json.dumps(request_redacted or {}),
                json.dumps(response_redacted or {}),
            ),
        )
        return int(cursor.fetchone()["id"])


def record_summary_block(
    connection: psycopg.Connection,
    *,
    raw_entry_id: int,
    extraction_id: int,
    ai_evaluation_id: int,
    translation_id: int | None,
    model_call_id: int,
    output: dict[str, object],
) -> int:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            insert into summary_blocks (
              raw_entry_id,
              extraction_id,
              ai_evaluation_id,
              translation_id,
              model_call_id,
              schema_version,
              status,
              one_sentence,
              detailed_summary,
              why_it_matters,
              source_note,
              china_relevance,
              related_topics_json
            )
            values (%s, %s, %s, %s, %s, %s, 'draft', %s, %s, %s, %s, %s, %s::jsonb)
            returning id::int
            """,
            (
                raw_entry_id,
                extraction_id,
                ai_evaluation_id,
                translation_id,
                model_call_id,
                SCHEMA_VERSION,
                str(output["oneSentence"]),
                str(output["detailedSummary"]),
                str(output["whyItMatters"]),
                str(output["sourceNote"]),
                str(output["chinaRelevance"]),
                json.dumps(output["relatedTopics"]),
            ),
        )
        return int(cursor.fetchone()["id"])


def optional_int(value: object) -> int | None:
    if value is None:
        return None
    return int(value)


def optional_text(value: object) -> str | None:
    if value is None:
        return None
    text = str(value)
    return text if text.strip() else None
