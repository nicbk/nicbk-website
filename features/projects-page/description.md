# Feature: Projects Page

The personal site's `/projects` page: a simple list of the sub-applications
hosted on this site, per
[research/ui-ux/pages/site-wide/pages/projects.md](../../research/ui-ux/pages/site-wide/pages/projects.md).

Concretely, this feature produces:

- The **static projects page** at `/projects`, replacing the placeholder route
  that currently exists only so the site header's `projects` link resolves: a
  "projects" heading followed by a list of entries, each entry a **name plus a
  one-line description**, the description in the dimmer secondary text color
  already used for secondary text elsewhere on the site (the blog list's dates
  and descriptions).
- **One entry at launch:** the Academic Literature Tracker
  ([high-level-guidance/design/lit-tracker/DESIGN.md](../../high-level-guidance/design/lit-tracker/DESIGN.md)).

No card/grid layout, no tech-stack badges, no status tags — name and
description only, per the decided page spec and the design philosophy's
avoid-overcomplicating guidance. Entirely static content: no data fetching, no
reactive subscription, no loading or empty state.

## Scope boundary

This is the last Phase 1 static page (see [../index.md](../index.md)). It
stands up **no** data layer, auth, or reactive data, and it introduces no new
infrastructure — the shell, header, design tokens, theming, and the colocated
page-component pattern all already exist from
[`app-shell-and-home`](../app-shell-and-home/description.md) and the
[`about-page`](../about-page/description.md) / [`blog`](../blog/description.md)
features, and are reused rather than rebuilt.

The Literature Tracker itself is Phase 3 (`article-upload-and-extraction` and
onward), gated by [`authentication`](../authentication/description.md) in
Phase 2. This feature only lists it.

## The entry is text, not yet a link

The decided page spec says each entry is a **single link** wrapping the name
and description. At the time this feature ships there is nothing to link to:
the Literature Tracker does not exist, no route serves it, and its URL has not
been decided in `research/`. Linking anyway would mean either pointing at a URL
that 404s or inventing a placeholder page that no spec covers — both of which
promise a reader something the site cannot deliver.

So the entry ships as **plain text now, and becomes a link in the Phase 3
feature that actually creates the Literature Tracker route** — the same feature
that will decide its URL. This is a deliberate, temporary deviation from the
page spec, recorded in [research.md](./research.md) with the follow-up it is
owed; it is a difference in *when* the link appears, not a change to the
decided design.
