import { describe, expect, it, vi } from 'vitest'
import { searchProvider } from './searchService'

describe('searchProvider', () => {
  it('maps an HTTP failure through the selected provider', async () => {
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

    await expect(searchProvider('open-library', 'no results', fetchMock)).rejects.toThrow(
      'Open Library found no books matching that search.',
    )
  })
})
