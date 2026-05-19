import os

import dramatiq
from dramatiq.brokers.redis import RedisBroker

from reno_worker.extraction import extract_raw_entry
from reno_worker.rss_ingest import ingest_source


redis_broker = RedisBroker(url=os.environ.get("REDIS_URL", "redis://localhost:6379/0"))
dramatiq.set_broker(redis_broker)


@dramatiq.actor
def ingest_source_actor(database_url: str, source_id: int) -> None:
    ingest_source(database_url, source_id)


@dramatiq.actor
def extract_raw_entry_actor(database_url: str, raw_entry_id: int) -> None:
    extract_raw_entry(database_url, raw_entry_id)
