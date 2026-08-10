/** Anything with a name is matchable; neither caller needs more than that. */
interface NamedTag {
  name: string
}

/**
 * The tags worth showing for what has been typed.
 *
 * Substring rather than prefix matching, and case-insensitively: a reader who
 * types "attn" is looking for the tag they half-remember, not completing a known
 * string from the left.
 *
 * Shared by the two surfaces that list a reader's whole tag collection — the
 * card menu, where finding a tag is how you apply it, and the filter rail, where
 * it is how you filter by it. Both grow past a screenful at the same point, and
 * a reader who learns that "attn" finds `attention` in one of them should not
 * find that it does not in the other.
 */
export function matchingTags<Tag extends NamedTag>(
  tags: readonly Tag[],
  query: string,
): readonly Tag[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') {
    return tags
  }
  return tags.filter((tag) => tag.name.toLowerCase().includes(needle))
}
