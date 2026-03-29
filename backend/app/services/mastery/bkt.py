"""Bayesian Knowledge Tracing (BKT) implementation.

Updates mastery probability P(M) for each user-concept pair after every answer.
Enriched with response time and confidence modifiers.
"""

from dataclasses import dataclass

# BKT parameters by question type
BKT_DEFAULTS: dict[str, dict[str, float]] = {
    "scenario": {"p_guess": 0.05, "p_slip": 0.08, "p_transit": 0.15},
    "comparison": {"p_guess": 0.10, "p_slip": 0.10, "p_transit": 0.12},
    "factual": {"p_guess": 0.20, "p_slip": 0.15, "p_transit": 0.10},
    "troubleshooting": {"p_guess": 0.08, "p_slip": 0.12, "p_transit": 0.13},
}

MASTERY_THRESHOLDS = [
    (0.0, 0.0, "not_started"),
    (0.01, 0.39, "weak"),
    (0.40, 0.69, "familiar"),
    (0.70, 0.89, "proficient"),
    (0.90, 1.0, "mastered"),
]


@dataclass
class BKTResult:
    mastery_before: float
    mastery_after: float
    level_before: str
    level_after: str
    quality_score: int
    was_misconception: bool


def get_mastery_level(p_mastery: float) -> str:
    if p_mastery <= 0.0:
        return "not_started"
    for low, high, label in MASTERY_THRESHOLDS:
        if low <= p_mastery <= high:
            return label
    return "mastered"


def time_modifier(response_time_seconds: float, expected_time_seconds: float) -> float:
    ratio = response_time_seconds / max(expected_time_seconds, 1)
    if ratio < 0.5:
        return 1.3
    elif ratio < 1.0:
        return 1.0
    elif ratio < 2.0:
        return 0.7
    else:
        return 0.5


def confidence_modifier(is_correct: bool, confidence: int) -> float:
    if is_correct:
        return 1.2 if confidence == 3 else (0.8 if confidence == 1 else 1.0)
    else:
        return 1.0  # Misconception handled separately


def compute_quality(correct: bool, time_ratio: float, confidence: int) -> int:
    """Map answer outcome to SM-2 quality score 0-5."""
    if not correct:
        if confidence == 3 and time_ratio < 0.6:
            return 0  # Misconception
        elif time_ratio < 0.8:
            return 2  # Guess
        else:
            return 1  # Knowledge gap
    else:
        if confidence == 1 and time_ratio > 1.5:
            return 3  # Shaky
        elif time_ratio <= 1.0:
            return 5  # Solid
        else:
            return 4  # Good


def detect_misconception(
    is_correct: bool, confidence: int, time_ratio: float
) -> bool:
    return not is_correct and confidence == 3 and time_ratio < 0.6


def update_mastery(
    current_mastery: float,
    is_correct: bool,
    question_type: str,
    response_time_seconds: float,
    expected_time_seconds: float,
    confidence: int,
    p_guess: float | None = None,
    p_slip: float | None = None,
    p_transit: float | None = None,
) -> BKTResult:
    """Run BKT update and return new mastery state."""
    defaults = BKT_DEFAULTS.get(question_type, BKT_DEFAULTS["factual"])
    p_g = p_guess if p_guess is not None else defaults["p_guess"]
    p_s = p_slip if p_slip is not None else defaults["p_slip"]
    p_t = p_transit if p_transit is not None else defaults["p_transit"]

    p_m = current_mastery
    level_before = get_mastery_level(p_m)
    time_ratio = response_time_seconds / max(expected_time_seconds, 1)

    if is_correct:
        p_correct_given_m = 1 - p_s
        p_correct_given_not_m = p_g
        p_correct = p_correct_given_m * p_m + p_correct_given_not_m * (1 - p_m)
        p_m_posterior = (p_correct_given_m * p_m) / max(p_correct, 1e-10)

        # Learning transition (only on correct)
        t_mod = time_modifier(response_time_seconds, expected_time_seconds)
        c_mod = confidence_modifier(True, confidence)
        effective_transit = p_t * t_mod * c_mod
        p_m_new = p_m_posterior + (1 - p_m_posterior) * effective_transit
    else:
        p_wrong_given_m = p_s
        p_wrong_given_not_m = 1 - p_g
        p_wrong = p_wrong_given_m * p_m + p_wrong_given_not_m * (1 - p_m)
        p_m_new = (p_wrong_given_m * p_m) / max(p_wrong, 1e-10)

    # Clamp
    p_m_new = max(0.0, min(0.99, p_m_new))

    quality = compute_quality(is_correct, time_ratio, confidence)
    was_misconception = detect_misconception(is_correct, confidence, time_ratio)
    level_after = get_mastery_level(p_m_new)

    return BKTResult(
        mastery_before=current_mastery,
        mastery_after=p_m_new,
        level_before=level_before,
        level_after=level_after,
        quality_score=quality,
        was_misconception=was_misconception,
    )
