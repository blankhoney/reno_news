import argparse
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable

from reno_worker.ai_evaluation import validate_or_repair_output


@dataclass(frozen=True)
class GoldenSample:
    id: str
    board: str
    title: str
    extracted_text: str
    expected_scores: dict[str, float]


GoldenAdapter = Callable[[GoldenSample], dict[str, object]]


def load_golden_samples(path: Path) -> list[GoldenSample]:
    samples: list[GoldenSample] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        payload = json.loads(line)
        samples.append(sample_from_payload(payload, line_number=line_number))

    return samples


def sample_from_payload(payload: object, *, line_number: int) -> GoldenSample:
    if not isinstance(payload, dict):
        raise ValueError(f"Golden sample line {line_number} must be an object")

    expected_scores = payload.get("expectedScores")
    if not isinstance(expected_scores, dict):
        raise ValueError(f"Golden sample line {line_number} must include expectedScores")

    return GoldenSample(
        id=required_text(payload, "id", line_number),
        board=required_text(payload, "board", line_number),
        title=required_text(payload, "title", line_number),
        extracted_text=required_text(payload, "extractedText", line_number),
        expected_scores={
            "relevance": float(expected_scores["relevance"]),
            "credibility": float(expected_scores["credibility"]),
            "novelty": float(expected_scores["novelty"]),
        },
    )


def required_text(payload: dict[str, object], key: str, line_number: int) -> str:
    value = payload.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"Golden sample line {line_number} must include {key}")
    return value


def fake_golden_adapter(sample: GoldenSample) -> dict[str, object]:
    return {
        "scores": sample.expected_scores,
        "rationale": {"summary": f"Fixture evaluation for {sample.id}."},
        "evidence": [{"quote": sample.extracted_text[:80], "reason": "Fixture evidence."}],
        "summary": {"zh": sample.title},
    }


fake_golden_adapter.provider = "fake"  # type: ignore[attr-defined]


def evaluate_golden_file(path: Path, *, adapter: GoldenAdapter = fake_golden_adapter) -> dict[str, object]:
    return evaluate_golden_samples(load_golden_samples(path), adapter=adapter)


def evaluate_golden_samples(
    samples: Iterable[GoldenSample],
    *,
    adapter: GoldenAdapter = fake_golden_adapter,
) -> dict[str, object]:
    rows: list[dict[str, object]] = []
    passed_count = 0
    failed_count = 0

    for sample in samples:
        try:
            gate_result = validate_or_repair_output(adapter(sample))
            mismatches = score_mismatches(sample.expected_scores, gate_result.output["scores"])
            if mismatches:
                failed_count += 1
                status = "failed"
            else:
                passed_count += 1
                status = "passed"
            rows.append(
                {
                    "id": sample.id,
                    "status": status,
                    "repairNotes": gate_result.repair_notes,
                    "mismatches": mismatches,
                }
            )
        except Exception as error:
            failed_count += 1
            rows.append(
                {
                    "id": sample.id,
                    "status": "failed",
                    "error": str(error),
                }
            )

    return {
        "provider": str(getattr(adapter, "provider", "custom")),
        "sampleCount": len(rows),
        "passedCount": passed_count,
        "failedCount": failed_count,
        "results": rows,
    }


def score_mismatches(expected: dict[str, float], actual: object) -> list[str]:
    if not isinstance(actual, dict):
        return ["scores"]

    mismatches: list[str] = []
    for key, expected_value in expected.items():
        actual_value = actual.get(key)
        if not isinstance(actual_value, int | float) or float(actual_value) != expected_value:
            mismatches.append(key)
    return mismatches


def live_provider_enabled(env: dict[str, str] | None = None) -> bool:
    values = env if env is not None else os.environ
    return values.get("RUN_LIVE_AI_GOLDEN") == "1" and bool(values.get("MINIMAX_API_KEY"))


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Reno News AI golden-set harness.")
    parser.add_argument("--fixture", type=Path, required=True)
    parser.add_argument("--provider", choices=["fake", "minimax"], default="fake")
    args = parser.parse_args()

    if args.provider != "fake" and not live_provider_enabled():
        raise SystemExit("Live golden runs require RUN_LIVE_AI_GOLDEN=1 and MINIMAX_API_KEY")

    if args.provider != "fake":
        raise SystemExit("Live MiniMax golden adapter is not implemented in this local harness yet")

    print(json.dumps(evaluate_golden_file(args.fixture), ensure_ascii=True, sort_keys=True))


if __name__ == "__main__":
    main()
