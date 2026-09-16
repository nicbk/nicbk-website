# Constraints and Behavior: The Text Box Fits a Margin

The feature's behavior and constraints, plus:

- **The override lives beside the link one**, in its own module with the
  measurements in its comment, and is passed in the same `tools` array — one
  place where the reader says how the engine's tools differ here.
- **`defaults` and `clickBehavior` are each complete objects.** The plugin
  merges by id with top-level fields replacing, which `link-annotations.ts`
  already records; a partial object drops what it does not mention.
- **The height that goes with 8pt** is stated with its reason, not inherited
  from the 14pt line the engine sized for.

## Acceptance

The feature's criteria 1–5.
