# Layer 3 — Engagement + Accountability

The engagement layer turns a study tool into a study habit. Most exam prep tools are "use once and abandon." The goal here is sustained daily engagement from signup until exam day, resulting in materially higher preparation quality.

---

## 3.1 Spaced repetition — modified SM-2

### Core algorithm

Each user-concept pair maintains a review schedule:

```python
@dataclass
class ReviewState:
    concept_id: str
    easiness_factor: float = 2.5     # EF: 1.3 (hard) to 3.0 (easy)
    interval_days: float = 1.0        # Current review interval
    repetition_count: int = 0         # Consecutive correct reviews
    next_review_date: date = None
    last_review_date: date = None

def update_review(state: ReviewState, quality: int, days_to_exam: int) -> ReviewState:
    """
    quality: 0-5 composite score from correctness, speed, confidence
      0 = wrong + fast + high confidence (misconception)
      1 = wrong + slow
      2 = wrong + fast + low confidence (guess)
      3 = correct + slow + low confidence (shaky)
      4 = correct + normal speed
      5 = correct + fast + high confidence (solid)
    """
    
    # Update easiness factor
    state.easiness_factor = max(1.3, 
        state.easiness_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    )
    
    if quality < 3:
        # Reset on failure
        state.repetition_count = 0
        state.interval_days = 1.0
    else:
        if state.repetition_count == 0:
            state.interval_days = 1.0
        elif state.repetition_count == 1:
            state.interval_days = 3.0
        else:
            state.interval_days = state.interval_days * state.easiness_factor
        state.repetition_count += 1
    
    # Exam proximity compression
    time_pressure = get_time_pressure_multiplier(days_to_exam)
    state.interval_days = state.interval_days * time_pressure
    
    # Cap intervals
    state.interval_days = min(state.interval_days, 45.0)  # Never more than 45 days
    state.interval_days = max(state.interval_days, 0.5)    # Never less than 12 hours
    
    state.last_review_date = date.today()
    state.next_review_date = date.today() + timedelta(days=state.interval_days)
    
    return state

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
```

### Quality score mapping

```python
def compute_quality(correct: bool, time_ratio: float, confidence: int) -> int:
    """
    time_ratio = actual_time / expected_time
    confidence = 1 (low), 2 (medium), 3 (high)
    Returns quality 0-5 for SM-2
    """
    if not correct:
        if confidence == 3 and time_ratio < 0.6:
            return 0  # Misconception: wrong + confident + fast
        elif time_ratio < 0.8:
            return 2  # Wrong + fast = guess
        else:
            return 1  # Wrong + slow = knowledge gap
    else:
        if confidence == 1 and time_ratio > 1.5:
            return 3  # Correct but shaky
        elif time_ratio <= 1.0:
            return 5  # Correct + fast = solid
        else:
            return 4  # Correct + normal = good
```

---

## 3.2 Daily engagement loop

### Session types

**Morning briefing (5 min target)**
```json
{
  "type": "daily_briefing",
  "composition": {
    "spaced_repetition_cards": 3,
    "new_concept_preview": 1,
    "readiness_delta_display": true
  },
  "trigger": "daily_notification_at_preferred_time",
  "target_duration_minutes": 5,
  "completion_reward": "streak_increment"
}
```

**Focused study session (15/30/60 min)**
```json
{
  "type": "focused_session",
  "15_min": {
    "review_cards": 8,
    "new_questions": 2,
    "ai_explanations": false,
    "use_case": "commute, quick break"
  },
  "30_min": {
    "review_cards": 5,
    "mind_map_exploration": 1,
    "mixed_questions": 8,
    "ai_explanations": true,
    "use_case": "default daily session"
  },
  "60_min": {
    "domain_deep_dive": true,
    "mind_map_full": 1,
    "concept_reading": true,
    "questions": 15,
    "weak_area_drill": true,
    "timed_mini_exam": {"questions": 5, "time_limit_minutes": 10},
    "use_case": "weekend deep study"
  }
}
```

**Smart review (10 min)**
```json
{
  "type": "smart_review",
  "composition": "spaced_repetition_queue_only",
  "question_count": "dynamic_based_on_overdue_count",
  "max_questions": 15,
  "trigger": "evening_if_briefing_completed_but_no_focused_session"
}
```

