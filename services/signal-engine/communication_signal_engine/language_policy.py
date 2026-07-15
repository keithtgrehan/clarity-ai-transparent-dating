"""Language metadata policy; tags never become quality or person scores."""

from __future__ import annotations

import re
from dataclasses import dataclass

from .limits import InputBoundaryError, MAX_LANGUAGE_SEGMENTS

SUPPORTED_TAGS = frozenset({"en-US", "en-GB", "en-EU", "mixed"})
_INLINE_TAG = re.compile(r"\[([A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})?)\]")
_SAFE_MIXED_FAMILIES = frozenset({"en", "de", "fr", "es", "it", "nl"})


@dataclass(frozen=True, slots=True)
class LanguageSegment:
    """Transient text plus a declared BCP-47-like tag."""

    text: str
    language_tag: str


def normalize_language_tag(value: str) -> str:
    """Normalize the bounded product metadata vocabulary."""

    aliases = {
        "en": "en-EU",
        "en-us": "en-US",
        "en_us": "en-US",
        "american": "en-US",
        "en-gb": "en-GB",
        "en_gb": "en-GB",
        "british": "en-GB",
        "en-eu": "en-EU",
        "en_eu": "en-EU",
        "euro-english": "en-EU",
        "mixed": "mixed",
    }
    normalized = aliases.get(value.strip().casefold())
    if normalized not in SUPPORTED_TAGS:
        raise InputBoundaryError("Unsupported language metadata")
    return normalized


def segment_inline_tags(text: str, declared_tag: str) -> tuple[LanguageSegment, ...]:
    """Split explicit code-switch tags without treating dialect as a score.

    The statistical/deterministic checks remain English-oriented. Supported
    European tags may delimit code-switch spans, but those spans carry an
    explicit limited-coverage notice in the output.
    """

    default_tag = normalize_language_tag(declared_tag)
    matches = list(_INLINE_TAG.finditer(text))
    if not matches:
        return (LanguageSegment(text=text, language_tag=default_tag),)
    if len(matches) > MAX_LANGUAGE_SEGMENTS:
        raise InputBoundaryError("Too many language-tagged segments")

    result: list[LanguageSegment] = []
    if matches[0].start() > 0 and text[: matches[0].start()].strip():
        result.append(LanguageSegment(text[: matches[0].start()], default_tag))
    for index, match in enumerate(matches):
        tag = match.group(1)
        family = tag.split("-", 1)[0].casefold()
        if family not in _SAFE_MIXED_FAMILIES:
            raise InputBoundaryError("Unsupported code-switch language family")
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        content = text[match.end() : end]
        if content.strip():
            result.append(LanguageSegment(content, tag))
    if not result:
        raise InputBoundaryError("Language tags did not contain message text")
    return tuple(result)


def coverage_label(tags: tuple[str, ...]) -> str:
    families = {tag.split("-", 1)[0].casefold() for tag in tags}
    if families == {"en"} and len(tags) == 1:
        return "DECLARED_ENGLISH_VARIANT_RULES_ONLY"
    return "MIXED_LANGUAGE_LIMITED_RULE_COVERAGE"
