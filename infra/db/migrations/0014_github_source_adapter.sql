alter table sources drop constraint if exists sources_source_type_check;

alter table sources
  add constraint sources_source_type_check check (source_type in ('rss', 'atom', 'github'));

alter table source_ingest_attempts drop constraint if exists source_ingest_attempts_failure_type_check;

alter table source_ingest_attempts
  add constraint source_ingest_attempts_failure_type_check check (
    failure_type is null or failure_type in ('network', 'parse', 'policy', 'duplicate', 'rate_limit', 'unknown')
  );
