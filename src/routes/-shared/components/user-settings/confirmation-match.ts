/**
 * Whether a typed confirmation exactly matches the phrase being asked for.
 *
 * This is the only thing standing between a stray click and an account that no
 * longer exists, so it is deliberately unforgiving: no trimming, no case
 * folding, no Unicode normalization. Typing the phrase is meant to be an act of
 * deliberate transcription, and every leniency shrinks the amount of deliberate
 * transcription required. `===` is the whole rule — this exists as a named,
 * tested function rather than an inline comparison so the rule is stated once
 * and can't be quietly loosened at a call site.
 *
 * An empty phrase never matches. Nothing in the app asks for one, but the
 * fallback if something ever did must be "the guard is closed", not "any empty
 * field opens it".
 */
export function matchesConfirmation(typed: string, phrase: string): boolean {
  if (phrase.length === 0) {
    return false
  }
  return typed === phrase
}
