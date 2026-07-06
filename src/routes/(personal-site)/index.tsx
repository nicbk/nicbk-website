import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from './-components/home-page/home-page'

export const Route = createFileRoute('/(personal-site)/')({
  component: HomePage,
})
