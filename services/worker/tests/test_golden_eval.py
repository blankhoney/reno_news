import json
import tempfile
import unittest
from pathlib import Path

from reno_worker.golden_eval import (
    evaluate_golden_file,
    fake_golden_adapter,
    live_provider_enabled,
    load_golden_samples,
)


class GoldenEvaluationTest(unittest.TestCase):
    def test_fake_golden_harness_produces_stable_report(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            fixture_path = Path(tmpdir) / "golden.jsonl"
            fixture_path.write_text(
                "\n".join(
                    [
                        json.dumps(
                            {
                                "id": "sample-001",
                                "board": "ai",
                                "title": "Deterministic AI item",
                                "extractedText": "A deterministic extracted text about model evaluation.",
                                "expectedScores": {"relevance": 0.8, "credibility": 0.7, "novelty": 0.6},
                            }
                        ),
                        json.dumps(
                            {
                                "id": "sample-002",
                                "board": "software-engineering",
                                "title": "Deterministic engineering item",
                                "extractedText": "A deterministic extracted text about release engineering.",
                                "expectedScores": {"relevance": 0.6, "credibility": 0.8, "novelty": 0.4},
                            }
                        ),
                    ]
                ),
                encoding="utf-8",
            )

            first_report = evaluate_golden_file(fixture_path, adapter=fake_golden_adapter)
            second_report = evaluate_golden_file(fixture_path, adapter=fake_golden_adapter)

        self.assertEqual(first_report, second_report)
        self.assertEqual(first_report["sampleCount"], 2)
        self.assertEqual(first_report["passedCount"], 2)
        self.assertEqual(first_report["failedCount"], 0)
        self.assertEqual(first_report["provider"], "fake")

    def test_repo_golden_fixture_has_required_sample_count_and_unique_ids(self) -> None:
        fixture_path = Path(__file__).resolve().parents[1] / "golden" / "ai_evaluation_golden.jsonl"
        samples = load_golden_samples(fixture_path)
        sample_ids = [sample.id for sample in samples]

        self.assertGreaterEqual(len(samples), 50)
        self.assertLessEqual(len(samples), 100)
        self.assertEqual(len(sample_ids), len(set(sample_ids)))

    def test_live_provider_requires_explicit_flag_and_key(self) -> None:
        self.assertFalse(live_provider_enabled({}))
        self.assertFalse(live_provider_enabled({"RUN_LIVE_AI_GOLDEN": "1"}))
        self.assertFalse(live_provider_enabled({"MINIMAX_API_KEY": "test"}))
        self.assertTrue(live_provider_enabled({"RUN_LIVE_AI_GOLDEN": "1", "MINIMAX_API_KEY": "test"}))


if __name__ == "__main__":
    unittest.main()
