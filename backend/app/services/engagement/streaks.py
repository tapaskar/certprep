"""Streak management — tracking daily study consistency."""

from dataclasses import dataclass
from datetime import date

STREAK_MIN_QUESTIONS = 3
STREAK_MIN_REVIEW_CARDS = 5
STREAK_MIN_STUDY_MINUTES = 5
GRACE_PERIOD_HOURS = 36


@dataclass
class StreakStatus:
    current_days: int
    is_active_today: bool
    at_risk: bool
    freeze_available: bool


def qualifies_for_streak(
    questions_answered: int = 0,
    review_cards_completed: int = 0,
    study_minutes: int = 0,
) -> bool:
    """Check if today's activity qualifies for maintaining the streak."""
    return (
        questions_answered >= STREAK_MIN_QUESTIONS
        or review_cards_completed >= STREAK_MIN_REVIEW_CARDS
        or study_minutes >= STREAK_MIN_STUDY_MINUTES
    )


def calculate_streak(
    last_active_date: date | None,
    current_streak: int,
    today: date | None = None,
) -> tuple[int, bool]:
    """Return (new_streak_count, streak_broken).

    Grace period: if last active yesterday or today, streak is alive.
    """
    today = today or date.today()
    if last_active_date is None:
        return (0, False)

    days_gap = (today - last_active_date).days

    if days_gap == 0:
        return (current_streak, False)
    elif days_gap == 1:
        return (current_streak, False)  # Still alive, increment on activity
    else:
        return (0, True)  # Streak broken
