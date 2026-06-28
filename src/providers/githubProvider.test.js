import {describe, expect, it} from 'vitest'
import {adaptGitHubResponse, buildGitHubRequest, mapGitHubSearchPolicy, validateGitHubQuery} from './githubProvider'

describe('GitHub provider', () => {
  it('validates and constructs an exact-user request', () => {
    const request = buildGitHubRequest(validateGitHubQuery(' vince7488 '))

    expect(request).toEqual({
      url: 'https://api.github.com/users/vince7488',
      options: {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2026-03-10',
        },
      },
    })
  })

  it('maps fuzzy intent to GitHub user search instead of exact lookup', () => {
    const request = buildGitHubRequest('vince7488', {fuzziness: 50, limit: 12, rankingThreshold: 0.8})
    const url = new URL(request.url)

    expect(mapGitHubSearchPolicy({fuzziness: 0})).toEqual({strategy: 'exact', requestLimit: 1})
    expect(`${url.origin}${url.pathname}`).toBe('https://api.github.com/search/users')
    expect(url.searchParams.get('q')).toBe('vince7488 in:login')
    expect(url.searchParams.get('per_page')).toBe('24')
  })

  it('normalizes a GitHub user into the shared display model', () => {
    const [result] = adaptGitHubResponse({
      id: 1,
      login: 'vince7488',
      name: 'The vince7488',
      bio: 'A GitHub mascot.',
      avatar_url: 'https://example.com/vince7488.png',
      html_url: 'https://github.com/vince7488',
      company: 'GitHub',
      location: 'San Francisco',
      public_repos: 8,
      followers: 20,
    })

    expect(result).toEqual({
      id: 'github:1',
      title: 'The vince7488',
      subtitle: '@vince7488',
      description: 'A GitHub mascot.',
      imageUrl: 'https://example.com/vince7488.png',
      externalUrl: 'https://github.com/vince7488',
      metadata: [
        {label: 'Company', value: 'GitHub'},
        {label: 'Location', value: 'San Francisco'},
        {label: 'Repositories', value: '8'},
        {label: 'Followers', value: '20'},
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
    expect(result.metadata).toContainEqual({label: 'Repositories', value: 'Not loaded'})
    expect(result.metadata).toContainEqual({label: 'Followers', value: 'Not loaded'})
  })
})
