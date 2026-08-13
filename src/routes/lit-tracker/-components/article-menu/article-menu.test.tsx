import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CollectionTag } from './article-menu'
import { ArticleMenu, EMPTY_TAGS_MESSAGE } from './article-menu'

/**
 * The card control's contract, asserted against injected callbacks.
 *
 * Nothing here goes near Zero: this decides *what was asked for*, and whether
 * that write is allowed is `src/zero/mutators.ts`'s business, proven against a
 * real database in `mutators.integration.test.ts`. Keeping the two apart is what
 * lets this file be about the two pieces of real logic the control owns — that a
 * typed name may already exist, and which tags a filter should show.
 */

const ATTENTION: CollectionTag = { id: 'tag-1', name: 'attention' }
const SURVEY: CollectionTag = { id: 'tag-2', name: 'survey' }
const SEQ2SEQ: CollectionTag = { id: 'tag-3', name: 'seq2seq' }

function renderMenu(
  overrides: Partial<Parameters<typeof ArticleMenu>[0]> = {},
) {
  const handlers = {
    onSetStatus: vi.fn(),
    onToggleTag: vi.fn(),
    onCreateTag: vi.fn(),
  }
  render(
    <ArticleMenu
      articleTitle="Attention Is All You Need"
      status="pending"
      allTags={[ATTENTION, SURVEY, SEQ2SEQ]}
      appliedTagIds={new Set([ATTENTION.id])}
      {...handlers}
      {...overrides}
    />,
  )
  return handlers
}

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Options for/ }))
  return screen.findByRole('dialog')
}

/** The tag names currently listed, in order. */
function listedTags() {
  const list = screen.queryByRole('list', { name: 'matching tags' })
  if (!list) {
    return []
  }
  // The row *is* the checkbox, so its own text is the tag's name.
  return within(list)
    .getAllByRole('checkbox')
    .map((row) => row.textContent ?? '')
}

