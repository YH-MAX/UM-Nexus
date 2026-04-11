COMPOSE_FILE=infra/docker/docker-compose.yml
ENV_FILE=.env

.PHONY: up down logs api-dev web-dev

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
