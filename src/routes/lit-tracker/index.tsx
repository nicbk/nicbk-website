import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from './-collection-page/collection-page'

/**
 * `/lit-tracker` — the tracker's home surface, the user's article collection.
 *
 * The guard, the header, the app-shell layout, and the Zero client all come
 * from the group layout in `route.tsx`; this route only says which page fills
 * the panel.
 */
export const Route = createFileRoute('/lit-tracker/')({
  component: CollectionPage,
})
