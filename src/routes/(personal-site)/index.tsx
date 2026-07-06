import { createFileRoute } from '@tanstack/react-router'

/**
 * Placeholder home route exercising the shell — replaced with the real
 * home-page content by the `home-page` task.
 */
export const Route = createFileRoute('/(personal-site)/')({
  component: HomePlaceholder,
})

function HomePlaceholder() {
  return <h1>home</h1>
}
