#!/bin/bash
# Daily PostgreSQL backup script
# Add to crontab: 0 2 * * * /opt/voidnull/scripts/backup-db.sh

set -euo pipefail

BACKUP_DIR="/opt/backups/postgres"
COMPOSE_FILE="/opt/voidnull/infra/docker/compose.prod.yml"
KEEP_DAYS=7

source /opt/voidnull/.env

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="${POSTGRES_DB:-voidnull_prod}"
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup: $BACKUP_FILE"

docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_dump -U "$POSTGRES_USER" -d "$DB_NAME" \
    | gzip > "$BACKUP_FILE"

# Verify
if gzip -t "$BACKUP_FILE"; then
    echo "[$(date)] Backup OK: $(du -sh $BACKUP_FILE | cut -f1)"
else
    echo "[$(date)] ERROR: Backup file corrupted!"
    exit 1
fi

# Cleanup old backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$KEEP_DAYS -delete
echo "[$(date)] Old backups cleaned (kept last $KEEP_DAYS days)"

# Optional: upload to S3/GCS
# aws s3 cp "$BACKUP_FILE" "s3://your-bucket/postgres/"
# gsutil cp "$BACKUP_FILE" "gs://your-bucket/postgres/"
