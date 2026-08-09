import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { UploadJobRow } from './job-list'
import { UploadStatus } from './upload-status'

function job(overrides: Partial<UploadJobRow> = {}): UploadJobRow {
  return {
    id: 'job-1',
    filename: 'paper.pdf',
    status: 'processing',
    failureReason: null,
    ...overrides,
  }
}

describe('UploadStatus', () => {
  it('shows the synced state as a non-clickable checkmark', async () => {
    render(<UploadStatus jobs={[]} />)

    // Not merely "disabled": there is no button at all, because a control that
    // does nothing when activated is worse than no control.
    expect(screen.queryByRole('button')).toBeNull()
    expect(
      screen.getByRole('img', { name: 'All articles synced' }),
    ).toBeInTheDocument()
  })

  it('does not claim the page status region', () => {
    // The collection's loading placeholder is the page's `role="status"`. A
    // second one here announced itself unprompted and made that one ambiguous.
    render(<UploadStatus jobs={[]} />)

    expect(screen.queryByRole('status')).toBeNull()
  })

  it('exposes the synced tooltip on hover', async () => {
    const user = userEvent.setup()
    render(<UploadStatus jobs={[]} />)

    await user.hover(screen.getByRole('img', { name: 'All articles synced' }))

    expect(await screen.findAllByText('All articles synced')).not.toHaveLength(
      0,
    )
  })

  it('opens the job list from the in-progress state', async () => {
    const user = userEvent.setup()
    render(<UploadStatus jobs={[job({ filename: 'quantum.pdf' })]} />)

    const trigger = screen.getByRole('button', { name: 'Uploads in progress' })
    await user.click(trigger)

    const list = await screen.findByRole('list', { name: 'Uploads' })
    expect(within(list).getByText('quantum.pdf')).toBeInTheDocument()
  })

  it('names the failed state in words, not by color alone', async () => {
    render(
      <UploadStatus jobs={[job({ status: 'failed', failureReason: 'x' })]} />,
    )

    expect(
      screen.getByRole('button', { name: 'Some uploads need attention' }),
    ).toBeInTheDocument()
  })

  it('shows a failure reason and a progress indicator on the right rows', async () => {
    const user = userEvent.setup()
    render(
      <UploadStatus
        jobs={[
          job({ id: 'a', filename: 'ok.pdf' }),
          job({
            id: 'b',
            filename: 'broken.pdf',
            status: 'failed',
            failureReason: "couldn't find authors",
          }),
        ]}
      />,
    )

    await user.click(screen.getByRole('button'))
    const list = await screen.findByRole('list', { name: 'Uploads' })

    expect(within(list).getByText("couldn't find authors")).toBeInTheDocument()
    // The in-progress row, and only it, carries the progress indicator.
    const bars = within(list).getAllByRole('progressbar')
    expect(bars).toHaveLength(1)
    expect(bars[0]).toHaveAccessibleName('Extracting ok.pdf')
  })

  it('renders multiple failures as multiple flat rows', async () => {
    const user = userEvent.setup()
    render(
      <UploadStatus
        jobs={[
          job({
            id: 'a',
            filename: 'one.pdf',
            status: 'failed',
            failureReason: 'no title',
          }),
          job({
            id: 'b',
            filename: 'two.pdf',
            status: 'failed',
            failureReason: 'no authors',
          }),
          job({
            id: 'c',
            filename: 'three.pdf',
            status: 'failed',
            failureReason: 'unreadable',
          }),
        ]}
      />,
    )

    await user.click(screen.getByRole('button'))
    const list = await screen.findByRole('list', { name: 'Uploads' })

    // No grouping and no summary — the decided behaviour is one row each.
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
  })

  it('falls back to a generic reason when a failed job carries none', async () => {
    const user = userEvent.setup()
    render(<UploadStatus jobs={[job({ status: 'failed' })]} />)

    await user.click(screen.getByRole('button'))

    expect(await screen.findByText('Extraction failed.')).toBeInTheDocument()
  })
})
