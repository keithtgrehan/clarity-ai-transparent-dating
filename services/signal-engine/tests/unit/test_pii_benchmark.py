from __future__ import annotations

import json
import re
from collections.abc import Sequence
from pathlib import Path

from communication_signal_engine.privacy.benchmark import run_fictional_benchmark
from communication_signal_engine.privacy.redaction import EntitySpan

FIXTURE = Path(__file__).parents[1] / "fixtures" / "t1_pii_benchmark.json"


class FictionalBenchmarkDetector:
    receipt_status = "SYNTHETIC_TEST_DOUBLE_APPLIED"
    surfaces = {
        "Rowan Example": "PERSON",
        "Example Quarter": "LOCATION",
        "Northstar Studio": "ORGANIZATION",
        "Example University": "ORGANIZATION",
        "Mina Example": "PERSON",
        "Testplatz": "LOCATION",
        "14 October 2035": "DATE_TIME",
        "Northstar Workshop": "ORGANIZATION",
    }

    def supports(self, _language_tag: str) -> bool:
        return True

    def detect(self, text: str, _language_tag: str) -> Sequence[EntitySpan]:
        result = []
        for surface, category in self.surfaces.items():
            for match in re.finditer(re.escape(surface), text):
                result.append(EntitySpan(match.start(), match.end(), category))
        return tuple(result)


def test_fictional_benchmark_reports_metrics_hash_slices_and_contextual_limits() -> None:
    report = run_fictional_benchmark(
        FIXTURE,
        detector=FictionalBenchmarkDetector(),
        detector_version="dv_" + "1" * 64,
    )
    assert report.case_count == 8
    assert report.direct_expected >= 15
    assert report.direct_identifier_recall == 1.0
    assert report.direct_identifier_precision == 1.0
    assert report.category_level_misses == {}
    assert report.contextual_identifier_limitations == {"CONTEXTUAL_IDENTIFIER": 2}
    assert report.abstention_refusal_rate == 0.0
    assert set(report.language_slices) == {"en-US", "en-GB", "en-EU", "mixed"}
    assert re.fullmatch(r"[0-9a-f]{64}", report.fixture_sha256)
    serialized = json.dumps(report.model_dump(), sort_keys=True)
    assert "rowan@example.test" not in serialized
    assert "Rowan Example" not in serialized
    assert "anonymization" not in serialized.casefold()
