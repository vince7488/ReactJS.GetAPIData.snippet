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

    const results = await searchProvider('open-library', 'pikchu', { fuzziness: 100, limit: 1, rankingThreshold: 0.8 }, fetchMock)

    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Pikchu')
  })
})
