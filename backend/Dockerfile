FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DB_PATH=/data/groundtruth.db

WORKDIR /app

RUN pip install --no-cache-dir fastapi uvicorn requests python-dotenv pydantic \
    && groupadd --system app \
    && useradd --system --gid app --home-dir /app app \
    && mkdir -p /app/backend/.cache /data \
    && chown -R app:app /app /data

COPY --chown=app:app acaps_client.py api.py daily_job.py data.py db.py latest.py questions.py openapi.yaml ./backend/

WORKDIR /app/backend
USER app

EXPOSE 8000
VOLUME ["/data"]

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
