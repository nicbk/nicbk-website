import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from './-home-page/home-page'

export const Route = createFileRoute('/(personal-site)/(home)/')({
  component: HomePage,
})
