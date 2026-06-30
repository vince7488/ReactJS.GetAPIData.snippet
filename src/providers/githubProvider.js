import { defineProvider, PROVIDER_ERROR_CODES, ProviderError } from './providerContract'
import { createSearchPolicy } from '../utils/searchPolicy'

/* The classic. The first one. This provider is the original inspiration for the entire project. It was built to demonstrate how to implement a provider and to serve as a reference for other providers. */
// Grabs the information from the GitHub API and adapts it to the provider contract. It supports searching for users by username, hydrating user profiles with additional metadata, and ranking results based on match levels.

const GITHUB_USERS_API = 'https://api.github.com/users'
const GITHUB_USER_SEARCH_API = 'https://api.github.com/search/users'
const GITHUB_API_VERSION = '2026-03-10'
const GITHUB_SEARCH_REQUEST_LIMIT = 100
const GITHUB_SEARCH_PAGE_LIMIT = 3
const GITHUB_CATALOG_PAGE_LIMIT = 3
const MIN_GITHUB_SEARCH_CHARACTERS = 2
const USERNAME_PATTERN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i

export function validateGitHubQuery(query) {
  const username = query.trim()

  if (!username) {
    throw new ProviderError(PROVIDER_ERROR_CODES.validation, 'Enter a GitHub username.')
  }

  if (username.length < MIN_GITHUB_SEARCH_CHARACTERS) {
    throw new ProviderError(PROVIDER_ERROR_CODES.validation, 'Please type more characters to search.')
  }

  if (!USERNAME_PATTERN.test(username)) {
    throw new ProviderError(
      PROVIDER_ERROR_CODES.validation,
      'Use a valid GitHub username containing only letters, numbers, or single hyphens.',
    )
  }

  return username
}

export function mapGitHubSearchPolicy(searchPolicy) {
  const policy = createSearchPolicy(searchPolicy)

  if (policy.matchLevel === 0) {
    return {
      strategy: 'exact',
      requestLimit: 1,
    }
  }

  return {
    strategy: policy.matchLevel <= 2 ? 'user-search' : 'user-search-and-catalog',
    requestLimit: GITHUB_SEARCH_REQUEST_LIMIT,
  }
}

function buildGitHubSearchRequest(searchTerm, requestLimit, page = 1) {
  const searchUrl = new URL(GITHUB_USER_SEARCH_API)
  searchUrl.search = new URLSearchParams({
    q: `${searchTerm} in:login`,
    per_page: String(requestLimit),
    page: String(page),
  })

  return {
    url: searchUrl.toString(),
    maxPages: GITHUB_SEARCH_PAGE_LIMIT,
    getNextRequest(payload) {
      const items = Array.isArray(payload?.items) ? payload.items : []

      if (page >= GITHUB_SEARCH_PAGE_LIMIT || items.length < requestLimit) {
        return null
      }

      return buildGitHubSearchRequest(searchTerm, requestLimit, page + 1)
    },
    options: {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
    },
  }
}

function getUniqueSearchCharacters(username) {
  return [...new Set(username.toLowerCase().match(/[a-z\d-]/g) ?? [])]
}

function buildGitHubUserRequest(username) {
  return {
    url: `${GITHUB_USERS_API}/${encodeURIComponent(username)}`,
    options: {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
    },
  }
}

function buildGitHubCatalogRequest(since = 0) {
  const catalogUrl = new URL(GITHUB_USERS_API)
  catalogUrl.search = new URLSearchParams({
    per_page: String(GITHUB_SEARCH_REQUEST_LIMIT),
    since: String(since),
  })

  return {
    url: catalogUrl.toString(),
    maxPages: GITHUB_CATALOG_PAGE_LIMIT,
    getNextRequest(payload) {
      const users = Array.isArray(payload) ? payload : []
      const lastUser = users.at(-1)

      if (!lastUser?.id || users.length < GITHUB_SEARCH_REQUEST_LIMIT) {
        return null
      }

      return buildGitHubCatalogRequest(lastUser.id)
    },
    options: {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
    },
  }
}

