import { describe, expect, it } from 'vitest'
import { adaptOpenLibraryResponse, buildOpenLibraryRequest, validateOpenLibraryQuery } from './openLibraryProvider'

describe('Open Library provider', () => {
  it('constructs a limited search request with explicit fields', () => {
    const request = buildOpenLibraryRequest(validateOpenLibraryQuery(' Tolkien '))
    const url = new URL(request.url)

    expect(`${url.origin}${url.pathname}`).toBe('https://openlibrary.org/search.json')
    expect(url.searchParams.get('q')).toBe('Tolkien')
    expect(url.searchParams.get('limit')).toBe('12')
    expect(url.searchParams.get('fields')).toContain('author_name')
    expect(request.options.headers.Accept).toBe('application/json')
  })

  it('widens the Open Library candidate pool as fuzziness increases', () => {
    const request = buildOpenLibraryRequest('Tolkien', { fuzziness: 100, limit: 12, rankingThreshold: 0.8 })

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

    expect(result).toEqual({
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
  })
})
