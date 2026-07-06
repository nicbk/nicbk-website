# Frontend Framework / Meta-Framework

Researched: 2026-07-02. Decided: 2026-07-02.

## Decision

**TanStack Start**, chosen over Next.js and plain Vite. Fully open source,
Vite-based, and additive to React's core primitives rather than the
RSC-first model. Pairs naturally with TanStack Query and with Zero (the
chosen sync engine, see [sync-engine.md](./sync-engine.md)) — both trace to
the Rocicorp/Replicache lineage — which fits the reactive, app-like needs
of the lit-tracker as well as the simpler content pages (blog, about).

An existing blog post referenced in the mockups already says "updated blog
to custom React system" (see
[blog-page.png](../../high-level-guidance/design/blog-page.png)), so React
itself is a given; the open question is which meta-framework to build it
on.

## Options

**Next.js**
- The "safer, more staffable, more documented" choice; file-based routing,
  SSR/SSG, API routes, image/font optimization, streaming.
- App Router is RSC-first: every component is a server component by
  default, opting out with `"use client"`.
- Best suited for marketing sites, e-commerce, SaaS with public pages, or
  anything needing SSR/SSG.

**TanStack Start**
- Full-stack React framework built on TanStack Router, Vite, and Nitro.
- Fully open source, "free to use, and always will be."
- Additive to React's core primitives rather than replacing them —
  framework-agnostic, opt into server capabilities only when needed
  (contrast with Next's RSC-first model).
- Advantages: type-safe routing, TanStack Query as a first-class layer,
  Vite build speed, Nitro deploy portability.

**React Router**
- One of the oldest, most widely used React routing libraries; strong
  community and documentation.

**Plain Vite (no meta-framework)**
- Recommended in 2026 for client-side SPAs, dashboards, admin panels, and
  internal tools where SEO isn't a priority — not for a public
  content-heavy personal site with a blog.

## Notes for later planning

- TanStack Query pairs naturally with reactive sync engines like Zero
  (Rocicorp, makers of Replicache, in the same ecosystem lineage) — worth
  weighing in [../system-architecture/index.md](../system-architecture/index.md)
  once the sync engine is chosen (see [sync-engine.md](./sync-engine.md)).
- A personal site + blog + multiple interactive sub-apps (lit-tracker) has
  a mix of content-heavy pages (blog, about) and app-like pages (lit
  tracker), which doesn't cleanly map to only one of "SEO-focused" vs
  "SPA-focused" — worth discussing directly rather than picking purely
  from this research.

## Sources

- [Comparison | TanStack Start vs Next.js vs React Router](https://tanstack.com/start/v0/docs/framework/react/comparison)
- [TanStack Start vs Next.js in 2026](https://makerkit.dev/blog/tutorials/tanstack-start-vs-nextjs)
- [TanStack Start Overview](https://tanstack.com/start/latest/docs/framework/react/overview)
- [Next.js vs React + Vite 2026](https://techsy.io/en/blog/nextjs-vs-react-vite)
- [TanStack Start vs Next.js | TanStack Start React Docs](https://tanstack.com/start/latest/docs/framework/react/start-vs-nextjs)
