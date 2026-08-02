# Status: User-Settings Modal

**State:** Implemented (2026-08-01); awaiting PR + CI + review. Built on
`auth-backend-and-config` (session helper, Better Auth endpoints) and
`sign-in-and-route-guard` (the guard, which the test-only probe page uses).

- Branch: `authentication/user-settings-modal`.
- Sub-issue: [#30](https://github.com/nicbk/nicbk-website/issues/30)
  (parent [#27](https://github.com/nicbk/nicbk-website/issues/27)); self-assigned.
- PR / CI / review: _pending._

## What was built

- **`<UserSettings>`** (`src/routes/-shared/components/user-settings/`) — a
  centered Base UI `Dialog`: the signed-in account email (display only), a log
  out action, and a delete-account action behind an inline type-to-match
  confirmation. The caller supplies the trigger's contents, label, and class,
  so #7's avatar drops straight in.
- **`matchesConfirmation`** — the pure, unforgiving match predicate (no
  trimming, no case folding; an empty phrase never matches).
- **`account-action-error.ts`** — failure-code → message mapping, with the one
  code that needs a different remedy (a stale session) singled out.
- **`--color-error`** added to both palettes and to the contrast audit
  (`src/styles/contrast.test.ts`), settling the question left open by task 2.
- **`user.deleteUser.enabled` + an explicit `session.freshAge`** in
  `create-auth.ts` — `/delete-user` 404s without the first, and the second is
  now stated rather than inherited.
- **`/user-settings-probe`** — a test-only page that mounts the modal, gated
  behind a build-time flag exactly like `/error-probe`.

## Implementation-time decisions worth review

- **A test-only probe page rather than deferring the browser tier to #7.**
  Nothing opens this modal yet, so there was no running page to test focus
  trapping, theming, or a real delete against. `/user-settings-probe` is gated
  behind `VITE_E2E_USER_SETTINGS_PROBE`, which only `scripts/e2e-auth-server.mjs`
  sets; production builds render the ordinary 404 there, and
  `e2e/not-found.spec.ts` asserts exactly that. It is also the route guard's
  first live consumer.
- **Session freshness kept (24 h) instead of disabled.** Better Auth refuses
  `/delete-user` on a session older than `freshAge`. Setting `freshAge: 0`
  would have removed the refusal; instead the modal recognizes the refusal and
  offers a trip back through Google, which mints a fresh session. A stolen
  cookie from a reader who signed in days ago therefore cannot delete the
  account.
- **The delete button is `aria-disabled`, not `disabled`.** Base UI's
  `focusableWhenDisabled` keeps it in the tab order so a screen-reader user can
  find it and hear both that it is unavailable and (via `aria-describedby`)
  what unlocks it. A natively disabled button is unreachable and silent.
- **Neutral inline errors are gone.** Task 2 left the palette without an error
  token and used full-strength text; this task adds `--color-error`, audited at
  the 4.5:1 text bar in both themes, and uses it for inline errors and for the
  destructive control's border and text.

## Two bugs the browser caught that the tests did not

- **Server-only code was reaching the client bundle.** `src/auth/session.ts`
  named a server-only type with this project's inline-type import style, which
  under `verbatimModuleSyntax` compiles to a surviving side-effect import. The
  moment a route imported the guard, Better Auth, Drizzle, and Postgres' driver
  were bundled for the browser and hydration died on `Buffer is not defined` —
  which silently disabled every interactive control on every page. Fixed with a
  separated `import type` and a documented `biome-ignore`; the conventions file
  carries a dated revision and an open question about doing it project-wide
  (see [import-conventions.md](../../../../research/coding-conventions/import-conventions.md)).
- **The destructive button rendered in ordinary text color.** `composes:` emits
  the composed class alongside rather than inlining it, so `.action` and
  `.destructive` had equal specificity and the bundler's emit order decided the
  winner. Fixed by qualifying the overrides with the section they live in; the
  e2e now asserts the rendered color, which is the only tier that can — jsdom
  applies no CSS.

## Verification

- **Unit (Vitest):** 40 tests across the four new files — the predicate, the
  error mapping, the modal (open/close, focus handoff, email display, log out,
  reset on reopen), and the delete flow (gating, cancel, failures, the
  re-authentication branch, no double-submit).
- **Integration (Testcontainers Postgres):** log out really invalidates the
  session row; delete really removes user + account + session and stops
  resolving; and a backdated session is refused with the exact `SESSION_EXPIRED`
  code the modal keys off — so the client mapping cannot drift from the server.
- **E2e (stubbed Google, real Postgres):** guard redirect, email display, focus
  trap and restore, inert-until-exact-match, both themes, 360px, axe in both
  themes and both states, log out, and account deletion. All 11 auth-tier tests
  pass.
- **Browser:** swept 320/360/768/1440px in both themes, in the plain and
  confirming states — no horizontal overflow at any size, and the focus ring
  and destructive coloring confirmed on the running page.

## Notes carried into implementation

- Live avatar trigger and any cascade of user-owned data remain #7's (nothing
  downstream to cascade to yet — deletion removes only the identity rows).

## Log

- 2026-07-06 — Task defined during feature spec. Not yet started; follows
  `auth-backend-and-config`.
- 2026-08-01 — Three decisions taken with the user before implementation: add
  `--color-error` rather than keep the neutral treatment; keep delete-time
  session freshness and add a re-authenticate affordance; build a gated
  test-only probe page so the modal can be exercised in a browser now.
- 2026-08-01 — Implemented on `authentication/user-settings-modal`. Two bugs
  found by browser verification (client-bundle leak, destructive styling
  override) fixed and locked in. Awaiting PR + CI + review.
