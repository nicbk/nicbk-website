import { createFileRoute } from '@tanstack/react-router'

/**
 * Stub so the header's typed <Link to="/about"> resolves — the real page
 * is the `about-page` feature.
 */
export const Route = createFileRoute('/(personal-site)/about')({
  component: AboutPlaceholder,
})

function AboutPlaceholder() {
  return <h1>about</h1>
}
