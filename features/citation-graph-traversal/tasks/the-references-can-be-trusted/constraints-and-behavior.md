# Constraints and Behavior: The References Can Be Trusted

The feature's **Data** constraints, plus:

- **The rule runs where a bibliography is written**, after Semantic Scholar's
  list has been aligned (a row only counts as resolved once it has an id).
- **Printed text survives alignment**: a parsed entry matched to a Semantic
  Scholar reference keeps its `raw`.
- **`referenceCount` is added to the enrichment request's fields**, not fetched
  separately.
- Generated the project's way (schema → allowlist → `db:generate-zero-schema` →
  `drizzle-kit generate`).

## Acceptance

Feature criterion 6, for new uploads (older papers are task 2).
