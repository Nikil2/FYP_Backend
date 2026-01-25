# Supabase Configuration Guide

## Getting Your Supabase Connection String

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** (gear icon) > **Database**
3. Scroll to **Connection String** section
4. Copy the **URI** format connection string

## Setting Up Environment Variables

1. Create your `.env` file:
```bash
cp .env.example .env
```

2. In your `.env` file, add both connection strings:

```env
# Connection pooling (for queries) - Port 6543
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true"

# Direct connection (for migrations) - Port 5432
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

**Important:** Replace:
- `[YOUR-PASSWORD]` - Your database password (set when creating project)
- `[YOUR-PROJECT-REF]` - Your project reference (e.g., `abcdefghijklmnop`)

## Enable PostGIS Extension

Your schema uses the PostGIS extension for location-based features. Enable it in Supabase:

1. Go to **Database** > **Extensions** in your Supabase dashboard
2. Search for `postgis`
3. Click **Enable** next to postgis

## Running Migrations

After setting up your `.env` file:

```bash
# Generate Prisma Client
npm run prisma:generate

# Create and run migrations
npm run prisma:migrate

# Or use Prisma push for development
npx prisma db push
```

## Connection Ports

- **Port 6543**: Connection pooling (PgBouncer) - Use for application queries
- **Port 5432**: Direct connection - Use for migrations and admin tasks

Supabase requires both because PgBouncer (connection pooler) doesn't support all PostgreSQL features needed for migrations.
