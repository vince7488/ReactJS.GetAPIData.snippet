import {defineProvider, PROVIDER_ERROR_CODES, ProviderError} from './providerContract'
import {createSearchPolicy, getSearchPolicyBreadth} from '../utils/searchPolicy'

/* Generates a provider for searching books using the Open Library API. */

const OPEN_LIBRARY_SEARCH_API = 'https://openlibrary.org/search.json'
const OPEN_LIBRARY_FIELDS = [
  'key',
  'title',
  'author_name',
  'first_publish_year',
  'cover_i',
  'edition_count',
  'language',
  'subtitle',
  'alternative_title',
].join(',')
const COMBINING_MARKS_PATTERN = /[\u0300-\u036f]/g
const PUNCTUATION_PATTERN = /[^\p{L}\p{N}]+/gu
const LEADING_ARTICLES = new Set(['a', 'an', 'the'])
const STOPWORDS = new Set(['a', 'an', 'and', 'in', 'of', 'the', 'to'])

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
  const breadth = getSearchPolicyBreadth(policy)

  return {
    strategy: 'full-text',
    requestLimit: Math.min(100, Math.ceil(policy.limit * (1 + 2 * breadth))),
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
    const alternativeTitles = [book.subtitle, ...(Array.isArray(book.alternative_title) ? book.alternative_title : [])].filter(Boolean)

    return {
      id: `open-library:${book.key || index}`,
      title: book.title || 'Untitled work',
      subtitle: authors === 'Author unknown' ? authors : `by ${authors}`,
      description:
        firstPublished === 'Not listed' ? 'Publication date information is not available.' : `First published in ${firstPublished}.`,
      imageUrl: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : null,
      externalUrl: getWorkUrl(book.key),
      metadata: [
        {label: 'First published', value: firstPublished},
        {
          label: 'Editions',
          value: String(book.edition_count ?? 'Not listed'),
        },
        {
          label: 'Languages',
          value: getLanguageSummary(book.language),
        },
      ],
      searchData: {
        title: book.title || 'Untitled work',
        authors: Array.isArray(book.author_name) ? book.author_name : [],
        alternativeTitles,
        editionCount: Number(book.edition_count ?? 0),
      },
    }
  })
}

export function getOpenLibraryCandidateFields(result) {
  return [result.title, result.subtitle]
}

