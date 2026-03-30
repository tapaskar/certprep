# Layer 7 — API Specification

Base URL: `https://api.sparkupcloud.com/v1`
Auth: Bearer token (Clerk JWT) in Authorization header
Content-Type: application/json

---

## 7.1 Authentication

### POST /auth/webhook (Clerk webhook)
Handles user lifecycle events from Clerk.

```json
// Clerk sends:
{ "type": "user.created", "data": { "id": "clerk_xxx", "email": "user@example.com" } }

// Internal action: Create user record, assign referral code, initialize preferences
```

---

## 7.2 Onboarding

### POST /onboarding/start
Initialize new user's exam selection and preferences.

```json
// Request
{
  "exam_id": "aws-sap-c02",
  "exam_date": "2026-06-15",
  "experience_level": "intermediate",  // beginner, intermediate, advanced
  "daily_study_minutes": 30,
  "preferred_session_time": "08:00"
}

// Response
{
  "enrollment_id": "uuid",
  "exam": { "id": "aws-sap-c02", "name": "AWS SA Professional", "domains": [...] },
  "diagnostic_required": true,
  "estimated_study_weeks": 8,
  "next_step": "diagnostic"
}
```

### POST /onboarding/diagnostic/start
Begin the 15-question diagnostic assessment.

```json
// Response
{
  "diagnostic_id": "uuid",
  "questions": [
    {
      "id": "q-diag-001",
      "stem": "...",
      "options": [{"id": "A", "text": "..."}, ...],
      "domain": "Design for organizational complexity",
      "difficulty": 1,
      "time_limit_seconds": 90
    }
    // ... 14 more questions
  ],
  "total_time_limit_minutes": 25
}
```

### POST /onboarding/diagnostic/submit
Submit diagnostic results and initialize mastery map.

```json
// Request
{
  "diagnostic_id": "uuid",
  "answers": [
    { "question_id": "q-diag-001", "selected_option": "B", "time_seconds": 42 },
    // ... 14 more
  ]
}

// Response
{
  "score_pct": 47,
  "domain_scores": {
    "design-org-complexity": 60,
    "design-new-solutions": 40,
    "migration-planning": 33,
    "cost-control": 50,
    "continuous-improvement": 43
  },
  "initial_readiness_pct": 38,
  "recommended_study_plan": {
    "focus_domains": ["design-new-solutions", "migration-planning"],
    "weekly_target_minutes": 150,
    "estimated_weeks_to_ready": 10
  },
  "concepts_initialized": 190
}
```

---

## 7.3 Study sessions

### POST /study/session
Create a new study session with AI-composed plan.

```json
// Request
{
  "exam_id": "aws-sap-c02",
  "duration_minutes": 30,
  "session_type": "focused"   // "daily_briefing" | "focused" | "smart_review"
}

// Response
{
  "session_id": "uuid",
  "plan": {
    "review_cards": [
      {
        "concept_id": "aws-sap-vpc-peering",
        "concept_name": "VPC Peering",
        "mastery_pct": 52,
        "review_type": "overdue",
        "question": { "id": "q-sap-net-012", "stem": "...", "options": [...] }
      }
    ],
    "questions": [
      {
        "question_id": "q-sap-net-042",
        "selection_reason": "remediate",    // "remediate" | "reinforce" | "explore"
        "primary_concept": "aws-sap-transit-gateway",
        "stem": "...",
        "options": [...]
      }
    ],
    "estimated_duration_minutes": 28
  }
}
```

### POST /study/session/{session_id}/answer
Submit an answer and get real-time mastery update.

```json
// Request
{
  "question_id": "q-sap-net-042",
  "selected_option": "B",
  "time_seconds": 45,
  "confidence": 2           // 1=low, 2=medium, 3=high
}

// Response
{
  "correct": true,
  "correct_option": "B",
  "mastery_update": {
    "concept_id": "aws-sap-transit-gateway",
    "concept_name": "Transit Gateway",
    "mastery_before": 0.42,
    "mastery_after": 0.58,
    "level_before": "familiar",
    "level_after": "familiar",
    "quality_score": 4
  },
  "propagation_updates": [
    { "concept_id": "aws-sap-vpc-peering", "mastery_delta": 0.03, "reason": "lateral_transfer" }
  ],
  "next_review_date": "2026-04-01",
  "explanation_available": true,
  "misconception_detected": false
}
```

### GET /study/question/{question_id}/explanation
Get AI-generated or cached explanation.

