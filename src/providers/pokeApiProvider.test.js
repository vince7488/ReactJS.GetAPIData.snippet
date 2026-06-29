import { describe, expect, it, vi } from 'vitest'
import { ProviderError } from './providerContract'
import {
  adaptPokeApiResponse,
  buildPokeApiRequest,
  hydratePokeApiResults,
  rankPokeApiResults,
  validatePokeApiQuery,
} from './pokeApiProvider'

function createPokemonDetail(id, name, speciesUrl, type = 'electric') {
  return {
    id,
    name,
    base_experience: 112,
    height: 4,
    weight: 60,
    species: {
      url: speciesUrl,
    },
    types: [{ type: { name: type } }],
    abilities: [{ ability: { name: 'static' } }],
    sprites: {
      other: {
        'official-artwork': {
          front_default: `https://example.com/${name}.png`,
        },
      },
    },
  }
}

function createJsonResponse(payload) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(payload),
  }
}

describe('PokéAPI provider', () => {
  it('normalizes names before constructing a Pokémon request', () => {
    const request = buildPokeApiRequest(validatePokeApiQuery(' Pikachu '))

    expect(request).toEqual({
      url: 'https://pokeapi.co/api/v2/pokemon/pikachu',
      options: {
        headers: {
          Accept: 'application/json',
        },
      },
    })
  })

  it('allows letter-only or number-only queries, but rejects mixed alphanumeric input', () => {
    expect(validatePokeApiQuery('Pikachu')).toBe('pikachu')
    expect(validatePokeApiQuery('25')).toBe('25')
    expect(validatePokeApiQuery('5')).toBe('5')
    expect(validatePokeApiQuery('025')).toBe('25')
    expect(() => validatePokeApiQuery('p')).toThrow(ProviderError)
    expect(() => validatePokeApiQuery('p')).toThrow('Please type more characters to search.')
    expect(() => validatePokeApiQuery('ra1chu')).toThrow('Use either letters or numbers only for a PokéAPI search.')
  })

  it('maps broader match levels to the Pokémon name catalog', () => {
    const request = buildPokeApiRequest('pikchu', { matchLevel: 1, limit: 12, rankingThreshold: 0.8 })

    expect(request.url).toBe('https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0')
  })

  it('normalizes Pokémon data into the shared display model', () => {
    const [result] = adaptPokeApiResponse({
      id: 25,
      name: 'pikachu',
      base_experience: 112,
      height: 4,
      weight: 60,
      types: [{ type: { name: 'electric' } }],
      abilities: [{ ability: { name: 'static' } }, { ability: { name: 'lightning-rod' } }],
      sprites: {
        other: {
          'official-artwork': {
            front_default: 'https://example.com/pikachu.png',
          },
        },
      },
    })

    expect(result).toEqual({
      id: 'pokeapi:25',
      title: 'Pikachu',
      subtitle: 'National Pokédex #0025',
      description: 'Pikachu has Electric typing and 112 base experience.',
      imageUrl: 'https://example.com/pikachu.png',
      externalUrl: 'https://pokeapi.co/api/v2/pokemon/25/',
      metadata: [
        { label: 'Types', value: 'Electric' },
        { label: 'Height', value: '0.4 m' },
        { label: 'Weight', value: '6 kg' },
        { label: 'Abilities', value: 'Static, Lightning Rod' },
      ],
    })
  })

  it('applies provider-specific ranking to catalog names and Pokédex numbers', () => {
    const candidates = adaptPokeApiResponse({
      results: [
        { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' },
        { name: 'raichu', url: 'https://pokeapi.co/api/v2/pokemon/26/' },
        { name: 'charmander', url: 'https://pokeapi.co/api/v2/pokemon/4/' },
      ],
    })

    expect(
      rankPokeApiResults('pi', candidates, { matchLevel: 1, limit: 12, rankingThreshold: 0.8 }).map(({ title }) => title),
    ).toEqual(['Pikachu'])
    expect(
      rankPokeApiResults('26', candidates, { matchLevel: 0, limit: 12, rankingThreshold: 0.8 }).map(({ title }) => title),
    ).toEqual(['Raichu'])
  })

  it('hydrates ranked catalog results into full Pokémon cards', async () => {
    const [candidate] = adaptPokeApiResponse({
      results: [{ name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' }],
    })
    const fetchMock = vi
      .fn()
      .mockResolvedValue(createJsonResponse(createPokemonDetail(25, 'pikachu', 'https://pokeapi.co/api/v2/pokemon-species/25/')))

    const [result] = await hydratePokeApiResults([candidate], {
      query: 'pi',
      searchPolicy: { matchLevel: 1, limit: 12, rankingThreshold: 0.8 },
      fetchImplementation: fetchMock,
    })

    expect(fetchMock).toHaveBeenCalledWith('https://pokeapi.co/api/v2/pokemon/25/', expect.any(Object))
    expect(result.title).toBe('Pikachu')
    expect(result.metadata).toContainEqual({ label: 'Types', value: 'Electric' })
  })

  it('searches deep Pokémon, species, and evolution-chain payloads at level 4', async () => {
    const candidates = adaptPokeApiResponse({
      results: [
        { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' },
        { name: 'raichu', url: 'https://pokeapi.co/api/v2/pokemon/26/' },
        { name: 'caterpie', url: 'https://pokeapi.co/api/v2/pokemon/10/' },
      ],
    })
    const payloads = new Map([
      ['https://pokeapi.co/api/v2/pokemon/25/', createPokemonDetail(25, 'pikachu', 'https://pokeapi.co/api/v2/pokemon-species/25/')],
      ['https://pokeapi.co/api/v2/pokemon/26/', createPokemonDetail(26, 'raichu', 'https://pokeapi.co/api/v2/pokemon-species/26/')],
      [
        'https://pokeapi.co/api/v2/pokemon/10/',
        createPokemonDetail(10, 'caterpie', 'https://pokeapi.co/api/v2/pokemon-species/10/', 'bug'),
      ],
      ['https://pokeapi.co/api/v2/pokemon-species/25/', { evolution_chain: { url: 'https://pokeapi.co/api/v2/evolution-chain/10/' } }],
      ['https://pokeapi.co/api/v2/pokemon-species/26/', { evolution_chain: { url: 'https://pokeapi.co/api/v2/evolution-chain/10/' } }],
      ['https://pokeapi.co/api/v2/pokemon-species/10/', { evolution_chain: { url: 'https://pokeapi.co/api/v2/evolution-chain/4/' } }],
      [
        'https://pokeapi.co/api/v2/evolution-chain/10/',
        {
          chain: {
            species: { name: 'pichu' },
            evolves_to: [{ species: { name: 'pikachu' }, evolves_to: [{ species: { name: 'raichu' } }] }],
          },
        },
      ],
      ['https://pokeapi.co/api/v2/evolution-chain/4/', { chain: { species: { name: 'caterpie' }, evolves_to: [] } }],
    ])
    const fetchMock = vi.fn((url) => Promise.resolve(createJsonResponse(payloads.get(url))))

    const results = await hydratePokeApiResults(candidates, {
      query: 'pik',
      searchPolicy: { matchLevel: 4, limit: 12, rankingThreshold: 0.8 },
      fetchImplementation: fetchMock,
    })

    expect(results.map(({ title }) => title)).toEqual(['Pikachu', 'Raichu'])
  })
})
