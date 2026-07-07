/**
 * Ambient type for `.mdx` imports.
 *
 * `@mdx-js/rollup` compiles each post to a module whose default export is the
 * rendered component and whose named `frontmatter` export is the raw YAML
 * object (before Zod validation — hence `unknown`; callers validate it via
 * blog/frontmatter-schema.ts). We declare this ourselves rather than relying on
 * `@types/mdx` so the `frontmatter` export is typed.
 */
declare module '*.mdx' {
  import type { ComponentType } from 'react'

  export const frontmatter: unknown
  const MDXComponent: ComponentType
  export default MDXComponent
}