### Session composition engine

```python
def compose_session(user_id, duration_minutes, exam_id):
    # Get current state
    overdue_reviews = get_overdue_reviews(user_id, exam_id)
    weak_concepts = get_concepts_by_mastery_range(user_id, exam_id, 0.3, 0.6)
    unexplored = get_unexplored_ready_concepts(user_id, exam_id)
    days_to_exam = get_days_until_exam(user_id, exam_id)
    
    session = Session()
    
    # Priority 1: Overdue spaced repetition (always included)
    overdue_budget = min(len(overdue_reviews), int(duration_minutes * 0.3))
    session.add_review_cards(overdue_reviews[:overdue_budget])
    
    remaining_minutes = duration_minutes - (overdue_budget * 1.5)  # ~1.5 min per review
    
    # Priority 2: Remediation questions (weak concepts)
    if remaining_minutes > 5 and weak_concepts:
        remediation_count = min(len(weak_concepts), int(remaining_minutes * 0.4 / 2))
        questions = select_questions(user_id, weak_concepts[:remediation_count], arm="remediate")
        session.add_questions(questions)
        remaining_minutes -= remediation_count * 2
    
    # Priority 3: Exploration (new concepts, if time allows and not cramming)
    if remaining_minutes > 5 and unexplored and days_to_exam > 14:
        explore_count = min(2, len(unexplored))
        session.add_concept_previews(unexplored[:explore_count])
        questions = select_questions(user_id, unexplored[:explore_count], arm="explore")
        session.add_questions(questions)
        remaining_minutes -= explore_count * 3
    
    # Priority 4: Fill remaining time with mixed reinforcement
    if remaining_minutes > 3:
        filler_count = int(remaining_minutes / 2)
        reinforcement = select_questions(user_id, weak_concepts + get_proficient_concepts(user_id, exam_id), arm="reinforce")
        session.add_questions(reinforcement[:filler_count])
    
    return session
```

---

## 3.3 Weekly engagement loop

### Monday — week plan

```python
def generate_week_plan(user_id, exam_id):
    readiness = calculate_readiness(user_id, exam_id)
    days_to_exam = get_days_until_exam(user_id, exam_id)
    weekly_study_capacity = get_avg_weekly_minutes(user_id) or 150  # Default 150 min/week
    
    # Identify top 3 focus areas
    domain_gaps = sorted(
        readiness["domain_readiness"].items(), 
        key=lambda x: x[1]
    )[:3]
    
    # Set 3 achievable goals
    goals = []
    for domain_id, score in domain_gaps:
        target_gain = min(5, (100 - score) * 0.1)  # 5% max improvement target per week
        concepts_to_cover = get_weakest_concepts(user_id, domain_id, limit=3)
        goals.append({
            "domain": domain_id,
            "current_score": score,
            "target_score": score + target_gain,
            "focus_concepts": concepts_to_cover,
            "estimated_minutes": target_gain * 6  # ~6 min per 1% improvement
        })
    
    return WeekPlan(
        goals=goals,
        suggested_daily_minutes=weekly_study_capacity / 5,
        mock_exam_day="wednesday",
        review_day="sunday"
    )
```

### Wednesday — mid-week challenge

```json
{
  "type": "mid_week_challenge",
  "questions": 10,
  "time_limit_minutes": 15,
  "domain_distribution": "proportional_to_exam_weights",
  "difficulty": "mixed_with_bias_toward_weak_areas",
  "scoring": {
    "show_timer": true,
    "show_score_after": true,
    "compare_to_last_week": true,
    "compare_to_cohort_percentile": true
  },
  "trigger": "wednesday_evening_notification"
}
```

### Sunday — weekly report

