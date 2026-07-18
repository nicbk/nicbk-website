# File Hierarchy and Complexity

Researched: 2026-07-04. Decided: 2026-07-04. Revised: 2026-07-17
(per-page colocation — a page's route file now sits in the same folder as
the code that implements it; see the colocation bullets and Concrete Layout
below).

Concrete, code-specific rules for when to split a component/module into its
own file or folder, and colocation conventions — operationalizing
[AGENTS.md](../../AGENTS.md)'s "manage complexity through folder structure"
principle specifically for code (that principle already covers docs in
general; this is its code-specific application).

## Decision

- **Splitting a file into a folder: triggered by real siblings appearing,
  not a line-count threshold.** A component starts as a single file
  (`my-component.tsx`). Convert it into a folder
  (`my-component/my-component.tsx` plus siblings) once it actually
  accumulates things that belong beside it — a colocated hook, sub-component
  used only by it, or a test file — not preemptively and not based on an
  arbitrary size metric.
- **Colocation is the default: keep a component's tests, styles, hooks, and
  tightly-coupled sub-components in the same folder as the component**,
  rather than splitting into parallel top-level trees (no separate
  top-level `styles/` or `__tests__/` tree mirroring the component tree).
  This is consistent with the already-decided allowance for small
  tightly-coupled sub-components living alongside their parent (see
  [component-and-export-conventions.md](./component-and-export-conventions.md)).
- **Top-level organization: feature-based with a shared escape hatch, not
  type-based.** Distinct areas of the project (the personal site, the
  lit-tracker sub-app) each get their own tree containing their own
  components/hooks/utilities, rather than one global `components/`,
  `hooks/`, and `utils/` each holding everything across the whole project.
  A shared/common layer holds only code actually used across more than one
  feature area.
- **Feature code is colocated inside TanStack Router's own `routes/` tree**,
  using its `-`-prefixed file/folder convention (files/folders prefixed
  with `-` are excluded from route-tree generation but still live inside
  `routes/`), rather than split into a separate top-level tree that
  mirrors `routes/`'s structure. See Concrete Layout below.
- **A page's route file and the code that implements it live in the same
  folder.** A page owning a single route gets a folder named for its path
  segment, holding the route file (`route.tsx`) beside its `-`-prefixed
  implementation — e.g. `about/route.tsx` next to `about/-about-page/`. A
  sub-feature spanning several routes gets one folder holding all of its
  route files plus the `-components/`/`-lib/`/`-utils/` those routes share —
  e.g. `blog/` with `index.tsx` + `$slug.tsx` alongside `-list-page/`,
  `-post-page/`, and the shared `-components/`/`-lib/`/`-utils/`. This keeps
  everything needed to read one page in one place, rather than separating
  route files at a group's root from their implementations under a single
  group-wide `-components/` folder. The one route that can't be a
  path-named folder — the group's index (`/`) — is wrapped in a pathless
  `(home)/` group (pathless groups add no URL segment) so it, too, gets its
  own folder holding `index.tsx` beside `-home-page/`. This is the same
  colocate-beside-the-one-route rule already stated below under "Two
  colocation granularities"; the route file is simply one more colocated
  sibling of the code it wires up.
- **Promotion to the shared layer: on the 2nd consumer**, not the 3rd. As
  soon as a second feature area needs the same logic/component, move it to
  the shared layer — don't wait for a third consumer (the more conservative
  "rule of three").
- **No explicit folder-nesting depth limit.** Rely on judgment and
  readability rather than an arbitrary cap; revisit only if deep nesting
  becomes an actual practical problem.

## Concrete Layout

The principles above translate into this top-level structure. Feature code
is colocated inside `routes/` itself, using TanStack Router's `-`-prefix
convention (`routeFileIgnorePrefix`, default `-`) to mark files/folders as
excluded from route-tree generation while still living alongside the
routes they belong to — avoiding a second tree that just mirrors `routes/`:

