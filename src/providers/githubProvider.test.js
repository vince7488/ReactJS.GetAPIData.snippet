import { describe, expect, it } from 'vitest'
import { adaptGitHubResponse, buildGitHubRequest, mapGitHubSearchPolicy, validateGitHubQuery } from './githubProvider'

describe('GitHub provider', () => {
  it('validates and constructs an exact-user request', () => {
    const request = buildGitHubRequest(validateGitHubQuery(' octocat '))

    expect(request).toEqual({
      url: 'https://api.github.com/users/octocat',
      options: {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2026-03-10',
        },
      },
    })
  })

  it('maps fuzzy intent to GitHub user search instead of exact lookup', () => {
    const request = buildGitHubRequest('octocat', { fuzziness: 50, limit: 12, rankingThreshold: 0.8 })
    const url = new URL(request.url)

    expect(mapGitHubSearchPolicy({ fuzziness: 0 })).toEqual({ strategy: 'exact', requestLimit: 1 })
    expect(`${url.origin}${url.pathname}`).toBe('https://api.github.com/search/users')
    expect(url.searchParams.get('q')).toBe('octocat in:login')
    expect(url.searchParams.get('per_page')).toBe('24')
  })

  it('normalizes a GitHub user into the shared display model', () => {
    const [result] = adaptGitHubResponse({
      id: 1,
      login: 'octocat',
      name: 'The Octocat',
      bio: 'A GitHub mascot.',
      avatar_url: 'https://example.com/octocat.png',
      html_url: 'https://github.com/octocat',
      company: 'GitHub',
      location: 'San Francisco',
      public_repos: 8,
      followers: 20,
    })

    expect(result).toEqual({
      id: 'github:1',
      title: 'The Octocat',
      subtitle: '@octocat',
      description: 'A GitHub mascot.',
      imageUrl: 'https://example.com/octocat.png',
      externalUrl: 'https://github.com/octocat',
      metadata: [
        { label: 'Company', value: 'GitHub' },
        { label: 'Location', value: 'San Francisco' },
        { label: 'Repositories', value: '8' },
        { label: 'Followers', value: '20' },
      ],
    })
  })

  it('does not invent profile counts for fuzzy search candidates', () => {
    const [result] = adaptGitHubResponse({
      items: [
        {
          id: 2,
          login: 'octodemo',
          score: 42,
          avatar_url: 'https://example.com/octodemo.png',
          html_url: 'https://github.com/octodemo',
        },
      ],
    })

    expect(result.description).toContain('search candidate')
    expect(result.metadata).toContainEqual({ label: 'Repositories', value: 'Not loaded' })
    expect(result.metadata).toContainEqual({ label: 'Followers', value: 'Not loaded' })
  })
})
