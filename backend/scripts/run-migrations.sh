#!/bin/bash
# Run database migrations for ER Viewer
# Usage: ./scripts/run-migrations.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
MIGRATION_FILE="$BACKEND_DIR/src/db/migrations/0000_initial_schema.sql"

# Default database connection
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-er_viewer}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

echo "Running database migrations for ER Viewer..."
echo "Database: $DB_NAME on $DB_HOST:$DB_PORT"

# Run migrations using psql
if command -v psql &> /dev/null; then
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"
    echo "Migrations completed successfully!"

    # Verify tables exist
    echo ""
    echo "Verifying tables..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\dt'
else
    echo "psql not found. You can run the migration manually:"
    echo ""
    echo "Using Docker:"
    echo "  docker-compose exec postgres psql -U postgres -d er_viewer -f /dev/stdin < $MIGRATION_FILE"
    echo ""
    echo "Or copy the SQL content and run it directly in your PostgreSQL client."
    exit 1
fi
