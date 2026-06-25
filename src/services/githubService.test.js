import { describe, expect, it } from 'vitest'
import { getProvider, getProviders } from '../providers/registry'

describe('provider registry', () => {
  it('registers every supported provider', () => {
    expect(getProviders().map(({ id }) => id)).toEqual(['github', 'open-library', 'pokeapi'])
  })

  it('looks up providers by id', () => {
    expect(getProvider('github').name).toBe('GitHub')
  })
})
