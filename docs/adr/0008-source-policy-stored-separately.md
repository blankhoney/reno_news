# Source Policy Stored Separately

Issue 003 stores Source Policy in a `source_policies` table with a one-to-one relationship to `sources`. Source identity, board association, type, URL, and enablement live in the Source Registry, while crawl cadence, rate limits, save level, rights policy, translation policy, and risk level live in Source Policy.

This keeps access and rights decisions readable by both the TypeScript API and Python worker without mixing those policy decisions into UI display code or future adapter-specific implementations.
