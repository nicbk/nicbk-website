# Constraints and Behavior: Citations Are Queryable

The feature's **Queries** constraints, plus:

- **Written like `articles.byId`**: `z.uuid()` args, `limit(0)` for anonymous,
  the owner filter in addition to the id.
- **Related articles filtered by owner too**, inside the `related` subquery, so a
  foreign key into another account can never bring its row.
- Registered where `/api/zero/query` resolves them, and covered by that
  endpoint's allowlist test if it has one.

## Acceptance

Feature criterion 7.
