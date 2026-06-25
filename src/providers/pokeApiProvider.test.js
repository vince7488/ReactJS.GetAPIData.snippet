import { describe, expect, it } from 'vitest'
import { adaptPokeApiResponse, buildPokeApiRequest, validatePokeApiQuery } from './pokeApiProvider'

describe('PokéAPI provider', () => {
  it('normalizes names before constructing a Pokémon request', () => {
    const request = buildPokeApiRequest(validatePokeApiQuery(' Mr Mime '))

    expect(request).toEqual({
      url: 'https://pokeapi.co/api/v2/pokemon/mr-mime',
      options: {
        headers: {
          Accept: 'application/json',
        },
      },
    })
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
})
