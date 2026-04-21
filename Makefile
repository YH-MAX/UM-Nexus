COMPOSE_FILE=infra/docker/docker-compose.yml
ENV_FILE=.env

.PHONY: up down logs api-dev web-dev api-migrate api-seed-trade api-seed-benchmarks api-worker

up:
	docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) up --build

down:
	docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) down

logs:
	docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) logs -f

api-dev:
	cd apps/api && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

web-dev:
	cd apps/web && npm run dev

api-migrate:
	cd apps/api && alembic upgrade head

api-seed-trade:
	cd apps/api && python scripts/seed_trade_demo.py

api-seed-benchmarks:
	cd apps/api && python scripts/seed_trade_benchmarks.py

api-worker:
	cd apps/api && celery -A app.tasks.celery_app.celery_app worker --loglevel=info -P solo
