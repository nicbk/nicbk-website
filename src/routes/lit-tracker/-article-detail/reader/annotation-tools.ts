import type { LucideIcon } from 'lucide-react'
import {
  Circle,
  Highlighter,
  PenLine,
  Pentagon,
  Slash,
  Spline,
  Square,
  SquareStack,
  StickyNote,
  Strikethrough,
  Type,
  Underline,
  Waves,
} from 'lucide-react'
import type { AnnotationType } from '~/lit-tracker/annotation-type'
import {
  HIGHLIGHT_BOX_INTENT,
  HIGHLIGHT_BOX_TOOL_ID,
} from './highlight-box-tool'

/**
 * The thirteen marks the reader may make, in the order they are offered.
 *
 * The list itself is decided
 * (research/ui-ux/pages/lit-tracker/components/reader-annotation.md); what is
 * chosen here is the grouping and the wording. Twelve of the ids are EmbedPDF's
 * own built-in tools, so this is mostly a presentation of the engine's
 * capabilities rather than a parallel definition of them — a tool named here
 * that the plugin does not have would simply never activate, which is what
 * `annotation-tools.test.ts` pins against the installed package.
 *
 * **The thirteenth is this reader's own**: the highlight box, cloned from the
 * engine's square at mount (see `highlight-box-tool.ts`). It is named here like
 * any other because from the menu's point of view it is one; the test knows to
 * exclude it from the engine check, and nothing else needs to.
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
      // Beside the rectangle, where someone hunting for a box will look —
      // rather than in `text` with the other see-through marks, because that
      // group is the tools that attach to *selected text* and this one is drawn
      // on the page (decided 2026-08-17).
      // A square laid over another: unmistakably box-shaped so it reads beside
      // `Square`, and offset so it does not read *as* it. The word carries the
      // meaning either way — every tool has one.
      { id: HIGHLIGHT_BOX_TOOL_ID, label: 'highlight box', icon: SquareStack },
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
 * Which tool draws each *stored* row type.
 *
 * The two vocabularies are the same word for eleven of the twelve — the
 * exception is the sticky note, whose tool EmbedPDF calls `textComment` while
 * the PDF subtype it stores is `text` (see `annotation-sync/annotation-row.ts`).
 * This map is what lets a surface that has only a row — the sidebar's list —
 * speak about it in the toolbar's words rather than growing a second set.
 */
const TOOL_ID_BY_TYPE: Record<AnnotationType, string> = {
  highlight: 'highlight',
  underline: 'underline',
  strikeout: 'strikeout',
  squiggly: 'squiggly',
  ink: 'ink',
  square: 'square',
  circle: 'circle',
  line: 'line',
  polyline: 'polyline',
  polygon: 'polygon',
  freeText: 'freeText',
  text: 'textComment',
}

/**
 * The stored type's name as the toolbar menu spells it — "freehand" for an ink
 * row, "rectangle" for a square one. One vocabulary across the toolbar and the
 * sidebar's list, whose textless rows say this instead of a blank line
 * (user-decided 2026-08-16).
 *
 * **The intent is not optional trivia.** Two of the offered tools store the same
 * type: a highlight box is a `square`, exactly as a plain rectangle is, and the
 * only thing separating them on the way back out is the `intent` the tool wrote
 * (see `highlight-box-tool.ts`). A caller with a stored row therefore passes the
 * row's intent; one asking about a bare type gets the plain tool's name, which
 * is the right answer when there is nothing to say otherwise.
 */
export function annotationTypeLabel(
  type: AnnotationType,
  intent?: string | null,
): string {
  const toolId =
    intent === HIGHLIGHT_BOX_INTENT
      ? HIGHLIGHT_BOX_TOOL_ID
      : TOOL_ID_BY_TYPE[type]

  return (
    ANNOTATION_TOOLS.find((tool) => tool.id === toolId)?.label ??
    // Unreachable while the map above stays total, and the stored name is a
    // truthful fallback if it ever stops being.
    type
  )
}

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
