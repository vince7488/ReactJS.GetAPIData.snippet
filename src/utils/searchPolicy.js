export const SEARCH_POLICY_STORAGE_KEY = 'api-search-playground.search-policy'

export const DEFAULT_SEARCH_POLICY = Object.freeze({
  fuzziness: 0,
  limit: 12,
  rankingThreshold: 0.8,
})

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function toNumber(value) {
  return value === null || value === '' ? Number.NaN : Number(value)
}

function getStorage(storage) {
  if (storage !== undefined) {
    return storage
  }

  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}

export function createSearchPolicy(policy = {}) {
  const policyValues = policy && typeof policy === 'object' ? policy : {}
  const fuzziness = toNumber(policyValues.fuzziness)
  const limit = toNumber(policyValues.limit)
  const rankingThreshold = toNumber(policyValues.rankingThreshold)

  return Object.freeze({
    fuzziness: Number.isFinite(fuzziness) ? Math.round(clamp(fuzziness, 0, 100)) : DEFAULT_SEARCH_POLICY.fuzziness,
    limit: Number.isFinite(limit) ? Math.floor(clamp(limit, 1, 100)) : DEFAULT_SEARCH_POLICY.limit,
    rankingThreshold: Number.isFinite(rankingThreshold) ? clamp(rankingThreshold, 0, 1) : DEFAULT_SEARCH_POLICY.rankingThreshold,
  })
}

export function getEffectiveRankingThreshold(policy) {
  const normalizedPolicy = createSearchPolicy(policy)
  const fuzzyRatio = normalizedPolicy.fuzziness / 100

  return 1 - fuzzyRatio * (1 - normalizedPolicy.rankingThreshold)
}

export function loadSearchPolicy(storage) {
  const resolvedStorage = getStorage(storage)

  if (!resolvedStorage) {
    return DEFAULT_SEARCH_POLICY
  }

  try {
    const storedValue = resolvedStorage.getItem(SEARCH_POLICY_STORAGE_KEY)

    if (!storedValue) {
      return DEFAULT_SEARCH_POLICY
    }

    const storedPolicy = JSON.parse(storedValue)
    return createSearchPolicy(storedPolicy)
  } catch {
    return DEFAULT_SEARCH_POLICY
  }
}

export function saveSearchPolicy(policy, storage) {
  const normalizedPolicy = createSearchPolicy(policy)
  const resolvedStorage = getStorage(storage)

  if (!resolvedStorage) {
    return normalizedPolicy
  }

  try {
    resolvedStorage.setItem(SEARCH_POLICY_STORAGE_KEY, JSON.stringify(normalizedPolicy))
  } catch {
    // Search still works when storage is unavailable or full.
  }

  return normalizedPolicy
}
