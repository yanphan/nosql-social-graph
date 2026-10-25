# PowerShell Physical snapshot restore script for FalkorDB (dump.rdb)
param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"
$ContainerName = "falkordb"
$Password = "falkor_dev_pass"

if (-not (Test-Path $BackupFile)) {
    Write-Error "Backup file '$BackupFile' does not exist!"
}

Write-Host "=== FalkorDB Physical Restore (dump.rdb) ===" -ForegroundColor Cyan
Write-Host "Container   : $ContainerName"
Write-Host "Source File : $BackupFile"

Write-Host "[1/4] Stopping container $ContainerName..." -ForegroundColor Yellow
docker stop $ContainerName

Write-Host "[2/4] Replacing dump.rdb in container volume..." -ForegroundColor Yellow
docker cp $BackupFile "$($ContainerName):/var/lib/falkordb/data/dump.rdb"

Write-Host "[3/4] Starting container $ContainerName..." -ForegroundColor Yellow
docker start $ContainerName

Write-Host "[4/4] Verifying database connection..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
docker exec $ContainerName redis-cli -a $Password PING

Write-Host "✅ Physical restore completed successfully!" -ForegroundColor Green