function normalizeOpenLibraryText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(COMBINING_MARKS_PATTERN, '')
    .toLowerCase()
    .replace(PUNCTUATION_PATTERN, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function getTokens(value) {
  const normalizedValue = normalizeOpenLibraryText(value)

  return normalizedValue ? normalizedValue.split(' ') : []
}

function dropLeadingArticles(tokens) {
  const nextTokens = [...tokens]

  while (nextTokens.length > 0 && LEADING_ARTICLES.has(nextTokens[0])) {
    nextTokens.shift()
  }

  return nextTokens
}

function getUsefulTokens(value) {
  const usefulTokens = getTokens(value).filter((token) => !STOPWORDS.has(token))

  return usefulTokens.length > 0 ? usefulTokens : getTokens(value)
}

function tokenMatches(queryToken, candidateToken) {
  return Boolean(candidateToken) && (candidateToken === queryToken || candidateToken.startsWith(queryToken))
}

function getMatchCount(queryTokens, candidateTokens) {
  return queryTokens.filter((queryToken) => candidateTokens.some((candidateToken) => tokenMatches(queryToken, candidateToken))).length
}

function hasAllTokens(queryTokens, candidateTokens) {
  return queryTokens.length > 0 && getMatchCount(queryTokens, candidateTokens) === queryTokens.length
}

function startsWithTokenSequence(queryTokens, candidateTokens) {
  return queryTokens.length > 0 && queryTokens.every((queryToken, index) => tokenMatches(queryToken, candidateTokens[index]))
}

function getOpenLibrarySearchData(result) {
  const rawAuthors =
    result.searchData?.authors ??
    result.subtitle
      .replace(/^by\s+/i, '')
      .split(',')
      .map((author) => author.trim())
      .filter(Boolean)

  return {
    title: result.searchData?.title ?? result.title,
    authors: rawAuthors,
    alternativeTitles: result.searchData?.alternativeTitles ?? [],
    editionCount: result.searchData?.editionCount ?? 0,
  }
}

function getRequiredLenientTokenCount(queryTokens) {
  if (queryTokens.length <= 1) {
    return 1
  }

  if (queryTokens.length === 2) {
    return 1
  }

  return Math.max(2, Math.ceil(queryTokens.length * 0.6))
}

function scoreOpenLibraryResult(query, result, matchLevel) {
  const searchData = getOpenLibrarySearchData(result)
  const normalizedQuery = normalizeOpenLibraryText(query)
  const normalizedTitle = normalizeOpenLibraryText(searchData.title)
  const queryTokens = getUsefulTokens(query)
  const titleTokens = getUsefulTokens(searchData.title)
  const titlePrefixTokens = dropLeadingArticles(getTokens(searchData.title)).filter((token) => !STOPWORDS.has(token))
  const authorTokens = getUsefulTokens(searchData.authors.join(' '))
  const alternativeTitleTokens = getUsefulTokens(searchData.alternativeTitles.join(' '))
  const titleMatchCount = getMatchCount(queryTokens, titleTokens)
  const authorMatchCount = getMatchCount(queryTokens, authorTokens)
  const alternativeTitleMatchCount = getMatchCount(queryTokens, alternativeTitleTokens)
  const allTitleAndAuthorTokens = [...titleTokens, ...authorTokens]
  const allSearchTokens = [...titleTokens, ...authorTokens, ...alternativeTitleTokens]

  if (matchLevel === 0) {
    return normalizedTitle === normalizedQuery ? 100 : null
  }

  if (matchLevel === 1) {
    return startsWithTokenSequence(queryTokens, titlePrefixTokens) ? 90 + titleMatchCount : null
  }

  if (matchLevel === 2) {
    return hasAllTokens(queryTokens, titleTokens) ? 80 + titleMatchCount : null
  }

  if (matchLevel === 3) {
    if (!hasAllTokens(queryTokens, allTitleAndAuthorTokens)) {
      return null
    }

    return 70 + titleMatchCount * 2 + authorMatchCount
  }

  const matchedTokenCount = getMatchCount(queryTokens, allSearchTokens)

  if (matchedTokenCount < getRequiredLenientTokenCount(queryTokens)) {
    return null
  }

  if (normalizedTitle === normalizedQuery) {
    return 100
  }

  if (startsWithTokenSequence(queryTokens, titlePrefixTokens)) {
    return 90 + titleMatchCount
  }

  if (hasAllTokens(queryTokens, titleTokens)) {
    return 80 + titleMatchCount
  }

  if (hasAllTokens(queryTokens, allTitleAndAuthorTokens)) {
    return 70 + titleMatchCount * 2 + authorMatchCount
  }

  return 50 + matchedTokenCount * 4 + titleMatchCount * 2 + authorMatchCount + alternativeTitleMatchCount * 0.5
}

export function rankOpenLibraryResults(query, results, searchPolicy) {
  const policy = createSearchPolicy(searchPolicy)

  return results
    .map((result, index) => {
      const searchData = getOpenLibrarySearchData(result)

      return {
        result,
        index,
        score: scoreOpenLibraryResult(query, result, policy.matchLevel),
        editionCount: searchData.editionCount,
      }
    })
    .filter(({score}) => score !== null)
    .sort((left, right) => right.score - left.score || right.editionCount - left.editionCount || left.index - right.index)
    .slice(0, policy.limit)
    .map(({result}) => result)
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
  rankResults: rankOpenLibraryResults,
  mapError: mapOpenLibraryError,
})