export function buildGitHubRequest(username, searchPolicy) {
  const providerPolicy = mapGitHubSearchPolicy(searchPolicy)

  if (providerPolicy.strategy === 'user-search') {
    return buildGitHubSearchRequest(username, providerPolicy.requestLimit)
  }

  if (providerPolicy.strategy === 'user-search-and-catalog') {
    return [buildGitHubSearchRequest(username, providerPolicy.requestLimit), buildGitHubCatalogRequest()]
  }

  return buildGitHubUserRequest(username)
}

function adaptGitHubUser(profile) {
  const login = profile.login || 'unknown-user'
  const isSearchCandidate =
    profile.score !== undefined ||
    !('bio' in profile || 'company' in profile || 'location' in profile || 'public_repos' in profile || 'followers' in profile)

  return {
    id: `github:${profile.id ?? login}`,
    title: profile.name || login,
    subtitle: `@${login}`,
    description:
      profile.bio ||
      (isSearchCandidate ? 'GitHub search candidate. Open the profile for complete details.' : 'No public bio has been provided.'),
    imageUrl: profile.avatar_url || `https://github.com/identicons/${encodeURIComponent(login)}.png`,
    externalUrl: profile.html_url || `https://github.com/${login}`,
    metadata: [
      { label: 'Company', value: profile.company || (isSearchCandidate ? 'Not loaded' : 'Not listed') },
      { label: 'Location', value: profile.location || (isSearchCandidate ? 'Not loaded' : 'Not listed') },
      {
        label: 'Repositories',
        value: profile.public_repos === undefined && isSearchCandidate ? 'Not loaded' : String(profile.public_repos ?? 0),
      },
      {
        label: 'Followers',
        value: profile.followers === undefined && isSearchCandidate ? 'Not loaded' : String(profile.followers ?? 0),
      },
    ],
  }
}

export function adaptGitHubResponse(payload) {
  if (Array.isArray(payload)) {
    const usersByKey = new Map()

    for (const providerPayload of payload) {
      for (const profile of adaptGitHubResponse(providerPayload)) {
        usersByKey.set(profile.id, profile)
      }
    }

    return [...usersByKey.values()]
  }

  if (Array.isArray(payload?.items)) {
    return payload.items.map(adaptGitHubUser)
  }

  return [adaptGitHubUser(payload)]
}

export function getGitHubCandidateFields(result) {
  return [result.title, result.subtitle]
}

function getGitHubLogin(result) {
  return result.subtitle.startsWith('@') ? result.subtitle.slice(1) : result.title
}

function getSearchCharacters(query) {
  return getUniqueSearchCharacters(query)
}

function scoreGitHubLogin(query, login, matchLevel) {
  const normalizedQuery = query.toLowerCase()
  const normalizedLogin = login.toLowerCase()

  if (matchLevel === 0) {
    return normalizedLogin === normalizedQuery ? 100 : null
  }

  const containsQuery = normalizedLogin.includes(normalizedQuery)
  const startsWithQuery = normalizedLogin.startsWith(normalizedQuery)
  const queryCharacters = getSearchCharacters(normalizedQuery)
  const matchedCharacterCount = queryCharacters.filter((character) => normalizedLogin.includes(character)).length
  const hasAllCharacters = matchedCharacterCount === queryCharacters.length
  const minimumLenientCharacterCount = queryCharacters.length >= 3 ? 2 : queryCharacters.length
  const hasEnoughLenientCharacters = matchedCharacterCount >= minimumLenientCharacterCount

  if (matchLevel === 1 && !startsWithQuery) {
    return null
  }

  if (matchLevel === 2 && !containsQuery) {
    return null
  }

  if (matchLevel === 3 && !hasAllCharacters) {
    return null
  }

  if (matchLevel === 4 && !hasEnoughLenientCharacters) {
    return null
  }

  if (normalizedLogin === normalizedQuery) {
    return 100
  }

  if (startsWithQuery) {
    return 80 - normalizedLogin.length / 1000
  }

  if (containsQuery) {
    return 60 - normalizedLogin.indexOf(normalizedQuery) / 100 - normalizedLogin.length / 1000
  }

  if (hasAllCharacters) {
    return 40 - normalizedLogin.length / 1000
  }

  return 20 * (matchedCharacterCount / queryCharacters.length) - normalizedLogin.length / 1000
}

