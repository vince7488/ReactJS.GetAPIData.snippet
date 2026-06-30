import { describe, expect, it, vi } from 'vitest'
import { searchProvider } from './searchService'

const dataImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

function createJsonResponse(payload) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(payload),
  }
}

function createGitHubProfile(login, overrides = {}) {
  return {
    id: overrides.id ?? 1,
    login,
    name: overrides.name ?? login,
    bio: overrides.bio ?? 'Mocked GitHub profile.',
    avatar_url: dataImage,
    html_url: `https://github.com/${login}`,
    company: overrides.company ?? 'Mock Co.',
    location: overrides.location ?? 'Remote',
    public_repos: overrides.public_repos ?? 7,
    followers: overrides.followers ?? 11,
  }
}

function createPokemonDetail(id, name) {
  return {
    id,
    name,
    base_experience: 112,
    height: 4,
    weight: 60,
    sprites: {
      front_default: null,
      other: {
        'official-artwork': {
          front_default: null,
        },
      },
    },
    types: [{ type: { name: 'electric' } }],
    abilities: [{ ability: { name: 'static' } }],
  }
}

describe('provider integrations with mocked API responses', () => {
  it('searches and hydrates GitHub users without a live GitHub request', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          items: [
            {
              id: 7488,
              login: 'vince7488',
              score: 42,
              avatar_url: dataImage,
              html_url: 'https://github.com/vince7488',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(createJsonResponse(createGitHubProfile('vince7488', { id: 7488, company: 'Vernard LLC' })))

    const results = await searchProvider('github', 'vince7488', { matchLevel: 1, limit: 12, rankingThreshold: 0.8 }, fetchMock)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toContain('https://api.github.com/search/users')
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.github.com/users/vince7488')
    expect(results[0]).toMatchObject({
      title: 'vince7488',
      subtitle: '@vince7488',
    })
    expect(results[0].metadata).toContainEqual({ label: 'Company', value: 'Vernard LLC' })
  })

  it('searches Open Library from mocked search documents', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      createJsonResponse({
        docs: [
          {
            key: '/works/OL262758W',
            title: 'The Hobbit',
            author_name: ['J. R. R. Tolkien'],
            first_publish_year: 1937,
            edition_count: 120,
            language: ['eng'],
          },
          {
            key: '/works/OL1W',
            title: 'The Annotated Hobbit',
            author_name: ['J. R. R. Tolkien'],
            first_publish_year: 2002,
            edition_count: 3,
            language: ['eng'],
          },
        ],
      }),
    )

    const results = await searchProvider('open-library', 'the hobbit', { matchLevel: 0, limit: 54, rankingThreshold: 0.8 }, fetchMock)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain('https://openlibrary.org/search.json')
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      title: 'The Hobbit',
      subtitle: 'by J. R. R. Tolkien',
    })
  })

  it('searches PokéAPI from a mocked exact Pokémon response', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(createJsonResponse(createPokemonDetail(25, 'pikachu')))

    const results = await searchProvider('pokeapi', 'pikachu', { matchLevel: 0, limit: 54, rankingThreshold: 0.8 }, fetchMock)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://pokeapi.co/api/v2/pokemon/pikachu')
    expect(results[0]).toMatchObject({
      title: 'Pikachu',
      subtitle: 'National Pokédex #0025',
    })
    expect(results[0].metadata).toContainEqual({ label: 'Types', value: 'Electric' })
  })
})
