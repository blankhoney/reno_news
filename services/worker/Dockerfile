FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

WORKDIR /app
COPY services/worker/pyproject.toml services/worker/uv.lock ./
COPY services/worker/src ./src

RUN uv sync

ENV PORT=3002
EXPOSE 3002
CMD ["uv", "run", "python", "-m", "reno_worker"]
