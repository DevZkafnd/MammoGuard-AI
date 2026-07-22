# ============================================================================
# STAGE 1: Builder - Install dependencies dengan caching optimal
# ============================================================================
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies (untuk compile beberapa Python packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy HANYA requirements.txt dulu (untuk leverage Docker layer caching)
# Jika requirements.txt tidak berubah, layer ini akan di-cache
COPY requirements.txt .

# Install dependencies ke /app/venv (isolated virtual environment)
# Kenapa venv? Supaya dependencies bersih dan mudah di-copy ke stage final
RUN python -m venv /app/venv && \
    /app/venv/bin/pip install --no-cache-dir --upgrade pip && \
    /app/venv/bin/pip install --no-cache-dir --timeout=300 --retries=10 -r requirements.txt

# ============================================================================
# STAGE 2: Runtime - Image final yang lebih kecil
# ============================================================================
FROM python:3.11-slim AS runtime

WORKDIR /app

# Install HANYA runtime dependencies (bukan build tools!)
# Ini yang bikin image final lebih kecil vs stage builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgomp1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment dari builder stage
# Ini yang bikin rebuild cepat karena dependencies sudah ter-install di builder
COPY --from=builder /app/venv /app/venv

# Set PATH supaya Python pakai venv
ENV PATH="/app/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

# Copy kode aplikasi (SETELAH dependencies, jadi perubahan code tidak rebuild pip install)
COPY . .

# Buat direktori untuk storage lokal (fallback jika R2 tidak dipakai)
RUN mkdir -p /app/storage/images/raw \
    && mkdir -p /app/storage/images/heatmaps \
    && mkdir -p /app/storage/models

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/kesehatan || exit 1

# Run aplikasi
CMD ["uvicorn", "app.main:aplikasi", "--host", "0.0.0.0", "--port", "8000"]
