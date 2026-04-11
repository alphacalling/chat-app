# Prisma Database Management Guide

This guide provides user-friendly commands for managing your Prisma database in both development and production environments.

## Quick Start

### Development Environment

For local development, use these commands to set up and manage your database:

```bash
# Generate Prisma Client (runs automatically after install)
pnpm run db:generate

# Push schema changes to database (for quick development)
pnpm run db:push

# Create and apply migrations (recommended for production-ready changes)
pnpm run db:migrate:dev

# Open Prisma Studio (database GUI)
pnpm run db:studio

# Check migration status
pnpm run db:status

# Reset database (⚠️ WARNING: Deletes all data)
pnpm run db:reset
```

### Production Environment

For production deployments, use these commands:

```bash
# Apply pending migrations
pnpm run db:migrate:deploy

# Generate Prisma Client
pnpm run db:generate

# Check migration status
pnpm run db:status
```

## Detailed Command Reference

### Database Schema Management

#### `prisma generate` (db:generate)

Generates the Prisma Client based on your schema. This is required before your application can interact with the database.

**When to use:**

- After installing dependencies
- After modifying the Prisma schema
- Before running the application

**Example:**

```bash
pnpm run db:generate
```

#### `prisma db push` (db:push)

Pushes your schema changes directly to the database without creating migration files. This is useful for rapid development but not recommended for production.

**When to use:**

- Quick schema prototyping
- Development environment only
- When you don't need migration history

**⚠️ Warning:** This command modifies your database directly and doesn't create migration files.

**Example:**

```bash
pnpm run db:push
```

#### `prisma migrate dev` (db:migrate:dev)

Creates a new migration file based on schema changes and applies it to your development database.

**When to use:**

- When making schema changes that should be tracked
- Before committing schema changes
- Development environment

**Example:**

```bash
pnpm run db:migrate:dev -- --name "add_user_profile"
```

#### `prisma migrate deploy` (db:migrate:deploy)

Applies pending migrations to a production database.

**When to use:**

- Production deployments
- Staging environments
- When applying migration files created in development

**Example:**

```bash
pnpm run db:migrate:deploy
```

### Database Inspection & Management

#### `prisma studio` (db:studio)

Opens Prisma Studio, a web-based database GUI for viewing and editing data.

**When to use:**

- Inspecting database contents
- Manual data editing (development only)
- Debugging data issues

**Example:**

```bash
pnpm run db:studio
```

#### `prisma migrate status` (db:status)

Shows the current migration status, including applied and pending migrations.

**When to use:**

- Checking if migrations are up to date
- Debugging migration issues
- Before deployments

**Example:**

```bash
pnpm run db:status
```

#### `prisma migrate reset` (db:reset)

Resets the database and applies all migrations from scratch.

**When to use:**

- Starting fresh in development
- After major schema changes
- When migration history becomes corrupted

**⚠️ WARNING:** This deletes all data in your database!

**Example:**

```bash
pnpm run db:reset
```

## Environment-Specific Workflows

### Development Workflow

1. Make changes to `prisma/schema.prisma`
2. Run `pnpm run db:migrate:dev` to create and apply migrations
3. Run `pnpm run db:generate` to update Prisma Client
4. Test your changes locally

### Production Deployment Workflow

1. Ensure all migrations are committed and tested
2. Run `pnpm run db:migrate:deploy` during deployment
3. Run `pnpm run db:generate` to ensure Prisma Client is up to date
4. Start your application

## Troubleshooting

### Migration Issues

- **"Migration not found"**: Check if migration files exist in `prisma/migrations/`
- **"Database schema out of sync"**: Run `pnpm run db:push` in development or check migration status
- **"Migration failed"**: Review the migration file and database state

### Connection Issues

- **"Can't connect to database"**: Check database credentials in `.env`
- **"Database doesn't exist"**: Create the database or update connection string

### Common Commands

```bash
# View database schema
npx prisma db pull

# Format schema file
npx prisma format

# Validate schema
npx prisma validate
```

## Best Practices

1. **Always use migrations for production changes**
2. **Test migrations on a copy of production data**
3. **Keep migration files in version control**
4. **Use descriptive migration names**
5. **Run `prisma generate` after schema changes**
6. **Don't modify migration files manually**

## Need Help?

- Check the [Prisma Documentation](https://www.prisma.io/docs)
- Run `npx prisma --help` for command options
- Use `pnpm run db:status` to check current state</content>
  <parameter name="filePath">d:\Projects new\chit-chat app\backend\PRISMA_COMMANDS.md
