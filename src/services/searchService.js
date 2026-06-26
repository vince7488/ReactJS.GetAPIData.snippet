import { isDisplayResult, PROVIDER_ERROR_CODES, ProviderError } from '../providers/providerContract'
import { getProvider } from '../providers/registry'
import { rankCandidates } from '../utils/searchRanking'
import { createSearchPolicy } from '../utils/searchPolicy'

async function fetchProviderData(provider, query, searchPolicy, fetchImplementation) {
  const normalizedPolicy = createSearchPolicy(searchPolicy)
  const validatedQuery = provider.validateQuery(query)
  const request = provider.buildRequest(validatedQuery, normalizedPolicy)

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

  const results = provider.adaptResponse(payload, {
    query: validatedQuery,
    searchPolicy: normalizedPolicy,
    request,
  })

  if (!Array.isArray(results) || !results.every(isDisplayResult)) {
    throw new ProviderError(PROVIDER_ERROR_CODES.invalidResponse, 'The provider response could not be normalized.')
  }

  const rankedResults = rankCandidates(validatedQuery, results, normalizedPolicy, provider.getCandidateFields)

  if (rankedResults.length === 0) {
    throw new ProviderError(PROVIDER_ERROR_CODES.noResults, 'The provider returned no results.')
  }

  return rankedResults
}

export async function searchProvider(providerId, query, searchPolicy, fetchImplementation) {
  const provider = getProvider(providerId)
  const resolvedSearchPolicy = typeof searchPolicy === 'function' ? undefined : searchPolicy
  const resolvedFetchImplementation = typeof searchPolicy === 'function' ? searchPolicy : (fetchImplementation ?? fetch)

  try {
    return await fetchProviderData(provider, query, resolvedSearchPolicy, resolvedFetchImplementation)
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
