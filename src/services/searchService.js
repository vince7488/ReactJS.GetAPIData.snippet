import { isDisplayResult, PROVIDER_ERROR_CODES, ProviderError } from '../providers/providerContract'
import { getProvider } from '../providers/registry'

async function fetchProviderData(provider, query, fetchImplementation) {
  const validatedQuery = provider.validateQuery(query)
  const request = provider.buildRequest(validatedQuery)

  let response

  try {
    response = await fetchImplementation(request.url, request.options)
  } catch (cause) {
    throw new ProviderError(PROVIDER_ERROR_CODES.network, 'The provider request failed.', { cause })
  }

  if (!response.ok) {
    throw new ProviderError(PROVIDER_ERROR_CODES.http, `The provider returned HTTP ${response.status}.`, { status: response.status })
  }

  let payload

  try {
    payload = await response.json()
  } catch (cause) {
    throw new ProviderError(PROVIDER_ERROR_CODES.invalidResponse, 'The provider response was not valid JSON.', { cause })
  }

  const results = provider.adaptResponse(payload)

  if (!Array.isArray(results) || !results.every(isDisplayResult)) {
    throw new ProviderError(PROVIDER_ERROR_CODES.invalidResponse, 'The provider response could not be normalized.')
  }

  if (results.length === 0) {
    throw new ProviderError(PROVIDER_ERROR_CODES.noResults, 'The provider returned no results.')
  }

  return results
}

export async function searchProvider(providerId, query, fetchImplementation = fetch) {
  const provider = getProvider(providerId)

  try {
    return await fetchProviderData(provider, query, fetchImplementation)
  } catch (error) {
    const providerError =
      error instanceof ProviderError
        ? error
        : new ProviderError(PROVIDER_ERROR_CODES.unexpected, 'An unexpected search error occurred.', { cause: error })

    throw new ProviderError(providerError.code, provider.mapError(providerError), {
      cause: providerError,
      status: providerError.status,
    })
  }
}
