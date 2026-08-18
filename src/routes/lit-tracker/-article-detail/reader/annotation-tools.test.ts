import { AnnotationPluginPackage } from '@embedpdf/plugin-annotation'
import { describe, expect, it } from 'vitest'
import { ANNOTATION_TYPES } from '~/lit-tracker/annotation-type'
import {
  ANNOTATION_TOOL_GROUPS,
  ANNOTATION_TOOLS,
  activeToolLabel,
  annotationTypeLabel,
  NO_TOOL,
} from './annotation-tools'
import {
  HIGHLIGHT_BOX_INTENT,
  HIGHLIGHT_BOX_TOOL_ID,
} from './highlight-box-tool'

/**
 * The tool list, checked against the engine that has to honour it.
 *
 * Every id here is a string handed to `setActiveTool`, and a wrong one fails the
 * way wrong strings do: nothing happens, no error is raised, and the tool simply
 * never activates. So the load-bearing assertion is not that the list has twelve
 * entries — it is that all twelve name tools the *installed* EmbedPDF actually
 * has, which is a thing that can change under this project without warning.
 */

/**
 * The tools the plugin ships with, as it builds them at registration.
 *
 * A package's `initialState` may be a value or a factory; this one is a factory,
 * and it reads only its config argument. Reaching for it rather than for an
 * exported list is deliberate — the list of default tools is not exported as a
 * value, and this is the same code path the running reader takes.
 */
const buildInitialState = AnnotationPluginPackage.initialState as (
  coreState: never,
  config: never,
) => { tools: { id: string }[] }

const engineToolIds = buildInitialState({} as never, {} as never).tools.map(
  (tool) => tool.id,
)

/**
 * The one tool that is this reader's rather than the engine's, and so is
 * deliberately absent from the check above.
 */
const OWN_TOOL_IDS: readonly string[] = [HIGHLIGHT_BOX_TOOL_ID]

describe('the annotation tools', () => {
  it('offers the twelve decided types, plus the one of its own', () => {
    expect(ANNOTATION_TOOLS).toHaveLength(13)
    expect(
      ANNOTATION_TOOLS.filter((tool) => !OWN_TOOL_IDS.includes(tool.id)),
    ).toHaveLength(12)
  })

  it('names only tools the installed engine has, bar its own', () => {
    for (const tool of ANNOTATION_TOOLS) {
      if (OWN_TOOL_IDS.includes(tool.id)) {
        continue
      }
      expect(engineToolIds).toContain(tool.id)
    }
  })

  it('does not claim the engine already has its own tool', () => {
    // If a future EmbedPDF ships a `highlightBox`, `addTool` would replace it
    // rather than add one, and the clone would silently become an override of
    // something with different behaviour. Worth knowing the day it happens.
    expect(engineToolIds).not.toContain(HIGHLIGHT_BOX_TOOL_ID)
  })

  it('leaves out the stamp, and the furniture a PDF arrives with', () => {
    // Stamp is out of scope by decision — the one type needing binary payload
    // storage. `link` is a tool the engine has and this reader deliberately does
    // not offer: a link is part of the document, not a mark on it.
    const offered = ANNOTATION_TOOLS.map((tool) => tool.id)

    expect(engineToolIds).toContain('stamp')
    expect(offered).not.toContain('stamp')
    expect(offered).not.toContain('link')
  })

  it('offers each tool once', () => {
    const offered = ANNOTATION_TOOLS.map((tool) => tool.id)

    expect(new Set(offered).size).toBe(offered.length)
  })

  it('gives every tool a word as well as a glyph', () => {
    // An icon-only control needs an accessible name anyway, so the name is
    // visible to everyone rather than only to a screen reader.
    for (const tool of ANNOTATION_TOOLS) {
      expect(tool.label.trim()).not.toBe('')
    }
  })

  it('cannot collide with the deselect item', () => {
    // The radio group needs one value meaning "no tool", and a tool sharing it
    // would make deselecting select something.
    expect(ANNOTATION_TOOLS.map((tool) => tool.id)).not.toContain(NO_TOOL)
  })

  it('groups the tools by what the reader is doing', () => {
    expect(ANNOTATION_TOOL_GROUPS.map((group) => group.name)).toEqual([
      'text',
      'draw',
      'write',
    ])
    expect(ANNOTATION_TOOL_GROUPS.flatMap((group) => group.tools)).toHaveLength(
      ANNOTATION_TOOLS.length,
    )
  })
})

describe('activeToolLabel', () => {
  it('names the live tool', () => {
    expect(activeToolLabel('highlight')).toBe('highlight')
    expect(activeToolLabel('textComment')).toBe('sticky note')
  })

  it('falls back to the control’s own name when none is live', () => {
    expect(activeToolLabel(null)).toBe('annotate')
  })

  it('does not go blank for a tool it does not know', () => {
    // Nothing offers one today. Saying something beats an empty trigger if
    // anything ever does.
    expect(activeToolLabel('inkHighlighter')).toBe('annotate')
  })
})

describe('annotationTypeLabel', () => {
  it('names every stored type in the toolbar menu’s own words', () => {
    // The sidebar's list says this for a textless mark, so all twelve must
    // resolve to a tool's label — a stored type falling through to its raw name
    // would put "freeText" in a list that says "text box" one panel over.
    const toolLabels = ANNOTATION_TOOLS.map((tool) => tool.label)
    for (const type of ANNOTATION_TYPES) {
      expect(toolLabels).toContain(annotationTypeLabel(type))
    }
  })

  it('bridges the one name the two vocabularies disagree on', () => {
    // The sticky note: the tool is `textComment`, the stored PDF subtype is
    // `text`. Everything else matches by name and would pass by accident.
    expect(annotationTypeLabel('text')).toBe('sticky note')
    expect(annotationTypeLabel('ink')).toBe('freehand')
    expect(annotationTypeLabel('square')).toBe('rectangle')
  })

  it('tells the two square-shaped tools apart by intent', () => {
    // Both store `square`, so the type alone cannot answer this — and a
    // highlight box called "rectangle" in the sidebar is the whole reason the
    // intent is written in the first place.
    expect(annotationTypeLabel('square', HIGHLIGHT_BOX_INTENT)).toBe(
      'highlight box',
    )
    expect(annotationTypeLabel('square', null)).toBe('rectangle')
  })

  it('ignores an intent it does not know', () => {
    // A PDF can arrive carrying marks with intents of its own; an unrecognised
    // one means "nothing special", not "no name".
    expect(annotationTypeLabel('square', 'SomeOtherIntent')).toBe('rectangle')
    expect(annotationTypeLabel('ink', 'InkHighlight')).toBe('freehand')
  })
})
