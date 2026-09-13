import { describe, expect, it } from 'vitest'
import type { EditableArticle } from './article-draft'
import {
  AUTHORS_REQUIRED,
  detailsFrom,
  draftErrors,
  draftFrom,
  isSaveable,
  TITLE_REQUIRED,
  withAuthorAdded,
  withAuthorName,
  withAuthorRemoved,
  YEAR_NOT_A_YEAR,
} from './article-draft'

/**
 * The edit form's three exact questions, asked without React: what a row looks
 * like as fields, what fields look like as a mutation, and what is wrong with
 * them in between.
 */

const ARTICLE: EditableArticle = {
  id: 'article-1',
  title: 'Attention Is All You Need',
  authors: [{ name: 'Ashish Vaswani' }, { name: 'Noam Shazeer' }],
  publicationYear: 2017,
  venue: 'NeurIPS',
  doi: '10.5555/3295222.3295349',
}

/** What a failed extraction actually leaves behind — the form's first user. */
const FAILED_EXTRACTION: EditableArticle = {
  id: 'article-2',
  title: 'vaswani-attention-2017.pdf',
  authors: [],
  publicationYear: null,
  venue: null,
  doi: null,
}

describe('draftFrom', () => {
  it('puts every field in the form as text', () => {
    expect(draftFrom(ARTICLE)).toEqual({
      title: 'Attention Is All You Need',
      authors: ARTICLE.authors,
      publicationYear: '2017',
      venue: 'NeurIPS',
      doi: '10.5555/3295222.3295349',
    })
  })

  it('shows an absent year, venue and DOI as empty fields', () => {
    const draft = draftFrom(FAILED_EXTRACTION)

    expect(draft.publicationYear).toBe('')
    expect(draft.venue).toBe('')
    expect(draft.doi).toBe('')
  })

  it('opens on one empty author row when the extractor found none', () => {
    // Otherwise the reader whose upload failed arrives at a list with nothing
    // in it and nothing to type into.
    expect(draftFrom(FAILED_EXTRACTION).authors).toEqual([{ name: '' }])
  })
})

describe('detailsFrom', () => {
  it('turns fields back into the mutation', () => {
    expect(detailsFrom(draftFrom(ARTICLE))).toEqual({
      title: 'Attention Is All You Need',
      authors: [{ name: 'Ashish Vaswani' }, { name: 'Noam Shazeer' }],
      publicationYear: 2017,
      venue: 'NeurIPS',
      doi: '10.5555/3295222.3295349',
    })
  })

  it('drops a blank author row rather than refusing it', () => {
    // Adding a row and thinking better of it is ordinary; it is not a mistake
    // worth stopping a save for.
    const draft = {
      ...draftFrom(ARTICLE),
      authors: [{ name: 'Ashish Vaswani' }, { name: '  ' }],
    }

    expect(detailsFrom(draft).authors).toEqual([{ name: 'Ashish Vaswani' }])
  })

  it('stores blank optional fields as absent', () => {
    const draft = { ...draftFrom(ARTICLE), venue: '', doi: '   ' }
    const details = detailsFrom(draft)

    expect(details.venue).toBeNull()
    expect(details.doi).toBeNull()
  })

  it('keeps given and family names on a row whose name was retyped', () => {
    const withStructure = draftFrom({
      ...ARTICLE,
      authors: [{ name: 'A. Vaswani', given: 'Ashish', family: 'Vaswani' }],
    })
    const renamed = {
      ...withStructure,
      authors: withAuthorName(withStructure.authors, 0, 'Ashish Vaswani'),
    }

    expect(detailsFrom(renamed).authors).toEqual([
      { name: 'Ashish Vaswani', given: 'Ashish', family: 'Vaswani' },
    ])
  })

  it.each([
    ['left empty', ''],
    ['not a number at all', 'nineteen ninety'],
    ['a number with a letter in it', '2o17'],
    ['written in exponent form', '2e3'],
    ['longer than a year', '20170'],
  ])('reads a year that is %s as absent', (_case, typed) => {
    const draft = { ...draftFrom(ARTICLE), publicationYear: typed }

    expect(detailsFrom(draft).publicationYear).toBeNull()
  })

  it('accepts a year from before four digits were needed', () => {
    // The tracker has no opinion about what belongs in a collection, and a 1543
    // printing is a real thing to catalogue.
    const draft = { ...draftFrom(ARTICLE), publicationYear: '1543' }

    expect(detailsFrom(draft).publicationYear).toBe(1543)
  })
})

