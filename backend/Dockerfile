FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Railway sets PORT at runtime; default to 8000 for local dev
ENV PORT=8000
EXPOSE 8000

# Use sh -c so $PORT actually gets expanded by the shell
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]