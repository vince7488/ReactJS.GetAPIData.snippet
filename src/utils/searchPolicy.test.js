import { describe, expect, it } from 'vitest'
import {
  createSearchPolicy,
  DEFAULT_SEARCH_POLICY,
  getEffectiveRankingThreshold,
  loadSearchPolicy,
  saveSearchPolicy,
  SEARCH_POLICY_STORAGE_KEY,
} from './searchPolicy'

describe('search policy', () => {
  it('uses strict defaults and clamps invalid policy values', () => {
    expect(createSearchPolicy()).toEqual(DEFAULT_SEARCH_POLICY)
    expect(createSearchPolicy(null)).toEqual(DEFAULT_SEARCH_POLICY)
    expect(createSearchPolicy({ fuzziness: 120, limit: 0, rankingThreshold: -1 })).toEqual({
      fuzziness: 100,
      limit: 1,
      rankingThreshold: 0,
    })
  })

  it('interpolates from exact matching to the configured ranking threshold', () => {
    expect(getEffectiveRankingThreshold({ fuzziness: 0, rankingThreshold: 0.8 })).toBe(1)
    expect(getEffectiveRankingThreshold({ fuzziness: 50, rankingThreshold: 0.8 })).toBeCloseTo(0.9)
    expect(getEffectiveRankingThreshold({ fuzziness: 100, rankingThreshold: 0.8 })).toBeCloseTo(0.8)
  })

  it('persists and restores a normalized policy', () => {
    const values = new Map()
    const storage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    }

    saveSearchPolicy({ fuzziness: 42, limit: 12, rankingThreshold: 0.8 }, storage)

    expect(JSON.parse(values.get(SEARCH_POLICY_STORAGE_KEY))).toEqual({
      fuzziness: 42,
      limit: 12,
      rankingThreshold: 0.8,
    })
    expect(loadSearchPolicy(storage)).toEqual({
      fuzziness: 42,
      limit: 12,
      rankingThreshold: 0.8,
    })
  })
})
