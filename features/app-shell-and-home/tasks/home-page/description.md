# Task: Home Page

Deliver the personal site's home page — the payload the walking skeleton
exists to render.

## What this task does — concretely

- Implement `src/routes/(personal-site)/index.tsx` as the home route,
  rendering exactly the two static content lines from `home-page.png`:

  ```
  who: 22 yr old dude from SF Bay Area
  doing: MLE intern @ Pinterest Labs in SF, MSCS AI @ Stanford
  ```

- No dynamic data, no data fetching, and no layout elements beyond the shared
  header — per the home-page spec, the content is final and nothing further
  is planned.
- Give the page a correct document heading structure so the shell's
  focus-handoff has a heading to target, and style it purely from the design
  tokens (CSS Module pulling from the global custom properties).
- Replace any placeholder the shell task rendered at `/` with this real page.

## Not in this task

- Any other page, navigation target, or reactive data.
- Containerization/deployment (final task).
