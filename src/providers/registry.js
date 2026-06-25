import { githubProvider } from './githubProvider'
import { openLibraryProvider } from './openLibraryProvider'
import { pokeApiProvider } from './pokeApiProvider'

const providers = Object.freeze([githubProvider, openLibraryProvider, pokeApiProvider])

const providerRegistry = new Map(providers.map((provider) => [provider.id, provider]))

export const DEFAULT_PROVIDER_ID = githubProvider.id

export function getProviders() {
  return providers
}

export function getProvider(providerId) {
  const provider = providerRegistry.get(providerId)

  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`)
  }

  return provider
}
