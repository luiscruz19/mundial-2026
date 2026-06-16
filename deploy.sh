#!/bin/bash
set -euo pipefail
# ════════════════════════════════════════════════════════════════════════════
#  MUNDIAL 2026 · deploy.sh — build + push (GHCR) + pull/up en el server.
#  Calco simplificado del deploy.sh de novitas (un solo servicio: api).
#
#  Uso:  ./deploy.sh [test]
#
#  Variables (en .env.deploy.<env>):
#    DEPLOY_USER, DEPLOY_SERVER, DEPLOY_PORT, DEPLOY_PATH, DEPLOY_TAG
#    DEPLOY_SSH_KEY            — clave privada para SSH (default ~/.ssh/id_ed25519)
#    GITHUB_REGISTRY_USER      — usuario de GHCR (default luiscruz19)
#    GITHUB_REGISTRY_TOKEN     — PAT con write:packages (suele venir del entorno/~/.bashrc)
#    DEPLOY_RUN_SEED           — "true" para correr la carga inicial tras el up (default false)
# ════════════════════════════════════════════════════════════════════════════

ENVIRONMENT="${1:-test}"
ENV_FILE=".env.deploy.${ENVIRONMENT}"
[ -f "$ENV_FILE" ] || { echo "✗ No se encontró $ENV_FILE"; exit 1; }

set -a; # shellcheck disable=SC1090
source "$ENV_FILE"; set +a

: "${DEPLOY_USER:?falta DEPLOY_USER}"
: "${DEPLOY_SERVER:?falta DEPLOY_SERVER}"
: "${DEPLOY_PORT:?falta DEPLOY_PORT}"
: "${DEPLOY_PATH:?falta DEPLOY_PATH}"

TAG="${DEPLOY_TAG:-TEST}"; export TAG
REG_USER="${GITHUB_REGISTRY_USER:-luiscruz19}"
REG_TOKEN="${GITHUB_REGISTRY_TOKEN:?falta GITHUB_REGISTRY_TOKEN (PAT con write:packages)}"
SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/id_ed25519}"
SSH_KEY="${SSH_KEY/#\~/$HOME}"   # expandir ~ (no se expande dentro de variables)
SEED="${DEPLOY_RUN_SEED:-false}"
SSH="ssh -i $SSH_KEY -p $DEPLOY_PORT -o StrictHostKeyChecking=accept-new"
SCP="scp -i $SSH_KEY -P $DEPLOY_PORT -o StrictHostKeyChecking=accept-new"

echo "── MUNDIAL deploy ($ENVIRONMENT) · TAG=$TAG → $DEPLOY_USER@$DEPLOY_SERVER:$DEPLOY_PATH ──"

# 1) Build + push de la imagen a GHCR (nada se compila en el server).
echo "→ login GHCR (local)"
echo "$REG_TOKEN" | docker login ghcr.io -u "$REG_USER" --password-stdin
echo "→ build"
docker compose -f docker-compose.prod.yml build
echo "→ push"
docker compose -f docker-compose.prod.yml push

# 2) Sincronizar el compose de runtime al server (el bloque build: es inerte en pull/up).
echo "→ copiar docker-compose.prod.yml → $DEPLOY_PATH/docker-compose.yml"
$SSH "$DEPLOY_USER@$DEPLOY_SERVER" "mkdir -p '$DEPLOY_PATH'"
$SCP docker-compose.prod.yml "$DEPLOY_USER@$DEPLOY_SERVER:$DEPLOY_PATH/docker-compose.yml"

# 3) En el server: login, pull, up. (heredoc no entrecomillado: TAG/credenciales se expanden acá)
echo "→ pull + up en el server"
$SSH "$DEPLOY_USER@$DEPLOY_SERVER" bash -s <<EOF
set -e
echo "$REG_TOKEN" | docker login ghcr.io -u "$REG_USER" --password-stdin >/dev/null
cd "$DEPLOY_PATH"
export TAG="$TAG"
docker compose pull
docker compose up -d --remove-orphans
docker compose ps
if [ "$SEED" = "true" ]; then
  echo "→ seed (carga inicial)"
  docker compose exec -T mundial_api node db/seed.js
fi
if docker compose ps | grep -E "(Exit|unhealthy)" >/dev/null 2>&1; then
  echo "✗ Hay contenedores en estado no saludable"; exit 1
fi
EOF

echo "✓ Deploy completado (TAG=$TAG) → https://mundial.sda.ovh"
