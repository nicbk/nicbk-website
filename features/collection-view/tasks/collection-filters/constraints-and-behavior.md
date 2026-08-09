# Constraints and Behavior: Collection Filters

Which of the feature's acceptance criteria
([../../constraints-and-behavior.md](../../constraints-and-behavior.md)) this
task satisfies.

## Satisfied here

**From "Filtering and search" — everything except search and infinite scroll:**

- The left rail lists **every tag the user has** plus the three reading
  statuses, each a toggle.
- Tags are **multi-select and AND-composed** — an article must carry all
  selected tags.
- The statuses behave as a **single-select group** within that list, rendered
  identically to user tags.
- **Filter state lives in the URL**: the narrowed collection is shareable and
  survives refresh and back/forward, and an inactive filter leaves no trace in
  the URL.
- When filters exclude everything, the page says **"no articles match"**,
  distinct from the empty-collection text.

**From "Cross-cutting quality":**

- Every filter toggle exposes **`aria-pressed`**, is distinguishable by more
  than color alone, and has a visible focus indicator in both themes.
- The filter list is marked up as a **navigation region now that it has
  contents** — #7 left it un-landmarked precisely because it did not.
- The rail **moves below the main content on narrow screens**, per the decided
  responsive convention that names this rail as its example.
- Live result changes are announced without an announcement per interaction.
- Correct in both themes and at narrow, mid, and wide widths.
- CI passes.

## Explicitly not satisfied here

- **The search bar**, and the requirement that search composes with these
  filters — task 4. The composition point is designed here and used there.
- **Infinite scroll** — task 4.
- Everything under **"Schema"**, **"Writes and authorization"**, and **"Tag and
  reading-status interaction"** — task 2. This task reads the tag list and
  writes nothing.
- The **toolbar layout** criteria — task 4.

## Exit state

A signed-in user selects `transformers` in the rail and the grid narrows to
articles carrying it; adding `reading` narrows it further, to articles carrying
the tag **and** in that status. The URL reflects both, and pasting it into a new
window reproduces the view. Deselecting everything restores the collection.
Selecting a combination nothing matches says "no articles match" rather than
implying the collection is empty. On a narrow window the rail sits below the
cards instead of beside them.
