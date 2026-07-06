import { createFileRoute } from '@tanstack/react-router'

/**
 * Stub so the header's typed <Link to="/blog"> resolves — the real page is
 * the `blog` feature.
 */
export const Route = createFileRoute('/(personal-site)/blog')({
  component: BlogPlaceholder,
})

function BlogPlaceholder() {
  return <h1>blog</h1>
}