describe('draftErrors', () => {
  it('finds nothing wrong with a complete draft', () => {
    const errors = draftErrors(draftFrom(ARTICLE))

    expect(errors).toEqual({})
    expect(isSaveable(errors)).toBe(true)
  })

  it('requires a title', () => {
    const draft = { ...draftFrom(ARTICLE), title: '   ' }

    expect(draftErrors(draft).title).toBe(TITLE_REQUIRED)
    expect(isSaveable(draftErrors(draft))).toBe(false)
  })

  it('requires an author who is actually named', () => {
    const draft = { ...draftFrom(ARTICLE), authors: [{ name: '  ' }] }

    expect(draftErrors(draft).authors).toBe(AUTHORS_REQUIRED)
  })

  it('accepts a list where only some rows are filled in', () => {
    const draft = {
      ...draftFrom(ARTICLE),
      authors: [{ name: 'Ashish Vaswani' }, { name: '' }],
    }

    expect(draftErrors(draft).authors).toBeUndefined()
  })

  it('objects to a year that is not one', () => {
    const draft = { ...draftFrom(ARTICLE), publicationYear: '2o17' }

    expect(draftErrors(draft).publicationYear).toBe(YEAR_NOT_A_YEAR)
  })

  it('does not object to an empty year', () => {
    // Optional means optional: a preprint has no year and saying so is not an
    // error to correct.
    const draft = { ...draftFrom(ARTICLE), publicationYear: '' }

    expect(draftErrors(draft).publicationYear).toBeUndefined()
  })

  it('reports both faults a failed extraction opens with', () => {
    const draft = draftFrom(FAILED_EXTRACTION)
    // The filename is a title as far as this is concerned — it is only the
    // authors that are missing outright.
    expect(draftErrors({ ...draft, title: '' })).toEqual({
      title: TITLE_REQUIRED,
      authors: AUTHORS_REQUIRED,
    })
  })
})

describe('the author list', () => {
  const AUTHORS = [
    { name: 'Ashish Vaswani' },
    { name: 'Noam Shazeer' },
    { name: 'Niki Parmar' },
  ]

  it('renames one row and leaves the others exactly as they were', () => {
    expect(withAuthorName(AUTHORS, 1, 'N. Shazeer')).toEqual([
      { name: 'Ashish Vaswani' },
      { name: 'N. Shazeer' },
      { name: 'Niki Parmar' },
    ])
  })

  it('keeps the structured parts of the row it renames', () => {
    const structured = [
      { name: 'A. Vaswani', given: 'Ashish', family: 'Vaswani' },
    ]

    expect(withAuthorName(structured, 0, 'Ashish Vaswani')).toEqual([
      { name: 'Ashish Vaswani', given: 'Ashish', family: 'Vaswani' },
    ])
  })

  it('adds an empty row at the end', () => {
    expect(withAuthorAdded(AUTHORS)).toHaveLength(4)
    expect(withAuthorAdded(AUTHORS).at(-1)).toEqual({ name: '' })
  })

  it('removes the row asked for, leaving the rest in order', () => {
    // The commonest repair there is: an author invented out of an affiliation
    // line.
    expect(withAuthorRemoved(AUTHORS, 1)).toEqual([
      { name: 'Ashish Vaswani' },
      { name: 'Niki Parmar' },
    ])
  })

  it('leaves an empty row behind when the last one is removed', () => {
    // Removing everything must not take away the field the reader needs to fix
    // what they just did.
    expect(withAuthorRemoved([{ name: 'Ashish Vaswani' }], 0)).toEqual([
      { name: '' },
    ])
  })

  it('never mutates the list it was given', () => {
    const original = [...AUTHORS]

    withAuthorName(AUTHORS, 0, 'someone else')
    withAuthorAdded(AUTHORS)
    withAuthorRemoved(AUTHORS, 0)

    expect(AUTHORS).toEqual(original)
  })
})
