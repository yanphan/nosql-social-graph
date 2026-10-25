#!/usr/bin/env bash
# Physical snapshot restore script for FalkorDB (dump.rdb)
set -e

CONTAINER_NAME="falkordb"
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <path_to_dump.rdb>"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file '$BACKUP_FILE' not found!"
  exit 1
fi

echo "=== FalkorDB Physical Restore (dump.rdb) ==="
echo "Container   : $CONTAINER_NAME"
echo "Source File : $BACKUP_FILE"

# 1. Stop container to safely replace RDB file
echo "[1/4] Stopping container $CONTAINER_NAME..."
docker stop "$CONTAINER_NAME"

# 2. Copy RDB file into container volume
echo "[2/4] Replacing dump.rdb in container volume..."
docker cp "$BACKUP_FILE" "$CONTAINER_NAME:/var/lib/falkordb/data/dump.rdb"

# 3. Start container
echo "[3/4] Starting container $CONTAINER_NAME..."
docker start "$CONTAINER_NAME"

# 4. Wait for database readiness
echo "[4/4] Verifying database connection..."
sleep 3
docker exec "$CONTAINER_NAME" redis-cli -a "falkor_dev_pass" PING

echo "✅ Physical restore completed successfully!"