```python
def generate_weekly_report(user_id, exam_id):
    week_data = get_week_activity(user_id, exam_id)
    prev_week = get_week_activity(user_id, exam_id, weeks_ago=1)
    
    return WeeklyReport(
        study_minutes=week_data.total_minutes,
        study_minutes_delta=week_data.total_minutes - prev_week.total_minutes,
        questions_answered=week_data.questions_answered,
        accuracy_pct=week_data.accuracy,
        accuracy_delta=week_data.accuracy - prev_week.accuracy,
        readiness_score=calculate_readiness(user_id, exam_id)["overall_readiness_pct"],
        readiness_delta=week_data.readiness_change,
        streak_days=get_current_streak(user_id),
        concepts_mastered_this_week=week_data.newly_mastered_concepts,
        goals_completed=week_data.goals_met,
        goals_total=3,
        weakest_domain=get_weakest_domain(user_id, exam_id),
        next_week_focus=generate_next_week_focus(user_id, exam_id),
        cohort_percentile=get_cohort_percentile(user_id, exam_id),
        pass_probability=predict_pass_probability(user_id, exam_id)
    )
```

---

## 3.4 Streaks and momentum

### Streak system

```python
STREAK_CONFIG = {
    "minimum_activity_for_streak": {
        "questions_answered": 3,       # OR
        "review_cards_completed": 5,   # OR
        "study_minutes": 5             # Any one of these counts
    },
    "grace_period_hours": 36,          # Allows missing late-night + catching up next morning
    "freeze_tokens": {
        "free_tier": 1,                # 1 freeze per month
        "pro_tier": 3                  # 3 freezes per month
    }
}
```

### Milestone rewards

| Milestone | Reward | Purpose |
|-----------|--------|---------|
| 3-day streak | "Getting started" badge | Early engagement hook |
| 7-day streak | Unlock detailed analytics | Value demonstration for free users |
| 14-day streak | "Committed learner" badge + share card | Social proof / referral trigger |
| 30-day streak | "Dedicated" badge + 1 free streak freeze | Retention reward |
| 50-day streak | "Unstoppable" badge + profile flair | Status |
| First mock exam passed | "Exam ready" badge | Confidence boost |
| All domains > 70% | "Well-rounded" badge | Balanced preparation signal |
| Pass the real exam | "Certified" badge + share card | Social proof + referral moment |

### Momentum score (internal, not shown to user)

```python
def calculate_momentum(user_id):
    """Internal metric to calibrate nudge frequency and intensity"""
    recent_7_days = get_activity_last_n_days(user_id, 7)
    recent_14_days = get_activity_last_n_days(user_id, 14)
    
    consistency = recent_7_days.active_days / 7  # 0-1
    trend = recent_7_days.avg_daily_minutes / max(recent_14_days.avg_daily_minutes, 1)  # >1 = improving
    engagement_depth = recent_7_days.avg_session_length / 20  # Normalized to 20 min target
    
    momentum = (consistency * 0.5 + min(trend, 1.5) / 1.5 * 0.3 + min(engagement_depth, 1.0) * 0.2)
    
    return {
        "score": round(momentum, 2),  # 0-1
        "classification": (
            "high" if momentum > 0.7 else
            "medium" if momentum > 0.4 else
            "low" if momentum > 0.1 else
            "dormant"
        )
    }
```

---

## 3.5 Nudge intelligence

### Nudge timing — learn from user behavior

```python
def determine_nudge_time(user_id):
    """Analyze last 14 days of study sessions to find optimal nudge time"""
    sessions = get_sessions_last_n_days(user_id, 14)
    
    if len(sessions) < 3:
        return DEFAULT_NUDGE_TIME  # 8:00 AM local
    
    # Find peak study hour
    hour_counts = Counter(s.started_at.hour for s in sessions)
    peak_hour = hour_counts.most_common(1)[0][0]
    
    # Nudge 30 minutes before typical study time
    nudge_hour = (peak_hour - 1) % 24 if peak_hour > 0 else 8
    nudge_minute = 30
    
    return time(nudge_hour, nudge_minute)
```

### Nudge frequency by momentum

| Momentum | Nudge frequency | Tone |
|----------|----------------|------|
| High (>0.7) | 1x/week max (encouragement only) | "Great week! Here's your progress" |
| Medium (0.4–0.7) | 3x/week | "Quick 5-min review to keep your streak" |
| Low (0.1–0.4) | Daily | "You're falling behind on {weakest_domain}. 2 minutes?" |
| Dormant (<0.1) | Recovery sequence (see below) | Escalating re-engagement |

### Nudge content templates

**Daily reminder (medium momentum):**
```
Your {concept_name} mastery is fading — a 5-min review will lock it in.
[Start quick review →]
```

