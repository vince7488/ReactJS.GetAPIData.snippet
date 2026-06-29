import { defineProvider, PROVIDER_ERROR_CODES, ProviderError } from './providerContract'
import { createSearchPolicy } from '../utils/searchPolicy'

const POKE_API = 'https://pokeapi.co/api/v2/pokemon'
const POKE_API_CATALOG_LIMIT = 100000
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

export function mapPokeApiSearchPolicy(searchPolicy) {
  const policy = createSearchPolicy(searchPolicy)

  return {
    strategy: policy.matchLevel === 0 ? 'exact' : 'catalog',
  }
}

export function buildPokeApiRequest(searchTerm, searchPolicy) {
  const providerPolicy = mapPokeApiSearchPolicy(searchPolicy)
  const url =
    providerPolicy.strategy === 'exact'
      ? `${POKE_API}/${encodeURIComponent(searchTerm)}`
      : `${POKE_API}?limit=${POKE_API_CATALOG_LIMIT}&offset=0`

  return {
    url,
    options: {
      headers: {
        Accept: 'application/json',
      },
    },
  }
}

function adaptPokeApiPokemon(pokemon) {
  const name = pokemon.name || 'unknown-pokemon'
  const displayName = toDisplayName(name)
  const types = Array.isArray(pokemon.types) ? pokemon.types.map(({ type }) => toDisplayName(type.name)) : []
  const abilities = Array.isArray(pokemon.abilities) ? pokemon.abilities.map(({ ability }) => toDisplayName(ability.name)) : []
  const typeDescription = types.length > 0 ? types.join(' / ') : 'Unknown type'

  return {
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
  }
}

function getPokemonIdFromUrl(url) {
  return String(url ?? '').match(/\/pokemon\/(\d+)\/?$/)?.[1] ?? null
}

function adaptPokeApiCatalogEntry(pokemon) {
  const id = getPokemonIdFromUrl(pokemon.url)
  const name = pokemon.name || 'unknown-pokemon'
  const displayName = toDisplayName(name)

  return {
    id: `pokeapi:${id ?? name}`,
    title: displayName,
    subtitle: id ? `National Pokédex #${String(id).padStart(4, '0')}` : 'Pokédex number unavailable',
    description: `${displayName} matched the PokéAPI name catalog. Open the resource for complete details.`,
    imageUrl: id ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png` : null,
    externalUrl: pokemon.url || `${POKE_API}/${encodeURIComponent(name)}/`,
    metadata: [
      { label: 'Match source', value: 'Pokémon name catalog' },
      { label: 'Details', value: 'Available from PokéAPI' },
    ],
  }
}

export function adaptPokeApiResponse(payload) {
  if (Array.isArray(payload?.results)) {
    return payload.results.map(adaptPokeApiCatalogEntry)
  }

  return [adaptPokeApiPokemon(payload)]
}

export function getPokeApiCandidateFields(result) {
  return [result.title, result.subtitle, result.id.replace(/^pokeapi:/, '')]
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
  description: 'Find Pokémon by name or National Pokédex number.',
  inputLabel: 'Pokémon name or Pokédex number',
  placeholder: 'pikachu or 25',
  example: 'pikachu',
  submitLabel: 'Find Pokémon',
  externalLinkLabel: 'View PokéAPI resource',
  resultsLabel: 'PokéAPI Pokémon results',
  validateQuery: validatePokeApiQuery,
  buildRequest: buildPokeApiRequest,
  adaptResponse: adaptPokeApiResponse,
  getCandidateFields: getPokeApiCandidateFields,
  mapError: mapPokeApiError,
})
