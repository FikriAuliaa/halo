#!/bin/sh
set -e

echo "🚀 Starting Halo Kampus container..."

# 1. Run database migrations & seeds
if [ -f "scripts/migrate.ts" ] && [ -x "$(command -v pnpm)" ]; then
  echo "📦 Running database migrations..."
  pnpm migrate || echo "⚠️ Migration check finished with warning, proceeding..."
elif [ -f "server.js" ]; then
  echo "📦 Database migration step ready."
fi

# 2. Start Next.js standalone server
echo "✨ Starting Next.js server on port ${PORT:-3000}..."
exec node server.js
