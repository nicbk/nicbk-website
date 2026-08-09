import type { Locator, Page } from '@playwright/test'

/**
 * Locating the collection grid's parts, shared by the specs that exercise it.
 *
 * One place rather than a copy per spec, because the definition of "a card" got
 * subtler the moment cards grew tag chips: the chips are a nested list, so a
 * plain `getByRole('listitem')` under the grid matches every chip as well as
 * every cell. That is not a mistake a reader of either spec would spot, and it
 * counts the collection wrong rather than failing outright.
 */

/**
 * The grid's cells — one per article, and **direct children only**.
 *
 * `> li` rather than `getByRole('listitem')` for exactly the reason above.
 */
export function cards(page: Page): Locator {
  return page.getByRole('list', { name: 'Articles' }).locator('> li')
}

/**
 * The tag chips of one card.
 *
 * Tags only. Reading status shares the card's foot with them but is not one of
 * them — it is an icon with an accessible name, deliberately quieter than a
 * chip so it does not out-shout the title. Ask for it with `statusOf`.
 */
export function chipsOf(card: Locator): Locator {
  return card.getByRole('list', { name: 'tags' }).locator('> li')
}

/** The reading-status icon of one card, named `status: pending` and so on. */
export function statusOf(card: Locator): Locator {
  return card.getByRole('img')
}
