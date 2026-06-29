import { describe, expect, it, vi } from 'vitest'
import { ProviderError } from './providerContract'
import {
  adaptGitHubResponse,
  buildGitHubRequest,
  hydrateGitHubResults,
  mapGitHubSearchPolicy,
  rankGitHubResults,
  validateGitHubQuery,
} from './githubProvider'

function createGitHubResult(login) {
  return {
    id: `github:${login}`,
    title: login,
    subtitle: `@${login}`,
    description: 'GitHub search candidate.',
    imageUrl: `https://github.com/identicons/${login}.png`,
    externalUrl: `https://github.com/${login}`,
    metadata: [],
  }
}

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

  it('requires at least two characters before searching', () => {
    expect(() => validateGitHubQuery('v')).toThrow(ProviderError)
    expect(() => validateGitHubQuery('v')).toThrow('Please type more characters to search.')
  })

  it('maps semi-strict and median levels to GitHub user search', () => {
    const request = buildGitHubRequest('vi', { matchLevel: 2, limit: 12, rankingThreshold: 0.8 })
    const url = new URL(request.url)

    expect(mapGitHubSearchPolicy({ matchLevel: 0 })).toEqual({ strategy: 'exact', requestLimit: 1 })
    expect(mapGitHubSearchPolicy({ matchLevel: 2 })).toEqual({ strategy: 'user-search', requestLimit: 100 })
    expect(`${url.origin}${url.pathname}`).toBe('https://api.github.com/search/users')
    expect(url.searchParams.get('q')).toBe('vi in:login')
    expect(url.searchParams.get('per_page')).toBe('100')
  })

  it('maps lenient levels to GitHub catalog capture', () => {
    const request = buildGitHubRequest('vi', { matchLevel: 4, limit: 12, rankingThreshold: 0.8 })
    const url = new URL(request.url)

    expect(mapGitHubSearchPolicy({ matchLevel: 4 })).toEqual({ strategy: 'catalog', requestLimit: 100 })
    expect(`${url.origin}${url.pathname}`).toBe('https://api.github.com/users')
    expect(url.searchParams.get('per_page')).toBe('100')
    expect(url.searchParams.get('since')).toBe('0')
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
        { label: 'Company', value: 'GitHub' },
        { label: 'Location', value: 'San Francisco' },
        { label: 'Repositories', value: '8' },
        { label: 'Followers', value: '20' },
      ],
    })
  })

  it('does not invent profile counts for GitHub search candidates', () => {
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

  it('does not invent profile counts for GitHub catalog candidates', () => {
    const [result] = adaptGitHubResponse([
      {
        id: 3,
        login: 'catalog-user',
        avatar_url: 'https://example.com/catalog-user.png',
        html_url: 'https://github.com/catalog-user',
      },
    ])

    expect(result.description).toContain('search candidate')
    expect(result.metadata).toContainEqual({ label: 'Company', value: 'Not loaded' })
    expect(result.metadata).toContainEqual({ label: 'Repositories', value: 'Not loaded' })
  })

  it('deduplicates users captured by multiple GitHub searches', () => {
    const results = adaptGitHubResponse([
      { items: [{ id: 2, login: 'vinno', score: 42 }] },
      { items: [{ id: 2, login: 'vinno', score: 30 }] },
    ])

    expect(results).toHaveLength(1)
    expect(results[0].subtitle).toBe('@vinno')
  })

  it('hydrates GitHub search candidates with profile metadata', async () => {
    const [candidate] = adaptGitHubResponse({
      items: [{ id: 2, login: 'vinno', score: 42 }],
    })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        id: 2,
        login: 'vinno',
        name: 'Vinno',
        bio: 'Profile bio.',
        avatar_url: 'https://example.com/vinno.png',
        html_url: 'https://github.com/vinno',
        company: 'Example Co.',
        location: 'Manila',
        public_repos: 7,
        followers: 11,
      }),
    })

    const [hydrated] = await hydrateGitHubResults([candidate], { fetchImplementation: fetchMock })

    expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/users/vinno', expect.any(Object))
    expect(hydrated.metadata).toContainEqual({ label: 'Company', value: 'Example Co.' })
    expect(hydrated.metadata).toContainEqual({ label: 'Location', value: 'Manila' })
    expect(hydrated.metadata).toContainEqual({ label: 'Repositories', value: '7' })
    expect(hydrated.metadata).toContainEqual({ label: 'Followers', value: '11' })
  })

  it('keeps GitHub search candidates when profile hydration fails', async () => {
    const [candidate] = adaptGitHubResponse({
      items: [{ id: 2, login: 'vinno', score: 42 }],
    })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
    })

    await expect(hydrateGitHubResults([candidate], { fetchImplementation: fetchMock })).resolves.toEqual([candidate])
  })

  it('applies level 0 exact case-insensitive GitHub matching', () => {
    const candidates = ['vi', 'vinno', 'davinci', 'vain', 'vao', 'igloo', 'tatlo', 'Vi'].map(createGitHubResult)

    expect(
      rankGitHubResults('vi', candidates, { matchLevel: 0, limit: 12, rankingThreshold: 0.8 }).map(({ subtitle }) => subtitle),
    ).toEqual(['@vi', '@Vi'])
  })

  it('applies level 1 case-insensitive prefix GitHub matching', () => {
    const candidates = ['vi', 'vinno', 'davinci', 'vain', 'vao', 'igloo', 'tatlo'].map(createGitHubResult)

    expect(
      rankGitHubResults('vi', candidates, { matchLevel: 1, limit: 12, rankingThreshold: 0.8 }).map(({ subtitle }) => subtitle),
    ).toEqual(['@vi', '@vinno'])
  })

  it('applies level 2 case-insensitive contiguous GitHub matching', () => {
    const candidates = ['vi', 'vinno', 'davinci', 'vain', 'vao', 'igloo', 'tatlo'].map(createGitHubResult)

    expect(
      rankGitHubResults('vi', candidates, { matchLevel: 2, limit: 12, rankingThreshold: 0.8 }).map(({ subtitle }) => subtitle),
    ).toEqual(['@vi', '@vinno', '@davinci'])
  })

  it('applies level 3 case-insensitive AND-character GitHub matching', () => {
    const candidates = ['vi', 'vinno', 'davinci', 'vain', 'vao', 'igloo', 'tatlo'].map(createGitHubResult)

    expect(
      rankGitHubResults('vi', candidates, { matchLevel: 3, limit: 12, rankingThreshold: 0.8 }).map(({ subtitle }) => subtitle),
    ).toEqual(['@vi', '@vinno', '@davinci', '@vain'])
  })

  it('applies level 4 two-of-three GitHub matching for three-character queries', () => {
    const candidates = ['tavinic', 'icin', 'viite', 'volnn', 'vn', 'vi', 'in', 'cootl', 'vard', 'ibar', 'nooo'].map(createGitHubResult)
    const subtitles = rankGitHubResults('vin', candidates, { matchLevel: 4, limit: 12, rankingThreshold: 0.8 }).map(
      ({ subtitle }) => subtitle,
    )

    expect(subtitles).toEqual(expect.arrayContaining(['@tavinic', '@icin', '@viite', '@volnn', '@vn', '@vi', '@in']))
    expect(subtitles).not.toEqual(expect.arrayContaining(['@cootl', '@vard', '@ibar', '@nooo']))
  })
})
