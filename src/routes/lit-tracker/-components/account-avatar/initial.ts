/** Shown when even the email yields no first character. */
const FALLBACK_INITIAL = 'U'

/** The account, as much of it as the letter needs. */
interface InitialSource {
  name: string
  email: string
}

/**
 * The single character shown in the avatar when there is no profile picture.
 *
 * Prefers the display name, since that is what the reader recognizes; falls
 * back to the email, which always exists where `name` (from the Google
 * profile) is free-form and can be empty.
 *
 * Pure and separate from the component so the edge cases can be asserted
 * directly rather than through a render.
 */
export function avatarInitial({ name, email }: InitialSource): string {
  const source = name.trim() === '' ? email : name.trim()
  // Iterate rather than index: a name starting with an emoji or a non-BMP
  // character would otherwise be cut in half and render as a replacement box.
  const first = [...source][0]
  return (first ?? FALLBACK_INITIAL).toUpperCase()
}
