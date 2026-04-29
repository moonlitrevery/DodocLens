# DodocLens Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (Tesseract OCR + libs for PyTorch/OpenCV)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install UV
RUN pip install --no-cache-dir uv

# Copy dependency files first (better layer caching)
COPY pyproject.toml uv.lock ./

# Install dependencies from lock file
# Using uv sync to install all dependencies defined in uv.lock
RUN uv sync --frozen

# Copy backend source code
COPY . .

# Create data directory for SQLite and uploads
RUN mkdir -p /app/data

# Expose API port
EXPOSE 8000

# Run the FastAPI server bound to all interfaces so other containers can reach it
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
