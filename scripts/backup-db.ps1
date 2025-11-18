# Database Backup Script for Greenwood Hall App
# Creates timestamped backups of the SQLite database

param(
    [string]$BackupDir = ".\backups",
    [switch]$Quiet
)

$DatabasePath = ".\prisma\dev.db"
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BackupFileName = "dev.db.backup_$Timestamp.db"
$BackupPath = Join-Path $BackupDir $BackupFileName

# Create backup directory if it doesn't exist
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
    if (-not $Quiet) {
        Write-Host "Created backup directory: $BackupDir" -ForegroundColor Green
    }
}

# Check if database exists
if (-not (Test-Path $DatabasePath)) {
    Write-Host "[ERROR] Database not found at: $DatabasePath" -ForegroundColor Red
    exit 1
}

try {
    # Copy the database file
    Copy-Item -Path $DatabasePath -Destination $BackupPath -Force
    
    $FileSize = (Get-Item $BackupPath).Length
    $FileSizeKB = [math]::Round($FileSize / 1KB, 2)
    
    if (-not $Quiet) {
        Write-Host "[SUCCESS] Database backed up successfully!" -ForegroundColor Green
        Write-Host "   Backup: $BackupPath" -ForegroundColor Cyan
        Write-Host "   Size: $FileSizeKB KB" -ForegroundColor Cyan
    }
    
    # Clean up old backups (keep only last 10)
    $AllBackups = Get-ChildItem -Path $BackupDir -Filter "*.db" | Sort-Object LastWriteTime -Descending
    if ($AllBackups.Count -gt 10) {
        $ToDelete = $AllBackups | Select-Object -Skip 10
        $ToDelete | Remove-Item -Force
        if (-not $Quiet) {
            Write-Host "   Cleaned up $($ToDelete.Count) old backup(s)" -ForegroundColor Yellow
        }
    }
    
    exit 0
} catch {
    Write-Host "[ERROR] Backup failed: $_" -ForegroundColor Red
    exit 1
}
