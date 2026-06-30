import { createSearchPolicy, getEffectiveRankingThreshold } from './searchPolicy'

const COMBINING_MARKS_PATTERN = /[\u0300-\u036f]/g
const PUNCTUATION_PATTERN = /[^\p{L}\p{N}]+/gu

export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(COMBINING_MARKS_PATTERN, '')
    .toLowerCase()
    .replace(PUNCTUATION_PATTERN, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
    .join(' ')
}

function getTokens(value) {
  const normalizedValue = normalizeSearchText(value)
  return normalizedValue ? normalizedValue.split(' ') : []
}

function getLevenshteinDistance(left, right) {
  if (left === right) {
    return 0
  }

  if (!left.length) {
    return right.length
  }

  if (!right.length) {
    return left.length
  }

  let previousRow = Array.from({ length: right.length + 1 }, (_, index) => index)

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const currentRow = [leftIndex]

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1
      currentRow[rightIndex] = Math.min(
        currentRow[rightIndex - 1] + 1,
        previousRow[rightIndex] + 1,
        previousRow[rightIndex - 1] + substitutionCost,
      )
    }

    previousRow = currentRow
  }

  return previousRow[right.length]
}

function scoreNormalizedText(left, right) {
  const maximumLength = Math.max(left.length, right.length)
  return 1 - getLevenshteinDistance(left, right) / maximumLength
}

export function scoreTextSimilarity(query, candidate) {
  const normalizedQuery = normalizeSearchText(query)
  const normalizedCandidate = normalizeSearchText(candidate)

  if (!normalizedQuery || !normalizedCandidate) {
    return 0
  }

  if (normalizedQuery === normalizedCandidate) {
    return 1
  }

  const characterScore = scoreNormalizedText(normalizedQuery, normalizedCandidate)
  const queryTokens = getTokens(normalizedQuery)
  const candidateTokens = getTokens(normalizedCandidate)
  const tokenScore =
    queryTokens.reduce((total, queryToken) => {
      const bestTokenScore = candidateTokens.reduce(
        (bestScore, candidateToken) => Math.max(bestScore, scoreNormalizedText(queryToken, candidateToken)),
        0,
      )

      return total + bestTokenScore
    }, 0) / queryTokens.length

  return Math.max(characterScore, tokenScore)
}

export function scoreCandidate(query, candidate, getCandidateFields) {
  const fields = getCandidateFields(candidate)

  if (!Array.isArray(fields)) {
    throw new TypeError('Candidate fields must be returned as an array.')
  }

  return [...fields, fields.join(' ')].reduce((bestScore, field) => Math.max(bestScore, scoreTextSimilarity(query, field)), 0)
}

export function rankCandidates(query, candidates, policy, getCandidateFields) {
  const normalizedPolicy = createSearchPolicy(policy)
  const threshold = getEffectiveRankingThreshold(normalizedPolicy)

  return candidates
    .map((candidate, index) => ({
      candidate,
      index,
      score: scoreCandidate(query, candidate, getCandidateFields),
    }))
    .filter(({ score }) => score >= threshold)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, normalizedPolicy.limit)
    .map(({ candidate }) => candidate)
}
