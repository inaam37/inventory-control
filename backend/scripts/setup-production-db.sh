#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL must be set"
  exit 1
fi

echo "Generating Prisma client..."
npm run prisma:generate

echo "Applying production migrations..."
npm run prisma:migrate:deploy

echo "Production database setup complete."
