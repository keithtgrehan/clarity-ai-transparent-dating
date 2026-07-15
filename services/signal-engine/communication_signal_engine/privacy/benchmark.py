"""Wholly fictional local benchmark harness for PII minimisation candidates.

The report measures direct-identifier span detection on a reviewed synthetic
fixture. It deliberately reports contextual limitations and must never be
described as anonymisation accuracy or model approval.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from ..language_policy import normalize_language_tag
from ..limits import InputBoundaryError
from .redaction import EntitySpan, LocalEntityDetector, PrivacyMinimizer


@dataclass(frozen=True, slots=True)
class BenchmarkReport:
    detector_version: str
    fixture_sha256: str
    direct_identifier_recall: float
    direct_identifier_precision: float
    direct_expected: int
    direct_detected: int
    predicted_spans: int
    category_level_misses: dict[str, int]
    contextual_identifier_limitations: dict[str, int]
    abstention_refusal_rate: float
    language_slices: dict[str, dict[str, int | float]]
    case_count: int

    def model_dump(self) -> dict[str, Any]:
        return {
            "detector_version": self.detector_version,
            "fixture_sha256": self.fixture_sha256,
            "direct_identifier_recall": self.direct_identifier_recall,
            "direct_identifier_precision": self.direct_identifier_precision,
            "direct_expected": self.direct_expected,
            "direct_detected": self.direct_detected,
            "predicted_spans": self.predicted_spans,
            "category_level_misses": self.category_level_misses,
            "contextual_identifier_limitations": self.contextual_identifier_limitations,
            "abstention_refusal_rate": self.abstention_refusal_rate,
            "language_slices": self.language_slices,
            "case_count": self.case_count,
        }


@dataclass(frozen=True, slots=True)
class _Expected:
    start: int
    end: int
    category: str
    direct: bool


def run_fictional_benchmark(
    fixture_path: Path,
    *,
    detector: LocalEntityDetector,
    detector_version: str,
) -> BenchmarkReport:
    raw_bytes = fixture_path.read_bytes()
    payload = json.loads(raw_bytes)
    if (
        not isinstance(payload, dict)
        or payload.get("content_class") != "wholly_fictional_t1_pii_benchmark"
        or payload.get("schema_version") != "1.0.0"
        or not isinstance(payload.get("cases"), list)
        or not payload["cases"]
    ):
        raise InputBoundaryError("Fictional PII benchmark fixture is invalid")

    direct_expected = 0
    direct_detected = 0
    true_predicted = 0
    predicted_total = 0
    refusals = 0
    category_misses: Counter[str] = Counter()
    contextual: Counter[str] = Counter()
    slices: dict[str, Counter[str]] = defaultdict(Counter)
    seen_ids: set[str] = set()

    for case in payload["cases"]:
        if not isinstance(case, dict) or set(case) != {"case_id", "language_tag", "text", "expected"}:
            raise InputBoundaryError("Fictional benchmark case schema is invalid")
        case_id = case["case_id"]
        text = case["text"]
        language_tag = normalize_language_tag(case["language_tag"])
        if (
            not isinstance(case_id, str)
            or not case_id.startswith("fictional_")
            or case_id in seen_ids
            or not isinstance(text, str)
            or not text
        ):
            raise InputBoundaryError("Fictional benchmark case metadata is invalid")
        seen_ids.add(case_id)
        expected = _expected_spans(text, case["expected"])
        direct = [item for item in expected if item.direct]
        indirect = [item for item in expected if not item.direct]
        direct_expected += len(direct)
        slices[language_tag]["cases"] += 1
        slices[language_tag]["direct_expected"] += len(direct)

        if not detector.supports(language_tag):
            refusals += 1
            slices[language_tag]["refusals"] += 1
            for item in direct:
                category_misses[item.category] += 1
            for item in indirect:
                contextual[item.category] += 1
            continue
        try:
            predicted = PrivacyMinimizer._pattern_spans(text)
            predicted.extend(detector.detect(text, language_tag))
            predicted = PrivacyMinimizer._merge(predicted)
        except Exception:
            refusals += 1
            slices[language_tag]["refusals"] += 1
            for item in direct:
                category_misses[item.category] += 1
            for item in indirect:
                contextual[item.category] += 1
            continue

        predicted_total += len(predicted)
        slices[language_tag]["predicted"] += len(predicted)
        for span in predicted:
            if any(_overlaps(span, item) for item in direct):
                true_predicted += 1
                slices[language_tag]["true_predicted"] += 1
        for item in direct:
            if any(_overlaps(span, item) for span in predicted):
                direct_detected += 1
                slices[language_tag]["direct_detected"] += 1
            else:
                category_misses[item.category] += 1
        for item in indirect:
            if not any(_overlaps(span, item) for span in predicted):
                contextual[item.category] += 1

    slice_report: dict[str, dict[str, int | float]] = {}
    for language_tag, counts in sorted(slices.items()):
        expected_count = counts["direct_expected"]
        predicted_count = counts["predicted"]
        slice_report[language_tag] = {
            "cases": counts["cases"],
            "direct_expected": expected_count,
            "direct_detected": counts["direct_detected"],
            "direct_recall": counts["direct_detected"] / expected_count if expected_count else 1.0,
            "predicted_spans": predicted_count,
            "direct_precision": counts["true_predicted"] / predicted_count if predicted_count else 1.0,
            "refusals": counts["refusals"],
        }
    return BenchmarkReport(
        detector_version=detector_version,
        fixture_sha256=hashlib.sha256(raw_bytes).hexdigest(),
        direct_identifier_recall=direct_detected / direct_expected if direct_expected else 1.0,
        direct_identifier_precision=true_predicted / predicted_total if predicted_total else 1.0,
        direct_expected=direct_expected,
        direct_detected=direct_detected,
        predicted_spans=predicted_total,
        category_level_misses=dict(sorted(category_misses.items())),
        contextual_identifier_limitations=dict(sorted(contextual.items())),
        abstention_refusal_rate=refusals / len(payload["cases"]),
        language_slices=slice_report,
        case_count=len(payload["cases"]),
    )


def _expected_spans(text: str, raw: object) -> tuple[_Expected, ...]:
    if not isinstance(raw, list):
        raise InputBoundaryError("Fictional benchmark expected spans are invalid")
    result: list[_Expected] = []
    for item in raw:
        if not isinstance(item, dict) or set(item) != {"surface", "category", "direct"}:
            raise InputBoundaryError("Fictional benchmark expected span is invalid")
        surface = item["surface"]
        category = item["category"]
        direct = item["direct"]
        if not isinstance(surface, str) or not surface or not isinstance(category, str) or not isinstance(direct, bool):
            raise InputBoundaryError("Fictional benchmark label is invalid")
        start = text.find(surface)
        if start < 0 or text.find(surface, start + 1) >= 0:
            raise InputBoundaryError("Fictional benchmark surface must occur exactly once")
        result.append(_Expected(start, start + len(surface), category, direct))
    return tuple(result)


def _overlaps(predicted: EntitySpan, expected: _Expected) -> bool:
    return predicted.start < expected.end and expected.start < predicted.end
