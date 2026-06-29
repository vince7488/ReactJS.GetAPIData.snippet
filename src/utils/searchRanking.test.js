import { describe, expect, it } from 'vitest'
import { normalizeSearchText, rankCandidates, scoreTextSimilarity } from './searchRanking'

const getCandidateFields = (candidate) => [candidate.title]

describe('search ranking', () => {
  it('normalizes case, punctuation, whitespace, accents, and token order', () => {
    expect(normalizeSearchText('  Café: The   WORLD! ')).toBe('cafe the world')
    expect(scoreTextSimilarity('world cafe the', 'Café: The World!')).toBe(1)
  })

  it('filters candidates using the match-level-adjusted threshold', () => {
    const candidates = [{ title: 'Pikachu' }, { title: 'Bulbasaur' }]

    expect(rankCandidates('pikchu', candidates, { matchLevel: 0, limit: 12, rankingThreshold: 0.8 }, getCandidateFields)).toEqual([])
    expect(rankCandidates('pikchu', candidates, { matchLevel: 4, limit: 12, rankingThreshold: 0.8 }, getCandidateFields)).toEqual([
      { title: 'Pikachu' },
    ])
  })

  it('ranks higher scores first and preserves provider order for ties', () => {
    const candidates = [{ title: 'Café!' }, { title: 'CAFE' }, { title: 'Cafes' }]

    expect(rankCandidates('cafe', candidates, { matchLevel: 4, limit: 2, rankingThreshold: 0.8 }, getCandidateFields)).toEqual([
      candidates[0],
      candidates[1],
    ])
  })

  it('matches query tokens across multiple provider candidate fields', () => {
    const candidates = [{ title: 'The Hobbit', author: 'J. R. R. Tolkien' }]

    expect(
      rankCandidates('hobbit tolkien', candidates, { matchLevel: 0, limit: 12, rankingThreshold: 0.8 }, (candidate) => [
        candidate.title,
        candidate.author,
      ]),
    ).toEqual(candidates)
  })
})
