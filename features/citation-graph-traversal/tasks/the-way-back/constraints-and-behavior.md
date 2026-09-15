# Constraints and Behavior: The Way Back

The feature's **The way back** behavior, plus:

- **The path rules are a pure module**: next path on opening a paper, path for a
  path link, the folded display. The header component only renders it.
- **Titles and labels come from sync**, through the existing owner-scoped queries
  (task 2's for the labels); nothing extra is fetched per step.
- **Replaces `article-title.tsx`'s single title** when there is a path, and
  renders it unchanged when there is none.
- **The fold menu is Base UI's Menu**, like the site's other menus.

## Acceptance

Feature criterion 8.
