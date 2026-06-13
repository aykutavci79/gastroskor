# GastroSkor API — Railway (repo kokunden build)
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY resto-pulse-mvp/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY resto-pulse-mvp/backend/ .

RUN test -f alembic/versions/20260618_0041_google_place_catalog.py \
    && test "$(ls -1 alembic/versions/*.py | wc -l)" -ge 40 \
    || (echo "ERROR: alembic migration files missing from image" && ls -la alembic/versions/ && exit 1)

RUN chmod +x start.sh

ENV PORT=8000
EXPOSE 8000

CMD ["./start.sh"]
