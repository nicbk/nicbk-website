# ORM / Migration Tooling

Researched: 2026-07-05. Decided: 2026-07-05.

Settled as part of researching migration sequencing in
[../devops-deployment/database-migrations.md](../devops-deployment/database-migrations.md)
— recorded here for discoverability alongside this project's other
shared-infrastructure technology choices, following the same
defer-to-the-source-doc pattern as [database.md](./database.md).

## Decision

**Drizzle ORM + Drizzle Kit**, owning actual Postgres DDL/migrations, paired
with the official `drizzle-zero` generator to produce
[Zero](./sync-engine.md)'s `zero/schema.ts` automatically from the Drizzle
schema. The Drizzle schema (`src/db/schema.ts`, per
[../coding-conventions/file-hierarchy-and-complexity.md](../coding-conventions/file-hierarchy-and-complexity.md))
is the project's canonical data-shape source — `zero/schema.ts` is a
generated artifact, not hand-authored (revising the original framing in
[../coding-conventions/typescript-conventions.md](../coding-conventions/typescript-conventions.md)).

Chosen over Prisma Migrate, Atlas, and node-pg-migrate/Umzug/hand-written
SQL — see `database-migrations.md` for the full comparison and reasoning;
not re-derived here to avoid duplicating that doc.

## Sources

See [../devops-deployment/database-migrations.md](../devops-deployment/database-migrations.md)'s
Sources section.
