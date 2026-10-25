#!/usr/bin/env bash
# Physical snapshot backup script for FalkorDB (dump.rdb)
set -e

BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../data/physical-backups" && pwd)"
mkdir -p "$BACKUP_DIR"

CONTAINER_NAME="falkordb"
PASSWORD="falkor_dev_pass"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/dump_${TIMESTAMP}.rdb"

echo "=== FalkorDB Physical Backup (dump.rdb) ==="
echo "Container : $CONTAINER_NAME"
echo "Target    : $BACKUP_FILE"

# 1. Trigger BGSAVE
echo "[1/3] Triggering Redis/FalkorDB BGSAVE..."
docker exec "$CONTAINER_NAME" redis-cli -a "$PASSWORD" BGSAVE

# 2. Wait for BGSAVE to finish
echo "[2/3] Waiting for snapshot completion..."
sleep 2

# 3. Copy dump.rdb from container to host
echo "[3/3] Copying dump.rdb to host backup directory..."
docker cp "$CONTAINER_NAME:/var/lib/falkordb/data/dump.rdb" "$BACKUP_FILE"

FILE_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
echo "✅ Physical backup created successfully: $BACKUP_FILE ($FILE_SIZE)"
