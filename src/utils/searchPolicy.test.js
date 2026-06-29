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
    expect(createSearchPolicy({ matchLevel: 9, limit: 0, rankingThreshold: -1 })).toEqual({
      matchLevel: 4,
      limit: 1,
      rankingThreshold: 0,
    })
  })

  it('migrates legacy fuzziness values to the closest match level', () => {
    expect(createSearchPolicy({ fuzziness: 0 })).toMatchObject({ matchLevel: 0 })
    expect(createSearchPolicy({ fuzziness: 50 })).toMatchObject({ matchLevel: 2 })
    expect(createSearchPolicy({ fuzziness: 100 })).toMatchObject({ matchLevel: 4 })
  })

  it('interpolates from exact matching to the configured ranking threshold for shared ranking fallbacks', () => {
    expect(getEffectiveRankingThreshold({ matchLevel: 0, rankingThreshold: 0.8 })).toBe(1)
    expect(getEffectiveRankingThreshold({ matchLevel: 2, rankingThreshold: 0.8 })).toBeCloseTo(0.9)
    expect(getEffectiveRankingThreshold({ matchLevel: 4, rankingThreshold: 0.8 })).toBeCloseTo(0.8)
  })

  it('persists and restores a normalized policy', () => {
    const values = new Map()
    const storage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    }

    saveSearchPolicy({ matchLevel: 3, limit: 12, rankingThreshold: 0.8 }, storage)

    expect(JSON.parse(values.get(SEARCH_POLICY_STORAGE_KEY))).toEqual({
      matchLevel: 3,
      limit: 12,
      rankingThreshold: 0.8,
    })
    expect(loadSearchPolicy(storage)).toEqual({
      matchLevel: 3,
      limit: 12,
      rankingThreshold: 0.8,
    })
  })
})
