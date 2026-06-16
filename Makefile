.PHONY: env core up down logs ps restart build db seed simulate-test

# Crea el .env a partir del .env.example si todavía no existe.
env:
	@for d in api; do \
	  if [ ! -f $$d/.env ]; then cp $$d/.env.example $$d/.env && echo "creado $$d/.env"; fi; \
	done

# Verifica que la infra core (net-shared + mysql_db + redis) esté arriba (/opt/shared).
core:
	@docker network inspect net-shared >/dev/null 2>&1 || { echo "✗ Falta la red net-shared. Levantá la infra core: (cd /opt/shared && docker compose up -d)"; exit 1; }
	@docker ps --format '{{.Names}}' | grep -qx mysql_db || { echo "✗ mysql_db (core) no está corriendo. (cd /opt/shared && docker compose up -d)"; exit 1; }
	@docker ps --format '{{.Names}}' | grep -qx redis || echo "⚠ redis (core) no está corriendo; el cache quedará deshabilitado."
	@echo "✓ infra core OK (net-shared, mysql_db, redis)"

# Crea la base MUNDIAL en el mysql_db COMPARTIDO (idempotente).
db: core
	@docker exec -i mysql_db sh -lc 'mysql -uroot -p"$$MYSQL_ROOT_PASSWORD"' < infra/mysql-init/01-databases.sql && echo "✓ base MUNDIAL asegurada en mysql_db"

# Levanta el API colgado de net-shared (consume mysql_db + redis del core).
up: env core db
	docker compose up -d --build

down:
	docker compose down

# Carga inicial del torneo (equipos, fixture, sedes, histórico, ranking + ETL).
seed:
	docker compose exec mundial_api node db/seed.js

logs:
	docker compose logs -f

ps:
	docker compose ps

restart:
	docker compose restart

build:
	docker compose build

# Smoke test del motor de simulación (no requiere la base).
simulate-test:
	docker compose exec mundial_api node services/simulation/smoke-test.js
