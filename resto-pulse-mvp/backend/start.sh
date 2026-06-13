#!/bin/sh
set -e
echo "Starting GastroSkor API on port ${PORT:-8000}..."
echo "Alembic migration files: $(ls -1 alembic/versions/*.py 2>/dev/null | wc -l)"
echo "Alembic head: $(alembic heads 2>/dev/null | tr '\n' ' ')"
if ! alembic upgrade head; then
  echo "Alembic upgrade failed."
  alembic current 2>&1 || true
  echo "If DB revision is ahead of this deploy, redeploy latest main (do not rollback)."
  echo "If stuck on 20260618_0041, ensure this image includes google_place_catalog migration."
  exit 1
fi
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
