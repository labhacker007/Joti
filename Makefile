# Joti Platform - Makefile
# Usage: make help

.DEFAULT_GOAL := help
COMPOSE := docker compose
COMPOSE_DEV := docker compose -f docker-compose.yml -f docker-compose.dev.yml

# ── Setup ────────────────────────────────────────────────────────────────────

.PHONY: setup
setup: .env ## First-time setup: copy .env, build images, start everything
	$(COMPOSE) up -d --build
	@echo ""
	@echo "Joti is starting up..."
	@echo "  Frontend : http://localhost:$${FRONTEND_PORT:-3000}"
	@echo "  Backend  : http://localhost:$${BACKEND_PORT:-8000}"
	@echo "  API Docs : http://localhost:$${BACKEND_PORT:-8000}/docs"
	@echo ""
	@echo "Run 'make logs' to follow startup progress."

.env:
	@cp .env.example .env
	@echo "Created .env from .env.example — edit it with your passwords before running 'make setup' again."
	@echo "Required: POSTGRES_PASSWORD, SECRET_KEY, ADMIN_PASSWORD"
	@exit 1

# ── Development (hot reload) ─────────────────────────────────────────────────

.PHONY: dev
dev: .env ## Start with hot reload (code changes apply instantly)
	$(COMPOSE_DEV) up -d --build
	@echo ""
	@echo "Dev mode (hot reload) is starting..."
	@echo "  Frontend : http://localhost:$${FRONTEND_PORT:-3000}"
	@echo "  Backend  : http://localhost:$${BACKEND_PORT:-8000}"
	@echo ""

.PHONY: dev-down
dev-down: ## Stop dev services
	$(COMPOSE_DEV) down

.PHONY: dev-logs
dev-logs: ## Follow dev service logs
	$(COMPOSE_DEV) logs -f

# ── Day-to-day ───────────────────────────────────────────────────────────────

.PHONY: up
up: ## Start all services
	$(COMPOSE) up -d

.PHONY: down
down: ## Stop all services
	$(COMPOSE) down

.PHONY: restart
restart: ## Restart all services
	$(COMPOSE) restart

.PHONY: build
build: ## Rebuild images without cache
	$(COMPOSE) build --no-cache

.PHONY: logs
logs: ## Follow all service logs
	$(COMPOSE) logs -f

.PHONY: logs-backend
logs-backend: ## Follow backend logs
	$(COMPOSE) logs -f backend

.PHONY: logs-frontend
logs-frontend: ## Follow frontend logs
	$(COMPOSE) logs -f frontend

.PHONY: status
status: ## Show service status
	$(COMPOSE) ps

# ── Database ─────────────────────────────────────────────────────────────────

.PHONY: migrate
migrate: ## Run database migrations
	$(COMPOSE) exec backend alembic upgrade head

.PHONY: seed
seed: ## Seed the database with default data
	$(COMPOSE) exec backend python -c "from app.seeds import seed_database; seed_database()"

# ── Testing ──────────────────────────────────────────────────────────────────

.PHONY: test
test: ## Run backend tests
	$(COMPOSE) exec backend pytest -q

.PHONY: test-verbose
test-verbose: ## Run backend tests with verbose output
	$(COMPOSE) exec backend pytest -v --tb=short

# ── Maintenance ──────────────────────────────────────────────────────────────

.PHONY: clean
clean: ## Stop services and remove volumes (WARNING: deletes database data)
	$(COMPOSE) down -v

.PHONY: reset
reset: clean build up migrate ## Full reset: wipe data, rebuild, restart, migrate

.PHONY: shell-backend
shell-backend: ## Open a shell in the backend container
	$(COMPOSE) exec backend bash

.PHONY: shell-db
shell-db: ## Open a psql session
	$(COMPOSE) exec postgres psql -U $${POSTGRES_USER:-joti} -d $${POSTGRES_DB:-joti}

# ── Help ─────────────────────────────────────────────────────────────────────

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