```json
// Query params: ?user_context=true (include personalized context)

// Response
{
  "explanation": {
    "text": "You might have been thinking about PrivateLink as a connectivity solution, but PrivateLink is designed for service-level access — exposing a specific service endpoint to another VPC. For full VPC-to-VPC connectivity across multiple regions, Transit Gateway with inter-region peering is the right choice because it provides hub-and-spoke routing with native encryption support.",
    "source": "ai_generated",    // "cached" | "ai_generated"
    "related_concepts": [
      { "id": "aws-sap-privatelink", "name": "PrivateLink", "mastery_pct": 35 },
      { "id": "aws-sap-tgw-peering", "name": "TGW Inter-region Peering", "mastery_pct": 20 }
    ]
  }
}
```

### POST /study/session/{session_id}/end
End session and get summary.

```json
// Response
{
  "summary": {
    "questions_answered": 12,
    "questions_correct": 8,
    "accuracy_pct": 67,
    "duration_minutes": 26,
    "review_cards_completed": 5,
    "readiness_before": 42,
    "readiness_after": 44,
    "readiness_delta": 2,
    "streak_days": 14,
    "streak_status": "maintained",
    "concepts_improved": [
      { "name": "Transit Gateway", "delta": "+16%" },
      { "name": "VPC Peering", "delta": "+8%" }
    ],
    "concepts_declined": [
      { "name": "S3 Lifecycle", "delta": "-3%", "reason": "wrong_answer" }
    ],
    "misconceptions_detected": 0,
    "achievements_unlocked": []
  }
}
```

---

## 7.4 Progress and readiness

### GET /progress/{exam_id}
Get full readiness dashboard data.

```json
// Response
{
  "readiness": {
    "overall_pct": 44,
    "pass_probability_pct": 35,
    "days_until_exam": 78,
    "concepts_mastered": 28,
    "concepts_total": 190,
    "domain_readiness": {
      "design-org-complexity": { "score": 52, "trend": "up", "delta_7d": 4 },
      "design-new-solutions": { "score": 38, "trend": "up", "delta_7d": 6 },
      "migration-planning": { "score": 30, "trend": "flat", "delta_7d": 0 },
      "cost-control": { "score": 55, "trend": "up", "delta_7d": 3 },
      "continuous-improvement": { "score": 41, "trend": "down", "delta_7d": -2 }
    }
  },
  "streak": {
    "current_days": 14,
    "longest_days": 14,
    "freezes_remaining": 2,
    "today_completed": true
  },
  "study_stats": {
    "total_study_minutes": 840,
    "total_questions_answered": 312,
    "overall_accuracy_pct": 64,
    "this_week_minutes": 145,
    "avg_session_minutes": 24
  },
  "upcoming_reviews": {
    "overdue": 8,
    "due_today": 12,
    "due_this_week": 34
  },
  "weakest_concepts": [
    { "id": "aws-sap-migration-hub", "name": "Migration Hub", "mastery_pct": 12, "exam_weight": 0.06 },
    { "id": "aws-sap-dms", "name": "Database Migration Service", "mastery_pct": 18, "exam_weight": 0.05 }
  ]
}
```

### GET /progress/{exam_id}/history
Get readiness over time for charts.

```json
// Query params: ?period=30d | 90d | all

// Response
{
  "data_points": [
    { "date": "2026-03-01", "readiness_pct": 12, "study_minutes": 30, "accuracy_pct": 45 },
    { "date": "2026-03-02", "readiness_pct": 14, "study_minutes": 25, "accuracy_pct": 50 },
    // ...
  ]
}
```

---

## 7.5 Content browsing

### GET /content/{exam_id}/mind-map/{mind_map_id}
Get mind map data for React Flow rendering.

### GET /content/{exam_id}/decision-tree/{tree_id}
Get decision tree data for interactive rendering.

### GET /content/{exam_id}/concept/{concept_id}
Get full concept detail page data.

```json
// Response
{
  "concept": {
    "id": "aws-sap-vpc-peering",
    "name": "VPC Peering",
    "domain": "Design for organizational complexity",
    "description": "...",
    "key_facts": ["...", "..."],
    "common_misconceptions": ["...", "..."],
    "aws_services": ["VPC", "Route Tables"]
  },
  "user_mastery": {
    "mastery_pct": 58,
    "level": "familiar",
    "total_attempts": 12,
    "accuracy_pct": 67,
    "next_review": "2026-04-01",
    "misconception_count": 1
  },
  "related_concepts": [
    { "id": "aws-sap-transit-gateway", "name": "Transit Gateway", "relation": "lateral", "mastery_pct": 42 },
    { "id": "aws-sap-vpc-fundamentals", "name": "VPC Fundamentals", "relation": "prerequisite", "mastery_pct": 78 }
  ],
  "decision_tree": { "id": "dt-networking-connectivity", "title": "Choosing a VPC connectivity method" },
  "question_count": 8
}
```

