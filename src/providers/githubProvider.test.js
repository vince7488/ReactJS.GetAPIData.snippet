import { describe, expect, it } from 'vitest'
import { adaptGitHubResponse, buildGitHubRequest, validateGitHubQuery } from './githubProvider'

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
})
