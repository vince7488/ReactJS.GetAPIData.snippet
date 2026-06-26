import { defineProvider, PROVIDER_ERROR_CODES, ProviderError } from './providerContract'
import { createSearchPolicy } from '../utils/searchPolicy'

const OPEN_LIBRARY_SEARCH_API = 'https://openlibrary.org/search.json'
const OPEN_LIBRARY_FIELDS = ['key', 'title', 'author_name', 'first_publish_year', 'cover_i', 'edition_count', 'language'].join(',')

export function validateOpenLibraryQuery(query) {
  const searchTerm = query.trim()

  if (!searchTerm) {
    throw new ProviderError(PROVIDER_ERROR_CODES.validation, 'Enter a book title or author.')
  }

  if (searchTerm.length < 2) {
    throw new ProviderError(PROVIDER_ERROR_CODES.validation, 'Use at least two characters for an Open Library search.')
  }

  return searchTerm
}

export function mapOpenLibrarySearchPolicy(searchPolicy) {
  const policy = createSearchPolicy(searchPolicy)

  return {
    strategy: 'full-text',
    requestLimit: Math.min(100, Math.ceil(policy.limit * (1 + (2 * policy.fuzziness) / 100))),
  }
}

export function buildOpenLibraryRequest(searchTerm, searchPolicy) {
  const providerPolicy = mapOpenLibrarySearchPolicy(searchPolicy)
  const url = new URL(OPEN_LIBRARY_SEARCH_API)
  url.search = new URLSearchParams({
    q: searchTerm,
    fields: OPEN_LIBRARY_FIELDS,
    limit: String(providerPolicy.requestLimit),
  })

  return {
    url: url.toString(),
    options: {
      headers: {
        Accept: 'application/json',
      },
    },
  }
}

function getWorkUrl(key) {
  if (!key) {
    return 'https://openlibrary.org'
  }

  const path = key.startsWith('/') ? key : `/works/${key}`
  return `https://openlibrary.org${path}`
}

function getLanguageSummary(languages) {
  if (!Array.isArray(languages) || languages.length === 0) {
    return 'Not listed'
  }

  return languages
    .slice(0, 3)
    .map((language) => language.toUpperCase())
    .join(', ')
}

export function adaptOpenLibraryResponse(payload) {
  const documents = Array.isArray(payload?.docs) ? payload.docs : []

  return documents.map((book, index) => {
    const authors = Array.isArray(book.author_name) ? book.author_name.join(', ') : 'Author unknown'
    const firstPublished = book.first_publish_year ? String(book.first_publish_year) : 'Not listed'

    return {
      id: `open-library:${book.key || index}`,
      title: book.title || 'Untitled work',
      subtitle: authors === 'Author unknown' ? authors : `by ${authors}`,
      description:
        firstPublished === 'Not listed' ? 'Publication date information is not available.' : `First published in ${firstPublished}.`,
      imageUrl: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : null,
      externalUrl: getWorkUrl(book.key),
      metadata: [
        { label: 'First published', value: firstPublished },
        {
          label: 'Editions',
          value: String(book.edition_count ?? 'Not listed'),
        },
        {
          label: 'Languages',
          value: getLanguageSummary(book.language),
        },
      ],
    }
  })
}

export function getOpenLibraryCandidateFields(result) {
  return [result.title, result.subtitle]
}

export function mapOpenLibraryError(error) {
  if (error.code === PROVIDER_ERROR_CODES.validation) {
    return error.message
  }

  if (error.code === PROVIDER_ERROR_CODES.noResults) {
    return 'Open Library found no books matching that search.'
  }

  if (error.status === 429) {
    return 'Open Library is receiving too many requests. Try again later.'
  }

  if (error.code === PROVIDER_ERROR_CODES.network) {
    return 'Open Library could not be reached. Check your connection and try again.'
  }

  return 'Open Library returned an unexpected response. Try again later.'
}

export const openLibraryProvider = defineProvider({
  id: 'open-library',
  name: 'Open Library',
  description: 'Search Open Library for books by title, author, or keywords.',
  inputLabel: 'Book title or author',
  placeholder: 'The Lord of the Rings',
  example: 'The Lord of the Rings',
  submitLabel: 'Search Open Library',
  externalLinkLabel: 'View on Open Library',
  resultsLabel: 'Open Library book results',
  validateQuery: validateOpenLibraryQuery,
  buildRequest: buildOpenLibraryRequest,
  adaptResponse: adaptOpenLibraryResponse,
  getCandidateFields: getOpenLibraryCandidateFields,
  mapError: mapOpenLibraryError,
})
