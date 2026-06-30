import { describe, expect, it } from 'vitest'
import { getProviders } from './registry'
import { isDisplayResult, PROVIDER_ERROR_CODES, ProviderError } from './providerContract'
import { DEFAULT_SEARCH_POLICY } from '../utils/searchPolicy'

const dataImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

const providerFixtures = {
  github: {
    query: 'vince7488',
    payload: {
      id: 7488,
      login: 'vince7488',
      name: 'Vernard Mercader',
      bio: 'Writes React adapters.',
      avatar_url: dataImage,
      html_url: 'https://github.com/vince7488',
      company: 'Vernard LLC',
      location: 'United States',
      public_repos: 42,
      followers: 24,
    },
  },
  'open-library': {
    query: 'the hobbit',
    payload: {
      docs: [
        {
          key: '/works/OL262758W',
          title: 'The Hobbit',
          author_name: ['J. R. R. Tolkien'],
          first_publish_year: 1937,
          edition_count: 120,
          language: ['eng'],
        },
      ],
    },
  },
  pokeapi: {
    query: 'pikachu',
    payload: {
      id: 25,
      name: 'pikachu',
      base_experience: 112,
      height: 4,
      weight: 60,
      sprites: {
        front_default: null,
        other: {
          'official-artwork': {
            front_default: null,
          },
        },
      },
      types: [{ type: { name: 'electric' } }],
      abilities: [{ ability: { name: 'static' } }],
    },
  },
}

function expectRequestShape(request) {
  expect(request).toEqual(
    expect.objectContaining({
      url: expect.any(String),
      options: expect.objectContaining({
        headers: expect.any(Object),
      }),
    }),
  )
}

describe('provider contract', () => {
  for (const provider of getProviders()) {
    it(`${provider.id} satisfies the shared adapter contract`, async () => {
      const fixture = providerFixtures[provider.id]
      const validatedQuery = provider.validateQuery(fixture.query)
      const request = provider.buildRequest(validatedQuery, DEFAULT_SEARCH_POLICY)
      const requests = Array.isArray(request) ? request : [request]
      const results = provider.adaptResponse(fixture.payload, {
        query: validatedQuery,
        request,
        requests,
        searchPolicy: DEFAULT_SEARCH_POLICY,
      })

      expect(provider).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          description: expect.any(String),
          inputLabel: expect.any(String),
          placeholder: expect.any(String),
          example: expect.any(String),
          submitLabel: expect.any(String),
          externalLinkLabel: expect.any(String),
          resultsLabel: expect.any(String),
          validateQuery: expect.any(Function),
          buildRequest: expect.any(Function),
          adaptResponse: expect.any(Function),
          getCandidateFields: expect.any(Function),
          mapError: expect.any(Function),
        }),
      )
      expect(validatedQuery).toBeTruthy()
      requests.forEach(expectRequestShape)
      expect(results.length).toBeGreaterThan(0)
      expect(results.every(isDisplayResult)).toBe(true)
      expect(provider.getCandidateFields(results[0]).every((field) => typeof field === 'string')).toBe(true)
      expect(provider.mapError(new ProviderError(PROVIDER_ERROR_CODES.validation, 'Contract validation message'))).toEqual(
        expect.any(String),
      )

      if (provider.rankResults) {
        expect(provider.rankResults(validatedQuery, results, DEFAULT_SEARCH_POLICY).every(isDisplayResult)).toBe(true)
      }

      if (provider.hydrateResults) {
        const hydratedResults = await provider.hydrateResults(results, {
          fetchImplementation: () => {
            throw new Error('Contract fixtures should not need live hydration.')
          },
          query: validatedQuery,
          request,
          requests,
          searchPolicy: DEFAULT_SEARCH_POLICY,
        })

        expect(hydratedResults.every(isDisplayResult)).toBe(true)
      }
    })
  }
})
