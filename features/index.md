# Features

Live operational state: what is being built, right now, and in what order.
This is a sibling of `src/`, `research/`, and `high-level-guidance/` — not a
research artifact (see
[../research/project-management-conventions/feature-definition-and-scoping.md](../research/project-management-conventions/feature-definition-and-scoping.md)),
but the tracking layer where already-decided research is turned into
implementable work.

## What a feature is

A **feature is one vertical slice** — a complete, independently
testable/demoable unit of user-visible behavior that touches every layer it
needs (UI, server, data) to actually work end-to-end. Infra-only or
route-only horizontal slices are not features on their own; they ride inside
the first feature that actually needs them.

Every feature is a `features/<feature-slug>/` folder with six files
(`plan.md`, `description.md`, `constraints-and-behavior.md`, `testing.md`,
`status.md`, `research.md`) and always at least one `tasks/<task-slug>/`
(four files: `description.md`, `constraints-and-behavior.md`, `testing.md`,
`status.md`, plus `research.md` only if it needs research beyond the
parent's). Work proceeds **one task at a time**, each gated by its own
PR + CI/CD + human review before the next task starts. Slugs are kebab-case.
Full rules, including mandatory `research.md` traceability back into
`research/*.md`, are in
[../research/project-management-conventions/feature-definition-and-scoping.md](../research/project-management-conventions/feature-definition-and-scoping.md).

## Roadmap

Ordered by dependency. Each feature is a vertical slice; infra is introduced
by the first feature that needs it rather than in an up-front infra phase.

### Phase 0 — Foundation (walking skeleton)

| # | Feature | Slug | Status | Depends on |
|---|---|---|---|---|
| 1 | App shell + home page | [`app-shell-and-home`](./app-shell-and-home/description.md) | **Complete** (2026-07-06; all 5 tasks merged) | — |

The first slice necessarily carries the stack bring-up it needs to exist:
the TanStack Start app, routing/route-groups, the design system (tokens,
JetBrains Mono, light/dark theming), the sticky site header, CI, and the
app-server Docker/Compose definition — and delivers the home page on top.
Because the personal site has no reactive data, this slice does **not** stand
up Postgres/Zero/Garage/GROBID; those arrive with the features that first
need them (see Phases 2–3).

### Phase 1 — Static site-wide (complete 2026-08-01; no auth, no data layer)

| # | Feature | Slug | Status | Depends on |
|---|---|---|---|---|
| 2 | About page (incl. GPG fingerprint + WKD/`.asc` publishing) | [`about-page`](./about-page/description.md) | **Complete** (2026-07-07; both tasks merged, #34 + #35) | #1 |
| 3 | Projects page (entry point to Lit Tracker) | [`projects-page`](./projects-page/description.md) | **Complete** (2026-08-01; its one task merged, #55) | #1 |
| 4 | Blog (MDX pipeline + list + post) | [`blog`](./blog/description.md) | **Complete** (2026-07-18; all 3 tasks merged, #37 + #39 + #46) | #1 |
| 5 | 404 + error-fallback pages | [`error-and-not-found`](./error-and-not-found/description.md) | **Complete** (2026-07-07; both tasks merged, #32 + #33) | #1 |

### Phase 2 — Authentication (complete 2026-08-01; gates all of the Lit Tracker; introduced Postgres + Better Auth)

| # | Feature | Slug | Status | Depends on |
|---|---|---|---|---|
| 6 | Authentication (Better Auth + Google OAuth, session hardening, sign-in page, user settings) | [`authentication`](./authentication/description.md) | **Complete** (2026-08-01; all 3 tasks merged, #57 + #59 + #60) | #1 |

### Phase 3 — Lit Tracker (started 2026-08-01; each needs auth; #7 is the ingest slice everything else builds on; introduced Garage/GROBID/Zero/pg-boss)

| # | Feature | Slug | Status | Depends on |
|---|---|---|---|---|
| 7 | Article upload + extraction pipeline (Garage, pg-boss jobs, GROBID + Semantic Scholar, upload status) | [`article-upload-and-extraction`](./article-upload-and-extraction/description.md) | **Complete** (2026-08-09; all 5 tasks merged, #67 + #68 + #69 + #70 + #71) | #6 |
| 8 | Collection view (card grid, tags, reading status, filtering, live search) | [`collection-view`](./collection-view/description.md) | **Complete** (2026-08-09; all 4 tasks merged, #86 + #88 + #90 + #92) | #7 |
| 9 | Article detail + PDF reader + annotations | [`article-detail-and-reader`](./article-detail-and-reader/description.md) | **Complete** (2026-08-17; all 6 tasks merged, #96 + #97 + #98 + #99 + #100 + #105) | #7, #8 |
| 10 | Citation-graph traversal | `citation-graph-traversal` | Not yet spec'd | #9 |
| 11 | Article edit (correcting what the extractor got wrong, deleting an article) | [`article-edit`](./article-edit/description.md) | **Complete** (2026-09-13; all 3 tasks merged, #141 + #142 + #143) | #7, #8 |
| 12 | Reader touch + gestures (pinch zoom, touch scrolling, click-away, touch selection) | [`reader-touch-and-gestures`](./reader-touch-and-gestures/description.md) | **Complete** (2026-08-23; all 7 tasks merged, #109 + #111 + #114 + #112 + #118 + #122 + #116) | #9 |
| 13 | Tracker navigation latency (the auth guard stops blocking) | [`tracker-navigation-latency`](./tracker-navigation-latency/description.md) | **Complete** (2026-09-12; its one task merged, #136) | #6, #8 |
| 14 | Reader zoom performance (tiled rendering, so zooming in stops costing the whole paper) | [`reader-zoom-performance`](./reader-zoom-performance/description.md) | **Complete** (2026-08-23; its one task merged, #121) | #9 |
| 15 | Reader marking a passage (the text tools reach the selections a reader actually makes) | [`reader-marking-a-passage`](./reader-marking-a-passage/description.md) | **Complete** (2026-09-11; both tasks merged, #129 + #130) | #9, #12 |
| 16 | Surface layering (the toolbar stays above the collection; a mark's controls stay above the reader toolbar) | [`surface-layering`](./surface-layering/description.md) | **Complete** (2026-09-13; both tasks merged, #153 + #154) | #8, #9 |
| 17 | One header row (the site's header and the tracker's become one row with two sets of items, at one declared height) | [`one-header-row`](./one-header-row/description.md) | **Complete** (2026-09-13; its one task merged, #157) | #1, #8 |
| 18 | Controls look like controls (a filter reads as pressable; the upload controls are finished) | [`controls-look-like-controls`](./controls-look-like-controls/description.md) | **Complete** (2026-09-14; both tasks merged, #162 + #163) | #4, #7, #8 |
| 19 | The site fits a phone (fields stop zooming iOS; code fits a narrow column) | [`the-site-fits-a-phone`](./the-site-fits-a-phone/description.md) | **Complete** (2026-09-14; its one task merged, #169; the user's phone check passed) | #4, #8, #9, #11 |
| 20 | A popup keeps its clicks (clicking a menu stops opening the card behind it) | [`a-popup-keeps-its-clicks`](./a-popup-keeps-its-clicks/description.md) | **Complete** (2026-09-14; its one task merged in two PRs, #174 — #176 + #177) | #8, #11 |
| 21 | A paper downloads once (reopening a paper revalidates instead of re-downloading it) | [`a-paper-downloads-once`](./a-paper-downloads-once/description.md) | **Spec'd** (2026-09-14; 1 task, not started) | #7, #9 |

## How this roadmap is spec'd out

Following the decided one-at-a-time, gated process, features are fleshed out
**just-in-time** rather than all at once — `app-shell-and-home` (complete),
`about-page` (complete), `error-and-not-found` (complete), `blog` (complete),
`projects-page` (complete), `authentication` (complete),
`article-upload-and-extraction` (complete), `collection-view` (complete),
`article-detail-and-reader` (complete), `reader-touch-and-gestures` (complete),
`reader-zoom-performance` (complete), `reader-marking-a-passage` (complete),
`tracker-navigation-latency` (complete), `article-edit` (complete),
`surface-layering` (complete), `one-header-row` (complete),
`controls-look-like-controls` (complete), `the-site-fits-a-phone` (complete),
`a-popup-keeps-its-clicks` (complete) and `a-paper-downloads-once` (spec'd) have full
folders today. The rest carry a one-line
intent here and get their full folder
(six files + tasks) written when we reach them, so their specs reflect the
actual state of `main` at that point instead of drifting from a speculative
up-front draft.

#8 was spec'd this way — written the day after #7 merged, against the code #7
actually left rather than a forecast of it: it upgrades that minimal collection
surface (the reserved search slot, the empty sidebar rail, the plain article
list) instead of starting from nothing, and it is the first consumer of the
`/mutate` endpoint #7 shipped real but unexercised.

#9 was spec'd the same way, the day #8 merged — against the page #8 actually
left rather than a forecast of it. That showed up concretely: its cards ship
without links because this feature is their decided target, so #9 turns them
into links rather than inventing a route to point at, and its Tags tab is a
second view of #8's working tag model rather than a second model. Spec'ing it
late also caught that **EmbedPDF's annotation API had moved** since the
technology was chosen, including a `committed` flag on its change events that
the persistence design has to gate on — a detail an up-front draft written in
July would have got wrong.

**#12, #13, #14 and #15 came from using the finished tracker, not from the
roadmap** — the first two reported by the user on 2026-08-17, the day #9
completed, #14 on 2026-08-23, and #15 from measurements taken while finishing
#12. They are the entries here that exist to fix built behaviour rather than to
add some, which is why they are features rather than a "bugs" list: each is a
vertical slice of user-visible behaviour with its own acceptance criteria, and
the project has no separate defect track. **All four are complete as of
2026-09-12**, and #13 was the last of them: the only one of the five reported
symptoms whose cause was not in the reader, and the only one whose fix was a
round trip removed rather than a behaviour rebuilt.

**#15 has a different provenance from the other three, and it is worth naming.**
It came from a task measuring its own premise: #12's last task asserted that a
markup tool already marks a whole multi-page selection, "already true of a
pointer drag". It is not true, and checking turned up a second defect nobody had
reported — a selection spanning two pages shows no copy control. **An acceptance
criterion that describes existing behaviour is a measurement, not a given.**

**Their causes were measured before any of them was spec'd** — see each one's
`research.md` — which is what split five reported symptoms into two features
instead of five tasks, and then did the same again on 2026-08-23: of three
symptoms reported in one message, the pinch that also selects text became a task
of #12 (pointer routing during a gesture) while the lag and the phone reload
became **#14**, because their one cause is in the render pipeline and costs a
mouse exactly what it costs a thumb.

**#11 was spec'd this way on 2026-09-12**, and both halves of what it was
predicted to inherit turned out to be true — with a detail the one-liner could
not have known. It does extend #8's card menu rather than adding a second
control: `ArticleMenu`'s own doc comment names this feature and says where its
two items go. And it does inherit #7's unresolvable failure path — but reading
`recordOutcome` showed the path is not quite the shape the line above assumed. A
failed extraction *does* create the article, so deleting it clears the warning
for free through a cascade, while **editing it clears nothing**, which is a whole
task and would have been a defect in a spec written earlier. It also gave a
decision back to #10: reference editing, which the decided interface puts in this
modal, waits for the Citations tab that displays references.

**#16 came from using the finished tracker too, and it is the first one a
Chrome-only browser pass could never have found.** It was filed on 2026-09-13
from a list of sixteen reported items, whose causes were measured before any
grouping — which is what showed that two of them share one: an order the code
never states, left to the engine's defaults. The collection toolbar's half is
**Safari-only**; Chrome renders that page correctly at every width tested, which
is why the defect has been live in production unnoticed. Two hypotheses were
tested and rejected on the way to it (the row's deliberate transparency, and
`container-type` forming the offending stacking context), and the third was
found only by driving Safari — something this project had never done. The
feature therefore also carries the change to how browser verification works,
which is the part that outlives the two fixes.

**#17 came out of the same list, and out of #16's own habit.** Item 8 reported
the tracker's header as a different height from the site's. Measuring it first —
the practice #16 wrote into `AGENTS.md` — showed the report was not quite right:
the rows differ by 1–1.6px at desktop, are *identical* at 500px, and the tracker
is the **shorter** of the two. Shown the numbers, the user confirmed the single
pixel is what they see, which makes it a real defect and also a useful
calibration. The fix they chose is a merge rather than two reconciled numbers,
because the pixel is a symptom: two stylesheets computing a height independently
had no reason to agree and no test holding them. That reverses a decided spec
from 2026-07-04, which is why both header documents carry a revision rather than
an edit.

**It completed the same day, and the general lesson is about reporting rather
than about headers.** A measurement confirmed the complaint was real while
showing its stated cause was wrong — "the tracker header is taller" is false, and
the thing behind it was not. Handing over the numbers instead of a verdict is
what let the user decide that, and it is the reason a 1px cosmetic report turned
into deleting a duplicated computation. Every header on the site now measures
56.00px in **both** engines, where the old site header was fractional and the two
engines disagreed about it.

**#18 is the third from that list, and it found a defect nobody reported.** Four
items were measured before grouping, and the measurement did two things a spec
written from the report could not. It **ruled out the obvious cause** of the
spinner wobble — lucide's arc is drawn on the viewBox centre, so the art is not
off-centre — leaving a fractional 18.4px box as the one measured candidate. And
it found that **the blog carries the same heading-versus-toggle collision as the
tracker**, invisible only because the blog's tags are prefixed `#`. The remedy's
direction was then forced rather than chosen: the label is already at the 4.5:1
contrast floor, so the control is the only thing that can move.

**It also produced the session's clearest result on a question nobody could
measure.** The spinner's fractional box shipped as *one candidate* rather than a
cure, with a composited-layer fallback deliberately held back — and the user
confirmed the wobble gone, which settled the cause instead of leaving two changes
and a shrug. Where a fix can only be judged by someone else's eyes, one change per
round is the difference between a finding and a guess. The feature's other lesson
came from a rejection: its picker met the acceptance criterion — "a dotted
boundary" — without designing anything, because the criterion named a visual
property instead of an outcome.

**#19 is the last of the measured clusters from that list, and it removed a
limitation rather than working around one.** Several earlier tasks recorded "320px
not verified", because Chrome refuses to resize its window below roughly 500px —
so this feature was very nearly accepted as one the agent could not check at all.
**Safari accepts arbitrary window bounds by AppleScript**, which produced a real
375px viewport and with it the numbers the spec is built on: a code block showing
34 of its 62-character lines with 214px of overflow, and four text controls —
not the one the report implied — sitting below the 16px iOS zoom threshold. The
two halves pull opposite ways, fields up and code down, which is why they are
specified together with the reasoning written down.

**#20 is the one item from that list that resisted three attempts**, and why is
worth more than the fix. The card's click guard already skips every control, so
clicking menu *items* — the obvious thing to click — always behaved correctly;
the defect lives only on inert surface, a popup's padding and its details text.
Two earlier passes concluded "not reproducible in Chrome" and reached for an
engine difference, which had been the answer twice that week. It is not one here:
**React portals propagate events through the React tree, not the DOM**, so
everything a card portals reaches the card's handler even though none of it is a
DOM descendant. The blast radius is larger than reported — the edit and delete
dialogs are mounted from that menu, so clicking a label while correcting metadata
navigates away from the form.

**#19 and #20 both completed 2026-09-14, each with a step past the merge.** #19's
definition of done included the user's phone, and its parent stayed open until
the drawer's tag search box stopped zooming iOS. #20 needed a second PR: its spec
audited click handlers by searching for `onClick=`, and the title `<Link>`
navigates from a handler inside the router library that no search of this
repository can find — the venue tooltip still navigated until it was clicked in
the browser. The scroll overshoot reported in the same list is no longer seen by
the user and is dropped.

**#21 is the first of that list's three new capabilities, and it turned out to be
a deferred decision rather than a missing feature.** The PDF route's
`no-store` was written as a placeholder — its comment says so — and the reader
has re-downloaded every paper on every visit since: 13.4 MB twice in a row for
the largest, measured on `nicbk.com`. The user chose revalidation over
`immutable` to keep the per-read authorization the security decision promises,
and Garage was probed first: it answers conditional reads itself, so an
unchanged paper costs a 304 and no storage read.

**Both tasks merged 2026-09-13, and the second one earned its own lesson.** Its
measurement ruled out the remedy its own spec had assumed — the menu sits inside
two nested stacking contexts whose outer one exists *because* the paper once
painted over the toolbar, so no layer value frees it — and the feature had to be
re-decided with the user mid-task rather than implemented as written. The
browser then found three defects the unit tier could not, **one of which the
first browser check itself reported as a pass**, because HMR had re-rendered a
menu that was already on screen. That is the sharpest available argument for the
reload-before-verifying habit: the verification step had a false-positive mode of
its own.

#10 stays a one-liner for the same reason #11 did. It inherits a populated
citation graph plus a
measured list of what is still wrong with it (see
[#7's task status](./article-upload-and-extraction/tasks/semantic-scholar-enrichment/status.md)) —
the graph's accuracy is deliberately #10's problem, not #7's. #10 also inherits
the **Citations tab** #9 deliberately leaves unbuilt: the decided detail page
has four sidebar tabs, #9 builds three, and the fourth arrives with the citation
graph it opens rather than as a list #10 would rebuild.
