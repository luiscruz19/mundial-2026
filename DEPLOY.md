# Deploy — Mundial 2026

Dos partes independientes: el **backend** (imagen Docker en un server) y la **app** (APK/AAB que se compila y se distribuye).

---

## 1) Backend

### Idea
El servidor **no compila nada**: baja una **imagen ya construida** y la levanta. La infra pesada (Traefik, MySQL, Redis, MinIO) es **compartida** entre todos los proyectos.

```
PC / GitHub ──build──▶ imagen en GHCR ──pull──▶ Server /opt/test/mundial
                                                + infra core /opt/shared (red net-shared)
                                                Cloudflare → Traefik → https://mundial.sda.ovh
```

### Piezas
- **Infra core compartida** — `/opt/shared` en el server, red externa `net-shared`: Traefik (reverse proxy + TLS), `mysql_db`, `redis`, `minio`. Mundial los **consume** (no levanta DB/Redis propios). La base se llama **`MUNDIAL`** (mayúsculas) en el mysql compartido.
- **Imagen** — `ghcr.io/luiscruz19/mundial-api:TEST` (GitHub Container Registry), construida desde `api/Dockerfile.production`.
- **`docker-compose.prod.yml`** — define `mundial_api`: `build` + `image` (ghcr) + labels Traefik (`Host(mundial.sda.ovh)`) + `net-shared`. Sirve para build/push y como runtime en el server.
- **`deploy.sh`** — orquestador: login GHCR → `build` + `push` → copia el compose al server por SSH → `pull` + `up -d` (+ seed opcional). Config en `.env.deploy.test`.
- **`.env.deploy.test`** (no versionado) — destino del deploy: `DEPLOY_USER/SERVER/PORT/PATH/TAG/SSH_KEY`, `GITHUB_REGISTRY_USER`, `DEPLOY_RUN_SEED`. El PAT de GHCR sale del entorno (`GITHUB_REGISTRY_TOKEN`).
- **`.env` en el server** (`/opt/test/mundial/.env`, no versionado) — secretos de runtime: password de la DB compartida, `FOOTBALLDATA_KEY`, `CRON_SECRET`, parámetros del modelo, etc.
- **Datos** — el seed (`node db/seed.js`) trae el Mundial real de **football-data.org** (con `FOOTBALLDATA_KEY`); luego la **cron** del contenedor actualiza resultados sola.

### Ruteo
Cloudflare apunta el dominio al server; **Traefik** rutea por `Host: mundial.sda.ovh` al contenedor (puerto 80). API pública: **`https://mundial.sda.ovh`**.

### Redeploy (lo normal)
```bash
cd /opt/repository/mundial
./deploy.sh test          # build + push + pull/up en el server
# Re-seed (si hace falta): DEPLOY_RUN_SEED=true en .env.deploy.test
```

### Primera vez en un server nuevo
1. Infra core arriba: `cd /opt/shared && docker compose up -d` (red `net-shared`).
2. Crear la base: `docker exec mysql_db mysql -uroot -p... -e "CREATE DATABASE IF NOT EXISTS \`MUNDIAL\` ..."`.
3. Crear `/opt/test/mundial/.env` (desde `.env.production.example` + credenciales del core + token).
4. `./deploy.sh test` y luego seed una vez.

### CI (opcional)
`.github/workflows/build.yml` construiría y publicaría la imagen en cada push a `main`. **Hoy no corre** (la cuenta de GitHub no levanta hosted runners). Por eso el camino vigente es `deploy.sh` (build local + push). Si se habilitan los runners, `git push` alcanzaría para reconstruir.

### Stack local (desarrollo)
`docker-compose.yml` (raíz) levanta el `api/` localmente sobre `net-shared` (build local). Útil para desarrollo, no es el server.

---

## 2) App (Expo / EAS)

### Idea
La app **no se deploya a un server**: se **compila un APK/AAB** y se **distribuye** (link/QR o stores). El backend al que pega lo decide una **variable por perfil**.

```
Código (Expo) ──eas build──▶ APK/AAB (nube EAS) ──link/QR──▶ instalar en el celular
                                     └ EXPO_PUBLIC_API_URL = https://mundial.sda.ovh
```

### Cómo elige el backend
`eas.json` setea `env` por perfil:
- **`preview-test`** → `EXPO_PUBLIC_API_URL=https://mundial.sda.ovh` → APK contra el server (anda en cualquier red). Para demos.
- **`preview-local`** → `http://10.0.2.2:4000` (emulador) o IP LAN → backend local.
- **`production`** → AAB para Play Store.

El código lee `process.env.EXPO_PUBLIC_API_URL` con **precedencia** sobre `extra.apiUrl` de `app.json`.

### Compilar / distribuir
```bash
cd mobile
npx eas-cli build -p android --profile preview-test   # APK en la nube → link/QR
# Play Store: --profile production (AAB) + npx eas-cli submit
# Probar al instante sin instalar: npx expo start  (Expo Go / web)
```
- Compila en la **nube de EAS** (no tu PC); el **keystore** lo maneja EAS.
- Proyecto EAS: **@luiscruzz.salta/mundial-2026-hinchas**.

---

## Resumen

| | Backend | App |
|---|---|---|
| Se entrega | Imagen Docker en GHCR | APK/AAB |
| Corre en | Server `/opt/test/mundial` (Traefik + infra compartida) | El celular |
| Se publica con | `./deploy.sh test` | `eas build` (nube) → link/QR |
| Apunta a | — | `EXPO_PUBLIC_API_URL` → `https://mundial.sda.ovh` |
| URL | `https://mundial.sda.ovh` | consume esa URL |
