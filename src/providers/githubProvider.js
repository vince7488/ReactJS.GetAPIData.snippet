import { defineProvider, PROVIDER_ERROR_CODES, ProviderError } from './providerContract'

const GITHUB_USERS_API = 'https://api.github.com/users'
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

export function buildGitHubRequest(username) {
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

export function adaptGitHubResponse(profile) {
  const login = profile.login || 'unknown-user'

  return [
    {
      id: `github:${profile.id ?? login}`,
      title: profile.name || login,
      subtitle: `@${login}`,
      description: profile.bio || 'No public bio has been provided.',
      imageUrl: profile.avatar_url || `https://github.com/identicons/${encodeURIComponent(login)}.png`,
      externalUrl: profile.html_url || `https://github.com/${login}`,
      metadata: [
        { label: 'Company', value: profile.company || 'Not listed' },
        { label: 'Location', value: profile.location || 'Not listed' },
        {
          label: 'Repositories',
          value: String(profile.public_repos ?? 0),
        },
        { label: 'Followers', value: String(profile.followers ?? 0) },
      ],
    },
  ]
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
  description: 'Find a public GitHub user by their exact username.',
  inputLabel: 'GitHub username',
  placeholder: 'octocat',
  example: 'octocat',
  submitLabel: 'Find GitHub user',
  externalLinkLabel: 'View GitHub profile',
  resultsLabel: 'GitHub user results',
  validateQuery: validateGitHubQuery,
  buildRequest: buildGitHubRequest,
  adaptResponse: adaptGitHubResponse,
  mapError: mapGitHubError,
})