```
.
├── Dockerfile
├── docker-compose.yml
├── .env.example                (committed — documents every var)
├── .env                         (gitignored)
├── biome.json
├── drizzle.config.ts            (Drizzle Kit config — points at
│                                src/db/schema.ts and the drizzle/
│                                migrations output below; see
│                                devops-deployment/database-migrations.md)
├── drizzle/                     (Drizzle Kit's generated SQL migration
│                                files + meta/ snapshots — committed, this
│                                is the actual migration history, applied
│                                via Compose's pre_start step)
├── tsconfig.json
├── vite.config.ts
├── package.json
├── public/                     (static assets)
└── src/
    ├── env.ts                  (Zod-validated process.env, imported first
    │                            at the server entry point — fails fast on
    │                            missing/invalid config)
    ├── router.tsx
    ├── routeTree.gen.ts         (generated by TanStack Router — never
    │                            hand-edited)
    ├── routes/                  (TanStack Router file-based routes)
    │   ├── __root.tsx
    │   ├── __root.module.css     (document-root base: html/body margin,
    │   │                         background, base font/colors — applied by
    │   │                         RootDocument via className, colocated with
    │   │                         the component that renders <html>/<body>
    │   │                         rather than floating in globals.css. See
    │   │                         styling-conventions.md)
    │   ├── -shared/              (dash-prefixed: excluded from the route
    │   │   │                     tree; code promoted here once a 2nd
    │   │   │                     feature needs it — see Decision above)
    │   │   ├── components/
    │   │   ├── lib/               (wrappers/facades)
    │   │   └── utils/             (small general-purpose pure functions)
    │   ├── (personal-site)/       (route group)
    │   │   ├── route.tsx           (group layout — the shared site shell)
    │   │   ├── (home)/             (pathless group so the index route `/`
    │   │   │   │                    gets its own folder like every page)
    │   │   │   ├── index.tsx        (the `/` route)
    │   │   │   └── -home-page/      (its implementation, colocated)
    │   │   ├── about/
    │   │   │   ├── route.tsx        (the `/about` route)
    │   │   │   └── -about-page/     (its implementation, colocated)
    │   │   ├── projects.tsx         (trivial stub — no siblings yet, so it
    │   │   │                         stays a flat file per the split rule)
    │   │   └── blog/                (a sub-feature spanning two routes)
    │   │       ├── index.tsx        (the `/blog` route)
    │   │       ├── $slug.tsx        (the `/blog/$slug` route)
    │   │       ├── -list-page/      (implements `/blog`)
    │   │       ├── -post-page/      (implements `/blog/$slug`)
    │   │       ├── -components/     (shared by both blog routes)
    │   │       ├── -lib/
    │   │       └── -utils/
    │   └── lit-tracker/
    │       ├── -components/       (shared across multiple lit-tracker
    │       │                      routes, e.g. header, sidebar filters)
    │       ├── -lib/
    │       ├── -utils/
    │       ├── -server/           (server-only business logic — the
    │       │   │                  *.server. suffix keeps it out of the
    │       │   │                  client bundle regardless of physical
    │       │   │                  location, so it colocates here rather
    │       │   │                  than in a separate top-level tree)
    │       │   ├── upload.server.ts       (Zero /query, /mutate handlers)
    │       │   └── jobs/
    │       │       ├── extract.server.ts  (pg-boss job handlers)
    │       │       ├── enrich.server.ts
    │       │       └── finalize.server.ts
    │       ├── index.tsx
    │       └── articles.$id/
    │           ├── -article-detail-card.tsx  (used only by this route —
    │           │                              colocated directly beside
    │           │                              it, not promoted anywhere)
    │           └── index.tsx                 (the actual route file)
    ├── db/
    │   └── schema.ts            (Drizzle's schema — the project's
    │                            canonical data-shape source, per
    │                            typescript-conventions.md. zero/schema.ts
    │                            below is generated from this file via
    │                            drizzle-zero, never hand-edited. Kept
    │                            outside routes/ as app-level
    │                            infrastructure, same rationale as zero/)
    ├── zero/
    │   └── schema.ts            (generated by drizzle-zero from
    │                            src/db/schema.ts — never hand-edited, like
    │                            routeTree.gen.ts. No .server./.client.
    │                            suffix, since both client and server
    │                            import it. Kept outside routes/, alongside
    │                            styles/ and env.ts, since it's app-level
    │                            infrastructure, not UI/logic tied to any
    │                            route. Its default lookup path is
    │                            overridable via ZERO_SCHEMA_PATH if this
    │                            ever needs to change)
    └── styles/
        ├── colors.css           (color tokens, incl. light/dark theme
        │                        variants scoped by [data-theme] — see
        │                        styling-conventions.md)
        ├── typography.css       (font-size/weight/line-height tokens)
        ├── spacing.css          (spacing-scale tokens)
        └── globals.css          (@imports the category files above, plus
                                 only irreducibly cross-cutting primitives —
                                 box-sizing reset, base `a` color, the
                                 :focus-visible ring; element-specific base
                                 styling colocates with its component, e.g.
                                 __root.module.css — see styling-conventions.md.
                                 Imported once, from __root.tsx)
```

