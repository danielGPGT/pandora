#!/bin/bash

# Database Migration Script
# Usage: ./scripts/db/migrate.sh [environment]

set -e

ENV=${1:-development}
MIGRATIONS_DIR="./db/migrations"

echo "Running migrations for environment: $ENV"

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

# Load environment variables
if [ -f ".env.$ENV.local" ]; then
  export $(cat .env.$ENV.local | grep -v '^#' | xargs)
elif [ -f ".env.local" ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check for Supabase CLI or use psql directly
if command -v supabase &> /dev/null; then
  echo "Using Supabase CLI..."
  supabase db reset
else
  echo "Supabase CLI not found. Please install it or use psql directly."
  echo "For Supabase projects, use: supabase migration up"
  exit 1
fi

echo "Migrations completed successfully!"

