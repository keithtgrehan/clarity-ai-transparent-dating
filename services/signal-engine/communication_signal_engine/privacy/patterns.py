"""Bounded deterministic identifier candidates for local minimisation."""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class PatternRule:
    category: str
    expression: re.Pattern[str]
    group: int = 0


CAPITALIZED = r"[A-ZÀ-ÖØ-Þ][\wÀ-ÖØ-öø-ÿ'’.-]*"
RULES: tuple[PatternRule, ...] = (
    PatternRule("EMAIL", re.compile(r"(?<![\w.+-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}(?![\w.-])", re.I)),
    PatternRule("URL", re.compile(r"\b(?:https?://|www\.)[^\s<>{}\[\]]+", re.I)),
    PatternRule("HANDLE", re.compile(r"(?<![\w@])@[A-Z0-9_][A-Z0-9_.-]{0,63}", re.I)),
    PatternRule("PHONE", re.compile(r"(?<!\w)(?:\+?\d[\d\s()./-]{6,}\d)(?!\w)")),
    PatternRule("IP_ADDRESS", re.compile(r"\b(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\b")),
    PatternRule("IBAN", re.compile(r"\b[A-Z]{2}\d{2}(?:[ -]?[A-Z0-9]){11,30}\b", re.I)),
    PatternRule("PAYMENT_CARD", re.compile(r"(?<!\d)(?:\d[ -]*?){13,19}(?!\d)")),
    PatternRule(
        "ADDRESS",
        re.compile(
            rf"\b\d{{1,5}}\s+(?:{CAPITALIZED}\s+){{0,5}}"
            r"(?:street|st\.?|road|rd\.?|avenue|ave\.?|lane|ln\.?|boulevard|blvd\.?|platz|straße|strasse|weg|allee)\b",
            re.I,
        ),
    ),
    PatternRule("POSTCODE", re.compile(r"\b(?:[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}|\d{4}\s?[A-Z]{2}|\d{4}-\d{3}|\d{5}(?:-\d{4})?)\b", re.I)),
    PatternRule(
        "PERSON_CONTEXT",
        re.compile(
            rf"\b(?i:my name is|call me|this is|met|with)\s+({CAPITALIZED}(?:\s+{CAPITALIZED}){{0,2}})\b"
        ),
        group=1,
    ),
    PatternRule(
        "LOCATION_CONTEXT",
        re.compile(
            rf"\b(?i:live in|living in|based in|near|from)\s+({CAPITALIZED}(?:\s+{CAPITALIZED}){{0,3}})\b"
        ),
        group=1,
    ),
)

NER_CATEGORY_MAP = {
    "PERSON": "PERSON",
    "PER": "PERSON",
    "GPE": "LOCATION",
    "LOC": "LOCATION",
    "FAC": "LOCATION",
    "ORG": "ORGANIZATION",
    "NORP": "SENSITIVE_GROUP",
    "DATE": "DATE_TIME",
    "TIME": "DATE_TIME",
}

HIGH_CERTAINTY_RESIDUALS: tuple[re.Pattern[str], ...] = (
    re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}"),
    re.compile(r"(?:https?://|www\.)\S+", re.I),
    re.compile(r"(?<!\w)@[A-Za-z0-9_][A-Za-z0-9_.-]+"),
    re.compile(r"(?<!\w)\+?\d(?:[\s()./-]*\d){7,}(?!\w)"),
    re.compile(r"\b[A-Z]{2}\d{2}(?:[ -]?[A-Z0-9]){11,30}\b", re.I),
)
