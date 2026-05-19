import json
from dataclasses import dataclass, field
from time import perf_counter
from typing import Callable

import psycopg
from psycopg.rows import dict_row


SCHEMA_VERSION = "translation.v1"
PURPOSE = "translation"
TARGET_LANGUAGE = "zh-Hans"

TRANSLATION_JSON_SCHEMA: dict[str, object] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["targetLanguage", "translatedTitle", "translatedText", "segments", "qualityFlags"],
    "properties": {
        "targetLanguage": {"type": "string", "enum": [TARGET_LANGUAGE]},
        "translatedTitle": {"type": "string"},
        "translatedText": {"type": "string"},
        "segments": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["sourceText", "translatedText"],
                "properties": {
                    "sourceText": {"type": "string"},
                    "translatedText": {"type": "string"},
                },
            },
        },
        "qualityFlags": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
}


@dataclass(frozen=True)
class TranslationInput:
    raw_entry_id: int
    extraction_id: int
    title: str
    extracted_text: str


@dataclass(frozen=True)
class TranslationAdapterResult:
    provider: str
    model: str
    output: dict[str, object]
    request_redacted: dict[str, object] = field(default_factory=dict)
    response_redacted: dict[str, object] = field(default_factory=dict)
    latency_ms: int | None = None


@dataclass(frozen=True)
class TranslationResult:
    raw_entry_id: int
    status: str
    model_call_id: int | None = None
    translation_id: int | None = None
    error_code: str | None = None
    message: str | None = None


TranslationAdapter = Callable[[TranslationInput], TranslationAdapterResult]


def fake_translation_adapter(input: TranslationInput) -> TranslationAdapterResult:
    return TranslationAdapterResult(
        provider="fake",
        model="fake-translator",
        output={
            "targetLanguage": TARGET_LANGUAGE,
            "translatedTitle": input.title,
            "translatedText": input.extracted_text,
            "segments": [
                {
                    "sourceText": input.extracted_text,
                    "translatedText": input.extracted_text,
                }
            ],
            "qualityFlags": [],
        },
        request_redacted={"adapter": "fake"},
        response_redacted={"fixture": True},
        latency_ms=0,
    )


@dataclass(frozen=True)
class OpenAITranslationAdapter:
    client: object
    model: str

    def __call__(self, input: TranslationInput) -> TranslationAdapterResult:
        request = build_translation_responses_request(input, self.model)
        started = perf_counter()
        response = self.client.responses.create(**request)
        latency_ms = int((perf_counter() - started) * 1000)
        output = parse_response_output(response)
        validate_translation_output(output)
        return TranslationAdapterResult(
            provider="openai",
            model=self.model,
            output=output,
            request_redacted={"rawEntryId": input.raw_entry_id, "schemaVersion": SCHEMA_VERSION},
            response_redacted={"schemaVersion": SCHEMA_VERSION},
            latency_ms=latency_ms,
        )


def build_translation_responses_request(input: TranslationInput, model: str) -> dict[str, object]:
    return {
        "model": model,
        "input": [
            {
                "role": "system",
                "content": "Translate one extracted news item into a structured Chinese draft for the Reno News MVP.",
            },
            {
                "role": "user",
                "content": (
                    f"raw_entry_id: {input.raw_entry_id}\n"
                    f"extraction_id: {input.extraction_id}\n"
                    f"title: {input.title}\n\n"
                    f"{input.extracted_text}"
                ),
            },
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "translation_draft",
                "schema": TRANSLATION_JSON_SCHEMA,
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


def translate_raw_entry(
    database_url: str,
    raw_entry_id: int,
    adapter: TranslationAdapter = fake_translation_adapter,
) -> TranslationResult:
    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        input_row = read_translation_input(connection, raw_entry_id)

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
            return TranslationResult(
                raw_entry_id=raw_entry_id,
                status="skipped",
                model_call_id=model_call_id,
                error_code="prefilter",
                message=skip_reason,
            )

        translation_input = TranslationInput(
            raw_entry_id=raw_entry_id,
            extraction_id=int(input_row["extraction_id"]),
            title=str(input_row["title"] or ""),
            extracted_text=str(input_row["extracted_text"]),
        )

        try:
            adapter_result = adapter(translation_input)
            validate_translation_output(adapter_result.output)
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
            return TranslationResult(
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
            return TranslationResult(
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
        translation_id = record_translation(
            connection,
            raw_entry_id=raw_entry_id,
            extraction_id=translation_input.extraction_id,
            model_call_id=model_call_id,
            output=adapter_result.output,
        )
        connection.commit()
        return TranslationResult(
            raw_entry_id=raw_entry_id,
            status="success",
            model_call_id=model_call_id,
            translation_id=translation_id,
        )


def read_translation_input(connection: psycopg.Connection, raw_entry_id: int) -> dict[str, object] | None:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            select
              re.id::int as raw_entry_id,
              coalesce(rex.title, re.title, '') as title,
              re.rights_status,
              sp.rights_policy,
              sp.translation_policy,
              rex.id::int as extraction_id,
              rex.extracted_text
            from raw_entries re
            join sources s on s.id = re.source_id
            join source_policies sp on sp.source_id = s.id
            left join raw_entry_extractions rex on rex.raw_entry_id = re.id
            where re.id = %s
            """,
            (raw_entry_id,),
        )
        return cursor.fetchone()


def prefilter_skip_reason(input_row: dict[str, object]) -> str | None:
    if input_row["rights_status"] == "blocked" or input_row["rights_policy"] == "blocked":
        return "Rights policy blocks translation"

    if input_row["translation_policy"] == "none":
        return "Source translation policy is disabled"

    text = input_row["extracted_text"]
    if text is None or not str(text).strip():
        return "Raw entry has no extracted text"

    return None


def validate_translation_output(output: dict[str, object]) -> None:
    required = ("targetLanguage", "translatedTitle", "translatedText", "segments", "qualityFlags")
    missing = [key for key in required if key not in output]
    if missing:
        raise ValueError(f"Translation output missing fields: {', '.join(missing)}")

    if output["targetLanguage"] != TARGET_LANGUAGE:
        raise ValueError("Translation output target language must be zh-Hans")
    if not isinstance(output["translatedTitle"], str):
        raise ValueError("Translation title must be a string")
    if not isinstance(output["translatedText"], str) or not output["translatedText"].strip():
        raise ValueError("Translation text must be a non-empty string")
    if not isinstance(output["segments"], list):
        raise ValueError("Translation segments must be a list")
    if not isinstance(output["qualityFlags"], list):
        raise ValueError("Translation quality flags must be a list")


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


def record_translation(
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
            insert into translations (
              raw_entry_id,
              extraction_id,
              model_call_id,
              target_language,
              schema_version,
              status,
              translated_title,
              translated_text,
              segments_json,
              quality_flags_json
            )
            values (%s, %s, %s, %s, %s, 'draft', %s, %s, %s::jsonb, %s::jsonb)
            returning id::int
            """,
            (
                raw_entry_id,
                extraction_id,
                model_call_id,
                str(output["targetLanguage"]),
                SCHEMA_VERSION,
                str(output["translatedTitle"]),
                str(output["translatedText"]),
                json.dumps(output["segments"]),
                json.dumps(output["qualityFlags"]),
            ),
        )
        return int(cursor.fetchone()["id"])
