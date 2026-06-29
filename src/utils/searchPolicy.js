export const SEARCH_POLICY_STORAGE_KEY = 'api-search-playground.search-policy'

export const SEARCH_MATCH_LEVELS = Object.freeze([
  Object.freeze({ value: 0, label: 'Strict', description: 'exact, case-insensitive matching' }),
  Object.freeze({ value: 1, label: 'Semi-strict', description: 'case-insensitive prefix matching' }),
  Object.freeze({ value: 2, label: 'Median', description: 'case-insensitive contiguous matching' }),
  Object.freeze({ value: 3, label: 'Semi-lenient', description: 'case-insensitive all-character matching' }),
  Object.freeze({ value: 4, label: 'Lenient', description: 'case-insensitive partial-character matching' }),
])

export const DEFAULT_SEARCH_POLICY = Object.freeze({
  matchLevel: 0,
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
  const matchLevel = toNumber(policyValues.matchLevel)
  const legacyFuzziness = toNumber(policyValues.fuzziness)
  const limit = toNumber(policyValues.limit)
  const rankingThreshold = toNumber(policyValues.rankingThreshold)
  const normalizedMatchLevel = Number.isFinite(matchLevel)
    ? Math.round(clamp(matchLevel, 0, SEARCH_MATCH_LEVELS.length - 1))
    : Number.isFinite(legacyFuzziness)
      ? Math.round(clamp(legacyFuzziness, 0, 100) / 25)
      : DEFAULT_SEARCH_POLICY.matchLevel

  return Object.freeze({
    matchLevel: normalizedMatchLevel,
    limit: Number.isFinite(limit) ? Math.floor(clamp(limit, 1, 100)) : DEFAULT_SEARCH_POLICY.limit,
    rankingThreshold: Number.isFinite(rankingThreshold) ? clamp(rankingThreshold, 0, 1) : DEFAULT_SEARCH_POLICY.rankingThreshold,
  })
}

export function getSearchPolicyBreadth(policy) {
  const normalizedPolicy = createSearchPolicy(policy)

  return normalizedPolicy.matchLevel / (SEARCH_MATCH_LEVELS.length - 1)
}

export function getEffectiveRankingThreshold(policy) {
  const normalizedPolicy = createSearchPolicy(policy)
  const breadthRatio = getSearchPolicyBreadth(normalizedPolicy)

  return 1 - breadthRatio * (1 - normalizedPolicy.rankingThreshold)
}

export function getSearchMatchLevel(matchLevel) {
  const normalizedPolicy = createSearchPolicy({ matchLevel })

  return SEARCH_MATCH_LEVELS[normalizedPolicy.matchLevel]
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
