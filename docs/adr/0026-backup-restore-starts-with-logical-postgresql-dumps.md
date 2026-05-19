# Backup restore starts with logical PostgreSQL dumps

Milestone 7 should start data-safety work with a manually invoked PostgreSQL logical Backup Snapshot and Restore Drill, not production backup automation. The first implementation should use PostgreSQL custom-format `pg_dump` output because it is restorable with `pg_restore`, portable across the local Compose workflow, and small enough for the current MVP database.

The first slice should prove that a dump can be created and restored into a disposable database target. It must not add cron scheduling, remote object storage, WAL archiving, point-in-time recovery, monitoring alerts, production credentials, or a release workflow. Those are later operational decisions and need explicit scope after the manual restore drill is proven.
