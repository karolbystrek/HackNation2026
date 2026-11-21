SHELL := /bin/bash
.DEFAULT_GOAL := help

.PHONY: help setup supabase dev up restart down clean logs status test lint build check

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*## "} /^[a-z]+:.*## / {printf "  make %-12s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Install the pinned Supabase CLI
	npm ci

supabase:
	npx --no-install supabase start
	@umask 077; set -o pipefail; npx --no-install supabase status -o env | \
		awk '/^(API_URL|PUBLISHABLE_KEY)=/ { \
			sub(/^API_URL=/, "NEXT_PUBLIC_SUPABASE_URL="); \
			sub(/^PUBLISHABLE_KEY=/, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="); \
			print; count++ \
		} END { exit count != 2 }' > .env.supabase.local

dev: supabase ## Start with hot reload
	docker compose up --build --watch

up: supabase ## Start in the background
	docker compose up --build -d --wait

restart: ## Restart services, preserving database data
	$(MAKE) down
	$(MAKE) up

down: ## Stop services, preserving database data
	docker compose down
	npx --no-install supabase stop

clean: ## Stop services and remove local dependencies and caches; keep database data
	$(MAKE) down
	rm -rf node_modules app/node_modules app/.next
	rm -f app/tsconfig.tsbuildinfo .env.supabase.local

logs: ## Follow app logs
	docker compose logs -f app

status: ## Show service status and local Supabase keys
	docker compose ps
	npx --no-install supabase status

test: ## Run the connection test (requires make up)
	docker compose exec -T app npm run test:connection

lint: ## Run ESLint
	docker compose exec -T app npm run lint

build: ## Verify the production build
	docker compose run --rm --no-deps app npm run build

check: ## Run type checks, lint and the connection test
	docker compose exec -T app npm run check
	$(MAKE) test