- **Two colocation granularities**, matching how widely code is used:
  - Code used by **exactly one route** colocates directly beside that
    route file (e.g. `articles.$id/-article-detail-card.tsx`, or a page's
    whole `-about-page/` implementation folder beside its `about/route.tsx`)
    — no reason to place it any further away than the one route that needs
    it.
  - Code used by **multiple routes within one feature** (e.g. lit-tracker's
    header, used across several lit-tracker routes) can't belong to a
    single route file, but still nests inside that feature's route subtree
    via a dash-prefixed folder at the shared ancestor level
    (`lit-tracker/-components/`), rather than being pulled out to a
    completely separate top-level tree disconnected from `routes/`.
- **`lib/` vs. `utils/` split**: `lib/` holds more substantial
  wrappers/facades around external functionality (e.g. an API-client
  wrapper); `utils/` holds small, general-purpose pure functions
  (formatters, parsers, small data-shaping helpers). Both exist at every
  level feature logic can live at (colocated with a single route,
  feature-wide via a dash-prefixed folder, or promoted to `routes/-shared/`).
- **Feature-local `-lib/`/`-utils/` exist alongside `routes/-shared/`**,
  following the same colocate-first/promote-on-2nd-consumer rule already
  decided for components: non-component logic starts as close as possible
  to the route(s) that need it, and only moves to `-shared/` once a second
  feature actually needs the same logic too.
- **Server-only logic colocates within its feature's route subtree**
  (`lit-tracker/-server/`), not in one global `server/` tree — the
  `*.server.` suffix convention already keeps it out of the client bundle
  regardless of where it physically lives, so there's no reason to give it
  a separate top-level home away from the feature it serves.
- **`createServerFn` bodies stay thin pass-throughs to plain, exported
  functions** within the same `.server.ts` file (or module, if it grows
  into a folder per the splitting rule above) — the actual logic lives in
  the plain function, not inside the `createServerFn(...)` call itself.
  This isn't a folder-layout rule so much as a within-file convention, but
  it lives here since it directly affects how `-server/` files like
  `upload.server.ts` are structured. See
  [../testing-qa/test-runner-and-frameworks.md](../testing-qa/test-runner-and-frameworks.md)
  for why: TanStack Start has no reliable way to unit-test a `createServerFn`
  body directly (the `vi.mock` workaround breaks on nested server-function
  calls and skips global middleware), so keeping the wrapper thin and
  testing the plain function directly sidesteps that gap entirely.
- **`zero/schema.ts`, `styles/`, and `env.ts` stay outside `routes/`**,
  unlike feature UI/logic code — these are app-level infrastructure
  (a data schema, design tokens, environment config), not code that
  belongs to or is colocated with any particular route.

## Reasoning

