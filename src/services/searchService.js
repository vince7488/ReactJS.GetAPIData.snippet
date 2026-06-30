import { isDisplayResult, PROVIDER_ERROR_CODES, ProviderError } from '../providers/providerContract'
import { getProvider } from '../providers/registry'
import { rankCandidates } from '../utils/searchRanking'
import { createSearchPolicy } from '../utils/searchPolicy'

async function fetchRequest(request, fetchImplementation) {
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

  return payload
}

async function fetchRequestPages(request, fetchImplementation) {
  const payloads = []
  const maxPages = Number.isFinite(request.maxPages) ? Math.max(1, request.maxPages) : 1
  let currentRequest = request

  for (let pageIndex = 0; currentRequest && pageIndex < maxPages; pageIndex += 1) {
    const payload = await fetchRequest(currentRequest, fetchImplementation)
    payloads.push(payload)
    currentRequest =
      typeof currentRequest.getNextRequest === 'function' ? currentRequest.getNextRequest(payload, currentRequest, pageIndex) : null
  }

  return payloads.length === 1 ? payloads[0] : payloads
}

async function fetchProviderData(provider, query, searchPolicy, fetchImplementation) {
  const normalizedPolicy = createSearchPolicy(searchPolicy)
  const validatedQuery = provider.validateQuery(query)
  const request = provider.buildRequest(validatedQuery, normalizedPolicy)
  const requests = Array.isArray(request) ? request : [request]
  const payloads = await Promise.all(requests.map((providerRequest) => fetchRequestPages(providerRequest, fetchImplementation)))
  const payload = Array.isArray(request) ? payloads : payloads[0]

  const results = provider.adaptResponse(payload, {
    query: validatedQuery,
    searchPolicy: normalizedPolicy,
    request,
    requests,
  })

  if (!Array.isArray(results) || !results.every(isDisplayResult)) {
    throw new ProviderError(PROVIDER_ERROR_CODES.invalidResponse, 'The provider response could not be normalized.')
  }

  const rankedResults = provider.rankResults
    ? provider.rankResults(validatedQuery, results, normalizedPolicy)
    : rankCandidates(validatedQuery, results, normalizedPolicy, provider.getCandidateFields)

  if (rankedResults.length === 0) {
    throw new ProviderError(PROVIDER_ERROR_CODES.noResults, 'The provider returned no results.')
  }

  if (!provider.hydrateResults) {
    return rankedResults
  }

  const hydratedResults = await provider.hydrateResults(rankedResults, {
    query: validatedQuery,
    searchPolicy: normalizedPolicy,
    fetchImplementation,
    request,
    requests,
  })

  if (!Array.isArray(hydratedResults) || !hydratedResults.every(isDisplayResult)) {
    throw new ProviderError(PROVIDER_ERROR_CODES.invalidResponse, 'The provider hydrated results could not be normalized.')
  }

  if (hydratedResults.length === 0) {
    throw new ProviderError(PROVIDER_ERROR_CODES.noResults, 'The provider returned no hydrated results.')
  }

  return hydratedResults
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
