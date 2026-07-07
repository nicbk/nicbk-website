import mdx from '@mdx-js/rollup'
import rehypePrettyCode from 'rehype-pretty-code'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import { createCssVariablesTheme } from 'shiki'
import { visit } from 'unist-util-visit'
import { type VFile } from 'vfile'
import { type Plugin } from 'vite'

/**
 * The MDX build pipeline, factored into one module so `vite.config.ts` (the
 * real build) and `vitest.config.ts` (which renders `.mdx` fixtures in unit
 * tests) configure it identically instead of drifting.
 *
 * Everything here runs at BUILD time: frontmatter extraction, alt-text
 * enforcement, and Shiki syntax highlighting all happen while compiling each
 * `.mdx` to JS, so the shipped client bundle carries no MDX runtime and no
 * syntax highlighter.
 */

/**
 * A Shiki theme whose every token color is a CSS custom property rather than a
 * baked-in hex value. This is how we honor the design rule that code colors
 * come from *this site's* tokens (themed light/dark in colors.css), not a
 * third-party syntax theme. The emitted markup is
 * `<span style="color:var(--shiki-token-keyword)">…</span>`; colors.css
 * defines those `--shiki-*` variables per theme.
 */
const cssVariablesTheme = createCssVariablesTheme({
  name: 'nicbk-css-vars',
  variablePrefix: '--shiki-',
  fontStyle: true,
})

/**
 * Remark plugin that FAILS THE BUILD on any image without non-empty alt text —
 * both Markdown images (`![alt](src)`) and JSX `<img>` elements.
 *
 * The site-wide alt-text mandate calls for mechanical, build-time enforcement.
 * The commonly-cited `remark-lint-no-empty-image-alt-text` rule is unmaintained
 * (last published 2021) and only emits a *warning*, which does not fail a Vite
 * build — so it would not actually satisfy the requirement. `file.fail()`
 * throws a fatal error out of the MDX transform, aborting the build
 * deterministically, with no dependency on a stale lint package.
 */
export function remarkRequireAltText() {
  // The unified transformer: `tree` is the MDX AST, `file` is the VFile whose
  // `.fail()` throws (with source position) to abort compilation.
  return (tree: unknown, file: VFile) => {
    visit(tree as never, (node: MdxNode) => {
      if (node.type === 'image') {
        // Markdown image: `![alt](url)` — `alt` is a string (possibly empty).
        if (!hasText(node.alt)) {
          file.fail('Blog image is missing non-empty alt text', node)
        }
        return
      }
      // JSX `<img …>` (flow or inline) authored directly in the MDX.
      if (isJsxImg(node)) {
        const altAttr = node.attributes?.find(
          (attr) => attr.type === 'mdxJsxAttribute' && attr.name === 'alt',
        )
        const value = altAttr?.value
        // A missing attr, `alt=""`, or a non-string expression value all fail.
        if (typeof value !== 'string' || !hasText(value)) {
          file.fail('Blog <img> is missing non-empty alt text', node)
        }
      }
    })
  }
}

/**
 * The configured `@mdx-js/rollup` plugin, wrapped `enforce: 'pre'` so MDX
 * compiles to JSX *before* the React plugin's transform runs on it. Callers
 * must still place it immediately before `@vitejs/plugin-react` (and configure
 * that plugin to `include` `.mdx`).
 */
export function mdxPlugin(): Plugin {
  return {
    enforce: 'pre',
    ...mdx({
      // Emit React JSX and route intrinsic/global components through the MDX
      // provider (@mdx-js/react), so posts use <Callout>/overridden <img>
      // without a per-file import.
      jsxImportSource: 'react',
      providerImportSource: '@mdx-js/react',
      remarkPlugins: [
        // Order matters: remark-frontmatter parses the `---` YAML block into an
        // AST node, which remark-mdx-frontmatter then turns into
        // `export const frontmatter = {…}`.
        remarkFrontmatter,
        [remarkMdxFrontmatter, { name: 'frontmatter' }],
        remarkRequireAltText,
      ],
      rehypePlugins: [
        [
          rehypePrettyCode,
          {
            theme: cssVariablesTheme,
            // Don't emit a theme background; the code block's surface comes
            // from our own --color-bg-surface token in CSS.
            keepBackground: false,
          },
        ],
      ],
    }),
  } as Plugin
}

/** Non-empty after trimming whitespace. */
function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim() !== ''
}

interface MdxJsxAttribute {
  type: string
  name?: string
  value?: unknown
}

interface MdxNode {
  type: string
  name?: string
  alt?: string | null
  attributes?: MdxJsxAttribute[]
}

function isJsxImg(node: MdxNode): boolean {
  return (
    (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
    node.name === 'img'
  )
}
