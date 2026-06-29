export const DEFAULT_RESULT_DISPLAY_POLICY = Object.freeze({
  searchLimit: 52,
  initialVisibleCount: 9,
  revealIncrement: 6,
  maxVisibleCount: 52,
})

const RESULT_DISPLAY_POLICIES = Object.freeze({
  github: Object.freeze({
    searchLimit: 12,
    initialVisibleCount: 6,
    revealIncrement: 3,
    maxVisibleCount: 12,
  }),
  'open-library': DEFAULT_RESULT_DISPLAY_POLICY,
  pokeapi: DEFAULT_RESULT_DISPLAY_POLICY,
})

export function getResultDisplayPolicy(providerId) {
  return RESULT_DISPLAY_POLICIES[providerId] ?? DEFAULT_RESULT_DISPLAY_POLICY
}
