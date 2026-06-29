import { useEffect, useMemo, useRef, useState } from 'react'
import MasonryGrid from './MasonryGrid'
import { getResultDisplayPolicy } from '../utils/resultDisplayPolicy'

const MASONRY_COLUMN_COUNT = 3

function getResultSummary(totalCount, visibleCount, hasMoreResults, revealIncrement) {
  const resultCountText = `${totalCount} ${totalCount === 1 ? 'result' : 'results'}`

  if (!hasMoreResults) {
    return resultCountText
  }

  return `${resultCountText} — showing ${visibleCount}; scroll to load ${Math.min(revealIncrement, totalCount - visibleCount)} more`
}

function ProgressiveResultList({ cappedResults, displayPolicy, externalLinkLabel, initialVisibleCount, resultsLabel }) {
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount)
  const loadMoreRef = useRef(null)
  const visibleResults = cappedResults.slice(0, visibleCount)
  const hasMoreResults = visibleCount < cappedResults.length

  useEffect(() => {
    const loadMoreMarker = loadMoreRef.current

    if (!hasMoreResults || !loadMoreMarker || typeof IntersectionObserver === 'undefined') {
      return undefined
    }

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((currentVisibleCount) => Math.min(currentVisibleCount + displayPolicy.revealIncrement, cappedResults.length))
        }
      },
      { rootMargin: '360px 0px' },
    )

    intersectionObserver.observe(loadMoreMarker)

    return () => intersectionObserver.disconnect()
  }, [cappedResults.length, displayPolicy.revealIncrement, hasMoreResults])

  return (
    <section aria-live='polite' aria-label={resultsLabel}>
      {cappedResults.length > 0 && (
        <p className='results-summary'>
          {getResultSummary(cappedResults.length, visibleCount, hasMoreResults, displayPolicy.revealIncrement)}
        </p>
      )}
      <MasonryGrid results={visibleResults} externalLinkLabel={externalLinkLabel} columnCount={MASONRY_COLUMN_COUNT} />
      {hasMoreResults && <div ref={loadMoreRef} className='result-list__load-more-marker' aria-hidden='true' />}
    </section>
  )
}

function ResultList({ results, externalLinkLabel, resultsLabel, providerId }) {
  const displayPolicy = getResultDisplayPolicy(providerId)
  const cappedResults = useMemo(() => results.slice(0, displayPolicy.maxVisibleCount), [results, displayPolicy.maxVisibleCount])
  const resultSetKey = `${providerId}:${displayPolicy.maxVisibleCount}:${cappedResults.map((result) => result.id).join('|')}`
  const initialVisibleCount = Math.min(displayPolicy.initialVisibleCount, cappedResults.length)

  return (
    <ProgressiveResultList
      key={resultSetKey}
      cappedResults={cappedResults}
      displayPolicy={displayPolicy}
      externalLinkLabel={externalLinkLabel}
      initialVisibleCount={initialVisibleCount}
      resultsLabel={resultsLabel}
    />
  )
}

export default ResultList
