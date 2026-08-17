import type { LucideIcon } from 'lucide-react'
import {
  Circle,
  Highlighter,
  PenLine,
  Pentagon,
  Slash,
  Spline,
  Square,
  StickyNote,
  Strikethrough,
  Type,
  Underline,
  Waves,
} from 'lucide-react'

/**
 * The twelve marks the reader may make, in the order they are offered.
 *
 * The list itself is decided
 * (research/ui-ux/pages/lit-tracker/components/reader-annotation.md); what is
 * chosen here is the grouping and the wording. Every id is one of EmbedPDF's own
 * built-in tools, so this is a presentation of the engine's capabilities rather
 * than a parallel definition of them — a tool named here that the plugin does
 * not have would simply never activate, which is what `annotation-tools.test.ts`
 * pins against the installed package.
 *
 * **Grouped by what the reader is doing, not by what the PDF specification calls
 * things.** Marking a passage, drawing on the page, and writing something down
 * are three different intentions, and a flat list of twelve makes the reader
 * scan all of them to find the one they meant. Three groups of four to six is
 * the shortest scan.
 *
 * **Every tool carries a word as well as a glyph.** Twelve icons in a grid would
 * be more compact and would ask the reader to guess which pentagon means polygon
 * — and an icon-only control needs an accessible name anyway, so the name may as
 * well be visible to everyone rather than only to a screen reader.
 */

export interface AnnotationToolChoice {
  /** EmbedPDF's own tool id, as `setActiveTool` takes it. */
  id: string
  label: string
  icon: LucideIcon
}

export interface AnnotationToolGroup {
  name: string
  tools: readonly AnnotationToolChoice[]
}

export const ANNOTATION_TOOL_GROUPS: readonly AnnotationToolGroup[] = [
  {
    // The four that attach to selected text rather than to a place on the page.
    name: 'text',
    tools: [
      { id: 'highlight', label: 'highlight', icon: Highlighter },
      { id: 'underline', label: 'underline', icon: Underline },
      { id: 'strikeout', label: 'strikeout', icon: Strikethrough },
      { id: 'squiggly', label: 'squiggly', icon: Waves },
    ],
  },
  {
    name: 'draw',
    tools: [
      { id: 'ink', label: 'freehand', icon: PenLine },
      { id: 'square', label: 'rectangle', icon: Square },
      { id: 'circle', label: 'ellipse', icon: Circle },
      { id: 'line', label: 'line', icon: Slash },
      { id: 'polyline', label: 'polyline', icon: Spline },
      { id: 'polygon', label: 'polygon', icon: Pentagon },
    ],
  },
  {
    name: 'write',
    tools: [
      { id: 'freeText', label: 'text box', icon: Type },
      { id: 'textComment', label: 'sticky note', icon: StickyNote },
    ],
  },
]

/** The same twelve, flat, for lookups that do not care which group a tool is in. */
export const ANNOTATION_TOOLS: readonly AnnotationToolChoice[] =
  ANNOTATION_TOOL_GROUPS.flatMap((group) => group.tools)

/**
 * The value the tool menu's radio group carries when no tool is active.
 *
 * A radio group needs *some* value for "none of these", and it has to be one no
 * tool could have. Deselecting is a real choice a reader makes — it is how they
 * get back to selecting text normally — so it is an item in the list rather than
 * a second control beside it.
 */
export const NO_TOOL = 'none'

/**
 * What the menu's trigger says.
 *
 * The active tool's own name, so the bar states what the next click on the paper
 * will do without the reader opening anything. Naming the state in words is also
 * what keeps it from being carried by colour alone.
 */
export function activeToolLabel(activeToolId: string | null): string {
  if (activeToolId === null) {
    return 'annotate'
  }
  return (
    ANNOTATION_TOOLS.find((tool) => tool.id === activeToolId)?.label ??
    // A tool the engine has and this list does not. Nothing offers one today;
    // saying so beats an empty trigger if something ever does.
    'annotate'
  )
}
