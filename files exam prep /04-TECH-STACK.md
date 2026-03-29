# Layer 4 — Technical Architecture

---

## 4.1 System architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CDN (CloudFront)                      │
│   Static assets, cached API responses, mind map JSON         │
└──────────────┬──────────────────────────────┬────────────────┘
               │                              │
┌──────────────▼──────────┐    ┌──────────────▼────────────────┐
│   Next.js Frontend       │    │   PWA / React Native Mobile   │
│   (Vercel or ECS)        │    │   (Push notifications)        │
└──────────────┬──────────┘    └──────────────┬────────────────┘
               │                              │
               └──────────┬───────────────────┘
                          │ HTTPS / WSS
               ┌──────────▼──────────┐
               │   API Gateway        │
               │   (rate limiting,    │
               │    auth validation)  │
               └──────────┬──────────┘
                          │
               ┌──────────▼──────────┐
               │   FastAPI Backend    │
               │   (ECS Fargate)      │
               ├──────────────────────┤
               │ Services:            │
               │  • Study engine      │
               │  • Question selector │
               │  • Mastery tracker   │
               │  • Session composer  │
               │  • Notification svc  │
               │  • Analytics svc     │
               └───┬────┬────┬───────┘
                   │    │    │
          ┌────────┘    │    └────────┐
          ▼             ▼             ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │PostgreSQL│  │  Redis    │  │ Claude   │
    │ (RDS)    │  │(ElastiC.)│  │  API     │
    │          │  │          │  │(Anthropic)│
    │ Users    │  │ Sessions │  │          │
    │ Progress │  │ Cache    │  │ Explain  │
    │ Content  │  │ Queues   │  │ Generate │
    │ Analytics│  │ Rate lim │  │ Adapt    │
    └──────────┘  └──────────┘  └──────────┘
