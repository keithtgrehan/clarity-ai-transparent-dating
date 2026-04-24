"""
Clarity Matching Engine — rules-first reference implementation

Purpose:
- explainable pair scoring
- friction detection
- human-readable reason codes
- confidence adjustment
- sample inputs/outputs

This is a reference implementation for v1 and is intentionally simple,
auditable, and easy to port to TypeScript later.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple, Any
import json


NUMERIC_COMMUNICATION_TRAITS = [
    "directness",
    "literalness",
    "reply_speed_preference",
    "reply_consistency_importance",
    "planned_vs_spontaneous",
    "small_talk_tolerance",
    "deep_topic_preference",
    "clarity_need",
    "ambiguity_tolerance",
]

NUMERIC_SOCIAL_TRAITS = [
    "social_battery",
    "interaction_frequency_preference",
    "one_to_one_preference",
    "alone_time_need",
    "sensory_sensitivity",
    "routine_need",
    "last_minute_change_tolerance",
]

NUMERIC_RELIABILITY_TRAITS = [
    "punctuality_importance",
    "reminder_friendliness",
    "dependability_preference",
    "rescheduling_tolerance",
    "repair_speed_after_miscommunication",
]

NUMERIC_VALUES_TRAITS = [
    "honesty_directness_importance",
    "independence_vs_closeness",
    "reassurance_need",
    "novelty_preference",
    "affection_expression",
]

COMMUNICATION_WEIGHTS = {
    "directness": 1.4,
    "literalness": 1.0,
    "reply_speed_preference": 1.2,
    "reply_consistency_importance": 1.2,
    "planned_vs_spontaneous": 1.0,
    "small_talk_tolerance": 1.0,
    "deep_topic_preference": 1.2,
    "clarity_need": 1.4,
    "ambiguity_tolerance": 1.3,
}

SOCIAL_WEIGHTS = {
    "social_battery": 1.0,
    "interaction_frequency_preference": 1.2,
    "one_to_one_preference": 1.1,
    "alone_time_need": 1.1,
    "sensory_sensitivity": 1.0,
    "routine_need": 1.2,
    "last_minute_change_tolerance": 1.4,
}

RELIABILITY_WEIGHTS = {
    "punctuality_importance": 1.4,
    "reminder_friendliness": 0.8,
    "dependability_preference": 1.5,
    "rescheduling_tolerance": 1.2,
    "repair_speed_after_miscommunication": 0.9,
}

VALUES_WEIGHTS = {
    "honesty_directness_importance": 1.3,
    "independence_vs_closeness": 1.0,
    "reassurance_need": 1.2,
    "novelty_preference": 1.0,
    "affection_expression": 0.9,
}

CATEGORY_COMPATIBILITY = {
    "relationship_intention": {
        ("long_term", "long_term"): 1.0,
        ("friendship_first", "friendship_first"): 1.0,
        ("exploring", "exploring"): 0.9,
        ("long_term", "friendship_first"): 0.65,
        ("friendship_first", "long_term"): 0.65,
        ("long_term", "exploring"): 0.35,
        ("exploring", "long_term"): 0.35,
        ("friendship_first", "exploring"): 0.6,
        ("exploring", "friendship_first"): 0.6,
        ("short_term", "short_term"): 1.0,
        ("short_term", "long_term"): 0.1,
        ("long_term", "short_term"): 0.1,
        ("short_term", "friendship_first"): 0.25,
        ("friendship_first", "short_term"): 0.25,
    },
    "relationship_structure": {
        ("monogamous", "monogamous"): 1.0,
        ("non_monogamous", "non_monogamous"): 1.0,
        ("monogamous", "non_monogamous"): 0.0,
        ("non_monogamous", "monogamous"): 0.0,
    },
    "conflict_style": {
        ("direct", "direct"): 1.0,
        ("direct", "reflective"): 0.7,
        ("direct", "collaborative"): 0.9,
        ("direct", "avoidant"): 0.2,
        ("reflective", "direct"): 0.7,
        ("reflective", "reflective"): 0.9,
        ("reflective", "collaborative"): 0.8,
        ("reflective", "avoidant"): 0.5,
        ("collaborative", "direct"): 0.9,
        ("collaborative", "reflective"): 0.8,
        ("collaborative", "collaborative"): 1.0,
        ("collaborative", "avoidant"): 0.4,
        ("avoidant", "direct"): 0.2,
        ("avoidant", "reflective"): 0.5,
        ("avoidant", "collaborative"): 0.4,
        ("avoidant", "avoidant"): 0.6,
    },
}


@dataclass
class MatchResult:
    final_score: float
    compatibility_score: float
    friction_score: float
    confidence_score: float
    sub_scores: Dict[str, float]
    friction_flags: List[Dict[str, Any]]
    reason_codes: List[str]
    explanation: str


def clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def numeric_trait_score(a: float, b: float) -> float:
    return clamp(1.0 - abs(a - b))


def weighted_average(pairs: List[Tuple[float, float]]) -> float:
    total_weight = sum(w for _, w in pairs)
    if total_weight == 0:
        return 0.0
    return sum(score * weight for score, weight in pairs) / total_weight


def category_score(category: str, a: str, b: str) -> float:
    table = CATEGORY_COMPATIBILITY.get(category, {})
    if (a, b) in table:
        return table[(a, b)]
    if a == b:
        return 1.0
    return 0.5


def interest_overlap_score(a_interests: List[Dict[str, Any]], b_interests: List[Dict[str, Any]]) -> float:
    b_lookup = {item["name"]: item for item in b_interests}
    overlaps: List[float] = []
    bonuses: List[float] = []

    for a_item in a_interests:
        name = a_item["name"]
        if name in b_lookup:
            b_item = b_lookup[name]
            intensity_score = numeric_trait_score(float(a_item.get("intensity", 0.5)), float(b_item.get("intensity", 0.5)))
            shared_bonus = 0.1 if a_item.get("wants_shared") and b_item.get("wants_shared") else 0.0
            overlaps.append(clamp(0.8 * intensity_score + shared_bonus))
        else:
            # tiny complement bonus for category match without same interest name
            for b_item in b_interests:
                if a_item.get("category") == b_item.get("category"):
                    bonuses.append(0.08)
                    break

    if not overlaps and not bonuses:
        return 0.0

    overlap_component = sum(overlaps) / max(len(overlaps), 1) if overlaps else 0.0
    bonus_component = min(sum(bonuses), 0.2)
    return clamp(overlap_component + bonus_component)


def compute_dimension_score(profile_a: Dict[str, Any], profile_b: Dict[str, Any], traits: List[str], weights: Dict[str, float]) -> float:
    pairs: List[Tuple[float, float]] = []
    for trait in traits:
        if trait in profile_a and trait in profile_b:
            score = numeric_trait_score(float(profile_a[trait]), float(profile_b[trait]))
            pairs.append((score, weights.get(trait, 1.0)))
    return weighted_average(pairs)


def compute_intent_score(profile_a: Dict[str, Any], profile_b: Dict[str, Any]) -> float:
    pairs = [
        (category_score("relationship_intention", profile_a["relationship_intention"], profile_b["relationship_intention"]), 1.7),
        (category_score("relationship_structure", profile_a["relationship_structure"], profile_b["relationship_structure"]), 1.6),
    ]
    return weighted_average(pairs)


def compute_values_score(profile_a: Dict[str, Any], profile_b: Dict[str, Any]) -> float:
    numeric = compute_dimension_score(profile_a, profile_b, NUMERIC_VALUES_TRAITS, VALUES_WEIGHTS)
    conflict = category_score("conflict_style", profile_a["conflict_style"], profile_b["conflict_style"])
    return weighted_average([(numeric, 1.3), (conflict, 1.1)])


def detect_friction(profile_a: Dict[str, Any], profile_b: Dict[str, Any]) -> List[Dict[str, Any]]:
    flags: List[Dict[str, Any]] = []

    def add_flag(domain: str, key: str, severity: str, message: str, threshold_gap: float | None = None) -> None:
        flags.append({
            "domain": domain,
            "key": key,
            "severity": severity,
            "message": message,
            "threshold_gap": threshold_gap,
        })

    def gap(key: str) -> float:
        return abs(float(profile_a[key]) - float(profile_b[key]))

    if gap("reply_speed_preference") > 0.45:
        add_flag("communication", "reply_speed_preference", "moderate", "Response pace mismatch may create anxiety or misread intent.", gap("reply_speed_preference"))
    if gap("planned_vs_spontaneous") > 0.55:
        add_flag("communication", "planned_vs_spontaneous", "high", "One person prefers firm plans while the other is much more spontaneous.", gap("planned_vs_spontaneous"))
    if gap("directness") > 0.55:
        add_flag("communication", "directness", "moderate", "Communication style differs in directness and may lead to bluntness or vagueness friction.", gap("directness"))
    if gap("ambiguity_tolerance") > 0.50:
        add_flag("communication", "ambiguity_tolerance", "high", "One person needs explicit clarity while the other is more comfortable with ambiguity.", gap("ambiguity_tolerance"))
    if gap("routine_need") > 0.55:
        add_flag("regulation", "routine_need", "moderate", "Routine and structure needs differ materially.", gap("routine_need"))
    if gap("last_minute_change_tolerance") > 0.55:
        add_flag("reliability", "last_minute_change_tolerance", "high", "Tolerance for last-minute changes differs enough to create planning friction.", gap("last_minute_change_tolerance"))
    if gap("dependability_preference") > 0.45:
        add_flag("reliability", "dependability_preference", "moderate", "One person places much higher importance on consistency and follow-through.", gap("dependability_preference"))
    if gap("reassurance_need") > 0.50:
        add_flag("emotional", "reassurance_need", "moderate", "Reassurance needs differ and could affect how secure each person feels.", gap("reassurance_need"))

    if category_score("conflict_style", profile_a["conflict_style"], profile_b["conflict_style"]) < 0.5:
        add_flag("emotional", "conflict_style", "high", "Conflict styles are likely to clash.", None)

    if category_score("relationship_intention", profile_a["relationship_intention"], profile_b["relationship_intention"]) < 0.5:
        add_flag("intent", "relationship_intention", "high", "Dating intentions are materially misaligned.", None)

    return flags


def friction_penalty(flags: List[Dict[str, Any]]) -> float:
    severity_weights = {
        "low": 0.08,
        "moderate": 0.16,
        "high": 0.28,
    }
    raw = sum(severity_weights.get(flag["severity"], 0.1) for flag in flags)
    return clamp(raw, 0.0, 1.0)


def confidence_score(profile_a: Dict[str, Any], profile_b: Dict[str, Any]) -> float:
    # Each profile provides meta fields from 0..1
    a = (
        0.45 * float(profile_a.get("profile_completeness", 0.6)) +
        0.35 * float(profile_a.get("behavioral_depth", 0.5)) +
        0.20 * float(profile_a.get("observed_signal_strength", 0.0))
    )
    b = (
        0.45 * float(profile_b.get("profile_completeness", 0.6)) +
        0.35 * float(profile_b.get("behavioral_depth", 0.5)) +
        0.20 * float(profile_b.get("observed_signal_strength", 0.0))
    )
    return clamp((a + b) / 2.0)


def hard_gate_failures(profile_a: Dict[str, Any], profile_b: Dict[str, Any]) -> List[str]:
    failures = []
    if profile_a["relationship_structure"] != profile_b["relationship_structure"]:
        failures.append("relationship_structure")
    # Example simple age/location hard-gate placeholders if supplied
    if "distance_km" in profile_a and "max_distance_km" in profile_a and float(profile_a["distance_km"]) > float(profile_a["max_distance_km"]):
        failures.append("distance_for_a")
    if "distance_km" in profile_b and "max_distance_km" in profile_b and float(profile_b["distance_km"]) > float(profile_b["max_distance_km"]):
        failures.append("distance_for_b")
    return failures


def explain(sub_scores: Dict[str, float], friction_flags: List[Dict[str, Any]]) -> Tuple[List[str], str]:
    sorted_strengths = sorted(sub_scores.items(), key=lambda x: x[1], reverse=True)
    strengths = [name.replace("_", " ") for name, score in sorted_strengths[:3] if score >= 0.72]
    watchouts = [flag["message"] for flag in friction_flags[:2]]

    reasons = []
    if strengths:
        reasons.extend([f"strong_{s.replace(' ', '_')}" for s in strengths])

    if watchouts:
        reasons.extend([f"friction_{flag['key']}" for flag in friction_flags[:2]])

    strength_text = ", ".join(strengths) if strengths else "several areas"
    if watchouts:
        explanation = f"Strong fit in {strength_text}. Key watch-out: {watchouts[0]}"
    else:
        explanation = f"Strong fit in {strength_text} with no major friction flags."
    return reasons, explanation


def compute_match(profile_a: Dict[str, Any], profile_b: Dict[str, Any]) -> MatchResult:
    failures = hard_gate_failures(profile_a, profile_b)
    if failures:
        return MatchResult(
            final_score=0.0,
            compatibility_score=0.0,
            friction_score=1.0,
            confidence_score=0.0,
            sub_scores={"hard_gate_failed": 0.0},
            friction_flags=[{"domain": "gate", "key": key, "severity": "high", "message": f"Hard gate failed: {key}"} for key in failures],
            reason_codes=["hard_gate_failed"],
            explanation=f"Pair rejected due to hard gate failure: {', '.join(failures)}",
        )

    intent = compute_intent_score(profile_a, profile_b)
    communication = compute_dimension_score(profile_a, profile_b, NUMERIC_COMMUNICATION_TRAITS, COMMUNICATION_WEIGHTS)
    social = compute_dimension_score(profile_a, profile_b, NUMERIC_SOCIAL_TRAITS, SOCIAL_WEIGHTS)
    reliability = compute_dimension_score(profile_a, profile_b, NUMERIC_RELIABILITY_TRAITS, RELIABILITY_WEIGHTS)
    interests = interest_overlap_score(profile_a.get("interests", []), profile_b.get("interests", []))
    values = compute_values_score(profile_a, profile_b)

    sub_scores = {
        "intent_alignment": round(intent, 4),
        "communication_compatibility": round(communication, 4),
        "social_rhythm": round(social, 4),
        "reliability_predictability": round(reliability, 4),
        "interest_bonding": round(interests, 4),
        "values_alignment": round(values, 4),
    }

    compatibility = (
        0.25 * intent +
        0.25 * communication +
        0.15 * social +
        0.15 * reliability +
        0.10 * interests +
        0.10 * values
    )

    flags = detect_friction(profile_a, profile_b)
    penalty = friction_penalty(flags)
    confidence = confidence_score(profile_a, profile_b)

    # Slight confidence adjustment: weak data should not rank too high
    final = clamp(compatibility - (0.45 * penalty) + (0.08 * confidence))

    reasons, explanation_text = explain(sub_scores, flags)

    return MatchResult(
        final_score=round(final * 100, 1),
        compatibility_score=round(compatibility * 100, 1),
        friction_score=round(penalty * 100, 1),
        confidence_score=round(confidence * 100, 1),
        sub_scores={k: round(v * 100, 1) for k, v in sub_scores.items()},
        friction_flags=flags,
        reason_codes=reasons,
        explanation=explanation_text,
    )


if __name__ == "__main__":
    user_a = {
        "relationship_intention": "long_term",
        "relationship_structure": "monogamous",
        "conflict_style": "collaborative",
        "directness": 0.90,
        "literalness": 0.78,
        "reply_speed_preference": 0.80,
        "reply_consistency_importance": 0.88,
        "planned_vs_spontaneous": 0.85,
        "small_talk_tolerance": 0.22,
        "deep_topic_preference": 0.92,
        "clarity_need": 0.94,
        "ambiguity_tolerance": 0.18,
        "social_battery": 0.35,
        "interaction_frequency_preference": 0.62,
        "one_to_one_preference": 0.90,
        "alone_time_need": 0.72,
        "sensory_sensitivity": 0.74,
        "routine_need": 0.82,
        "last_minute_change_tolerance": 0.20,
        "punctuality_importance": 0.90,
        "reminder_friendliness": 0.85,
        "dependability_preference": 0.88,
        "rescheduling_tolerance": 0.35,
        "repair_speed_after_miscommunication": 0.58,
        "honesty_directness_importance": 0.94,
        "independence_vs_closeness": 0.55,
        "reassurance_need": 0.62,
        "novelty_preference": 0.36,
        "affection_expression": 0.45,
        "profile_completeness": 0.95,
        "behavioral_depth": 0.88,
        "observed_signal_strength": 0.20,
        "interests": [
            {"category": "music", "name": "deep house", "intensity": 0.92, "wants_shared": True},
            {"category": "nature", "name": "forest walks", "intensity": 0.80, "wants_shared": True},
            {"category": "books", "name": "psychology", "intensity": 0.68, "wants_shared": False},
        ],
    }

    user_b = {
        "relationship_intention": "long_term",
        "relationship_structure": "monogamous",
        "conflict_style": "reflective",
        "directness": 0.82,
        "literalness": 0.73,
        "reply_speed_preference": 0.42,
        "reply_consistency_importance": 0.72,
        "planned_vs_spontaneous": 0.74,
        "small_talk_tolerance": 0.28,
        "deep_topic_preference": 0.88,
        "clarity_need": 0.86,
        "ambiguity_tolerance": 0.30,
        "social_battery": 0.42,
        "interaction_frequency_preference": 0.55,
        "one_to_one_preference": 0.83,
        "alone_time_need": 0.66,
        "sensory_sensitivity": 0.61,
        "routine_need": 0.65,
        "last_minute_change_tolerance": 0.34,
        "punctuality_importance": 0.82,
        "reminder_friendliness": 0.70,
        "dependability_preference": 0.79,
        "rescheduling_tolerance": 0.48,
        "repair_speed_after_miscommunication": 0.49,
        "honesty_directness_importance": 0.88,
        "independence_vs_closeness": 0.58,
        "reassurance_need": 0.40,
        "novelty_preference": 0.48,
        "affection_expression": 0.54,
        "profile_completeness": 0.91,
        "behavioral_depth": 0.82,
        "observed_signal_strength": 0.10,
        "interests": [
            {"category": "music", "name": "deep house", "intensity": 0.86, "wants_shared": True},
            {"category": "nature", "name": "forest walks", "intensity": 0.72, "wants_shared": True},
            {"category": "food", "name": "coffee", "intensity": 0.66, "wants_shared": True},
        ],
    }

    result = compute_match(user_a, user_b)
    print(json.dumps(result.__dict__, indent=2))
