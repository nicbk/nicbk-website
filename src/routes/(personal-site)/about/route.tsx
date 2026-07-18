import { createFileRoute } from '@tanstack/react-router'
import { AboutPage } from './-about-page/about-page'

export const Route = createFileRoute('/(personal-site)/about')({
  component: AboutPage,
})