```

---

## 4.2 Frontend

### Stack
| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Framework | Next.js 14 (App Router) | SSR for SEO on marketing pages, SPA for dashboard |
| UI library | Tailwind CSS + shadcn/ui | Rapid development, consistent design system |
| State management | Zustand | Lightweight, no boilerplate, good for study session state |
| Mind maps | React Flow | Battle-tested for node-graph UIs, supports zoom/pan/interactive |
| Decision trees | Custom React + D3 | Tree visualization with collapsible nodes |
| Charts | Recharts | Readiness radar, progress over time, domain comparison |
| Forms | React Hook Form + Zod | Validation for settings, onboarding, feedback |
| Real-time | Socket.io client | Live session state sync, streak updates |
| Mobile | PWA first, React Native later | Push notifications via service worker, offline review cards |

### Key pages

| Route | Purpose | Rendering |
|-------|---------|-----------|
| `/` | Marketing landing page | SSG |
| `/pricing` | Pricing comparison | SSG |
| `/blog/*` | SEO content (exam breakdowns) | SSG + ISR |
| `/dashboard` | Main study hub | CSR (authenticated) |
| `/study` | Active study session | CSR + WebSocket |
| `/study/review` | Spaced repetition queue | CSR |
| `/explore/{exam}` | Mind map explorer | CSR |
| `/explore/{exam}/tree/{id}` | Decision tree viewer | CSR |
| `/progress` | Readiness dashboard + analytics | CSR |
| `/mock-exam` | Full mock exam (timed) | CSR |
| `/settings` | Account, exam date, notifications | CSR |
| `/admin/content` | Content management (internal) | CSR |

### Study session UI flow

```
1. Session start
   → Show session plan (X review cards, Y questions, Z new concepts)
   → User can adjust duration preference
   
2. Question display
   → Question stem (full width, clear typography)
   → Options (radio buttons, keyboard shortcuts 1-4)
   → Timer (subtle, top-right, optional per settings)
   
3. After answering
   → Immediate correct/wrong feedback (green/red highlight)
   → Confidence self-report (3 buttons: Low / Medium / High)
   → "Show explanation" toggle (expands AI explanation)
   → Related concept links
   → "Next" button (or auto-advance after 3 seconds if correct)
   
4. Session end
   → Score summary (correct/total, accuracy %)
   → Mastery changes (concepts that moved up/down)
   → Readiness score delta
   → Streak status
   → "Continue studying" / "Done for today"
```

### Offline support (PWA)

```json
{
  "cache_strategy": {
    "mind_map_json": "cache-first",
    "question_batch": "stale-while-revalidate",
    "user_progress": "network-first",
    "static_assets": "cache-first"
  },
  "offline_capability": {
    "review_cards": "pre-cache next 20 due cards",
    "questions": "pre-cache 10 questions per weak domain",
    "sync_on_reconnect": "queue answers, sync when online"
  }
}
```

---

## 4.3 Backend

### Stack
| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Framework | FastAPI (Python 3.12) | Async, type-safe, fast, great for ML/data workloads |
| ORM | SQLAlchemy 2.0 + Alembic | Mature, async support, migration management |
| Task queue | Celery + Redis | Background jobs: notifications, analytics, report generation |
| WebSocket | FastAPI WebSocket | Real-time session state during study |
| API docs | Auto-generated OpenAPI | Comes free with FastAPI |
| Testing | pytest + httpx | Async test client for API tests |

### Service modules

```
app/
├── main.py                 # FastAPI app, middleware, lifespan
├── config.py               # Settings from environment
├── models/                 # SQLAlchemy models
│   ├── user.py
│   ├── exam.py
│   ├── concept.py
│   ├── question.py
│   ├── user_progress.py
│   ├── review_schedule.py
│   └── session.py
├── schemas/                # Pydantic request/response schemas
├── services/
│   ├── mastery/
│   │   ├── bkt.py          # Bayesian Knowledge Tracing
│   │   ├── decay.py        # Time decay calculations
│   │   └── propagation.py  # Concept graph propagation
│   ├── selection/
│   │   ├── bandit.py       # Multi-armed bandit question selection
│   │   ├── scoring.py      # Question scoring formula
│   │   └── diagnostic.py   # Cold-start diagnostic
│   ├── engagement/
│   │   ├── spaced_rep.py   # SM-2 scheduler
│   │   ├── session.py      # Session composer
│   │   ├── streaks.py      # Streak management
│   │   ├── nudges.py       # Nudge timing + content
│   │   └── reports.py      # Weekly report generation
│   ├── ai/
│   │   ├── explainer.py    # Claude API integration for explanations
│   │   ├── prompts.py      # Prompt templates
│   │   └── cache.py        # Explanation caching
│   ├── analytics/
│   │   ├── readiness.py    # Readiness score calculation
│   │   ├── pass_model.py   # Pass probability prediction
│   │   └── tracking.py     # Event tracking
│   └── content/
│       ├── graph.py        # Knowledge graph operations
│       ├── questions.py    # Question CRUD + IRT
│       └── import.py       # Bulk content import
├── api/
│   ├── auth.py             # Clerk webhook + JWT validation
│   ├── study.py            # Study session endpoints
│   ├── progress.py         # Progress + readiness endpoints
│   ├── content.py          # Content browsing endpoints
│   ├── admin.py            # Admin content management
│   └── webhooks.py         # Stripe + Clerk webhooks
├── tasks/                  # Celery background tasks
│   ├── notifications.py
│   ├── reports.py
│   ├── irt_calibration.py
│   └── decay_batch.py
└── middleware/
    ├── rate_limit.py
    ├── cors.py
    └── logging.py
```

### Key API patterns

**Study session lifecycle:**
```python
# 1. Start session
POST /api/study/session
Body: { "exam_id": "aws-sap-c02", "duration_minutes": 30 }
Response: { "session_id": "...", "plan": { "review_cards": [...], "questions": [...] } }

# 2. Submit answer (real-time via WebSocket or REST)
POST /api/study/session/{session_id}/answer
Body: { "question_id": "...", "selected_option": "B", "time_seconds": 45, "confidence": 2 }
Response: { 
  "correct": true, 
  "mastery_update": { "concept": "vpc-peering", "old": 0.42, "new": 0.58 },
  "next_question": { ... },
  "explanation_available": true
}

# 3. Get explanation
GET /api/study/question/{question_id}/explanation?user_context=true
Response: { "explanation": "...", "source": "cached" | "ai_generated" }

# 4. End session
POST /api/study/session/{session_id}/end
Response: { "summary": { "correct": 8, "total": 12, "readiness_delta": +2, "streak": 14 } }
```

---

## 4.4 Data layer

### PostgreSQL (RDS)
- Primary data store for all persistent data
- Instance: `db.r6g.large` (2 vCPU, 16 GB RAM) initially, scale to `xlarge` at ~2K users
- Multi-AZ for production
- Point-in-time recovery enabled
- JSONB columns for flexible content (question options, explanations, concept metadata)
- `pg_trgm` extension for full-text search on questions and concepts
- Partitioned tables for `user_answers` (by month) and `analytics_events` (by day)

### Redis (ElastiCache)
- Session state (active study sessions, current question pointer)
- Explanation cache (TTL 7 days for generic, 1 day for personalized)
- Rate limiting counters
- Celery task broker and result backend
- Leaderboard/streak caches
- Instance: `cache.r6g.large`, single-node initially

### Data retention policy

| Data type | Retention | Reason |
|-----------|-----------|--------|
| User progress (mastery, reviews) | Indefinite | Core product value |
| Individual answers | 12 months | IRT calibration, then aggregate |
| Session metadata | 6 months | Analytics |
| Analytics events | 3 months raw, aggregated indefinitely | Cost management |
| AI explanations (cached) | 30 days | Fresh content, cost management |
| Account data | Until deletion request | GDPR/privacy |

---

## 4.5 AI integration — Claude API

### Configuration

```python
AI_CONFIG = {
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 300,                # Short, focused explanations
    "temperature": 0.3,               # Low variance for factual accuracy
    "timeout_seconds": 10,
    "retry_attempts": 2,
    "fallback": "cached_generic_explanation",
    
    "rate_limits": {
        "per_user_per_hour": 20,       # Prevent abuse
        "per_user_per_day": 100,
    },
    
    "cost_tracking": {
        "log_every_call": True,
        "alert_threshold_daily_usd": 50,
        "budget_monthly_usd": 500,     # Initial budget
    }
}
```

### Usage patterns and estimated costs

| Use case | Calls/user/month | Avg tokens | Cost/call | Monthly cost (1K users) |
|----------|-----------------|------------|-----------|------------------------|
| Wrong answer explanation | 40 | 250 | $0.003 | $120 |
| Misconception re-teach | 5 | 400 | $0.005 | $25 |
| Follow-up questions | 10 | 200 | $0.002 | $20 |
| Weekly plan generation | 4 | 300 | $0.004 | $16 |
| **Total** | **59** | | | **~$181/month** |

### Caching strategy to reduce API costs

```python
EXPLANATION_CACHE_STRATEGY = {
    # Level 1: Question-level generic explanation (covers ~60% of requests)
    "generic": {
        "key": "explain:{question_id}:{wrong_option}",
        "ttl_days": 30,
        "generate_on": "question_creation",  # Pre-generate for all wrong options
    },
    
    # Level 2: Concept-level misconception explanation (covers ~25%)
    "misconception": {
        "key": "misconception:{concept_id}:{misconception_pattern}",
        "ttl_days": 14,
        "generate_on": "first_occurrence",
    },
    
    # Level 3: Personalized explanation (remaining ~15%)
    "personalized": {
        "key": "personal:{user_id}:{question_id}:{attempt}",
        "ttl_days": 1,  # Short TTL, user-specific
        "generate_on": "request",
    }
}
```

---

## 4.6 Infrastructure (AWS)

### Services

| Service | Purpose | Config |
|---------|---------|--------|
| ECS Fargate | Backend API containers | 2 tasks, 1 vCPU / 2 GB each |
| RDS PostgreSQL | Primary database | db.r6g.large, Multi-AZ |
| ElastiCache Redis | Cache + sessions | cache.r6g.large |
| CloudFront | CDN for frontend + API cache | Custom domain + SSL |
| S3 | Static assets, content JSON, backups | Standard + Intelligent-Tiering |
| SES | Transactional emails | Nudges, reports, re-engagement |
| SNS | Push notifications | Mobile + web push |
| CloudWatch | Monitoring + alerting | Custom dashboards |
| Secrets Manager | API keys, DB credentials | Rotation enabled |
| WAF | API protection | Rate limiting, bot protection |

### Estimated monthly infrastructure cost

| Service | Estimated cost |
|---------|---------------|
| ECS Fargate (2 tasks) | $70 |
| RDS PostgreSQL (r6g.large, Multi-AZ) | $350 |
| ElastiCache Redis | $130 |
| CloudFront | $20 |
| S3 | $5 |
| SES (50K emails/month) | $5 |
| Other (CloudWatch, Secrets, WAF) | $40 |
| Claude API | $180 |
| **Total** | **~$800/month** |

### CI/CD pipeline

```
GitHub → GitHub Actions → Build + Test → ECR → ECS Deploy

Pipeline stages:
1. Lint + type check (ruff, mypy)
2. Unit tests (pytest, 90%+ coverage target)
3. Integration tests (testcontainers for PostgreSQL + Redis)
4. Build Docker image → push to ECR
5. Deploy to staging (ECS, separate task definition)
6. Smoke tests against staging
7. Manual approval gate
8. Deploy to production (blue/green via ECS)
9. Post-deploy health check
```

---

## 4.7 Auth and payments

### Authentication — Clerk

```python
CLERK_CONFIG = {
    "provider": "clerk",
    "features": {
        "email_password": True,
        "google_oauth": True,
        "github_oauth": True,      # Developers prefer this
    },
    "session_management": "clerk_jwt",
    "webhook_events": [
        "user.created",            # Initialize user record + default preferences
        "user.deleted",            # GDPR: cascade delete all user data
        "session.created",         # Track login analytics
    ]
}
```

### Payments — Stripe

```python
STRIPE_CONFIG = {
    "products": {
        "pro_monthly": {
            "price_id": "price_xxx",
            "amount_usd": 29,
            "interval": "month",
            "features": ["unlimited_exams", "ai_engine", "spaced_rep", "reports"]
        },
        "pro_annual": {
            "price_id": "price_yyy",
            "amount_usd": 249,        # ~$20.75/month, 2 months free
            "interval": "year",
        },
        "team_monthly": {
            "price_id": "price_zzz",
            "amount_usd": 49,          # Per seat
            "interval": "month",
            "min_seats": 3,
        }
    },
    "trial": {
        "duration_days": 7,
        "requires_payment_method": False,  # Reduce friction
    },
    "webhook_events": [
        "checkout.session.completed",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "invoice.payment_failed",
    ]
}
```

---

## 4.8 Monitoring and observability

### Key metrics to track

| Category | Metric | Alert threshold |
|----------|--------|----------------|
| API | p95 latency | > 500ms |
| API | Error rate (5xx) | > 1% |
| API | Request rate | < 10 rpm (dead) or > 1000 rpm (attack) |
| DB | Connection pool utilization | > 80% |
| DB | Query p95 latency | > 200ms |
| Redis | Memory utilization | > 75% |
| Redis | Cache hit rate | < 70% |
| Claude API | Error rate | > 5% |
| Claude API | Daily spend | > $50 |
| Business | DAU | < previous_week * 0.8 (20% drop) |
| Business | Session completion rate | < 60% |
| Business | Question answer rate | > 100/user/day (abuse) |
