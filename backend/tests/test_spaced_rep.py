"""Tests for SM-2 spaced repetition scheduler."""

from app.services.engagement.spaced_rep import update_review


def test_first_correct_answer():
    state = update_review(
        easiness_factor=2.5,
        interval_days=1.0,
        repetition_count=0,
        quality=4,
    )
    assert state.repetition_count == 1
    assert state.interval_days == 1.0
    assert state.easiness_factor >= 2.3


def test_second_correct_answer():
    state = update_review(
        easiness_factor=2.5,
        interval_days=1.0,
        repetition_count=1,
        quality=4,
    )
    assert state.repetition_count == 2
    assert state.interval_days == 3.0


def test_wrong_answer_resets():
    state = update_review(
        easiness_factor=2.5,
        interval_days=10.0,
        repetition_count=5,
        quality=1,
    )
    assert state.repetition_count == 0
    assert state.interval_days == 1.0


def test_exam_pressure_compresses_intervals():
    # Without pressure
    normal = update_review(
        easiness_factor=2.5,
        interval_days=6.0,
        repetition_count=3,
        quality=5,
    )
    # With exam in 10 days
    pressed = update_review(
        easiness_factor=2.5,
        interval_days=6.0,
        repetition_count=3,
        quality=5,
        days_to_exam=10,
    )
    assert pressed.interval_days < normal.interval_days


def test_interval_caps():
    state = update_review(
        easiness_factor=3.0,
        interval_days=40.0,
        repetition_count=10,
        quality=5,
    )
    assert state.interval_days <= 45.0

    state2 = update_review(
        easiness_factor=1.3,
        interval_days=0.1,
        repetition_count=0,
        quality=2,
        days_to_exam=3,
    )
    assert state2.interval_days >= 0.5
