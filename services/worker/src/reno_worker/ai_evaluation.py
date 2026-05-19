import json
from dataclasses import dataclass, field
from time import perf_counter
from typing import Callable

import psycopg
from psycopg.rows import dict_row


SCHEMA_VERSION = "ai_evaluation.v1"
PURPOSE = "ai_evaluation"

AI_EVALUATION_JSON_SCHEMA: dict[str, object] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["scores", "rationale", "evidence", "summary"],
    "properties": {
        "scores": {
            "type": "object",
            "additionalProperties": False,
            "required": ["relevance", "credibility", "novelty"],
            "properties": {
                "relevance": {"type": "number", "minimum": 0, "maximum": 1},
                "credibility": {"type": "number", "minimum": 0, "maximum": 1},
                "novelty": {"type": "number", "minimum": 0, "maximum": 1},
            },
        },
        "rationale": {
            "type": "object",
            "additionalProperties": True,
        },
        "evidence": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": True,
            },
        },
        "summary": {
            "type": "object",
            "additionalProperties": True,
        },
    },
}


@dataclass(frozen=True)
class EvaluationInput:
    raw_entry_id: int
    extraction_id: int
    extracted_text: str


@dataclass(frozen=True)
class AdapterResult:
    provider: str
    model: str
    output: dict[str, object]
    request_redacted: dict[str, object] = field(default_factory=dict)
    response_redacted: dict[str, object] = field(default_factory=dict)
    latency_ms: int | None = None


@dataclass(frozen=True)
class EvaluationResult:
    raw_entry_id: int
    status: str
    model_call_id: int | None = None
    evaluation_id: int | None = None
    error_code: str | None = None
    message: str | None = None


AiAdapter = Callable[[EvaluationInput], AdapterResult]


def fake_adapter(_input: EvaluationInput) -> AdapterResult:
    return AdapterResult(
        provider="fake",
        model="fake-evaluator",
        output={
            "scores": {"relevance": 0.0, "credibility": 0.0, "novelty": 0.0},
            "rationale": {"summary": "Deterministic fake evaluation."},
            "evidence": [],
            "summary": {"zh": ""},
        },
        request_redacted={"adapter": "fake"},
        response_redacted={"fixture": True},
        latency_ms=0,
    )


@dataclass(frozen=True)
class OpenAIResponsesAdapter:
    client: object
    model: str

    def __call__(self, input: EvaluationInput) -> AdapterResult:
        request = build_responses_request(input, self.model)
        started = perf_counter()
        response = self.client.responses.create(**request)
        latency_ms = int((perf_counter() - started) * 1000)
        output = parse_response_output(response)
        validate_output(output)
        return AdapterResult(
            provider="openai",
            model=self.model,
            output=output,
            request_redacted={"rawEntryId": input.raw_entry_id, "schemaVersion": SCHEMA_VERSION},
            response_redacted={"schemaVersion": SCHEMA_VERSION},
            latency_ms=latency_ms,
        )


def build_responses_request(input: EvaluationInput, model: str) -> dict[str, object]:
    return {
        "model": model,
        "input": [
            {
                "role": "system",
                "content": "Evaluate one extracted news item for the Reno News MVP. Return only the structured output.",
            },
            {
                "role": "user",
                "content": (
                    f"raw_entry_id: {input.raw_entry_id}\n"
                    f"extraction_id: {input.extraction_id}\n\n"
                    f"{input.extracted_text}"
                ),
            },
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "ai_evaluation",
                "schema": AI_EVALUATION_JSON_SCHEMA,
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


def evaluate_raw_entry(
    database_url: str,
    raw_entry_id: int,
    adapter: AiAdapter = fake_adapter,
) -> EvaluationResult:
    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        input_row = read_evaluation_input(connection, raw_entry_id)

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
            return EvaluationResult(
                raw_entry_id=raw_entry_id,
                status="skipped",
                model_call_id=model_call_id,
                error_code="prefilter",
                message=skip_reason,
            )

        evaluation_input = EvaluationInput(
            raw_entry_id=raw_entry_id,
            extraction_id=int(input_row["extraction_id"]),
            extracted_text=str(input_row["extracted_text"]),
        )

        try:
            adapter_result = adapter(evaluation_input)
            validate_output(adapter_result.output)
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
            return EvaluationResult(
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
            return EvaluationResult(
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
        evaluation_id = record_evaluation(
            connection,
            raw_entry_id=raw_entry_id,
            extraction_id=evaluation_input.extraction_id,
            model_call_id=model_call_id,
            output=adapter_result.output,
        )
        connection.commit()
        return EvaluationResult(
            raw_entry_id=raw_entry_id,
            status="success",
            model_call_id=model_call_id,
            evaluation_id=evaluation_id,
        )


def read_evaluation_input(connection: psycopg.Connection, raw_entry_id: int) -> dict[str, object] | None:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            select
              re.id::int as raw_entry_id,
              re.rights_status,
              rex.id::int as extraction_id,
              rex.extracted_text
            from raw_entries re
            left join raw_entry_extractions rex on rex.raw_entry_id = re.id
            where re.id = %s
            """,
            (raw_entry_id,),
        )
        return cursor.fetchone()


def prefilter_skip_reason(input_row: dict[str, object]) -> str | None:
    if input_row["rights_status"] == "blocked":
        return "Raw entry rights status is blocked"

    text = input_row["extracted_text"]
    if text is None or not str(text).strip():
        return "Raw entry has no extracted text"

    return None


def validate_output(output: dict[str, object]) -> None:
    required = ("scores", "rationale", "evidence", "summary")
    missing = [key for key in required if key not in output]
    if missing:
        raise ValueError(f"AI evaluation output missing fields: {', '.join(missing)}")

    if not isinstance(output["scores"], dict):
        raise ValueError("AI evaluation scores must be an object")
    if not isinstance(output["rationale"], dict):
        raise ValueError("AI evaluation rationale must be an object")
    if not isinstance(output["evidence"], list):
        raise ValueError("AI evaluation evidence must be a list")
    if not isinstance(output["summary"], dict):
        raise ValueError("AI evaluation summary must be an object")


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


def record_evaluation(
    connection: psycopg.Connection,
    *,
    raw_entry_id: int,
    extraction_id: int,
    model_call_id: int,
    output: dict[str, object],
) -> int:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            insert into ai_evaluations (
              raw_entry_id,
              extraction_id,
              model_call_id,
              schema_version,
              scores_json,
              rationale_json,
              evidence_json,
              summary_json
            )
            values (%s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb)
            returning id::int
            """,
            (
                raw_entry_id,
                extraction_id,
                model_call_id,
                SCHEMA_VERSION,
                json.dumps(output["scores"]),
                json.dumps(output["rationale"]),
                json.dumps(output["evidence"]),
                json.dumps(output["summary"]),
            ),
        )
        return int(cursor.fetchone()["id"])
