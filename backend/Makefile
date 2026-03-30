PYTHON := .venv/bin/python
PIP    := .venv/bin/pip
UVICORN := .venv/bin/uvicorn
PYTEST := .venv/bin/pytest
RUFF   := .venv/bin/ruff

.DEFAULT_GOAL := help

# ── Setup ─────────────────────────────────────────────────────────────────────

.PHONY: install
install: ## Install all dependencies into .venv
	python3.12 -m venv .venv
	$(PIP) install --upgrade pip
	$(PIP) install -e ".[dev]"

.PHONY: check-venv
check-venv:
	@test -f $(PYTHON) || (echo "\n❌  No .venv found. Run: make install\n" && exit 1)

# ── Database ──────────────────────────────────────────────────────────────────

.PHONY: db-create
db-create: ## Create the certprep Postgres user + database (run once)
	psql postgres -c "CREATE USER certprep WITH PASSWORD 'certprep';" 2>/dev/null || true
	psql postgres -c "CREATE DATABASE certprep OWNER certprep;" 2>/dev/null || true
	psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE certprep TO certprep;" 2>/dev/null || true
	@echo "✅ Database ready"

.PHONY: db-tables
db-tables: check-venv ## Create all SQLAlchemy tables
	$(PYTHON) -m app.cli create-tables

.PHONY: db-drop
db-drop: check-venv ## Drop all tables (DESTRUCTIVE)
	$(PYTHON) -m app.cli drop-tables

.PHONY: db-seed
db-seed: check-venv ## Seed AWS SA Pro exam content
	$(PYTHON) -m app.cli seed --exam aws-sap-c02 --data-dir data/seed/aws-sap

.PHONY: db-reset
db-reset: db-drop db-tables db-seed ## Drop + recreate + reseed (DESTRUCTIVE)

.PHONY: setup
setup: install db-create db-tables db-seed ## Full first-time setup
	@echo "\n✅  Setup complete. Run: make dev\n"

# ── Development ───────────────────────────────────────────────────────────────

.PHONY: dev
dev: check-venv ## Start API server with hot reload
	$(UVICORN) app.main:app --reload --port 8000

.PHONY: dev-verbose
dev-verbose: check-venv ## Start API server with SQL echo
	DATABASE_ECHO=true $(UVICORN) app.main:app --reload --port 8000

# ── Testing & Quality ─────────────────────────────────────────────────────────

.PHONY: test
test: check-venv ## Run all tests
	$(PYTEST) tests/ -v

.PHONY: test-fast
test-fast: check-venv ## Run tests (quiet)
	$(PYTEST) tests/ -q

.PHONY: lint
lint: check-venv ## Run ruff linter
	$(RUFF) check app/ tests/

.PHONY: lint-fix
lint-fix: check-venv ## Run ruff and auto-fix
	$(RUFF) check app/ tests/ --fix

.PHONY: check
check: lint test-fast ## Lint + tests (CI gate)

# ── Help ──────────────────────────────────────────────────────────────────────

.PHONY: help
help:
	@echo ""
	@echo "SparkUpCloud Backend"
	@echo "────────────────────────────────────"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""
