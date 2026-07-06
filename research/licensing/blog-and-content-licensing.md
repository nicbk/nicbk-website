# Blog and Content Licensing

Decision: **CC BY 4.0** for blog post content, separate from the project's
Apache-2.0 code license
([project-license-selection.md](./project-license-selection.md)).

## Why a separate license from the code

Apache-2.0 is a mismatched tool for prose — its patent-grant and
source-redistribution/NOTICE mechanics target executable code and don't
map meaningfully onto blog text. This is a standard split: even OSI's own
site applies an OSI-approved software license to its code but licenses its
web page *content* under CC BY 4.0 specifically because it "offers similar
freedoms for non-software works as open source offers for software works."
Code and prose conventionally get different license families.

## Why CC BY over the alternatives

This was a preference question, not a compliance one — there's no
objectively correct answer, unlike the other three licensing topics. The
choice: CC BY permits reuse, remixing, and even commercial republishing of
blog posts, as long as the reuser credits the original author. Weighed
against:

- All-rights-reserved (no reuse granted) — rejected, too restrictive for
  what's wanted here.
- CC BY-NC (blocks commercial reuse) — rejected in favor of the simpler,
  fully-open CC BY.
- CC0 (public domain, no attribution required) — rejected; attribution is
  wanted, just not a barrier to reuse.

## Implementation — resolved: root carve-out, not a frontmatter field

Two mechanical options were possible, either sufficient:

- A carve-out note in the root `LICENSE`/README: "Content under `blog/` is
  licensed separately under CC BY 4.0, distinct from the code's
  Apache-2.0."
- A `license`/`copyright` field in each post's MDX frontmatter.

**The carve-out route is the one in effect.** When
`documentation-content-conventions/` was later scoped,
[../documentation-content-conventions/blog-frontmatter-schema.md](../documentation-content-conventions/blog-frontmatter-schema.md)
deliberately did *not* add a `license`/`copyright` frontmatter field —
consistent with its minimal-fields philosophy and the fact that a
single-author blog under one uniform CC BY 4.0 license would repeat an
identical value in every post (the same duplication reasoning it uses to
omit `author`). The single blanket license is therefore expressed once, as
the root `LICENSE`/README carve-out, rather than per-post in frontmatter.