**Streak at risk:**
```
You're on a {streak_count}-day streak! Answer 3 questions to keep it alive.
[Save my streak →]
```

**Readiness milestone approaching:**
```
You're at {readiness}% readiness — just {gap}% away from {next_milestone}!
[Study now →]
```

**Social proof:**
```
Users who study 5+ days/week pass at {pass_rate}%. You studied {days} days this week.
[Keep going →]
```

### Re-engagement flows (dormant users)

```python
REENGAGEMENT_SEQUENCE = [
    {
        "day": 1,  # 1 day after last activity
        "channel": "push",
        "message": "Quick check-in: ready for a 2-minute review?",
        "cta": "2-minute review"
    },
    {
        "day": 3,
        "channel": "email",
        "message": "Your {weakest_concept} mastery dropped from {old}% to {new}%. Here's a quick refresher.",
        "cta": "Refresh now",
        "include_readiness_chart": True
    },
    {
        "day": 7,
        "channel": "email",
        "message": "Your exam is in {days} days. Here's an updated study plan that accounts for your break.",
        "cta": "See my updated plan",
        "include_revised_plan": True
    },
    {
        "day": 14,
        "channel": "email",
        "message": "We've kept your progress safe. When you're ready, we'll pick up right where you left off.",
        "cta": "Resume studying",
        "tone": "no_pressure"
    },
    {
        "day": 30,
        "channel": "email",
        "message": "Still planning to take {exam_name}? Your readiness: {readiness}%. We can rebuild your plan.",
        "cta": "Rebuild my plan",
        "include_unsubscribe_prominent": True
    }
]
```

### Notification channels and limits

| Channel | Max per day | Max per week | Use case |
|---------|------------|-------------|----------|
| Push notification | 2 | 7 | Streak reminders, session starts |
| In-app | Unlimited | Unlimited | Session composition, explanations |
| Email | 0 | 3 | Weekly report, re-engagement, milestones |
| SMS (opt-in only) | 1 | 3 | Exam countdown (last 7 days only) |

---

## 3.6 Exam countdown features

### Countdown dashboard widgets

```python
COUNTDOWN_FEATURES = {
    "60_days_out": {
        "show_countdown_timer": True,
        "show_daily_target": True,
        "show_coverage_map": True,  # Visual map of concepts: green/amber/red
    },
    "30_days_out": {
        "enable_mock_exams": True,   # Full-length timed practice exams
        "show_pass_probability": True,
        "compress_review_intervals": True,
    },
    "14_days_out": {
        "enable_cram_mode": True,    # Focus only on weak + high-weight concepts
        "daily_mock_sections": True,  # 15-question timed sections daily
        "show_peer_comparison": True,
    },
    "7_days_out": {
        "exam_day_checklist": True,
        "final_review_mode": True,   # Only overdue reviews + misconceptions
        "confidence_building": True,  # Show progress journey, strengths
    },
    "1_day_out": {
        "no_new_content": True,       # Only light review of mastered concepts
        "exam_logistics_reminder": True,
        "encouragement_message": True,
    }
}
```

### Mock exam generation

```python
def generate_mock_exam(user_id, exam_id):
    exam = get_exam(exam_id)
    
    questions = []
    for domain in exam.domains:
        # Select questions proportional to exam weight
        domain_count = round(exam.total_questions * domain.weight)
        
        # Difficulty distribution mimics real exam
        easy = select_questions_by_difficulty(domain, level=1, count=int(domain_count * 0.2))
        medium = select_questions_by_difficulty(domain, level=3, count=int(domain_count * 0.5))
        hard = select_questions_by_difficulty(domain, level=5, count=int(domain_count * 0.3))
        
        # Exclude questions seen in last 7 days
        domain_questions = filter_recently_seen(easy + medium + hard, user_id, days=7)
        questions.extend(domain_questions[:domain_count])
    
    random.shuffle(questions)
    
    return MockExam(
        questions=questions[:exam.total_questions],  # 75 for AWS SA Pro
        time_limit_minutes=exam.time_limit_minutes,   # 180 for AWS SA Pro
        passing_score=exam.passing_score_pct,          # 75% for AWS SA Pro
    )
```
