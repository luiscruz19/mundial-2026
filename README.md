# Simulador y Seguimiento del Mundial 2026

App mobile para hinchas + backend con ingeniería de datos, motor de predicción y notificaciones push. Enfocado **únicamente en el Mundial 2026**.

La pieza distintiva no es el calendario de resultados (que también está), sino el **motor de simulación** (probabilidad de cada marcador, victoria/empate/derrota, proyección del torneo) y el **enriquecimiento de datos bajo demanda** que lo alimenta.

## Arquitectura

```
mundial/
├── api/         Backend monolito (Node + Express + Sequelize/MySQL, ESM)
│                API REST · ingeniería de datos (ETL) · motor de simulación ·
│                jobs/cron · notificaciones push · capa en vivo
├── mobile/      App Expo (React Native + TypeScript, expo-router)
├── infra/mysql-init/   01-databases.sql (crea la base MUNDIAL en el mysql_db compartido)
└── docker-compose.yml  Solo el API, colgado de la infra core compartida
```

**Infra core compartida (`/opt/shared`, red `net-shared`).** Este proyecto NO levanta
MySQL ni Redis propios: consume el **MySQL `mysql_db`** (base `MUNDIAL`, en MAYÚSCULAS)
y el **Redis `redis`** del core, y se publica por **Traefik** en `http://mundial.localhost`
(sin exponer puertos sueltos), igual que novitas/ordana.

- **Base de datos = fuente de verdad.** Todo dato externo se guarda; las pantallas y simulaciones leen de la base, no de la API en vivo. Las llamadas a las fuentes usan reintentos con espera progresiva (backoff).
- **Cache/TTL en Redis** para los *snapshots* de datos por selección (degrada con elegancia si Redis no está).
- **Identidad de dispositivo anónima** (sin cuentas ni login): el MVP se opera con el `device_uuid` + token de push + preferencias.

### Backend `api/`

| Carpeta | Qué hace |
|---|---|
| `models/` | Selección, Jugador, Sede, Partido, Histórico, Posiciones, Simulación, Snapshot, Dispositivo, Notificación programada |
| `services/providers/` | **Capa de abstracción** de fuentes: API-Football + football-data.org (con *fallback*), CSV histórico, ranking FIFA. El resto del sistema nunca habla con un proveedor concreto |
| `services/etl/` | **Ingeniería de datos** (un solo módulo reutilizable): forma con decaimiento, head-to-head, snapshot/TTL, enriquecimiento del cruce, carga inicial, cierre de partido, posiciones, llave |
| `services/simulation/` | **Motor**: Poisson + corrección Dixon-Coles + Monte Carlo + calibración (Brier/log-loss) |
| `services/notification/` | Envío push (Expo), planificador, avisos por evento |
| `services/live/` | Capa en vivo (sondeo acotado; interface lista para feed pago) |
| `jobs/` | Cron: ranking FIFA, sondeo de fixture + cierre, push programadas, sondeo en vivo, reprogramación |
| `controllers/`, `routes/` | API REST (patrón `routes/[entidad]/index.js`) |

## Cómo correr

### Backend (Docker)

**Requisito:** la infra core debe estar arriba (una sola vez para todos los proyectos):
```bash
cd /opt/shared && docker compose up -d     # traefik + mysql_db + redis (+ minio)
```

Luego, en `mundial/`:
```bash
make up          # crea api/.env, asegura la base MUNDIAL en mysql_db y levanta el API en net-shared
make seed        # carga inicial del torneo (equipos, fixture, sedes, histórico, ranking + ETL)
make db          # (idempotente) crea la base MUNDIAL en el mysql_db compartido
make logs        # ver logs
make simulate-test   # smoke test del motor (sin base)
```

La API se publica por **Traefik** en `http://mundial.localhost` (no expone puertos sueltos).
La base `MUNDIAL` y el cache Redis viven en el **core compartido** (`/opt/shared`). Sin claves
de proveedor, la carga inicial usa un **dataset estático de respaldo** (48 selecciones en 12 grupos,
72 partidos de grupo + fase final, 16 sedes, histórico sintético) para que todo sea demostrable de
punta a punta. Configurá las claves en `api/.env` para datos reales.

### App mobile (Expo)

```bash
cd mobile
npm install
npx expo start --web   # web en http://localhost:8081 (apunta a http://mundial.localhost)
# o:  npx expo start    y escaneá el QR con Expo Go
```