---

## 7.6 Mock exams

### POST /mock-exam/generate
Generate a full-length mock exam.

```json
// Request
{ "exam_id": "aws-sap-c02" }

// Response
{
  "mock_exam_id": "uuid",
  "questions": [...],   // 75 questions
  "time_limit_minutes": 180,
  "passing_score_pct": 75
}
```

### POST /mock-exam/{mock_exam_id}/submit
Submit completed mock exam.

```json
// Response
{
  "score_pct": 72,
  "passed": false,
  "passing_score_pct": 75,
  "domain_scores": {...},
  "time_used_minutes": 162,
  "comparison": {
    "your_percentile": 45,
    "avg_score_pct": 68,
    "pass_rate_pct": 42
  },
  "review_recommended": [
    { "question_id": "...", "concept": "...", "your_answer": "A", "correct": "C" }
  ]
}
```

---

## 7.7 Notifications and settings

### PUT /settings/notifications
Update notification preferences.

### PUT /settings/exam-date
Update planned exam date (triggers study plan recalculation).

### PUT /settings/study-preferences
Update daily target, session length, nudge time.

---

## 7.8 WebSocket — real-time study session

### Connection
```
wss://api.sparkupcloud.com/v1/ws/study/{session_id}?token={jwt}
```

### Message types (server → client)

```json
// Next question
{ "type": "next_question", "data": { "question": {...}, "position": 3, "total": 12 } }

// Mastery update (after answer processed)
{ "type": "mastery_update", "data": { "concept": "...", "before": 0.42, "after": 0.58 } }

// Session progress
{ "type": "progress", "data": { "completed": 3, "total": 12, "accuracy": 67 } }

// Achievement unlocked
{ "type": "achievement", "data": { "badge": "first_mock_pass", "title": "Exam Ready!" } }

// Session complete
{ "type": "session_complete", "data": { "summary": {...} } }
```

### Message types (client → server)

```json
// Submit answer
{ "type": "submit_answer", "data": { "question_id": "...", "option": "B", "time_seconds": 45, "confidence": 2 } }

// Request explanation
{ "type": "request_explanation", "data": { "question_id": "..." } }

// Pause session
{ "type": "pause" }

// Resume session
{ "type": "resume" }
```

---

## 7.9 Admin API (internal)

### Content management

```
POST   /admin/questions                    # Create question
PUT    /admin/questions/{id}               # Update question
DELETE /admin/questions/{id}               # Retire question (soft delete)
POST   /admin/questions/bulk-import        # Import from JSON
GET    /admin/questions/review-queue       # Questions pending review

POST   /admin/concepts                     # Create concept
PUT    /admin/concepts/{id}                # Update concept
POST   /admin/concepts/bulk-import         # Import knowledge graph

POST   /admin/decision-trees              # Create decision tree
PUT    /admin/decision-trees/{id}         # Update decision tree

POST   /admin/mind-maps                   # Create mind map
PUT    /admin/mind-maps/{id}              # Update mind map
```

### Analytics

```
GET    /admin/analytics/overview           # DAU, MAU, conversion, churn
GET    /admin/analytics/content            # Question accuracy rates, IRT params
GET    /admin/analytics/engagement          # Session lengths, completion rates
GET    /admin/analytics/cohort             # Cohort retention curves
GET    /admin/analytics/revenue            # MRR, ARPU, LTV
```

### IRT calibration

```
POST   /admin/irt/calibrate               # Trigger IRT parameter recalibration
GET    /admin/irt/status                   # Current calibration status
GET    /admin/irt/flagged-questions        # Questions with poor discrimination
```

---

## 7.10 Rate limits

| Endpoint group | Free tier | Pro tier | Team tier |
|---------------|-----------|---------|-----------|
| Study session answers | 10/day | Unlimited | Unlimited |
| AI explanations | 3/day | 20/hour | 30/hour |
| Mock exam generation | 0/week | 3/day | 5/day |
| Content browsing | 50/hour | 200/hour | 500/hour |
| Admin API | N/A | N/A | 100/hour |

Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## 7.11 Error format

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You've reached your daily question limit. Upgrade to Pro for unlimited access.",
    "details": {
      "limit": 10,
      "reset_at": "2026-03-29T00:00:00Z"
    },
    "upgrade_cta": true        // Frontend shows upgrade prompt
  }
}
```

Standard HTTP status codes: 200, 201, 400, 401, 403, 404, 429, 500.
