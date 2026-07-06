import { createFileRoute } from '@tanstack/react-router'

/**
 * Stub so the header's typed <Link to="/projects"> resolves — the real
 * page is the `projects-page` feature.
 */
export const Route = createFileRoute('/(personal-site)/projects')({
  component: ProjectsPlaceholder,
})

function ProjectsPlaceholder() {
  return <h1>projects</h1>
}
