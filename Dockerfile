# GastroSkor API — Railway (repo kokunden build)
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY resto-pulse-mvp/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY resto-pulse-mvp/backend/ .

RUN chmod +x start.sh

ENV PORT=8000
EXPOSE 8000

CMD ["./start.sh"]
