"""First and exclusive raw-text boundary for identifier minimisation."""

from __future__ import annotations

import re
import unicodedata
from collections import Counter
from dataclasses import dataclass
from typing import Any, Protocol, Sequence

from ..contracts import SanitizedText
from ..language_policy import segment_inline_tags
from ..limits import MAX_REDACTION_CATEGORIES, MAX_TEXT_CHARACTERS, InputBoundaryError, PrivacyBoundaryError
from ..semantic.model_loader import ModelInventoryEntry, verified_local_artifact
from .patterns import HIGH_CERTAINTY_RESIDUALS, NER_CATEGORY_MAP, RULES
from .receipts import build_receipt


@dataclass(frozen=True, slots=True)
class EntitySpan:
    start: int
    end: int
    category: str


class LocalEntityDetector(Protocol):
    receipt_status: str

    def supports(self, language_tag: str) -> bool: ...

    def detect(self, text: str, language_tag: str) -> Sequence[EntitySpan]: ...


class ExactLocalSpacyDetector:
    """Load only the inventory-pinned multilingual spaCy release.

    Runtime installation and candidate scanning are prohibited. A separately
    installed package is accepted only while the exact reviewed wheel remains
    present under the managed model root and its SHA-256 still matches.
    """

    SUPPORTED_FAMILIES = frozenset({"en", "de", "fr", "es", "it", "nl"})
    receipt_status = "LOCAL_SPACY_APPLIED"

    def __init__(self, pipeline: Any) -> None:
        self._pipeline = pipeline

    @classmethod
    def from_inventory(cls, entry: ModelInventoryEntry) -> "ExactLocalSpacyDetector | None":
        artifact = verified_local_artifact(entry)
        if artifact is None or artifact.name != "xx_ent_wiki_sm-3.8.0-py3-none-any.whl":
            return None
        # A verified wheel is not proof that an independently installed Python
        # package has identical bytes. The v1 inventory lacks a signed installed-
        # package manifest, so it cannot activate NER even when the wheel exists.
        return None

    def supports(self, language_tag: str) -> bool:
        family = language_tag.split("-", 1)[0].casefold()
        return language_tag == "mixed" or family in self.SUPPORTED_FAMILIES

    def detect(self, text: str, language_tag: str) -> Sequence[EntitySpan]:
        result: list[EntitySpan] = []
        document = self._pipeline(text)
        for entity in document.ents:
            category = NER_CATEGORY_MAP.get(str(entity.label_))
            if category:
                result.append(EntitySpan(int(entity.start_char), int(entity.end_char), category))
        return tuple(result)


class PrivacyMinimizer:
    """Convert transient raw input into an opaque attested value.

    Deterministic patterns always run. Installed spaCy NER augments them, but
    its absence is reported rather than silently described as high coverage.
    The current HTTP boundary separately restricts all input to exact synthetic
    fixtures; these checks are not a general anonymizer guarantee.
    """

    _PLACEHOLDER = re.compile(r"\u27e6REDACTED_[A-Z_]+\u27e7")

    def __init__(
        self,
        detector: LocalEntityDetector | None = None,
        *,
        model_entry: ModelInventoryEntry,
        allow_test_detector: bool = False,
    ) -> None:
        if detector is not None:
            if not allow_test_detector or getattr(detector, "receipt_status", None) != "SYNTHETIC_TEST_DOUBLE_APPLIED":
                raise PrivacyBoundaryError("Only an explicitly attested synthetic test detector may be injected")
            self._detector = detector
        else:
            self._detector = ExactLocalSpacyDetector.from_inventory(model_entry)

    def minimize(
        self,
        raw_text: str,
        language_tag: str,
        *,
        synthetic_fixture_attested: bool = False,
    ) -> SanitizedText:
        if self._detector is None and not synthetic_fixture_attested:
            raise PrivacyBoundaryError("Required local NER coverage is unavailable")
        if not isinstance(raw_text, str):
            raise InputBoundaryError("Message text must be a string")
        normalized = unicodedata.normalize("NFKC", raw_text).replace("\x00", " ").strip()
        if not normalized or len(normalized) > MAX_TEXT_CHARACTERS:
            raise InputBoundaryError("Message text is empty or exceeds the transient size limit")

        segments = segment_inline_tags(normalized, language_tag)
        sanitized_parts: list[str] = []
        counts: Counter[str] = Counter()
        for segment in segments:
            if self._detector is not None and not self._detector.supports(segment.language_tag):
                raise PrivacyBoundaryError("Required local NER language coverage is unavailable")
            spans = self._pattern_spans(segment.text)
            if self._detector is not None:
                spans.extend(self._detector.detect(segment.text, segment.language_tag))
            selected = self._merge(spans)
            sanitized, part_counts = self._replace(segment.text, selected)
            sanitized_parts.append(sanitized)
            counts.update(part_counts)

        if len(counts) > MAX_REDACTION_CATEGORIES:
            raise PrivacyBoundaryError("Unexpected redaction-category expansion")
        sanitized_text = "\n".join(sanitized_parts).strip()
        if not sanitized_text:
            raise PrivacyBoundaryError("No analyzable text remained after minimisation")
        residual_surface = self._PLACEHOLDER.sub("", sanitized_text)
        if any(pattern.search(residual_surface) for pattern in HIGH_CERTAINTY_RESIDUALS):
            raise PrivacyBoundaryError("Residual identifier pattern detected")

        detector_status = (
            self._detector.receipt_status
            if self._detector is not None
            else "SYNTHETIC_FIXTURE_PATTERN_CHECK_ONLY"
        )
        receipt = build_receipt(counts, detector_status=detector_status)
        return SanitizedText._from_privacy_boundary(
            sanitized_text,
            tuple(segment.language_tag for segment in segments),
            receipt,
        )

    @staticmethod
    def _pattern_spans(text: str) -> list[EntitySpan]:
        result: list[EntitySpan] = []
        for rule in RULES:
            for match in rule.expression.finditer(text):
                start, end = match.span(rule.group)
                result.append(EntitySpan(start, end, rule.category))
        return result

    @staticmethod
    def _merge(spans: Sequence[EntitySpan]) -> list[EntitySpan]:
        valid = sorted(
            (span for span in spans if span.start >= 0 and span.end > span.start),
            key=lambda item: (item.start, -(item.end - item.start), item.category),
        )
        selected: list[EntitySpan] = []
        for span in valid:
            if selected and span.start < selected[-1].end:
                if span.end > selected[-1].end:
                    previous = selected[-1]
                    selected[-1] = EntitySpan(
                        previous.start,
                        span.end,
                        previous.category if previous.start <= span.start else span.category,
                    )
                continue
            selected.append(span)
        return selected

    @staticmethod
    def _replace(text: str, spans: Sequence[EntitySpan]) -> tuple[str, Counter[str]]:
        parts: list[str] = []
        counts: Counter[str] = Counter()
        cursor = 0
        for span in spans:
            parts.append(text[cursor : span.start])
            category = NER_CATEGORY_MAP.get(span.category, span.category).upper()
            category = re.sub(r"[^A-Z_]", "_", category)[:40] or "IDENTIFIER"
            parts.append(f"\u27e6REDACTED_{category}\u27e7")
            counts[category] += 1
            cursor = span.end
        parts.append(text[cursor:])
        return "".join(parts), counts