describe('ArticleMenu', () => {
  describe('what it puts behind itself', () => {
    it('leaves the page alone by default, as the collection grid wants', async () => {
      // A card's menu floats over cards, which are inert anyway. A dimming
      // overlay there would be weight for nothing.
      const user = userEvent.setup()
      const { container } = render(
        <ArticleMenu
          articleTitle="Attention Is All You Need"
          status="pending"
          allTags={[]}
          appliedTagIds={new Set()}
          onSetStatus={vi.fn()}
          onToggleTag={vi.fn()}
          onCreateTag={vi.fn()}
        />,
      )
      await open(user)

      expect(
        container.ownerDocument.querySelector('[class*="backdrop"]'),
      ).toBeNull()
    })

    it('dims and blocks what is behind it when asked to', async () => {
      // The article page asks: this menu opens over the reader's floating
      // toolbar, which stays visible and clickable underneath otherwise, and
      // two live surfaces at once is what that reads as (user-decided
      // 2026-08-13).
      const user = userEvent.setup()
      const { container } = render(
        <ArticleMenu
          articleTitle="Attention Is All You Need"
          status="pending"
          allTags={[]}
          appliedTagIds={new Set()}
          onSetStatus={vi.fn()}
          onToggleTag={vi.fn()}
          onCreateTag={vi.fn()}
          modal
        />,
      )
      await open(user)

      expect(
        container.ownerDocument.querySelector('[class*="backdrop"]'),
      ).not.toBeNull()
    })

    it('shows the article’s own details when it is given them', async () => {
      // Only the detail page passes these: a card already shows its title,
      // authors and venue, so repeating them in its menu would be noise.
      const user = userEvent.setup()
      render(
        <ArticleMenu
          articleTitle="Attention Is All You Need"
          status="pending"
          allTags={[]}
          appliedTagIds={new Set()}
          onSetStatus={vi.fn()}
          onToggleTag={vi.fn()}
          onCreateTag={vi.fn()}
          details={<p>Ashish Vaswani et al.</p>}
        />,
      )
      await open(user)

      expect(screen.getByText('Ashish Vaswani et al.')).toBeInTheDocument()
    })
  })

  it('names its trigger after the article it belongs to', () => {
    // Twenty cards in a grid, each with one of these: "options" repeated twenty
    // times is not a name, and a screen-reader user listing the page's controls
    // would have no way to tell them apart.
    renderMenu()

    expect(
      screen.getByRole('button', {
        name: 'Options for Attention Is All You Need',
      }),
    ).toBeInTheDocument()
  })

  it('opens from its trigger and closes on Escape, returning focus', async () => {
    const user = userEvent.setup()
    renderMenu()
    const trigger = screen.getByRole('button', { name: /Options for/ })

    await open(user)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).toBeNull()
    // Focus back where it started — otherwise a keyboard user is returned to
    // the top of the document and has to tab through the whole grid again.
    expect(trigger).toHaveFocus()
  })

  it('reports the chosen reading status', async () => {
    const user = userEvent.setup()
    const { onSetStatus } = renderMenu()

    const popup = await open(user)
    await user.click(within(popup).getByRole('button', { name: 'read' }))

    expect(onSetStatus).toHaveBeenCalledWith('read')
  })

  it('reports only the new status, with no call to clear the old one', async () => {
    // Mutual exclusivity comes from the column being single-valued, not from
    // the UI unsetting anything. If this ever needs two calls, the model has
    // drifted from `research/data-modeling/tags-and-reading-status.md`.
    const user = userEvent.setup()
    const { onSetStatus } = renderMenu({ status: 'reading' })

    const popup = await open(user)
    await user.click(within(popup).getByRole('button', { name: 'read' }))

    expect(onSetStatus).toHaveBeenCalledTimes(1)
    expect(onSetStatus).toHaveBeenCalledWith('read')
  })

  it('writes nothing when the status already set is pressed again', async () => {
    // A status cannot be *unset* — every article has one — so pressing the
    // current one is a no-op rather than a write that would be refused or,
    // worse, stored as nothing.
    const user = userEvent.setup()
    const { onSetStatus } = renderMenu({ status: 'reading' })

    const popup = await open(user)
    await user.click(within(popup).getByRole('button', { name: 'reading' }))

    expect(onSetStatus).not.toHaveBeenCalled()
  })

  it('shows which tags this article already carries', async () => {
    const user = userEvent.setup()
    renderMenu()

    const popup = await open(user)

    expect(
      within(popup).getByRole('checkbox', { name: /attention/ }),
    ).toBeChecked()
    expect(
      within(popup).getByRole('checkbox', { name: /survey/ }),
    ).not.toBeChecked()
  })

  it('applies an unchecked tag and removes a checked one', async () => {
    const user = userEvent.setup()
    const { onToggleTag } = renderMenu()

    const popup = await open(user)
    await user.click(within(popup).getByRole('checkbox', { name: /survey/ }))
    await user.click(within(popup).getByRole('checkbox', { name: /attention/ }))

    expect(onToggleTag).toHaveBeenNthCalledWith(1, SURVEY.id, true)
    expect(onToggleTag).toHaveBeenNthCalledWith(2, ATTENTION.id, false)
  })

  it('stays open while tags are toggled', async () => {
    // Tagging is rarely one tag. A control that closed after each would make
    // applying three tags three trips.
    const user = userEvent.setup()
    renderMenu()

    const popup = await open(user)
    await user.click(within(popup).getByRole('checkbox', { name: /survey/ }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  describe('the filter', () => {
    it('narrows the list as the reader types, matching anywhere in the name', async () => {
      // Substring rather than prefix: a reader typing "seq" is looking for the
      // tag they half-remember, not completing a string from the left.
      const user = userEvent.setup()
      renderMenu()

      await open(user)
      expect(listedTags()).toHaveLength(3)

      await user.type(screen.getByLabelText('tags'), 'seq')

      // `attention` stays because this article carries it — see the pinning
      // test below. What "seq" narrowed away is `survey`.
      expect(listedTags()).toEqual(['attention', 'seq2seq'])
    })

    it('ignores case', async () => {
      const user = userEvent.setup()
      renderMenu()

      await open(user)
      await user.type(screen.getByLabelText('tags'), 'SURV')

      expect(listedTags()).toEqual(['attention', 'survey'])
    })

    it('keeps a tag this article carries listed, whatever is typed', async () => {
      // The ticked boxes are how the reader knows what the article already
      // has. Searching for one more tag must not make the others look as
      // though they came off — and un-ticking one would otherwise mean
      // clearing the field first to find it again.
      const user = userEvent.setup()
      renderMenu()

      await open(user)
      await user.type(screen.getByLabelText('tags'), 'seq')

      expect(screen.getByRole('checkbox', { name: 'attention' })).toBeChecked()
    })

    it('offers to create what was typed when it matches no tag', async () => {
      const user = userEvent.setup()
      renderMenu()

      await open(user)
      await user.type(screen.getByLabelText('tags'), 'transformers')

      // Only the applied tag is left; nothing matched what was typed.
      expect(listedTags()).toEqual(['attention'])
      expect(
        screen.getByRole('button', { name: /create .transformers./ }),
      ).toBeInTheDocument()
    })

    it('does not offer to create a name the reader already has', async () => {
      // The whole reason there is no separate "manage tags" screen: typing a
      // name is how a tag is both created and reused, and typing "survey" twice
      // must not leave two tags called "survey".
      const user = userEvent.setup()
      renderMenu()

      await open(user)
      await user.type(screen.getByLabelText('tags'), 'survey')

      expect(screen.queryByRole('button', { name: /create/ })).toBeNull()
      expect(listedTags()).toEqual(['attention', 'survey'])
    })

    it('does not offer to create a name that differs only in case', async () => {
      const user = userEvent.setup()
      renderMenu()

      await open(user)
      await user.type(screen.getByLabelText('tags'), 'Survey')

      expect(screen.queryByRole('button', { name: /create/ })).toBeNull()
    })

    it('creates the tag when the create button is pressed', async () => {
      const user = userEvent.setup()
      const { onCreateTag, onToggleTag } = renderMenu()

      await open(user)
      await user.type(screen.getByLabelText('tags'), 'transformers')
      await user.click(screen.getByRole('button', { name: /create/ }))

      expect(onCreateTag).toHaveBeenCalledWith('transformers')
      expect(onToggleTag).not.toHaveBeenCalled()
    })

    it('creates on Enter, without reaching for the button', async () => {
      const user = userEvent.setup()
      const { onCreateTag } = renderMenu()

      await open(user)
      await user.type(screen.getByLabelText('tags'), 'transformers{Enter}')

      expect(onCreateTag).toHaveBeenCalledWith('transformers')
    })

    it('applies the existing tag on Enter when the name is already one', async () => {
      const user = userEvent.setup()
      const { onCreateTag, onToggleTag } = renderMenu()

      await open(user)
      await user.type(screen.getByLabelText('tags'), 'survey{Enter}')

      expect(onToggleTag).toHaveBeenCalledWith(SURVEY.id, true)
      expect(onCreateTag).not.toHaveBeenCalled()
    })

    it('trims what was typed, and does nothing with only spaces', async () => {
      const user = userEvent.setup()
      const { onCreateTag } = renderMenu()

      await open(user)
      const field = screen.getByLabelText('tags')

      await user.type(field, '   {Enter}')
      expect(onCreateTag).not.toHaveBeenCalled()
      expect(screen.queryByRole('button', { name: /create/ })).toBeNull()

      await user.clear(field)
      await user.type(field, '  spaced  {Enter}')
      expect(onCreateTag).toHaveBeenCalledWith('spaced')
    })

    it('clears itself once a name has been submitted', async () => {
      // Otherwise the next tag has to be typed over the last one, and the list
      // stays filtered to a tag the reader has finished with.
      const user = userEvent.setup()
      renderMenu()

      await open(user)
      await user.type(screen.getByLabelText('tags'), 'transformers{Enter}')

      expect(screen.getByLabelText('tags')).toHaveValue('')
      expect(listedTags()).toHaveLength(3)
    })
  })

  it('says so when the reader has no tags at all', async () => {
    const user = userEvent.setup()
    renderMenu({ allTags: [], appliedTagIds: new Set() })

    await open(user)

    expect(screen.getByText(EMPTY_TAGS_MESSAGE)).toBeInTheDocument()
    expect(listedTags()).toEqual([])
  })
})
