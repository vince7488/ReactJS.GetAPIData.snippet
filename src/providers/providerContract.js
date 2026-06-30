export const PROVIDER_ERROR_CODES = Object.freeze({
  validation: 'validation',
  network: 'network',
  http: 'http',
  invalidResponse: 'invalid-response',
  noResults: 'no-results',
  unexpected: 'unexpected',
})

export class ProviderError extends Error {
  constructor(code, message, options = {}) {
    super(message, { cause: options.cause })
    this.name = 'ProviderError'
    this.code = code
    this.status = options.status
  }
}

const requiredTextFields = [
  'id',
  'name',
  'description',
  'inputLabel',
  'placeholder',
  'example',
  'submitLabel',
  'externalLinkLabel',
  'resultsLabel',
]

const requiredMethods = ['validateQuery', 'buildRequest', 'adaptResponse', 'getCandidateFields', 'mapError']

/**
 * Runtime-checks the JavaScript provider adapter interface.
 *
 * Every adapter owns its UI copy, query validation, request construction,
 * provider-specific policy translation, response normalization, candidate
 * fields used by shared ranking, optional provider-owned ranking, optional
 * result hydration, and user-facing error mapping.
 */
export function defineProvider(provider) {
  for (const field of requiredTextFields) {
    if (typeof provider[field] !== 'string' || !provider[field]) {
      throw new TypeError(`Provider "${field}" must be a non-empty string.`)
    }
  }

  for (const method of requiredMethods) {
    if (typeof provider[method] !== 'function') {
      throw new TypeError(`Provider "${method}" must be a function.`)
    }
  }

  if (provider.rankResults !== undefined && typeof provider.rankResults !== 'function') {
    throw new TypeError('Provider "rankResults" must be a function when provided.')
  }

  if (provider.hydrateResults !== undefined && typeof provider.hydrateResults !== 'function') {
    throw new TypeError('Provider "hydrateResults" must be a function when provided.')
  }

  return Object.freeze(provider)
}

export function isDisplayResult(result) {
  return (
    typeof result?.id === 'string' &&
    typeof result.title === 'string' &&
    typeof result.subtitle === 'string' &&
    typeof result.description === 'string' &&
    (typeof result.imageUrl === 'string' || result.imageUrl === null) &&
    typeof result.externalUrl === 'string' &&
    Array.isArray(result.metadata) &&
    result.metadata.every((item) => typeof item?.label === 'string' && typeof item.value === 'string')
  )
}
