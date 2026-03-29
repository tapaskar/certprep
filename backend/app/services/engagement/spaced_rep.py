"""Modified SM-2 spaced repetition scheduler.

Each user-concept pair maintains a review schedule with easiness factor,
interval, and repetition count. Compressed as exam date approaches.
"""

from dataclasses import dataclass
from datetime import date, timedelta


@dataclass
class ReviewState:
    easiness_factor: float = 2.5
    interval_days: float = 1.0
    repetition_count: int = 0
    next_review_date: date | None = None
    last_review_date: date | None = None


def get_time_pressure_multiplier(days_to_exam: int) -> float:
    if days_to_exam > 60:
        return 1.0
    elif days_to_exam > 30:
        return 0.7
    elif days_to_exam > 14:
        return 0.5
    elif days_to_exam > 7:
        return 0.35
    else:
        return 0.25  # Cram mode


def update_review(
    easiness_factor: float,
    interval_days: float,
    repetition_count: int,
    quality: int,
    days_to_exam: int | None = None,
) -> ReviewState:
    """Update SM-2 review schedule after an answer.

    quality: 0-5 composite score
        0 = misconception (wrong + confident + fast)
        1 = wrong + slow
        2 = wrong + fast + low confidence (guess)
        3 = correct + slow + low confidence (shaky)
        4 = correct + normal speed
        5 = correct + fast + high confidence (solid)
    """
    # Update easiness factor
    ef = max(
        1.3,
        easiness_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
    )

    if quality < 3:
        # Reset on failure
        rep_count = 0
        interval = 1.0
    else:
        if repetition_count == 0:
            interval = 1.0
        elif repetition_count == 1:
            interval = 3.0
        else:
            interval = interval_days * ef
        rep_count = repetition_count + 1

    # Exam proximity compression
    if days_to_exam is not None and days_to_exam > 0:
        time_pressure = get_time_pressure_multiplier(days_to_exam)
        interval *= time_pressure

    # Cap intervals
    interval = min(interval, 45.0)
    interval = max(interval, 0.5)

    today = date.today()
    return ReviewState(
        easiness_factor=round(ef, 2),
        interval_days=round(interval, 2),
        repetition_count=rep_count,
        next_review_date=today + timedelta(days=int(interval)),
        last_review_date=today,
    )