- Splitting on "real siblings appear" (rather than a line-count metric)
  avoids an arbitrary threshold that would either trigger premature
  splitting or fail to trigger when it should — the presence of genuine
  siblings is a much more direct signal that a file's complexity now
  warrants a folder.
- Colocation and feature-based organization were both essentially
  uncontested across sources researched — no real tradeoff to weigh, and
  feature-based structure is a natural fit given the personal site and
  lit-tracker are already meaningfully distinct areas
  (per [../ui-ux/pages/lit-tracker/index.md](../ui-ux/pages/lit-tracker/index.md)'s
  component count).
- **Per-page folders (over one group-wide `-components/`)** were adopted on
  revision because the original layout, though it followed the colocation
  principle in spirit, still separated each route file (at the group root)
  from its implementation (under a shared `-components/`): reading one page
  meant jumping between two distant locations. Giving each page a folder
  that holds its route file beside its implementation is the more direct
  reading of the same colocate-beside-the-one-route rule, and it scales
  cleanly — a multi-route sub-feature like the blog collects its two routes
  and everything they share (`-components/`/`-lib/`/`-utils/`) into one
  self-contained folder instead of scattering them across a group-wide tree.
  The pathless `(home)/` wrapper is the one concession the router's naming
  forces: an index route is a file, not a path segment, so wrapping it in a
  pathless group (which adds no URL) is the only way to give it a folder of
  its own without inventing a `/home` path.
- The 2nd-consumer threshold (over the classic "rule of three") was chosen
  to avoid tolerating a round of duplication across two feature areas any
  longer than necessary — the risk of premature abstraction on a false
  positive is low once a second real consumer already exists (as opposed to
  speculatively extracting before any second use appears, which is the
  actual failure mode the "rule of three" guards against and which this
  decision still avoids by requiring at least one real second consumer
  before promoting).
- No explicit depth limit was adopted because only one source gave a
  specific number (max 2 levels) with no broader corroboration — codifying
  a single source's opinion as a hard rule risked more friction than value;
  judgment-based readability review is the safer default until an actual
  problem justifies revisiting this.
- The concrete layout follows TanStack Start's own scaffolding conventions
  (`src/` wrapper, `routes/` for file-based routing, config files at repo
  root outside `src/`) rather than inventing a different shape, minimizing
  friction against the framework's own tooling/generated files
  (`routeTree.gen.ts`).
- **Colocating feature code inside `routes/` via the `-` prefix (rather
  than a separate top-level tree per feature) was chosen after directly
  verifying it against TanStack Router's own docs and community
  precedent.** A GitHub discussion (TanStack/router#3046) shows a developer
  describing exactly the problem a split tree creates — parallel
  `components/dashboard/`, `utils/dashboard/`, `server-fns/dashboard/`
  trees mirroring `routes/dashboard/`, i.e. "multiple sources of truth" for
  one feature — and a TanStack maintainer's resolution was to colocate
  using the `-` prefix instead, which the developer confirmed fixed it.
  This is a framework-provided, documented mechanism (`routeFileIgnorePrefix`
  config), not a workaround, so there's no reason to reject it in favor of
  a split that the framework's own community has been moving away from.
- Docker files and env files follow unambiguous, uncontested standard
  conventions (root-level `Dockerfile`/`docker-compose.yml`, not a nested
  `docker/` folder; `.env.example` committed with `.env`/`.env.local`
  gitignored; a Zod-validated `env.ts` imported first so bad configuration
  fails at startup rather than at first use) — no real tradeoff to weigh
  here, just recording the standard.
- Zero's `schema.ts` was placed at `src/zero/schema.ts` (rather than
  directly at `src/schema.ts`) to visually signal that it's a shared,
  cross-cutting file rather than belonging to any one feature — a low-stakes
  choice since Zero's own `ZERO_SCHEMA_PATH` makes this fully configurable
  regardless.
