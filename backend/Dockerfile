FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Railway sets the PORT env var; default to 8000 for local dev
ENV PORT=8000
EXPOSE $PORT

# Use shell form so $PORT gets expanded at runtime
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
