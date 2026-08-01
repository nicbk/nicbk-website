import { createFileRoute } from '@tanstack/react-router'
import { ProjectsPage } from './-projects-page/projects-page'

export const Route = createFileRoute('/(personal-site)/projects')({
  component: ProjectsPage,
})
