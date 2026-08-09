# syntax=docker/dockerfile:1

# ============================================================
# Builder
# ============================================================

FROM python:3.10.19-slim-trixie AS builder

# Pin uv to a specific version.
COPY --from=ghcr.io/astral-sh/uv:0.12.3 /uv /uvx /bin/

WORKDIR /app

# Use Python from the base image rather than downloading
# another Python version through uv.
ENV UV_PYTHON_DOWNLOADS=0

# Do not install development dependencies.
ENV UV_NO_DEV=1

# uv cache and project environment are on different filesystems.
ENV UV_LINK_MODE=copy

# Compile Python bytecode for production.
ENV UV_COMPILE_BYTECODE=1

# ============================================================
# Dependencies
# ============================================================

# Copy dependency metadata first so Docker can cache this layer.
COPY pyproject.toml uv.lock ./

RUN --mount=type=cache,target=/root/.cache/uv \
  uv sync \
  --locked \
  --no-install-project \
  --no-editable

# ============================================================
# Application
# ============================================================

COPY server ./server

# ============================================================
# Install project
# ============================================================

RUN --mount=type=cache,target=/root/.cache/uv \
  uv sync \
  --locked \
  --no-editable


WORKDIR /app/server
RUN /app/.venv/bin/python -c "import app; print(\"IMPORT OK\")"

# ============================================================
# Runtime
# ============================================================

FROM python:3.10.19-slim-trixie AS runtime

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PATH="/app/.venv/bin:$PATH"

# Create an unprivileged user.
RUN useradd \
  --create-home \
  --shell /usr/sbin/nologin \
  appuser

# Copy application + virtual environment from builder.
COPY --from=builder --chown=appuser:appuser /app /app

USER appuser

WORKDIR /app/server

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
