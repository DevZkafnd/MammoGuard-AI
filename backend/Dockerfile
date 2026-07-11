FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
# - curl: untuk health check
# - libgomp1: required by torch's OpenMP runtime
# - libglib2.0-0, libsm6, libxext6, libxrender-dev: untuk image processing (Pillow, OpenCV)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgomp1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements dan install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy semua kode aplikasi
COPY . .

# Buat direktori untuk storage lokal (fallback jika R2 tidak dipakai)
RUN mkdir -p /app/storage/images/raw \
    && mkdir -p /app/storage/images/heatmaps \
    && mkdir -p /app/storage/models

# Expose port
EXPOSE 8000

# Environment variables
ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/kesehatan || exit 1

# Run aplikasi
CMD ["uvicorn", "app.main:aplikasi", "--host", "0.0.0.0", "--port", "8000"]
