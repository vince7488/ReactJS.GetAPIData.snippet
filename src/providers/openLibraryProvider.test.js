import { describe, expect, it } from 'vitest'
import {
  adaptOpenLibraryResponse,
  buildOpenLibraryRequest,
  rankOpenLibraryResults,
  validateOpenLibraryQuery,
} from './openLibraryProvider'

describe('Open Library provider', () => {
  it('constructs a limited search request with explicit fields', () => {
    const request = buildOpenLibraryRequest(validateOpenLibraryQuery(' Tolkien '))
    const url = new URL(request.url)

    expect(`${url.origin}${url.pathname}`).toBe('https://openlibrary.org/search.json')
    expect(url.searchParams.get('q')).toBe('Tolkien')
    expect(url.searchParams.get('limit')).toBe('12')
    expect(url.searchParams.get('fields')).toContain('author_name')
    expect(url.searchParams.get('fields')).toContain('alternative_title')
    expect(request.options.headers.Accept).toBe('application/json')
  })

  it('widens the Open Library candidate pool as match level increases', () => {
    const request = buildOpenLibraryRequest('Tolkien', { matchLevel: 4, limit: 12, rankingThreshold: 0.8 })

    expect(new URL(request.url).searchParams.get('limit')).toBe('36')
  })

  it('normalizes book documents into the shared display model', () => {
    const [result] = adaptOpenLibraryResponse({
      docs: [
        {
          key: '/works/OL27448W',
          title: 'The Lord of the Rings',
          author_name: ['J. R. R. Tolkien'],
          first_publish_year: 1954,
          cover_i: 258027,
          edition_count: 120,
          language: ['eng', 'fre'],
        },
      ],
    })

    expect(result).toMatchObject({
      id: 'open-library:/works/OL27448W',
      title: 'The Lord of the Rings',
      subtitle: 'by J. R. R. Tolkien',
      description: 'First published in 1954.',
      imageUrl: 'https://covers.openlibrary.org/b/id/258027-M.jpg',
      externalUrl: 'https://openlibrary.org/works/OL27448W',
      metadata: [
        { label: 'First published', value: '1954' },
        { label: 'Editions', value: '120' },
        { label: 'Languages', value: 'ENG, FRE' },
      ],
    })
    expect(result.searchData).toEqual({
      title: 'The Lord of the Rings',
      authors: ['J. R. R. Tolkien'],
      alternativeTitles: [],
      editionCount: 120,
    })
  })

  it('applies level 0 exact normalized title matching', () => {
    const candidates = adaptOpenLibraryResponse({
      docs: [
        { key: '/works/1', title: 'The Hobbit', author_name: ['J. R. R. Tolkien'], edition_count: 120 },
        { key: '/works/2', title: 'The Hobbit, or There and Back Again', author_name: ['J. R. R. Tolkien'], edition_count: 40 },
        { key: '/works/3', title: 'The Annotated Hobbit', author_name: ['J. R. R. Tolkien'], edition_count: 12 },
      ],
    })

    expect(
      rankOpenLibraryResults('the hobbit', candidates, { matchLevel: 0, limit: 12, rankingThreshold: 0.8 }).map(({ title }) => title),
    ).toEqual(['The Hobbit'])
  })

  it('applies level 1 title-prefix matching while ignoring leading articles and stopwords', () => {
    const candidates = adaptOpenLibraryResponse({
      docs: [
        { key: '/works/1', title: 'The Hobbit', author_name: ['J. R. R. Tolkien'], edition_count: 120 },
        { key: '/works/2', title: 'The Hobbit, or There and Back Again', author_name: ['J. R. R. Tolkien'], edition_count: 40 },
        { key: '/works/3', title: 'Finding the Hobbit', author_name: ['Someone Else'], edition_count: 3 },
      ],
    })

    expect(
      rankOpenLibraryResults('hobbit', candidates, { matchLevel: 1, limit: 12, rankingThreshold: 0.8 }).map(({ title }) => title),
    ).toEqual(['The Hobbit', 'The Hobbit, or There and Back Again'])
  })

  it('applies level 2 unordered title-token matching', () => {
    const candidates = adaptOpenLibraryResponse({
      docs: [
        { key: '/works/1', title: 'The Hobbit', author_name: ['J. R. R. Tolkien'], edition_count: 120 },
        { key: '/works/2', title: 'The Annotated Hobbit', author_name: ['J. R. R. Tolkien'], edition_count: 12 },
      ],
    })

    expect(
      rankOpenLibraryResults('hobbit annotated', candidates, { matchLevel: 2, limit: 12, rankingThreshold: 0.8 }).map(
        ({ title }) => title,
      ),
    ).toEqual(['The Annotated Hobbit'])
  })

  it('applies level 3 all-token matching across title and author fields', () => {
    const candidates = adaptOpenLibraryResponse({
      docs: [
        { key: '/works/1', title: 'Frankenstein', author_name: ['Mary Shelley'], edition_count: 140 },
        { key: '/works/2', title: 'Frankenstein', author_name: ['Dean Koontz'], edition_count: 3 },
        { key: '/works/3', title: 'Mary', author_name: ['Vladimir Nabokov'], edition_count: 8 },
      ],
    })

    expect(
      rankOpenLibraryResults('frankenstein shelley', candidates, { matchLevel: 3, limit: 12, rankingThreshold: 0.8 }).map(
        ({ title }) => title,
      ),
    ).toEqual(['Frankenstein'])
  })

  it('applies level 4 lenient token coverage across title, author, and alternate titles', () => {
    const candidates = adaptOpenLibraryResponse({
      docs: [
        {
          key: '/works/1',
          title: 'Harry Potter and the Sorcerer Stone',
          alternative_title: ['Harry Potter and the Philosopher Stone'],
          author_name: ['J. K. Rowling'],
          edition_count: 80,
        },
        { key: '/works/2', title: 'The Philosophy Book', author_name: ['DK'], edition_count: 35 },
        { key: '/works/3', title: 'Stone Soup', author_name: ['Marcia Brown'], edition_count: 8 },
      ],
    })

    expect(
      rankOpenLibraryResults('philosopher stone rowling', candidates, { matchLevel: 4, limit: 12, rankingThreshold: 0.8 }).map(
        ({ title }) => title,
      ),
    ).toEqual(['Harry Potter and the Sorcerer Stone'])
  })

  it('uses edition count as a deterministic tie-breaker', () => {
    const candidates = adaptOpenLibraryResponse({
      docs: [
        { key: '/works/1', title: 'Dune', author_name: ['Frank Herbert'], edition_count: 20 },
        { key: '/works/2', title: 'Dune', author_name: ['Frank Herbert'], edition_count: 200 },
      ],
    })

    expect(
      rankOpenLibraryResults('dune', candidates, { matchLevel: 0, limit: 12, rankingThreshold: 0.8 }).map(({ id }) => id),
    ).toEqual(['open-library:/works/2', 'open-library:/works/1'])
  })
})
