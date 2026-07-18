import { Info, Lightbulb, type LucideIcon, TriangleAlert } from 'lucide-react'
import { type ReactNode } from 'react'
import styles from './callout.module.css'

export type CalloutType = 'note' | 'warning' | 'tip'

interface CalloutProps {
  type?: CalloutType
  children: ReactNode
}

/**
 * A boxed aside for a blog post — "note", "warning", or "tip". Registered as a
 * global MDX component (see the post page's provider), so posts write
 * `<Callout type="warning">…</Callout>` with no import.
 *
 * The type is conveyed by BOTH an icon and a visible text label, never by color
 * alone, so it survives grayscale/AT (WCAG 1.4.1). Styling stays uniform across
 * types using existing tokens — the icon + label do the differentiating — which
 * keeps the minimalist monochrome look and avoids introducing new semantic
 * color tokens.
 */
export function Callout({ type = 'note', children }: CalloutProps) {
  const { Icon, label } = CALLOUT_VARIANTS[type]
  return (
    <div className={styles.callout} data-type={type}>
      <p className={styles.label}>
        <Icon className={styles.icon} aria-hidden={true} />
        {label}
      </p>
      <div className={styles.body}>{children}</div>
    </div>
  )
}

const CALLOUT_VARIANTS: Record<
  CalloutType,
  { Icon: LucideIcon; label: string }
> = {
  note: { Icon: Info, label: 'Note' },
  warning: { Icon: TriangleAlert, label: 'Warning' },
  tip: { Icon: Lightbulb, label: 'Tip' },
}
