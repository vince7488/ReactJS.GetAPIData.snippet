import { useEffect, useMemo, useRef, useState } from 'react'
import LoadMoreIndicator from './LoadMoreIndicator'
import MasonryGrid from './MasonryGrid'
import { getResultDisplayPolicy } from '../utils/resultDisplayPolicy'

const MASONRY_COLUMN_COUNT = 3
const LOAD_MORE_DELAY_MS = 300

function getResultSummary(totalCount, visibleCount, hasMoreResults, revealIncrement) {
  const resultCountText = `${totalCount} ${totalCount === 1 ? 'result' : 'results'}`

  if (!hasMoreResults) {
    return resultCountText
  }

  return `${resultCountText} — showing ${visibleCount}; scroll to load ${Math.min(revealIncrement, totalCount - visibleCount)} more`
}

function ProgressiveResultList({ cappedResults, displayPolicy, externalLinkLabel, initialVisibleCount, resultsLabel }) {
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const canRequestMoreRef = useRef(true)
  const loadMoreTimerRef = useRef(null)
  const loadMoreRef = useRef(null)
  const visibleResults = cappedResults.slice(0, visibleCount)
  const hasMoreResults = visibleCount < cappedResults.length

  useEffect(() => {
    const loadMoreMarker = loadMoreRef.current

    if (!hasMoreResults || isLoadingMore || !loadMoreMarker || typeof IntersectionObserver === 'undefined') {
      return undefined
    }

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => !entry.isIntersecting)) {
          canRequestMoreRef.current = true
        }

        if (entries.some((entry) => entry.isIntersecting) && canRequestMoreRef.current && !loadMoreTimerRef.current) {
          canRequestMoreRef.current = false
          setIsLoadingMore(true)

          loadMoreTimerRef.current = window.setTimeout(() => {
            setVisibleCount((currentVisibleCount) =>
              Math.min(currentVisibleCount + displayPolicy.revealIncrement, cappedResults.length),
            )
            setIsLoadingMore(false)
            loadMoreTimerRef.current = null
          }, LOAD_MORE_DELAY_MS)
        }
      },
      { rootMargin: '0px' },
    )

    intersectionObserver.observe(loadMoreMarker)

    return () => intersectionObserver.disconnect()
  }, [cappedResults.length, displayPolicy.revealIncrement, hasMoreResults, isLoadingMore])

  useEffect(
    () => () => {
      if (loadMoreTimerRef.current) {
        window.clearTimeout(loadMoreTimerRef.current)
      }
    },
    [],
  )

  return (
    <section aria-live='polite' aria-label={resultsLabel}>
      {cappedResults.length > 0 && (
        <p className='results-summary'>
          {getResultSummary(cappedResults.length, visibleCount, hasMoreResults, displayPolicy.revealIncrement)}
        </p>
      )}
      <MasonryGrid results={visibleResults} externalLinkLabel={externalLinkLabel} columnCount={MASONRY_COLUMN_COUNT} />
      {hasMoreResults && (
        <div ref={loadMoreRef} className='result-list__load-more-marker'>
          {isLoadingMore && <LoadMoreIndicator />}
        </div>
      )}
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