`extra.apiUrl` (en `mobile/app.json`) apunta a `http://mundial.localhost` (Traefik del core).
En el navegador resuelve solo; para un teléfono con Expo Go, cambialo a `http://<IP-de-tu-PC>`
y agregá una regla de Host por esa IP en las labels de Traefik del `docker-compose.yml`.

## Configuración (`api/.env`)

| Variable | Para qué |
|---|---|
| `DATA_PROVIDER` | `api-football` o `football-data` (principal; el otro queda de respaldo) |
| `APIFOOTBALL_KEY` / `FOOTBALLDATA_KEY` | Claves de las fuentes de fútbol |
| `HISTORY_CSV_URL` | CSV de resultados internacionales para sembrar la forma |
| `FIFA_RANKING_URL` | Fuente de los puntos del ranking FIFA |
| `TEAM_SNAPSHOT_TTL_SECONDS` | TTL del cache de datos por selección (default 6h) |
| `SIM_*` | Parámetros calibrables del modelo (k, peso ranking/forma, goles totales, ρ Dixon-Coles, vida media, ventaja anfitrión, corridas Monte Carlo) |
| `LIVE_*` | Capa en vivo (habilitar, frecuencia de sondeo, ventana) |
| `CRON_SECRET` | Secreto para los endpoints admin (`x-cron-secret`) |

## API (resumen)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/teams` · `/teams/:id` | Selecciones; detalle con partidos + simulaciones + posición |
| GET | `/matches?day=&group=&team=&stage=` · `/matches/:id` | Calendario/resultados; detalle (sede, formaciones, oficial + simulado, live) |
| GET | `/standings` | Tablas de los 12 grupos |
| GET | `/bracket` | Llave de la fase final |
| POST | `/simulations` `{ match_id }` | Simular A vs B (enriquecimiento bajo demanda + motor); guarda y devuelve |
| GET | `/simulations/:matchId` | Simulación guardada |
| GET | `/tournament/projection` | Monte Carlo: quién llega más lejos, prob. de campeón |
| POST | `/devices/register` · PATCH `/devices/push-token` · GET `/devices/me` · PUT `/devices/preferences` | Dispositivo anónimo + preferencias (selecciones de interés, avisos, zona horaria, tema) |
| POST | `/admin/seed` · `/admin/jobs/:name/trigger` | Operación (requiere `x-cron-secret`) |

Formato de respuesta: `{ status: 1, ... }` éxito · `{ status: 0, message }` error; los datos van en `data`.

## El modelo de predicción

Modelo de goles tipo **Poisson anclado en el ranking FIFA**, combinado con:

- **Forma reciente** (últimos ~12 partidos con decaimiento temporal: los recientes pesan más; los amistosos, menos).
- **Head-to-head** ponderado por su confiabilidad (más reciente y numeroso pesa más).
- **Ventaja de anfitrión** (EE.UU., Canadá, México juegan de local).
- **Corrección Dixon-Coles** para los marcadores bajos (arregla un sesgo conocido del Poisson puro en empates y pocos goles).

Cada cálculo por partido es cerrado → instantáneo; el **Monte Carlo** del torneo corre en milisegundos. La **calibración** (minimizando Brier/log-loss contra resultados históricos) es lo que cierra la precisión: que cuando el modelo dice 60%, ocurra cerca del 60% de las veces.

> El fútbol es de alta varianza: ningún modelo adivina el marcador exacto. Lo que entrega este método es una **probabilidad bien calibrada** (el favorito y los porcentajes correctos).

## Las dos corridas de la ingeniería de datos

El **mismo módulo** corre en dos momentos (mismo código, distinto alcance):

1. **Carga inicial** (`make seed`): procesa **todas** las selecciones una vez y siembra la base.
2. **Enriquecimiento al simular**: refresca **solo las dos** selecciones del cruce, y solo si su snapshot venció (TTL). Así la simulación es rápida y está basada en datos al día.

## Dos capas de actualización

- **En vivo** (capa provisoria): durante el partido, sondeo acotado actualiza el marcador y dispara el aviso de **gol**.
- **Cierre** (consolidación): al finalizar se guarda el **resultado oficial**, se actualizan posiciones e historial, se resuelve la llave y se arma la comparación **oficial vs simulado**. **Solo lo consolidado al final alimenta el modelo.**
