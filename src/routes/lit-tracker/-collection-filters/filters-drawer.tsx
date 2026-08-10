import { SlidersHorizontal } from 'lucide-react'
import { NarrowScreenDrawer } from '../-components/narrow-screen-drawer/narrow-screen-drawer'
import { CollectionFilters } from './collection-filters'

/** Names the trigger and the sheet it opens, so the two read as one thing. */
const FILTERS_LABEL = 'filters'

/**
 * The filters on a narrow screen: the shared bottom sheet, holding the same
 * filter list the rail shows above the breakpoint.
 *
 * Everything about *how* the sheet behaves — when it is shown, what closes it,
 * how it is dismissed — lives in `NarrowScreenDrawer`, because #9's detail page
 * needs the identical behaviour for its own sidebar. What is left here is the
 * only part that is about filters: which label, which icon, and what goes
 * inside.
 */
export function FiltersDrawer() {
  return (
    <NarrowScreenDrawer label={FILTERS_LABEL} icon={SlidersHorizontal}>
      <CollectionFilters />
    </NarrowScreenDrawer>
  )
}
