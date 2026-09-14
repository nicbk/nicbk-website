# Constraints and Behavior: The Position Is Saved

The feature's "Stored" constraints, plus:

- **Generated the project's way**: schema edit → `drizzle-zero.config.ts`
  allowlist → `npm run db:generate-zero-schema` → `npx drizzle-kit generate`.
  The committed migration is what the integration tests apply.
- **Zero type `number()`** for both, nullable.
- **Bounds**: page ≤ 100 000; offset ≤ 100 000 points. Beyond any real paper,
  and small enough to refuse garbage.
- **The mutator writes only the two columns** — asserted, so `updated_at` cannot
  creep in later.

## Acceptance

Feature criterion 1.
