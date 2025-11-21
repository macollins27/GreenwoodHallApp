# Greenwood Hall Database Guide

- **Database:** PostgreSQL (used locally and in production)
- **Schema:** `prisma/schema.prisma`
- **Migrations:** `prisma/migrations` (Postgres-ready)
- **Seeding:** `prisma/seed.ts`

## Common commands
- Validate schema: `npx prisma validate`
- Generate client: `npx prisma generate`
- Apply migrations (already generated): `npx prisma migrate deploy`
- Reset dev database (drops data): `npm run db:reset`
- Seed dev data: `npm run db:seed`
- Prisma Studio: `npm run db:studio`

## Environment variables
Set `DATABASE_URL` to your Postgres connection string, e.g.:
```
postgresql://user:password@host:5432/database?schema=public
```

## Workflow
1. Edit `prisma/schema.prisma`.
2. Create a migration (`prisma migrate dev --name <change>`) against a dev Postgres database.
3. Run `npx prisma generate`.
4. Deploy with `npx prisma migrate deploy` in the target environment.

## Backups
Use your Postgres provider’s backup tools (e.g., `pg_dump` locally or managed snapshots in the cloud). Legacy SQLite backup scripts were removed.
