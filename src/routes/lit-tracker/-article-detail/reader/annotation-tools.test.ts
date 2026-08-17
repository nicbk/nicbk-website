import { AnnotationPluginPackage } from '@embedpdf/plugin-annotation'
import { describe, expect, it } from 'vitest'
import {
  ANNOTATION_TOOL_GROUPS,
  ANNOTATION_TOOLS,
  activeToolLabel,
  NO_TOOL,
} from './annotation-tools'

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

describe('the annotation tools', () => {
  it('offers the twelve decided types', () => {
    expect(ANNOTATION_TOOLS).toHaveLength(12)
  })

  it('names only tools the installed engine has', () => {
    for (const tool of ANNOTATION_TOOLS) {
      expect(engineToolIds).toContain(tool.id)
    }
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