export function rankGitHubResults(query, results, searchPolicy) {
  const policy = createSearchPolicy(searchPolicy)

  return results
    .map((result, index) => ({
      result,
      index,
      score: scoreGitHubLogin(query, getGitHubLogin(result), policy.matchLevel),
    }))
    .filter(({ score }) => score !== null)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, policy.limit)
    .map(({ result }) => result)
}

function hasUnloadedGitHubMetadata(result) {
  return result.metadata.some((item) => item.value === 'Not loaded')
}

async function hydrateGitHubResult(result, fetchImplementation) {
  if (!hasUnloadedGitHubMetadata(result)) {
    return result
  }

  const request = buildGitHubUserRequest(getGitHubLogin(result))
  let response

  try {
    response = await fetchImplementation(request.url, request.options)
  } catch (cause) {
    throw new ProviderError(PROVIDER_ERROR_CODES.network, 'GitHub profile hydration request failed.', { cause })
  }

  if (!response.ok) {
    throw new ProviderError(PROVIDER_ERROR_CODES.http, `GitHub profile hydration returned HTTP ${response.status}.`, {
      status: response.status,
    })
  }

  try {
    return adaptGitHubUser(await response.json())
  } catch (cause) {
    throw new ProviderError(PROVIDER_ERROR_CODES.invalidResponse, 'GitHub profile hydration returned invalid JSON.', { cause })
  }
}

function assertGitHubHydrationComplete(result) {
  if (hasUnloadedGitHubMetadata(result)) {
    throw new ProviderError(PROVIDER_ERROR_CODES.invalidResponse, 'GitHub profile metadata is incomplete after hydration.')
  }
}

export async function hydrateGitHubResults(results, { fetchImplementation }) {
  const hydratedResults = await Promise.all(results.map((result) => hydrateGitHubResult(result, fetchImplementation)))

  hydratedResults.forEach(assertGitHubHydrationComplete)

  return hydratedResults
}

export function mapGitHubError(error) {
  if (error.code === PROVIDER_ERROR_CODES.validation) {
    return error.message
  }

  if (error.code === PROVIDER_ERROR_CODES.noResults || error.status === 404) {
    return "That GitHub username couldn't be found."
  }

  if (error.status === 403 || error.status === 429) {
    return 'GitHub has temporarily rate-limited this search. Try again later.'
  }

  if (error.code === PROVIDER_ERROR_CODES.network) {
    return 'GitHub could not be reached. Check your connection and try again.'
  }

  return 'GitHub returned an unexpected response. Try again later.'
}

export const githubProvider = defineProvider({
  id: 'github',
  name: 'GitHub',
  description: 'Find public GitHub users by username with provider-specific match levels.',
  inputLabel: 'GitHub username',
  placeholder: 'vince7488',
  example: 'vince7488',
  submitLabel: 'Find GitHub user',
  externalLinkLabel: 'View GitHub profile',
  resultsLabel: 'GitHub user results',
  validateQuery: validateGitHubQuery,
  buildRequest: buildGitHubRequest,
  adaptResponse: adaptGitHubResponse,
  getCandidateFields: getGitHubCandidateFields,
  rankResults: rankGitHubResults,
  hydrateResults: hydrateGitHubResults,
  mapError: mapGitHubError,
})
