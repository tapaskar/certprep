"""Tests for Bayesian Knowledge Tracing."""

from app.services.mastery.bkt import (
    compute_quality,
    detect_misconception,
    get_mastery_level,
    time_modifier,
    update_mastery,
)


def test_get_mastery_level():
    assert get_mastery_level(0.0) == "not_started"
    assert get_mastery_level(0.2) == "weak"
    assert get_mastery_level(0.5) == "familiar"
    assert get_mastery_level(0.75) == "proficient"
    assert get_mastery_level(0.95) == "mastered"


def test_time_modifier():
    assert time_modifier(20, 60) == 1.3   # Very fast
    assert time_modifier(50, 60) == 1.0   # Normal
    assert time_modifier(90, 60) == 0.7   # Slow
    assert time_modifier(150, 60) == 0.5  # Very slow


def test_compute_quality():
    # Misconception: wrong + high confidence + fast
    assert compute_quality(False, 0.4, 3) == 0
    # Wrong + slow
    assert compute_quality(False, 1.2, 1) == 1
    # Wrong + fast = guess
    assert compute_quality(False, 0.5, 1) == 2
    # Correct + slow + low confidence
    assert compute_quality(True, 2.0, 1) == 3
    # Correct + normal
    assert compute_quality(True, 1.2, 2) == 4
    # Correct + fast + high confidence
    assert compute_quality(True, 0.8, 3) == 5


def test_detect_misconception():
    assert detect_misconception(False, 3, 0.4) is True
    assert detect_misconception(False, 1, 0.4) is False
    assert detect_misconception(True, 3, 0.4) is False
    assert detect_misconception(False, 3, 0.8) is False


def test_update_mastery_correct():
    result = update_mastery(
        current_mastery=0.3,
        is_correct=True,
        question_type="scenario",
        response_time_seconds=60,
        expected_time_seconds=120,
        confidence=2,
    )
    assert result.mastery_after > result.mastery_before
    assert result.quality_score >= 4
    assert result.was_misconception is False


def test_update_mastery_wrong():
    result = update_mastery(
        current_mastery=0.6,
        is_correct=False,
        question_type="factual",
        response_time_seconds=90,
        expected_time_seconds=60,
        confidence=1,
    )
    assert result.mastery_after < result.mastery_before
    assert result.quality_score <= 2


def test_update_mastery_misconception():
    result = update_mastery(
        current_mastery=0.5,
        is_correct=False,
        question_type="scenario",
        response_time_seconds=30,
        expected_time_seconds=120,
        confidence=3,
    )
    assert result.was_misconception is True
    assert result.quality_score == 0
