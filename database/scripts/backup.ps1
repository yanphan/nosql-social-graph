# PowerShell Physical snapshot backup script for FalkorDB (dump.rdb)
$ErrorActionPreference = "Stop"

$BackupDir = Join-Path $PSScriptRoot "..\data\physical-backups"
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$ContainerName = "falkordb"
$Password = "falkor_dev_pass"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "dump_$Timestamp.rdb"

Write-Host "=== FalkorDB Physical Backup (dump.rdb) ===" -ForegroundColor Cyan
Write-Host "Container : $ContainerName"
Write-Host "Target    : $BackupFile"

Write-Host "[1/3] Triggering Redis/FalkorDB BGSAVE..." -ForegroundColor Yellow
docker exec $ContainerName redis-cli -a $Password BGSAVE

Write-Host "[2/3] Waiting for snapshot completion..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host "[3/3] Copying dump.rdb from container to host..." -ForegroundColor Yellow
docker cp "$($ContainerName):/var/lib/falkordb/data/dump.rdb" $BackupFile

$FileSize = (Get-Item $BackupFile).Length / 1KB
Write-Host "✅ Physical backup created successfully: $BackupFile ($([math]::Round($FileSize, 1)) KB)" -ForegroundColor Green
