# Greenwood Hall App - Database Management Guide

## Quick Commands

### Backup Database
```powershell
npm run db:backup
```
Creates a timestamped backup in `backups/` folder. Automatically keeps the 10 most recent backups.

### Restore Database
```powershell
# List available backups
.\scripts\restore-db.ps1

# Restore latest backup
npm run db:restore -- -Latest -Force

# Restore specific backup
.\scripts\restore-db.ps1 -BackupFile "backups\dev.db.backup_2025-11-18_14-30-00.db"
```

### Seed Database
```powershell
npm run db:seed
```
Populates the database with:
- 4 EVENT bookings (mix of confirmed/pending)
- 3 SHOWING appointments
- 3 Add-ons (Whicker Chair, Table Cloth, Floral Centerpiece)
- 1 Blocked date
- Showing availability (Mon-Fri, 9 AM - 5 PM)

### Reset & Reseed Database
```powershell
npm run db:reset
```
⚠️ **WARNING**: This will:
1. Create a backup of current database
2. Reset the database (delete all data)
3. Run all migrations
4. Seed with test data

### Open Prisma Studio
```powershell
npm run db:studio
```
Visual database browser at http://localhost:5555

## Safe Migration Workflow

**ALWAYS backup before migrations!**

```powershell
# 1. Backup current database
npm run db:backup

# 2. Make schema changes in prisma/schema.prisma

# 3. Create and apply migration
npx prisma migrate dev --name your_migration_name

# 4. If something goes wrong, restore from backup
npm run db:restore -- -Latest -Force
```

## Environment Separation

### Development (.env.development)
- Local SQLite database (`dev.db`)
- Postmark sandbox/test tokens
- Stripe test mode keys
- Email notifications can be disabled

### Production (.env.production)
- PostgreSQL or hosted database
- Postmark production tokens (approved account)
- Stripe live mode keys
- Email notifications enabled

**To switch environments:**
```powershell
# Development (default)
cp .env.development .env

# Production
cp .env.production .env
```

## Database Backup Strategy

### Automatic Backups
Backups are automatically created when you run:
- `npm run db:reset` (before resetting)
- `npm run db:restore` (before restoring)

### Manual Backups
Before any risky operation, run:
```powershell
npm run db:backup
```

### Backup Retention
- Last 10 backups are kept automatically
- Older backups are deleted to save space
- Backups are stored in `backups/` folder

### Backup Location
```
GreenwoodHallApp/
├── backups/
│   ├── dev.db.backup_2025-11-18_14-30-00.db
│   ├── dev.db.backup_2025-11-18_15-45-12.db
│   └── pre-restore_2025-11-18_16-20-45.db
```

## Common Scenarios

### Lost Data - Restore from Backup
```powershell
# See available backups
.\scripts\restore-db.ps1

# Restore most recent
npm run db:restore -- -Latest -Force
```

### Fresh Start with Test Data
```powershell
npm run db:reset
```

### Add New Test Data
```powershell
# Edit prisma/seed.ts, then:
npm run db:seed
```

### Migration Failed
```powershell
# Restore pre-migration state
npm run db:restore -- -Latest -Force

# Fix schema issues, then try again
npx prisma migrate dev
```

## Production Deployment

### Initial Setup
1. Set up production database (PostgreSQL recommended)
2. Configure `.env.production` with production credentials
3. Get Postmark account approved for production email
4. Use Stripe live mode keys

### Migration to Production
```powershell
# 1. Set production environment
$env:NODE_ENV="production"

# 2. Push schema to production database
npx prisma migrate deploy

# 3. Optionally seed initial data
npm run db:seed
```

### Production Backups
For production, use automated backup solutions:
- **PostgreSQL**: pg_dump with cron jobs
- **Hosted DB**: Built-in backup features (AWS RDS, Railway, etc.)
- **Manual**: Regular exports via Prisma Studio

## Troubleshooting

### Database Locked Error
```powershell
# Close Prisma Studio and try again
# Or restart the dev server
```

### Migration Conflicts
```powershell
# Reset migrations (development only!)
npm run db:backup
npx prisma migrate reset
```

### Corrupt Database
```powershell
# Restore from backup
npm run db:restore -- -Latest -Force
```

## File Structure

```
GreenwoodHallApp/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Test data seeder
│   ├── dev.db                 # SQLite database (dev)
│   └── migrations/            # Migration history
├── scripts/
│   ├── backup-db.ps1          # Backup script
│   └── restore-db.ps1         # Restore script
├── backups/                   # Database backups
├── .env                       # Active environment
├── .env.development           # Dev environment template
└── .env.production.example    # Prod environment template
```
