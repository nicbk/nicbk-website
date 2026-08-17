import { Menu } from '@base-ui/react/menu'
import { Check, MousePointer2, PenLine } from 'lucide-react'
import type { AnnotationToolChoice } from './annotation-tools'
import {
  ANNOTATION_TOOL_GROUPS,
  activeToolLabel,
  NO_TOOL,
} from './annotation-tools'
import styles from './annotation-tool-control.module.css'

/**
 * The annotation tools, in the space the toolbar reserved for them.
 *
 * **One control rather than twelve.** The bar already carries three groups and
 * has to hold at 420px; a strip of twelve icon buttons would be most of a
 * screen's width, and the fix for that is always the same one — a menu — so it
 * may as well be the design rather than the retreat. What it costs is a click
 * before a tool; what it buys is a bar that is the same shape at every width,
 * and room to name every tool in words.
 *
 * **A menu rather than a popover**, the same call `zoom-control.tsx` made and for
 * the same reason: this is a list of mutually exclusive choices and nothing
 * else, which is exactly a radio group, and a menu brings the keyboard model
 * with it. The card's three-dot control became a popover only because it holds a
 * text field and several independently scrolling regions.
 *
 * **The tool stays active after a mark is made** — that is the decided creation
 * flow, and it is EmbedPDF's own default (`deactivateToolAfterCreate` is off
 * unless asked for), so nothing here has to re-arm it. The trigger keeps saying
 * which tool is live until the reader picks another or picks "select".
 */

interface AnnotationToolControlProps {
  /** EmbedPDF's active tool id for this document, or null when none is. */
  activeToolId: string | null
  /** Null deselects — see `NO_TOOL`. */
  onSelectTool: (toolId: string | null) => void
  /** True before a document exists: the control stays, inert. */
  disabled: boolean
}

export function AnnotationToolControl({
  activeToolId,
  onSelectTool,
  disabled,
}: AnnotationToolControlProps) {
  const label = activeToolLabel(activeToolId)
  const active = activeToolId !== null

  return (
    <div className={styles.group}>
      <Menu.Root>
        <Menu.Trigger
          className={styles.trigger}
          disabled={disabled}
          // The trigger names the live tool, so the label alone is ambiguous
          // about what pressing it does. This says it once, for everyone.
          aria-label={`annotation tools, ${active ? label : 'none'} selected`}
          data-active={active ? '' : undefined}
        >
          <ActiveToolIcon activeToolId={activeToolId} />
          <span className={styles.label}>{label}</span>
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner
            className={styles.positioner}
            sideOffset={4}
            align="start"
          >
            <Menu.Popup className={styles.popup}>
              {/* Deselecting is a choice in the list rather than a second
                  control: it is how the reader gets back to reading, and it is
                  the item they reach for most after finishing a mark. */}
              <Menu.RadioGroup value={activeToolId ?? NO_TOOL}>
                <ToolItem
                  value={NO_TOOL}
                  label="select"
                  icon={MousePointer2}
                  onSelect={() => onSelectTool(null)}
                />
              </Menu.RadioGroup>

              {ANNOTATION_TOOL_GROUPS.map((group) => (
                <Menu.Group key={group.name} className={styles.section}>
                  <Menu.GroupLabel className={styles.sectionLabel}>
                    {group.name}
                  </Menu.GroupLabel>
                  {/* One radio group per section, all reading the same value:
                      the tick lands in whichever section owns the live tool, and
                      each section keeps its own label. */}
                  <Menu.RadioGroup value={activeToolId ?? NO_TOOL}>
                    {group.tools.map((tool) => (
                      <ToolItem
                        key={tool.id}
                        value={tool.id}
                        label={tool.label}
                        icon={tool.icon}
                        onSelect={() => onSelectTool(tool.id)}
                      />
                    ))}
                  </Menu.RadioGroup>
                </Menu.Group>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  )
}

/**
 * One row: the tick column, the tool's glyph, and its name.
 *
 * `closeOnClick` because Base UI leaves a radio item open by default, which
 * suits a group you might toggle several of. Picking a tool is one decision, and
 * the next thing the reader does is on the paper the menu is covering.
 */
function ToolItem({
  value,
  label,
  icon: Icon,
  onSelect,
}: {
  value: string
  label: string
  icon: AnnotationToolChoice['icon']
  onSelect: () => void
}) {
  return (
    <Menu.RadioItem
      value={value}
      className={styles.item}
      onClick={onSelect}
      closeOnClick
    >
      <Menu.RadioItemIndicator className={styles.indicator}>
        <Check className={styles.indicatorIcon} aria-hidden="true" />
      </Menu.RadioItemIndicator>
      <Icon className={styles.itemIcon} aria-hidden="true" />
      {label}
    </Menu.RadioItem>
  )
}

/** The live tool's own glyph, or a pen when the reader is not marking anything. */
function ActiveToolIcon({ activeToolId }: { activeToolId: string | null }) {
  const tool = ANNOTATION_TOOL_GROUPS.flatMap((group) => group.tools).find(
    (candidate) => candidate.id === activeToolId,
  )
  const Icon = tool?.icon ?? PenLine

  return <Icon className={styles.triggerIcon} aria-hidden="true" />
}
