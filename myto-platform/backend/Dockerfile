FROM python:3.12-slim

WORKDIR /app

# Install system deps for psycopg and optional extractors
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src /app/src
COPY alembic /app/alembic
COPY alembic.ini /app/alembic.ini
ENV PYTHONPATH=/app/src

EXPOSE 8000

# Wait for DB then run migrations, then start API (retry migrations a few times in case DB is slow)
CMD ["sh", "-c", "for i in 1 2 3 4 5; do alembic -c /app/alembic.ini upgrade head && break; echo 'Migration attempt failed, retrying in 3s...'; sleep 3; done && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
