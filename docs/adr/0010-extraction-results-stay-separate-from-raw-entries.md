# Extraction Results Stay Separate From Raw Entries

Full-text extraction results will be stored separately from `raw_entries`. `raw_entries` remains the metadata landing table for Source Adapter output. Extraction attempts and successful extraction results belong to Milestone 2 tables owned by the Python worker.

This avoids turning a discovered feed entry into a reader-visible content item too early. Later milestones can normalize, score, translate, and publish from extraction results without overloading the raw feed metadata table or creating reader semantics during extraction.

Issue 006 should therefore add extraction attempt/result storage linked to `raw_entries`, not reader UI, search indexes, AI evaluations, or non-RSS adapters.
