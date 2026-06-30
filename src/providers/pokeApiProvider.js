import { defineProvider, PROVIDER_ERROR_CODES, ProviderError } from './providerContract'
import { createSearchPolicy } from '../utils/searchPolicy'

/* Provides access to Pokémon data from the PokéAPI (https://pokeapi.co/). */

const POKE_API = 'https://pokeapi.co/api/v2/pokemon'
const POKE_API_CATALOG_LIMIT = 100000
const POKEMON_ALPHA_QUERY_PATTERN = /^[a-z]+$/i
const POKEMON_NUMBER_QUERY_PATTERN = /^\d+$/

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

  const isAlphaQuery = POKEMON_ALPHA_QUERY_PATTERN.test(searchTerm)
  const isNumberQuery = POKEMON_NUMBER_QUERY_PATTERN.test(searchTerm)

  if (!isAlphaQuery && !isNumberQuery) {
    throw new ProviderError(PROVIDER_ERROR_CODES.validation, 'Use either letters or numbers only for a PokéAPI search.')
  }

  if (isAlphaQuery && searchTerm.length < 2) {
    throw new ProviderError(PROVIDER_ERROR_CODES.validation, 'Please type more characters to search.')
  }

  const normalizedQuery = isNumberQuery ? String(Number(searchTerm)) : searchTerm.toLowerCase()

  if (isNumberQuery && Number(normalizedQuery) < 1) {
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

function buildPokeApiJsonRequest(url) {
  return {
    url,
    options: {
      headers: {
        Accept: 'application/json',
      },
    },
  }
}

export function buildPokeApiRequest(searchTerm, searchPolicy) {
  const providerPolicy = mapPokeApiSearchPolicy(searchPolicy)
  const url =
    providerPolicy.strategy === 'exact'
      ? `${POKE_API}/${encodeURIComponent(searchTerm)}`
      : `${POKE_API}?limit=${POKE_API_CATALOG_LIMIT}&offset=0`

  return buildPokeApiJsonRequest(url)
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

function isPokeApiCatalogResult(result) {
  return result.metadata.some((item) => item.label === 'Match source' && item.value === 'Pokémon name catalog')
}

function getPokeApiName(result) {
  return result.title.toLowerCase().replace(/[^a-z\d]/g, '')
}

function getPokeApiNumber(result) {
  return result.id.replace(/^pokeapi:/, '')
}

function getSearchCharacters(query) {
  return [...new Set(query.toLowerCase().split(''))]
}

function scorePokeApiValue(query, value, matchLevel) {
  const normalizedQuery = query.toLowerCase()
  const normalizedValue = String(value ?? '').toLowerCase()

  if (!normalizedValue) {
    return null
  }

  if (matchLevel === 0) {
    return normalizedValue === normalizedQuery ? 100 : null
  }

  const containsQuery = normalizedValue.includes(normalizedQuery)
  const startsWithQuery = normalizedValue.startsWith(normalizedQuery)
  const queryCharacters = getSearchCharacters(normalizedQuery)
  const matchedCharacterCount = queryCharacters.filter((character) => normalizedValue.includes(character)).length
  const hasAllCharacters = queryCharacters.every((character) => normalizedValue.includes(character))
  const minimumLenientCharacterCount = queryCharacters.length >= 3 ? 2 : queryCharacters.length
  const hasEnoughLenientCharacters = matchedCharacterCount >= minimumLenientCharacterCount

  if (matchLevel === 1 && !startsWithQuery) {
    return null
  }

  if (matchLevel === 2 && !containsQuery) {
    return null
  }

  if (matchLevel === 3 && !hasAllCharacters) {
    return null
  }

  if (matchLevel === 4 && !hasEnoughLenientCharacters) {
    return null
  }

  if (normalizedValue === normalizedQuery) {
    return 100
  }

  if (startsWithQuery) {
    return 80 - normalizedValue.length / 1000
  }

  if (containsQuery) {
    return 60 - normalizedValue.indexOf(normalizedQuery) / 100 - normalizedValue.length / 1000
  }

  if (hasAllCharacters) {
    return 40 - normalizedValue.length / 1000
  }

  return 40 - normalizedValue.length / 1000
}

function scorePokeApiResult(query, result, matchLevel) {
  return [getPokeApiName(result), getPokeApiNumber(result)].reduce((bestScore, value) => {
    const score = scorePokeApiValue(query, value, matchLevel)

    return score === null ? bestScore : Math.max(bestScore, score)
  }, Number.NEGATIVE_INFINITY)
}

export function rankPokeApiResults(query, results, searchPolicy) {
  const policy = createSearchPolicy(searchPolicy)

  return results
    .map((result, index) => ({
      result,
      index,
      score: scorePokeApiResult(query, result, policy.matchLevel),
    }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, policy.limit)
    .map(({ result }) => result)
}

async function fetchPokeApiJson(url, fetchImplementation) {
  let response

  try {
    response = await fetchImplementation(url, buildPokeApiJsonRequest(url).options)
  } catch (cause) {
    throw new ProviderError(PROVIDER_ERROR_CODES.network, 'The PokéAPI detail request failed.', { cause })
  }

  if (!response.ok) {
    throw new ProviderError(PROVIDER_ERROR_CODES.http, `PokéAPI returned HTTP ${response.status}.`, { status: response.status })
  }

  try {
    return await response.json()
  } catch (cause) {
    throw new ProviderError(PROVIDER_ERROR_CODES.invalidResponse, 'The PokéAPI detail response was not valid JSON.', { cause })
  }
}

async function hydratePokeApiCatalogResult(result, fetchImplementation) {
  if (!isPokeApiCatalogResult(result)) {
    return result
  }

  const pokemon = await fetchPokeApiJson(result.externalUrl, fetchImplementation)

  return adaptPokeApiPokemon(pokemon)
}

async function hydratePokeApiStandardResults(results, fetchImplementation) {
  return Promise.all(results.map((result) => hydratePokeApiCatalogResult(result, fetchImplementation)))
}

export async function hydratePokeApiResults(results, { fetchImplementation }) {
  return hydratePokeApiStandardResults(results, fetchImplementation)
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
  rankResults: rankPokeApiResults,
  hydrateResults: hydratePokeApiResults,
  mapError: mapPokeApiError,
})
