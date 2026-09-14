# Task: Links Stay Put

Task 1 of 3 of [#22](../../description.md). Sub-issue
[#186](https://github.com/nicbk/nicbk-website/issues/186).

Lock the file's link annotations and give the reader its own `link` renderer: a
URL click copies (with a confirmation toast), a `mailto:` copies the address, and
an internal link does nothing until task 3.

## Files

- `reader-plugins.ts` — a `link` tool override with its own category; the
  category lock.
- A registered `link` renderer and its click handler, beside the reader.
- A confirmation toast beside `use-error-toast.ts`.

## Does not

Touch marks, the file's own highlights, or the selection menu.
