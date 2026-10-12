# Task: Older Papers Are Read for Contents

Task 2 of 4 of [#29](../../description.md). Sub-issue [#246](https://github.com/nicbk/nicbk-website/issues/246).

A queue, filled at worker start, that reads every finished paper without an
`article_contents` row. It reads the stored PDF and runs GROBID only when the
outline is unusable. It writes only the contents row. This is #10's
`reread-stage.ts` pattern, applied to contents.
