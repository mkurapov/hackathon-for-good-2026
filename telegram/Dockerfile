FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    BOT_DB_PATH=/data/bot.db

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && groupadd --system app \
    && useradd --system --gid app --home-dir /app app \
    && mkdir -p /data \
    && chown -R app:app /app /data

COPY --chown=app:app bot.py client.py store.py ./

USER app
VOLUME ["/data"]

CMD ["python", "bot.py"]
