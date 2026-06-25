import { defineProvider, PROVIDER_ERROR_CODES, ProviderError } from './providerContract'

const POKE_API = 'https://pokeapi.co/api/v2/pokemon'
const POKEMON_QUERY_PATTERN = /^[a-z\d]+(?:[ -][a-z\d]+)*$/i

function toDisplayName(value) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function validatePokeApiQuery(query) {
  const searchTerm = query.trim()

  if (!searchTerm) {
    throw new ProviderError(PROVIDER_ERROR_CODES.validation, 'Enter a Pokémon name or Pokédex number.')
  }

  if (!POKEMON_QUERY_PATTERN.test(searchTerm)) {
    throw new ProviderError(PROVIDER_ERROR_CODES.validation, 'Use a Pokémon name or a positive Pokédex number.')
  }

  const normalizedQuery = searchTerm.toLowerCase().replaceAll(' ', '-')

  if (/^\d+$/.test(normalizedQuery) && Number(normalizedQuery) < 1) {
    throw new ProviderError(PROVIDER_ERROR_CODES.validation, 'Pokédex numbers must be greater than zero.')
  }

  return normalizedQuery
}

export function buildPokeApiRequest(searchTerm) {
  return {
    url: `${POKE_API}/${encodeURIComponent(searchTerm)}`,
    options: {
      headers: {
        Accept: 'application/json',
      },
    },
  }
}

export function adaptPokeApiResponse(pokemon) {
  const name = pokemon.name || 'unknown-pokemon'
  const displayName = toDisplayName(name)
  const types = Array.isArray(pokemon.types) ? pokemon.types.map(({ type }) => toDisplayName(type.name)) : []
  const abilities = Array.isArray(pokemon.abilities) ? pokemon.abilities.map(({ ability }) => toDisplayName(ability.name)) : []
  const typeDescription = types.length > 0 ? types.join(' / ') : 'Unknown type'

  return [
    {
      id: `pokeapi:${pokemon.id ?? name}`,
      title: displayName,
      subtitle: pokemon.id ? `National Pokédex #${String(pokemon.id).padStart(4, '0')}` : 'Pokédex number unavailable',
      description: `${displayName} has ${typeDescription} typing and ${pokemon.base_experience ?? 'unknown'} base experience.`,
      imageUrl: pokemon.sprites?.other?.['official-artwork']?.front_default || pokemon.sprites?.front_default || null,
      externalUrl: pokemon.id ? `${POKE_API}/${pokemon.id}/` : `${POKE_API}/${encodeURIComponent(name)}/`,
      metadata: [
        { label: 'Types', value: typeDescription },
        {
          label: 'Height',
          value: typeof pokemon.height === 'number' ? `${pokemon.height / 10} m` : 'Not listed',
        },
        {
          label: 'Weight',
          value: typeof pokemon.weight === 'number' ? `${pokemon.weight / 10} kg` : 'Not listed',
        },
        {
          label: 'Abilities',
          value: abilities.length > 0 ? abilities.join(', ') : 'Not listed',
        },
      ],
    },
  ]
}

export function mapPokeApiError(error) {
  if (error.code === PROVIDER_ERROR_CODES.validation) {
    return error.message
  }

  if (error.code === PROVIDER_ERROR_CODES.noResults || error.status === 404) {
    return "That Pokémon couldn't be found."
  }

  if (error.status === 429) {
    return 'PokéAPI is receiving too many requests. Try again later.'
  }

  if (error.code === PROVIDER_ERROR_CODES.network) {
    return 'PokéAPI could not be reached. Check your connection and try again.'
  }

  return 'PokéAPI returned an unexpected response. Try again later.'
}

export const pokeApiProvider = defineProvider({
  id: 'pokeapi',
  name: 'PokéAPI',
  description: 'Find one Pokémon by its name or National Pokédex number.',
  inputLabel: 'Pokémon name or Pokédex number',
  placeholder: 'pikachu or 25',
  example: 'pikachu',
  submitLabel: 'Find Pokémon',
  externalLinkLabel: 'View PokéAPI resource',
  resultsLabel: 'PokéAPI Pokémon results',
  validateQuery: validatePokeApiQuery,
  buildRequest: buildPokeApiRequest,
  adaptResponse: adaptPokeApiResponse,
  mapError: mapPokeApiError,
})
