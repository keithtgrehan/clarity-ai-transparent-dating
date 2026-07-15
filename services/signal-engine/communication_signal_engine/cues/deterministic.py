"""Deterministic wording and structure checks over attested text only."""

from __future__ import annotations

import re
from dataclasses import dataclass

from ..contracts import AnalysisState, CueObservation, ProfileId, SanitizedOffset, SanitizedText
from ..limits import MAX_CUES, MIN_SIGNAL_TOKENS
from .registry import RULE_HANDLERS, CueDefinition, CueRegistry

_WORD = re.compile(r"[^\W\d_]+(?:['’\-][^\W\d_]+)*", re.UNICODE)


@dataclass(frozen=True, slots=True)
class DeterministicResult:
    state: AnalysisState
    sufficient: bool
    cues: tuple[CueObservation, ...]
    primary_definition: CueDefinition | None


@dataclass(frozen=True, slots=True)
class _Match:
    canonical_id: str
    count: int
    start: int
    end: int


class DeterministicCueEngine:
    """Apply the canonical fixed rules without psychological interpretation."""

    AMBIGUITY = re.compile(r"\b(?:maybe|perhaps|possibly|sort of|kind of|not sure|might|could be)\b", re.I)
    PRESSURE = re.compile(r"\b(?:you (?:have|need) to|reply (?:right )?now|answer (?:right )?now|prove (?:that )?you care|before it is too late)\b", re.I)
    REASSURANCE = re.compile(r"\b(?:are you sure|is everything okay|is (?:this|that|it) okay|do you promise)\b", re.I)
    REPAIR = re.compile(r"\b(?:misunderstood|let me rephrase|what i meant|earlier note was unclear|i apolog(?:ise|ize)|to clarify|correction)\b", re.I)
    DIRECT = re.compile(r"\b(?:i would like|i prefer|please let me know|my preference is|what i meant was|i want (?:a|to))\b", re.I)
    TRANSITION = re.compile(r"\b(?:by the way|looping back|returning to|on a separate point|back to)\b", re.I)
    PROCESSING = re.compile(r"\b(?:need (?:some )?time to (?:process|think)|time to process|respond after i think|come back to this)\b", re.I)
    WINDOW = re.compile(r"\b(?:by (?:tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|tomorrow (?:morning|afternoon|evening)|in \d+ (?:minutes?|hours?|days?)|at \d{1,2}(?::\d{2})?)\b", re.I)
    THINKING = re.compile(r"\b(?:thinking aloud|thinking out loud|working through this aloud)\b", re.I)
    FINAL = re.compile(r"\b(?:my (?:considered|current|final) answer is|my current position is|the answer i can give now is)\b", re.I)
    RECIPROCITY = re.compile(r"\b(?:would you like the short version|do you want the short version|short version (?:first|or)|more context or less)\b", re.I)
    CHANNEL = re.compile(r"\b(?:switch to a call|continue by text|talk in person|another time that works|voice note instead)\b", re.I)
    FUNCTION_WORDS = frozenset(
        "a an and are as at be been but by can could did do does for from had has have he her here him his how i if in into is it its me my of on or our she so that the their them then there they this to up us was we were what when where which who will with would you your".split()
    )
    QUOTED = re.compile(r"(?:\"[^\"\n]*\"|“[^”\n]*”|'[^'\n]*')")
    REPORTED = re.compile(r"\b(?:they|he|she|you|my friend)\s+(?:said|wrote|asked|told me)\b", re.I)
    REJECTED = re.compile(r"\b(?:not|never|reject(?:ed)?|avoid|without|do not|don't)\b", re.I)

    def __init__(self, registry: CueRegistry) -> None:
        self.registry = registry

    def analyze(self, sanitized: SanitizedText, profile: ProfileId) -> DeterministicResult:
        text = sanitized._read_attested()
        words = list(_WORD.finditer(text))
        if len(words) < MIN_SIGNAL_TOKENS:
            return DeterministicResult(AnalysisState.LOW_SIGNAL, False, (), None)
        candidates: list[tuple[CueDefinition, _Match]] = []
        for definition in self.registry.cues.values():
            if (
                profile not in definition.profiles
                or definition.status != "active"
                or not all(
                    tag in definition.language_support or "mixed" in definition.language_support
                    for tag in sanitized.language_tags
                )
            ):
                continue
            match = self._evaluate(definition, text, words)
            if match is not None:
                candidates.append((definition, match))
        candidates.sort(key=lambda item: (-item[0].priority, item[0].canonical_id))
        selected = candidates[:MAX_CUES]
        cues = tuple(
            CueObservation(
                canonical_id=definition.canonical_id,
                observation=definition.observation,
                limitation=definition.limitation,
                sanitized_range=SanitizedOffset(start=match.start, end=match.end),
                evidence_sufficiency="deterministic",
            )
            for definition, match in selected
        )
        state = AnalysisState.CUES_FOUND if cues else AnalysisState.NO_TARGETED_CUES
        return DeterministicResult(state, True, cues, selected[0][0] if selected else None)

    def _evaluate(
        self,
        definition: CueDefinition,
        text: str,
        words: list[re.Match[str]],
    ) -> _Match | None:
        """Execute only the rule, preconditions and language policy in the registry."""

        if definition.deterministic_rule not in RULE_HANDLERS:
            raise ValueError("Registry rule is not executable")
        masked = self.QUOTED.sub(lambda match: " " * (match.end() - match.start()), text)

        def found(
            expression: re.Pattern[str],
            *,
            attribution_sensitive: bool = False,
            rejection_sensitive: bool = False,
        ) -> list[re.Match[str]]:
            matches: list[re.Match[str]] = []
            for candidate in expression.finditer(masked):
                prefix = masked[max(0, candidate.start() - 48) : candidate.start()]
                if attribution_sensitive and self.REPORTED.search(prefix):
                    continue
                if rejection_sensitive and self.REJECTED.search(prefix):
                    continue
                matches.append(candidate)
            return matches

        reassurance = found(self.REASSURANCE)
        processing = found(self.PROCESSING)
        window = self.WINDOW.search(masked)
        questions = list(re.finditer(r"\?", text))
        token_count = len(words)
        preconditions = {
            "minimum_signal": token_count >= MIN_SIGNAL_TOKENS,
            "two_reassurance_requests": len(reassurance) >= 2,
            "at_least_40_tokens": token_count >= 40,
            "at_least_45_tokens": token_count >= 45,
            "processing_request": bool(processing),
            "no_time_window": window is None,
            "three_questions": len(questions) >= 3,
        }
        if not all(preconditions.get(name, False) for name in definition.preconditions):
            return None

        rule = definition.deterministic_rule
        matches: list[re.Match[str]] = []
        if rule == "first_person_preference_or_explicit_request":
            matches = found(self.DIRECT, attribution_sensitive=True)
        elif rule == "ambiguity_marker_count":
            matches = found(self.AMBIGUITY)
        elif rule == "second_person_obligation_or_urgency":
            matches = found(self.PRESSURE, attribution_sensitive=True, rejection_sensitive=True)
        elif rule in {"reassurance_question", "repeated_reassurance_question"}:
            matches = reassurance
            if rule == "repeated_reassurance_question" and len(matches) < 2:
                return None
        elif rule == "explicit_repair_marker":
            matches = found(self.REPAIR)
        elif rule == "transition_marker":
            matches = found(self.TRANSITION)
        elif rule == "processing_time_phrase":
            matches = processing
        elif rule == "thinking_aloud_marker":
            matches = found(self.THINKING)
        elif rule == "final_position_marker":
            matches = found(self.FINAL)
        elif rule == "short_version_offer":
            matches = found(self.RECIPROCITY)
        elif rule == "channel_choice_phrase":
            matches = found(self.CHANNEL)
        elif rule == "processing_request_with_time_window":
            if not processing or window is None:
                return None
            return _Match(definition.canonical_id, 1, window.start(), window.end())
        elif rule == "processing_request_without_time_window":
            if not processing or window is not None:
                return None
            marker = processing[0]
            return _Match(definition.canonical_id, 1, marker.start(), marker.end())
        elif rule == "question_count_threshold":
            if len(questions) < 3:
                return None
            return _Match(
                definition.canonical_id,
                len(questions),
                questions[0].start(),
                questions[-1].end(),
            )
        elif rule == "lexical_density_threshold":
            content_count = sum(
                1 for word in words if word.group(0).casefold() not in self.FUNCTION_WORDS
            )
            lexical_density = content_count / token_count if token_count else 0.0
            if token_count < 40 or lexical_density < 0.62:
                return None
            return _Match(definition.canonical_id, 1, words[0].start(), words[-1].end())
        elif rule == "long_comma_separated_run":
            if token_count < 45 or text.count(",") < 5:
                return None
            return _Match(definition.canonical_id, 1, words[0].start(), words[-1].end())

        if not matches:
            return None
        return _Match(
            definition.canonical_id,
            len(matches),
            matches[0].start(),
            matches[-1].end(),
        )
