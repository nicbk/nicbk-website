# Testing: Annotations

What this task's tests must cover. The feature-wide tiers are in
[../../testing.md](../../testing.md).

## Unit (Vitest, no EmbedPDF engine)

**The translation layer — the part that can be wrong quietly**

- An EmbedPDF annotation object becomes a row with `type`, `page_index`, and
  `contents` promoted to columns and everything type-specific in `payload`.
- A row becomes an object EmbedPDF's `importAnnotations` accepts, with `author`
  and `created`/`modified` populated **from the row** rather than read from
  stored fields.
- **Round-trip one of each of the 12 types** — object → row → object — and lose
  nothing the engine needs to redraw the mark. The type-specific fields are the
  point here: `inkList` and `strokeWidth` for ink, `segmentRects` for the markup
  types, `vertices` for the shapes, `fontSize`/`fontFamily` for free text.
- **A stamp is not accepted.** Out of scope by decision, so the boundary is
  asserted rather than assumed.
- An annotation with **empty `contents`** (a shape, an ink stroke) round-trips
  as such — this is expected, not a defect, and task 5 renders a fallback for it.

**The committed-only rule**

- An **uncommitted** annotation event produces **no write**.
- The **committed** event that follows it produces exactly **one** write.
- A rapid burst of uncommitted events followed by one commit produces **one**
  write, not one per event. This is the test that would have caught the
  row-per-frame defect the rule exists to prevent.
- Asserted against the bridge with a fake event source — no engine required.

**The tools**

- Selecting a tool sets it active, and it **stays active** across an applied
  annotation rather than resetting.
- Switching tools deactivates the previous one; deselecting clears it.
- Active state is exposed programmatically and is not signalled by color alone.
- Every icon-only tool control has a discernible accessible name.

**Failure surfacing**

- A rejected mutation surfaces through the toast rather than being swallowed.

## Integration (Vitest + Testcontainers Postgres)

- **Migration** applies cleanly to a fresh database, producing `annotations`
  with the `(article_id, page_index)` index and both `ON DELETE CASCADE` foreign
  keys.
- **Mutator authorization — the load-bearing test.** With two users' articles
  and annotations present, each mutator run under user A's context against user
  B's article or B's annotation writes nothing and fails; run under A's own
  context it succeeds. Verified through the same path `/mutate` uses, not by
  calling the mutator body directly. **Non-vacuous**: B's rows genuinely
  present.
- **Cascades**: deleting an article removes its annotations; deleting a `user`
  removes that user's annotations — extending the account-deletion cascade #7
  and #8 established.
- **Publication membership**: `annotations` is in `zero_data`, so a row inserted
  directly into Postgres replicates. CI's drift check covers the generated
  schema; this covers the publication, which the generator does not know about.
- **`payload` round-trips through `jsonb`** without reordering keys or coercing
  types in a way that changes what comes back — asserted with a payload from
  each of the structurally different type families.

## Browser verification (record in status.md)

- **Each of the 12 types** can be created on a real PDF.
- Each **persists across a reload** and is redrawn in the right place at a
  **different zoom level** than the one it was made at — page-space coordinates
  are the property that makes this work, and the only way to see it is to look.
- A mark made in one window appears in a **second window**, not a second tab.
- **Dragging an ink stroke produces one row, not one per frame** — check the
  actual row count in the database, which is the only place the truth is.
- Editing and deleting a mark both persist and both sync.
- The toolbar with fifteen controls still works at **narrow** widths and in both
  themes.

## Coverage

Ratchet applies. The translation layer and the committed-only gate are pure and
fully coverable — if this task drags coverage down, the logic is in the wrong
place.
