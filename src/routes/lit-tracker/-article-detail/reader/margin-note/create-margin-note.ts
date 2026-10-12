import type { PdfFreeTextAnnoObject } from '@embedpdf/models'

/**
 * Creates a margin note already open for typing.
 *
 * **Why this reaches past the public API.** The annotation scope's
 * `createAnnotation(pageIndex, annotation, ctx)` has no way to say "and open it
 * for typing": that option exists only on the plugin's own method, as a fifth
 * argument, which the engine's tools pass when a text box is placed by a click
 * (`plugin-annotation/dist/index.js`, the tool's `onCommit`). Without it the
 * annotation layer never enters editing — its `editingId` is set only by a
 * `create` event that carries `editAfterCreate` — and the reader would have to
 * double-click the note it just asked for before writing in it. That is the
 * friction the feature exists to remove.
 *
 * **Held to the installed version.** The method is not part of the typed
 * surface, so its shape is checked here before it is called and pinned by a test
 * against the package itself (`create-margin-note.test.ts`). If an upgrade
 * changes it, the note is still made, through the public method — closed rather
 * than open, which is a lesser feature, not a broken one.
 */

/** The plugin's own `createAnnotation`, with the option the scope leaves out. */
interface PluginCreate {
  createAnnotation: (
    pageIndex: number,
    annotation: PdfFreeTextAnnoObject,
    ctx: undefined,
    documentId: string,
    options: { editAfterCreate: boolean },
  ) => void
}

/** The public half, used when the plugin's method is not as expected. */
interface ScopeCreate {
  createAnnotation: (pageIndex: number, annotation: never) => void
}

/**
 * The arity of the plugin method this relies on:
 * `(pageIndex, annotation, ctx, documentId, options)`.
 */
export const PLUGIN_CREATE_ARITY = 5

/** Whether `plugin` carries the method in the shape this relies on. */
export function opensForTyping(plugin: unknown): plugin is PluginCreate {
  const create = (plugin as { createAnnotation?: unknown } | null)
    ?.createAnnotation
  return typeof create === 'function' && create.length === PLUGIN_CREATE_ARITY
}

/**
 * Creates `note` on its page, open for typing if the plugin allows it.
 * Returns whether it opened.
 */
export function createMarginNote({
  plugin,
  scope,
  documentId,
  note,
}: {
  plugin: unknown
  scope: ScopeCreate
  documentId: string
  note: PdfFreeTextAnnoObject
}): boolean {
  if (opensForTyping(plugin)) {
    plugin.createAnnotation(note.pageIndex, note, undefined, documentId, {
      editAfterCreate: true,
    })
    return true
  }
  scope.createAnnotation(note.pageIndex, note as never)
  return false
}
