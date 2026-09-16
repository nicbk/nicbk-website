import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PathStep } from '~/lit-tracker/citation-path'

/**
 * What the header's way back draws: the steps, their labels, where each one
 * goes, and the fold that holds the whole path whatever a width has hidden.
 *
 * The steps are supplied rather than synced (`use-citation-path.ts` covers the
 * query), and which of them a given width *shows* is the stylesheet's, checked
 * in the browser — what is asserted here is that every step is rendered, marked
 * with where it sits, so the stylesheet has something to answer with.
 */

const steps = vi.hoisted(() => ({ current: [] as PathStep[] }))
vi.mock('./use-citation-path', () => ({
  useCitationPath: () => steps.current,
}))

/** The router's `Link`, as the attributes it would render with. */
const linkProps = vi.hoisted(() => vi.fn())
vi.mock('@tanstack/react-router', async () => {
  const { createElement } = await import('react')
  return {
    // Everything else is spread through, because Base UI's `render` prop hands
    // the menu item's own attributes — its role, its handlers — to the element
    // it is given, and a mock that swallowed them would make the menu's links
    // stop being menu items.
    Link: ({
      to,
      params,
      search,
      children,
      ...rest
    }: {
      to: string
      params: { articleId: string }
      search: (previous: Record<string, unknown>) => Record<string, unknown>
      children?: ReactNode
    } & Record<string, unknown>) => {
      linkProps({ to, params, search, ...rest })
      return createElement(
        'a',
        { href: `/lit-tracker/${params.articleId}`, ...rest },
        children,
      )
    },
  }
})

vi.mock('../article-title', async () => {
  const { createElement } = await import('react')
  return {
    ArticleTitle: ({ articleId }: { articleId: string }) =>
      createElement('span', null, `title of ${articleId}`),
  }
})

const { ArticlePath } = await import('./article-path')

const ATTENTION = 'article-attention'
const BERT = 'article-bert'
const ROBERTA = 'article-roberta'
const T5 = 'article-t5'

function step(
  id: string,
  title: string,
  role: PathStep['role'],
  label: PathStep['label'] = null,
  via: string[] = [],
): PathStep {
  return { id, title, role, label, via }
}

const THREE: PathStep[] = [
  step(ATTENTION, 'Attention Is All You Need', 'first'),
  step(
    BERT,
    'BERT: Pre-training of Deep Bidirectional Transformers',
    'previous',
    'cited by',
    [ATTENTION],
  ),
  step(
    ROBERTA,
    'RoBERTa: A Robustly Optimized BERT Pretraining',
    'current',
    'cited by',
    [ATTENTION, BERT],
  ),
]

function renderPath(path: PathStep[] = THREE) {
  steps.current = path
  return render(<ArticlePath articleId={path.at(-1)?.id ?? ROBERTA} via={[]} />)
}

beforeEach(() => {
  linkProps.mockReset()
  steps.current = []
})

describe('ArticlePath', () => {
  it('is the article’s title alone when no citation was followed', () => {
    render(<ArticlePath articleId={ROBERTA} via={[]} />)

    expect(screen.getByText(`title of ${ROBERTA}`)).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('names every paper on the way, ending on the one open', () => {
    renderPath()

    const path = screen.getByRole('navigation', { name: 'the way back' })
    expect(path).toHaveTextContent('Attention Is All You Need')
    expect(path).toHaveTextContent(
      'RoBERTa: A Robustly Optimized BERT Pretraining',
    )
  })

  it('says how each step was reached', () => {
    renderPath([
      step(ATTENTION, 'Attention', 'previous'),
      step(BERT, 'BERT', 'current', 'cites', [ATTENTION]),
    ])

    expect(
      screen.getByRole('navigation', { name: 'the way back' }),
    ).toHaveTextContent('cites')
  })

  it('leaves a step with no edge unlabelled rather than guessing', () => {
    renderPath([
      step(ATTENTION, 'Attention', 'previous'),
      step(BERT, 'BERT', 'current', null, [ATTENTION]),
    ])

    const path = screen.getByRole('navigation', { name: 'the way back' })
    expect(path).not.toHaveTextContent('cites')
    expect(path).not.toHaveTextContent('cited by')
  })

  it('marks the open paper as where you are, with nothing to press', () => {
    renderPath()

    const current = screen.getByText(
      'RoBERTa: A Robustly Optimized BERT Pretraining',
      { selector: '[aria-current="page"]' },
    )
    expect(current.tagName).toBe('SPAN')
  })

  it('links an earlier paper to itself, carrying only the path up to it', () => {
    renderPath()

    // The row's link, not the menu's: both exist, and the first call is the row.
    const props = linkProps.mock.calls[0]?.[0]
    expect(props.to).toBe('/lit-tracker/$articleId')
    expect(props.params).toEqual({ articleId: ATTENTION })
    // Dropping `view` opens the paper on its reader; the shortened `via` is what
    // makes going back a shortening rather than another hop.
    expect(
      props.search({ q: 'bert', view: 'citations', via: [ATTENTION, BERT] }),
    ).toEqual({ q: 'bert', view: undefined, via: [] })
  })

  it('tells the stylesheet how many papers there are, so it can fold', () => {
    renderPath([
      step(ATTENTION, 'Attention', 'first'),
      step(BERT, 'BERT', 'middle', 'cited by', [ATTENTION]),
      step(ROBERTA, 'RoBERTa', 'previous', 'cited by', [ATTENTION, BERT]),
      step(T5, 'T5', 'current', 'cited by', [ATTENTION, BERT, ROBERTA]),
    ])

    const path = screen.getByRole('navigation', { name: 'the way back' })
    expect(path).toHaveAttribute('data-steps', 'many')
    // Every step is rendered whatever the width will hide, and each says where
    // it sits.
    expect(
      [...path.querySelectorAll('li[data-role]')].map((item) =>
        item.getAttribute('data-role'),
      ),
    ).toEqual(['first', 'middle', 'previous', 'current'])
  })

  it('counts a short path exactly, so a width that fits it hides the fold', () => {
    renderPath()

    expect(
      screen.getByRole('navigation', { name: 'the way back' }),
    ).toHaveAttribute('data-steps', '3')
  })

  it('holds the whole path in the menu, including where you are', async () => {
    renderPath()

    await userEvent.click(screen.getByRole('button', { name: 'the way back' }))

    const items = await screen.findAllByRole('menuitem')
    expect(items.map((item) => item.textContent)).toEqual([
      'Attention Is All You Need',
      '↓ cited byBERT: Pre-training of Deep Bidirectional Transformers',
      '↓ cited byRoBERTa: A Robustly Optimized BERT Pretrainingyou are here',
    ])
  })

  it('makes the menu’s earlier papers links back, and the open one inert', async () => {
    renderPath()

    await userEvent.click(screen.getByRole('button', { name: 'the way back' }))
    const items = await screen.findAllByRole('menuitem')

    expect(items[0]).toHaveAttribute('href', `/lit-tracker/${ATTENTION}`)
    expect(items.at(-1)).not.toHaveAttribute('href')
  })
})
