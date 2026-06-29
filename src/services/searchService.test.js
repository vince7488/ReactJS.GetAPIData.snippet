import { describe, expect, it, vi } from 'vitest'
import { searchProvider } from './searchService'
import { DEFAULT_SEARCH_POLICY } from '../utils/searchPolicy'

describe('searchProvider', () => {
  it('maps an HTTP failure through the selected provider', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    })

    await expect(searchProvider('pokeapi', 'missingno', DEFAULT_SEARCH_POLICY, fetchMock)).rejects.toThrow(
      "That Pokémon couldn't be found.",
    )
  })

  it('keeps the previous custom-fetch call signature compatible', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    })

    await expect(searchProvider('pokeapi', 'missingno', fetchMock)).rejects.toThrow("That Pokémon couldn't be found.")
  })

  it('maps an empty result set through the selected provider', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ docs: [] }),
    })

    await expect(searchProvider('open-library', 'no results', DEFAULT_SEARCH_POLICY, fetchMock)).rejects.toThrow(
      'Open Library found no books matching that search.',
    )
  })

  it('applies shared ranking and result limits after provider adaptation', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        docs: [
          { key: '/works/1', title: 'Pikachu' },
          { key: '/works/2', title: 'Pikchu' },
          { key: '/works/3', title: 'Bulbasaur' },
        ],
      }),
    })

    const results = await searchProvider('open-library', 'pikchu', { matchLevel: 4, limit: 1, rankingThreshold: 0.8 }, fetchMock)

    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Pikchu')
  })

  it('supports provider adapters that capture candidates with bounded pagination', async () => {
    const firstCatalogPage = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      login: index === 0 ? 'vard' : `catalog-${index}`,
      avatar_url: `https://example.com/catalog-${index}.png`,
      html_url: `https://github.com/catalog-${index}`,
    }))
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(firstCatalogPage),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            id: 101,
            login: 'icin',
            avatar_url: 'https://example.com/icin.png',
            html_url: 'https://github.com/icin',
          },
          {
            id: 102,
            login: 'volnn',
            avatar_url: 'https://example.com/volnn.png',
            html_url: 'https://github.com/volnn',
          },
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 101,
          login: 'icin',
          avatar_url: 'https://example.com/icin.png',
          html_url: 'https://github.com/icin',
          company: 'Icin Co.',
          public_repos: 3,
          followers: 5,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 102,
          login: 'volnn',
          avatar_url: 'https://example.com/volnn.png',
          html_url: 'https://github.com/volnn',
          company: 'Volnn Co.',
          public_repos: 8,
          followers: 13,
        }),
      })

    const results = await searchProvider('github', 'vin', { matchLevel: 4, limit: 12, rankingThreshold: 0.8 }, fetchMock)

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock.mock.calls[1][0]).toContain('since=100')
    expect(results.map((result) => result.subtitle)).toEqual(['@icin', '@volnn'])
    expect(results[0].metadata).toContainEqual({ label: 'Company', value: 'Icin Co.' })
    expect(results[1].metadata).toContainEqual({ label: 'Company', value: 'Volnn Co.' })
  })
})
