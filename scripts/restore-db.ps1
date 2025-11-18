# Database Restore Script for Greenwood Hall App
# Restores database from a backup file

param(
    [string]$BackupFile,
    [string]$BackupDir = ".\backups",
    [switch]$Latest,
    [switch]$Force
)

$DatabasePath = ".\prisma\dev.db"

# Determine which backup to restore
if ($Latest) {
    $BackupFiles = Get-ChildItem -Path $BackupDir -Filter "*.db" | Sort-Object LastWriteTime -Descending
    if ($BackupFiles.Count -eq 0) {
        Write-Host "[ERROR] No backup files found in $BackupDir" -ForegroundColor Red
        exit 1
    }
    $BackupFile = $BackupFiles[0].FullName
    Write-Host "[INFO] Using latest backup: $($BackupFiles[0].Name)" -ForegroundColor Cyan
} elseif (-not $BackupFile) {
    # List available backups
    Write-Host "`nAvailable backups:" -ForegroundColor Yellow
    $BackupFiles = Get-ChildItem -Path $BackupDir -Filter "*.db" | Sort-Object LastWriteTime -Descending
    if ($BackupFiles.Count -eq 0) {
        Write-Host "  No backups found" -ForegroundColor Red
        exit 1
    }
    
    for ($i = 0; $i -lt $BackupFiles.Count; $i++) {
        $file = $BackupFiles[$i]
        $size = [math]::Round($file.Length / 1KB, 2)
        Write-Host "  [$i] $($file.Name) - $size KB - $($file.LastWriteTime)" -ForegroundColor Cyan
    }
    
    Write-Host "`nUsage:" -ForegroundColor Yellow
    Write-Host "  Restore specific backup: .\scripts\restore-db.ps1 -BackupFile backups\dev.db.backup_2025-11-18_14-30-00.db"
    Write-Host "  Restore latest backup:   .\scripts\restore-db.ps1 -Latest"
    exit 0
}

# Check if backup file exists
if (-not (Test-Path $BackupFile)) {
    Write-Host "[ERROR] Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

# Confirm restoration (unless -Force is used)
if (-not $Force) {
    Write-Host "`n[WARNING] This will replace your current database!" -ForegroundColor Yellow
    Write-Host "   Current: $DatabasePath" -ForegroundColor Cyan
    Write-Host "   Backup:  $BackupFile" -ForegroundColor Cyan
    $Confirmation = Read-Host "`nContinue? (yes/no)"
    if ($Confirmation -ne "yes") {
        Write-Host "[INFO] Restore cancelled" -ForegroundColor Red
        exit 1
    }
}

try {
    # Backup current database before replacing
    if (Test-Path $DatabasePath) {
        $PreRestoreBackup = ".\backups\pre-restore_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').db"
        Copy-Item -Path $DatabasePath -Destination $PreRestoreBackup -Force
        Write-Host "[SUCCESS] Current database backed up to: $PreRestoreBackup" -ForegroundColor Green
    }
    
    # Restore from backup
    Copy-Item -Path $BackupFile -Destination $DatabasePath -Force
    
    $FileSize = (Get-Item $DatabasePath).Length
    $FileSizeKB = [math]::Round($FileSize / 1KB, 2)
    
    Write-Host "[SUCCESS] Database restored successfully!" -ForegroundColor Green
    Write-Host "   Database: $DatabasePath" -ForegroundColor Cyan
    Write-Host "   Size: $FileSizeKB KB" -ForegroundColor Cyan
    
    exit 0
} catch {
    Write-Host "[ERROR] Restore failed: $_" -ForegroundColor Red
    exit 1
}
