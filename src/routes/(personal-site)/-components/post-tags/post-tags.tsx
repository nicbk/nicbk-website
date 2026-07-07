import styles from './post-tags.module.css'

interface PostTagsProps {
  tags: string[]
}

/**
 * A post's tags, rendered inline (not as separate pills/badges) — the shared
 * tag treatment used both in the post header and, later, in each blog-list row.
 * Defined once here so the two places can't drift. Renders nothing when there
 * are no tags.
 *
 * A semantic list conveys "these are N related tags" to assistive tech; the
 * leading `#` is a purely decorative CSS `::before`, kept out of the DOM text
 * so it never pollutes tag matching in the later search/filter task.
 */
export function PostTags({ tags }: PostTagsProps) {
  if (tags.length === 0) {
    return null
  }
  return (
    <ul className={styles.tags} aria-label="Tags">
      {tags.map((tag) => (
        <li key={tag} className={styles.tag}>
          {tag}
        </li>
      ))}
    </ul>
  )
}
