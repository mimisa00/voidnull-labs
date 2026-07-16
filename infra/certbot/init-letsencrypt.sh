#!/bin/bash
# Run this ONCE on first deployment to obtain Let's Encrypt certificates via Cloudflare DNS-01 challenge.
# Requires Cloudflare API token in ./certbot/cloudflare.ini
# Usage: ./init-letsencrypt.sh [staging|prod]

set -e

ENV=${1:-prod}
EMAIL="admin@voidnull.io"
CF_CREDENTIALS="/etc/letsencrypt/cloudflare.ini"

if [ "$ENV" = "staging" ]; then
    DOMAINS=("staging.voidnull.io")
    COMPOSE_FILE="compose.staging.yml"
    STAGING_FLAG="--staging"
else
    DOMAINS=("voidnull.io" "www.voidnull.io" "voidnull.ai" "www.voidnull.ai")
    COMPOSE_FILE="compose.prod.yml"
    STAGING_FLAG=""
fi

CLOUDFLARE_INI="./certbot/cloudflare.ini"

if [ ! -f "$CLOUDFLARE_INI" ]; then
    echo "ERROR: $CLOUDFLARE_INI not found."
    echo "Create it with: dns_cloudflare_api_token = YOUR_TOKEN"
    exit 1
fi

if [ "$(stat -c '%a' "$CLOUDFLARE_INI" 2>/dev/null || stat -f '%A' "$CLOUDFLARE_INI")" != "600" ]; then
    echo "WARNING: $CLOUDFLARE_INI permissions should be 600. Fixing..."
    chmod 600 "$CLOUDFLARE_INI"
fi

echo "### Requesting Let's Encrypt cert via Cloudflare DNS-01..."
DOMAIN_ARGS=""
for d in "${DOMAINS[@]}"; do
    DOMAIN_ARGS="$DOMAIN_ARGS -d $d"
done

docker compose -f "$COMPOSE_FILE" run --rm certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials "$CF_CREDENTIALS" \
    --dns-cloudflare-propagation-seconds 60 \
    $STAGING_FLAG \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    $DOMAIN_ARGS

echo "### Reloading Nginx..."
docker compose -f "$COMPOSE_FILE" exec nginx nginx -s reload

echo "### Done! Certs are in ./certbot/conf/live/"
echo "### Auto-renewal is handled by the certbot container (runs every 12h)"
