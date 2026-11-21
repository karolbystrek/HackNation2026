.DEFAULT_GOAL := help

.PHONY: help setup dev up restart down clean logs status test lint typecheck build check

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*## "} /^[a-z]+:.*## / {printf "  make %-12s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Install the pinned Supabase CLI (requires Node.js 24+ and Docker)
	npm ci

dev: ## Start local Supabase and Next.js with hot reload
	npm run dev

up: ## Start all local services in the background and wait for health checks
	npm run local:up

restart: ## Restart all local services, preserving database data
	$(MAKE) down
	$(MAKE) up

down: ## Stop and remove local containers, preserving database data
	npm run local:stop

clean: ## Stop services and remove local dependencies and caches; keep database data
	$(MAKE) down
	rm -rf node_modules app/node_modules app/.next
	rm -f app/tsconfig.tsbuildinfo .env.supabase.local

logs: ## Follow Next.js logs (Ctrl-C exits)
	docker compose logs -f app

status: ## Show Next.js and Supabase status (includes local API keys)
	docker compose ps
	npm run supabase:status

test: ## Run connection and real Auth/session integration tests (requires make up)
	npm run test:connection
	npm run test:auth

lint: ## Run ESLint in the running app container
	docker compose exec -T app npm run lint

typecheck: ## Generate Next.js types and check TypeScript in the running app
	docker compose exec -T app sh -c 'npx next typegen && npx tsc --noEmit'

build: ## Verify a production build in a disposable container
	docker compose run --rm --no-deps app npm run build

check: ## Run lint, type checks, integration tests and production build
	$(MAKE) lint
	$(MAKE) typecheck
	$(MAKE) test
	$(MAKE) build
