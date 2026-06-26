import { defineProvider, PROVIDER_ERROR_CODES, ProviderError } from './providerContract'
import { createSearchPolicy } from '../utils/searchPolicy'

const GITHUB_USERS_API = 'https://api.github.com/users'
const GITHUB_USER_SEARCH_API = 'https://api.github.com/search/users'
const GITHUB_API_VERSION = '2026-03-10'
const USERNAME_PATTERN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i

export function validateGitHubQuery(query) {
  const username = query.trim()

  if (!username) {
    throw new ProviderError(PROVIDER_ERROR_CODES.validation, 'Enter a GitHub username.')
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

  if (policy.fuzziness === 0) {
    return {
      strategy: 'exact',
      requestLimit: 1,
    }
  }

  return {
    strategy: 'user-search',
    requestLimit: Math.min(100, Math.ceil(policy.limit * (1 + (2 * policy.fuzziness) / 100))),
  }
}

export function buildGitHubRequest(username, searchPolicy) {
  const providerPolicy = mapGitHubSearchPolicy(searchPolicy)
  let url = `${GITHUB_USERS_API}/${encodeURIComponent(username)}`

  if (providerPolicy.strategy === 'user-search') {
    const searchUrl = new URL(GITHUB_USER_SEARCH_API)
    searchUrl.search = new URLSearchParams({
      q: `${username} in:login`,
      per_page: String(providerPolicy.requestLimit),
    })
    url = searchUrl.toString()
  }

  return {
    url,
    options: {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
    },
  }
}

function adaptGitHubUser(profile) {
  const login = profile.login || 'unknown-user'
  const isSearchCandidate = profile.score !== undefined

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
  if (Array.isArray(payload?.items)) {
    return payload.items.map(adaptGitHubUser)
  }

  return [adaptGitHubUser(payload)]
}

export function getGitHubCandidateFields(result) {
  return [result.title, result.subtitle]
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
  description: 'Find public GitHub users by username with exact or broader matching.',
  inputLabel: 'GitHub username',
  placeholder: 'octocat',
  example: 'octocat',
  submitLabel: 'Find GitHub user',
  externalLinkLabel: 'View GitHub profile',
  resultsLabel: 'GitHub user results',
  validateQuery: validateGitHubQuery,
  buildRequest: buildGitHubRequest,
  adaptResponse: adaptGitHubResponse,
  getCandidateFields: getGitHubCandidateFields,
  mapError: mapGitHubError,
})
