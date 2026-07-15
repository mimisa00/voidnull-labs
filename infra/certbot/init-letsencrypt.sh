#!/bin/bash
# Run this ONCE on first deployment to obtain Let's Encrypt certificates
# Usage: ./init-letsencrypt.sh [staging|prod]

set -e

ENV=${1:-prod}
EMAIL="admin@voidnull.io"

if [ "$ENV" = "staging" ]; then
    DOMAINS=("staging.voidnull.io")
    COMPOSE_FILE="compose.staging.yml"
    STAGING_FLAG="--staging"  # Remove for real cert after testing
else
    DOMAINS=("voidnull.io" "www.voidnull.io" "voidnull.ai" "www.voidnull.ai")
    COMPOSE_FILE="compose.prod.yml"
    STAGING_FLAG=""
fi

DATA_PATH="./certbot"
RSA_KEY_SIZE=4096

echo "### Creating dummy certs for Nginx to start..."
mkdir -p "$DATA_PATH/conf/live/${DOMAINS[0]}"
openssl req -x509 -nodes -newkey rsa:$RSA_KEY_SIZE -days 1 \
    -keyout "$DATA_PATH/conf/live/${DOMAINS[0]}/privkey.pem" \
    -out "$DATA_PATH/conf/live/${DOMAINS[0]}/fullchain.pem" \
    -subj "/CN=localhost"

echo "### Starting Nginx with dummy certs..."
docker compose -f "$COMPOSE_FILE" up -d nginx

echo "### Deleting dummy certs..."
rm -rf "$DATA_PATH/conf/live/${DOMAINS[0]}"

echo "### Requesting real Let's Encrypt cert..."
DOMAIN_ARGS=""
for d in "${DOMAINS[@]}"; do
    DOMAIN_ARGS="$DOMAIN_ARGS -d $d"
done

docker compose -f "$COMPOSE_FILE" run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    $STAGING_FLAG \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    $DOMAIN_ARGS

echo "### Reloading Nginx..."
docker compose -f "$COMPOSE_FILE" exec nginx nginx -s reload

echo "### Done! Certs are in $DATA_PATH/conf/live/"
echo "### Auto-renewal is handled by the certbot container (runs every 12h)"
