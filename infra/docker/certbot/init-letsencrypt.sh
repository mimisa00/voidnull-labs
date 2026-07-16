#!/bin/bash
# Run this ONCE on first deployment to obtain Let's Encrypt certificates via Cloudflare DNS-01 challenge.
# Must be run from the project root: bash infra/docker/certbot/init-letsencrypt.sh [staging|prod]
# Requires:
#   infra/docker/.env.staging (or .env.prod) with POSTGRES_USER, POSTGRES_PASSWORD, etc.
#   infra/docker/certbot/cloudflare.ini with dns_cloudflare_api_token

set -e

# Always resolve relative to infra/docker/ regardless of where script is called from
cd "$(dirname "$0")/.."

ENV=${1:-prod}
EMAIL="admin@voidnull.io"
CF_CREDENTIALS="/run/secrets/cloudflare.ini"

if [ "$ENV" = "staging" ]; then
    DOMAINS=("staging.voidnull.io")
    COMPOSE_FILE="compose.staging.yml"
    STAGING_FLAG="--staging"
else
    DOMAINS=("voidnull.io" "www.voidnull.io" "voidnull.ai" "www.voidnull.ai")
    COMPOSE_FILE="compose.prod.yml"
    STAGING_FLAG=""
fi

# Use an environment-specific .env file so infra/docker/.env (dev config) is NOT auto-loaded.
# This prevents POSTGRES_DB=voidnull_dev and other dev values from polluting staging/prod.
ENV_FILE=".env.${ENV}"
if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: $ENV_FILE not found."
    echo "Copy the example and fill in secrets:"
    echo "  cp .env.${ENV}.example $ENV_FILE"
    exit 1
fi

CLOUDFLARE_INI="./certbot/cloudflare.ini"

if [ ! -f "$CLOUDFLARE_INI" ]; then
    echo "ERROR: $CLOUDFLARE_INI not found."
    echo "Copy the example and fill in your token:"
    echo "  cp certbot/cloudflare.ini.example certbot/cloudflare.ini"
    echo "  chmod 600 certbot/cloudflare.ini"
    exit 1
fi

if [ "$(stat -c '%a' "$CLOUDFLARE_INI" 2>/dev/null || stat -f '%A' "$CLOUDFLARE_INI")" != "600" ]; then
    echo "WARNING: $CLOUDFLARE_INI permissions should be 600. Fixing..."
    chmod 600 "$CLOUDFLARE_INI"
fi

# Create a placeholder self-signed cert so nginx can start before real certs arrive.
# certbot will replace these files with real Let's Encrypt certs after issuance.
CERT_DIR="./certbot/conf/live/${DOMAINS[0]}"
if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
    echo "### Creating placeholder self-signed certificate for nginx bootstrap..."
    mkdir -p "$CERT_DIR"
    openssl req -x509 -nodes -newkey rsa:2048 \
        -keyout "$CERT_DIR/privkey.pem" \
        -out "$CERT_DIR/fullchain.pem" \
        -days 1 \
        -subj "/CN=${DOMAINS[0]}" 2>/dev/null
    echo "### Placeholder cert created."
fi

echo "### Requesting Let's Encrypt cert via Cloudflare DNS-01..."
DOMAIN_ARGS=""
for d in "${DOMAINS[@]}"; do
    DOMAIN_ARGS="$DOMAIN_ARGS -d $d"
done

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials "$CF_CREDENTIALS" \
    --dns-cloudflare-propagation-seconds 60 \
    $STAGING_FLAG \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    $DOMAIN_ARGS

echo "### Starting all services..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo "### Reloading Nginx with real certificates..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec nginx nginx -s reload

echo "### Done! Certs are in ./certbot/conf/live/"
echo "### Auto-renewal is handled by the certbot container (runs every 12h)."
echo "### Nginx reloads every 6h to pick up renewed certs automatically."
