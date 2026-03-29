"""Time decay for mastery — knowledge fades without review."""

import math

# Decay rate by review history
DECAY_RATES = {
    1: 0.08,  # First correct review — half-life ~8.7 days
    2: 0.05,  # 2 correct reviews — half-life ~13.9 days
    3: 0.03,  # 3+ correct reviews — half-life ~23.1 days
}
HIGH_MASTERY_DECAY = 0.02  # P(M) > 0.85 — half-life ~34.7 days


def get_decay_rate(repetition_count: int, mastery: float) -> float:
    if mastery > 0.85:
        return HIGH_MASTERY_DECAY
    if repetition_count >= 3:
        return DECAY_RATES[3]
    return DECAY_RATES.get(repetition_count, DECAY_RATES[1])


def decayed_mastery(
    last_mastery: float, days_since_review: float, decay_rate: float
) -> float:
    if days_since_review <= 0:
        return last_mastery
    return last_mastery * math.exp(-decay_rate * days_since_review)
