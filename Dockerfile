# ---------------------------------------------------------------------------
# ReviewRoute — production API image
#
# Build:  docker build -t reviewroute .
# Run:    docker run -p 8000:8000 reviewroute
#
# Pass Firestore credentials at runtime (never bake secrets into the image):
#   docker run -p 8000:8000 \
#     -e FIREBASE_CREDENTIALS_JSON="$(cat firebase-service-account.json)" \
#     reviewroute

#
# Notes:
# - .dockerignore excludes training artifacts (saves ~3GB: checkpoint-938/)
# - Only production model weights included (excludes optimizer.pt, scheduler.pt)
# ---------------------------------------------------------------------------

FROM python:3.11-slim

# ---------------------------------------------------------------------------
# System dependencies
# ---------------------------------------------------------------------------
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# Working directory
# ---------------------------------------------------------------------------
WORKDIR /app

# ---------------------------------------------------------------------------
# Python dependencies
# Copy requirements first so this layer is cached when only code changes.
# Install PyTorch CPU-only (no CUDA): much smaller (~300MB vs 2GB)
# ---------------------------------------------------------------------------
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --timeout 300 \
    torch==2.11.0 --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir --timeout 300 -r requirements.txt

# ---------------------------------------------------------------------------
# Application code
# ---------------------------------------------------------------------------
COPY backend/api/     api/
COPY backend/router/  router/

# ---------------------------------------------------------------------------
# Trained model artifacts
# Models are NOT copied into image (kept lightweight ~200MB).
# Instead, mount models directory at runtime:
#   docker run -v $(pwd)/models/saved:/app/models/saved ...
# Or use docker-compose (see docker-compose.yml).
# This allows updating models without rebuilding Docker image.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Non-root user — principle of least privilege
# ---------------------------------------------------------------------------
RUN useradd -m -u 1000 appuser \
    && chown -R appuser:appuser /app
USER appuser

# ---------------------------------------------------------------------------
# Runtime
# ---------------------------------------------------------------------------
EXPOSE 8000

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
