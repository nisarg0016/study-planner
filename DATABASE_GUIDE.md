# Database Setup & Migration Guide

## Overview

This guide explains how to set up and maintain the Study Planner database across different scenarios.

## Scripts Available

### 1. `npm run setup-db`
**Purpose:** Initial database setup for new installations

**What it does:**
- Reads `database/schema.sql` and creates all tables
- Inserts sample data (demo user with credentials)
- Creates a fresh database file at `database/study_planner.db`

**When to use:**
- First time installing the application
- Setting up on a new server
- After running `npm run reset-db`

**Command:**
```bash
cd backend
npm run setup-db
```

---

### 2. `npm run migrate-db`
**Purpose:** Update existing database with new columns

**What it does:**
- Adds new columns to existing tables without deleting data
- Safe to run multiple times (checks if columns already exist)
- Currently adds:
  - `attendees` TEXT to events table
  - `reminders` INTEGER to events table
  - `updated_at` TIMESTAMP to study_sessions table

**When to use:**
- Upgrading from an older version
- After pulling new code that includes database schema changes
- When you see "no such column" errors

**Command:**
```bash
cd backend
npm run migrate-db
```

---

### 3. `npm run reset-db`
**Purpose:** Complete database reset (DESTRUCTIVE)

**What it does:**
- **DELETES** the existing database file
- Creates a new database from scratch
- Inserts fresh sample data
- Requires confirmation (type "yes" to proceed)

**When to use:**
- During development when you want to start fresh
- When database is corrupted beyond repair
- When you want to clear all test data

**⚠️ WARNING:** This will delete ALL your data. Backup first!

**Command:**
```bash
cd backend
npm run reset-db
```

---

## Quick Reference

### New Installation
```bash
cd backend
npm install
npm run setup-db
npm run dev
```

### Upgrading Existing Installation
```bash
cd backend
git pull
npm install
npm run migrate-db
npm run dev
```

### Development Reset
```bash
cd backend
npm run reset-db  # Type "yes" to confirm
npm run dev
```

---

## Troubleshooting

### Error: "no such column: [column_name]"
**Solution:** Run the migration script
```bash
npm run migrate-db
```

### Error: "database is locked"
**Solution:** Stop the backend server, then retry
```bash
# Stop server (Ctrl+C)
npm run migrate-db
npm run dev
```

### Error: "table already exists"
**Solution:** Database is already set up. If you want to start fresh:
```bash
npm run reset-db
```

### Want to backup before migrating?
```bash
cd backend/database
cp study_planner.db study_planner.db.backup
cd ..
npm run migrate-db
```

---

## Schema File

The master schema is in `backend/database/schema.sql`. All tables and columns are defined there.

- New installations: Gets full schema from this file
- Migrations: Add only new columns to existing tables
- Resets: Rebuilds everything from this file

---

## Sample Data

The setup script creates a demo user:
- **Email:** demo@studyplanner.com
- **Password:** password123
- **Role:** user

This user has sample tasks, syllabus items, and other data for testing.

---

## Database Location

Default: `backend/database/study_planner.db`

Can be changed via environment variable:
```env
DB_PATH=./path/to/your/database.db
```

---

## Production Considerations

### Before Deployment
1. Change JWT_SECRET in `.env`
2. Run `npm run setup-db` once
3. DO NOT commit the `.db` file to git (already in `.gitignore`)

### After Deployment
1. Keep backups of `study_planner.db`
2. Test migrations on backup copy first
3. Use `npm run migrate-db` for schema updates
4. NEVER use `reset-db` in production

### Database Backups
```bash
# Manual backup
cp backend/database/study_planner.db backup-$(date +%Y%m%d).db

# Before migration
cd backend
npm run migrate-db 2>&1 | tee migration-log.txt
```

---

## Summary

| Scenario | Command | Data Loss? |
|----------|---------|------------|
| New server setup | `npm run setup-db` | N/A (new) |
| Code update with schema changes | `npm run migrate-db` | ❌ No |
| Development reset | `npm run reset-db` | ✅ Yes |
| Production update | `npm run migrate-db` | ❌ No |

---

For more information, see `README.md` or `API_DOCUMENTATION.md`.