- **`src/db/schema.ts` and `src/zero/schema.ts` are kept as two separate
  files/folders, not merged into one**, because
  [../devops-deployment/database-migrations.md](../devops-deployment/database-migrations.md)
  gave them different authorship: `db/schema.ts` is hand-authored/canonical,
  `zero/schema.ts` is generated output. Conflating them into one location
  would obscure which file is actually safe to edit by hand — the same
  reasoning that already keeps `routeTree.gen.ts` distinct from
  hand-authored route files.

## Sources

- [joshwcomeau.com/react/file-structure](https://www.joshwcomeau.com/react/file-structure/) —
  "pull non-trivial components into their own files once the basic
  functionality is working" (split-on-siblings, not preemptively);
  colocation guidance.
- [robinwieruch.de/react-folder-structure](https://www.robinwieruch.de/react-folder-structure/) —
  "colocate first, extract later"; feature-based organization with a
  shared layer; the 2nd-consumer promotion threshold ("if exactly one
  feature uses a util, it lives inside that feature; once two or more
  features need it, it moves up to the shared layer"); the "max two levels
  of nesting" guidance (considered but not adopted, per Decision above).
- [falldowngoboone.com — how to avoid premature abstractions in React](https://www.falldowngoboone.com/blog/how-to-avoid-premature-abstractions-in-react/) —
  cautionary example of premature shared-abstraction extraction becoming
  unmaintainable.
- [profy.dev/article/react-folder-structure](https://profy.dev/article/react-folder-structure) —
  type-based-for-small-projects vs. feature-based-as-projects-grow
  progression.
- [tanstack.com/start/latest/docs/framework/react/build-from-scratch](https://tanstack.com/start/latest/docs/framework/react/build-from-scratch),
  [tanstack.com/start/latest/docs/framework/react/guide/routing](https://tanstack.com/start/latest/docs/framework/react/guide/routing) —
  official TanStack Start scaffold layout (`src/` wrapper, `routes/`,
  generated `routeTree.gen.ts`, root-level config).
- [royportas.com/posts/tanstack-start-project-structure](https://royportas.com/posts/tanstack-start-project-structure) —
  an opinionated real-world TanStack Start project layout, `lib/` for
  non-UI utilities/data-fetching/helpers.
- [docs.docker.com/compose/intro/compose-application-model](https://docs.docker.com/compose/intro/compose-application-model/) —
  root-level `Dockerfile`/`docker-compose.yml` as the standard convention.
- [dev.to/schead — ensuring environment variable integrity with Zod](https://dev.to/schead/ensuring-environment-variable-integrity-with-zod-in-typescript-3di5),
  [jsdev.space/howto/env-ts-zod](https://jsdev.space/howto/env-ts-zod/) —
  `.env.example` committed / `.env*` gitignored convention, Zod-validated
  `env.ts` fail-fast pattern.
- [orm.drizzle.team/docs/drizzle-kit-generate](https://orm.drizzle.team/docs/drizzle-kit-generate) —
  Drizzle Kit's `drizzle.config.ts` and default `drizzle/` migrations
  output-folder convention (see
  [../devops-deployment/database-migrations.md](../devops-deployment/database-migrations.md)
  for the full ORM/migration-tool decision).
- [zero.rocicorp.dev/docs/add-to-existing-project](https://zero.rocicorp.dev/docs/add-to-existing-project),
  [github.com/rocicorp/hello-zero/blob/main/src/schema.ts](https://github.com/rocicorp/hello-zero/blob/main/src/schema.ts) —
  Zero's `schema.ts` default lookup path and `ZERO_SCHEMA_PATH`
  configurability.
- [tanstack.com/router/latest/docs/framework/react/routing/file-naming-conventions](https://tanstack.com/router/latest/docs/framework/react/routing/file-naming-conventions) —
  the `-` prefix / `routeFileIgnorePrefix` convention for colocating
  non-route files inside `routes/`.
- [github.com/TanStack/router/discussions/3046](https://github.com/TanStack/router/discussions/3046) —
  a real-world report of the exact split-tree problem this decision avoids,
  and a maintainer's colocation-based resolution.
