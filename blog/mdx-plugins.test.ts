import { describe, expect, it } from 'vitest'
import { remarkRequireAltText } from './mdx-plugins'

/**
 * Unit test for the build-time alt-text gate, exercised directly on small ASTs
 * so it needs no full MDX compile. A fake VFile whose `.fail` throws stands in
 * for unified's real one (which likewise aborts the build).
 *
 * The end-to-end version — that a bad image actually fails `npm run build` — is
 * verified separately against the real pipeline.
 */
function run(node: unknown): void {
  const transform = remarkRequireAltText()
  // A minimal stand-in for unified's VFile: only `.fail` is exercised, and it
  // throws just as the real one does.
  const file = {
    fail: (reason: string): never => {
      throw new Error(reason)
    },
  } as never
  transform({ type: 'root', children: [node] } as never, file)
}

const markdownImage = (alt: string | null) => ({ type: 'image', alt, url: 'x' })
const jsxImg = (attributes: unknown[]) => ({
  type: 'mdxJsxFlowElement',
  name: 'img',
  attributes,
})
const altAttr = (value: unknown) => ({
  type: 'mdxJsxAttribute',
  name: 'alt',
  value,
})

describe('remarkRequireAltText', () => {
  it('accepts a Markdown image with non-empty alt', () => {
    expect(() => run(markdownImage('A diagram'))).not.toThrow()
  })

  it.each([
    ['empty', ''],
    ['missing', null],
  ])('fails a Markdown image with %s alt', (_label, alt) => {
    expect(() => run(markdownImage(alt))).toThrow(/alt text/)
  })

  it('accepts a JSX <img> with non-empty alt', () => {
    expect(() =>
      run(
        jsxImg([
          { type: 'mdxJsxAttribute', name: 'src', value: 'x' },
          altAttr('A diagram'),
        ]),
      ),
    ).not.toThrow()
  })

  it('fails a JSX <img> with an empty alt attribute', () => {
    expect(() => run(jsxImg([altAttr('')]))).toThrow(/alt text/)
  })

  it('fails a JSX <img> with no alt attribute', () => {
    expect(() =>
      run(jsxImg([{ type: 'mdxJsxAttribute', name: 'src', value: 'x' }])),
    ).toThrow(/alt text/)
  })

  it('fails a JSX <img> whose alt is a non-string expression', () => {
    // alt={someVar} — value is an expression object, not a plain string.
    expect(() =>
      run(
        jsxImg([
          altAttr({ type: 'mdxJsxAttributeValueExpression', value: 'x' }),
        ]),
      ),
    ).toThrow(/alt text/)
  })
})
