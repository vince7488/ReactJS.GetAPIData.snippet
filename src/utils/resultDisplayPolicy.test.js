import { describe, expect, it } from 'vitest'
import { getResultDisplayPolicy } from './resultDisplayPolicy'

describe('result display policy', () => {
  it('uses the GitHub display cap and progressive reveal size', () => {
    expect(getResultDisplayPolicy('github')).toEqual({
      searchLimit: 12,
      initialVisibleCount: 6,
      revealIncrement: 3,
      maxVisibleCount: 12,
    })
  })

  it('uses the larger Open Library and PokéAPI display cap', () => {
    expect(getResultDisplayPolicy('open-library')).toEqual({
      searchLimit: 54,
      initialVisibleCount: 9,
      revealIncrement: 6,
      maxVisibleCount: 54,
    })
    expect(getResultDisplayPolicy('pokeapi')).toEqual(getResultDisplayPolicy('open-library'))
  })
})
