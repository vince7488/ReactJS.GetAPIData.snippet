import { useMemo } from 'react'
import { Masonry } from 'masonic'
import ResultCard from './ResultCard'

const DEFAULT_COLUMN_COUNT = 3
const COLUMN_WIDTH = 360
const COLUMN_GUTTER = 16
const ROW_GUTTER = 16

// Masonic needs a reasonable first guess before images and text settle into their final heights.
// If this estimate is wildly off, scrolling still works, but the page can feel jumpier while it measures.
const ITEM_HEIGHT_ESTIMATE = 520

// Masonic owns virtualization and layout, so each rendered cell receives its data through this small adapter.
// Keeping ResultCard unaware of Masonic makes the card component easier to reuse and test.
function MasonicResultCard({ data }) {
  return <ResultCard result={data.result} externalLinkLabel={data.externalLinkLabel} />
}

function MasonryGrid({ results, externalLinkLabel, columnCount = DEFAULT_COLUMN_COUNT }) {
  // Attach shared render props once per result set instead of rebuilding wrapper objects on every render.
  // Stable item data helps Masonic reuse measured cells instead of treating the grid as brand new work.
  const items = useMemo(() => results.map((result) => ({ result, externalLinkLabel })), [results, externalLinkLabel])

  if (results.length === 0) {
    return null
  }

  return (
    <Masonry
      className='masonry-grid'
      columnGutter={COLUMN_GUTTER}
      columnWidth={COLUMN_WIDTH}
      itemHeightEstimate={ITEM_HEIGHT_ESTIMATE}
      // Result IDs are stable across searches; index keys would make virtualization reuse the wrong card after filtering or clearing.
      itemKey={(item) => item.result.id}
      items={items}
      // We cap the layout at three columns, while Masonic can still collapse below that when the viewport gets narrow.
      maxColumnCount={columnCount}
      overscanBy={2}
      render={MasonicResultCard}
      role='list'
      rowGutter={ROW_GUTTER}
      ssrHeight={900}
      ssrWidth={1600}
    />
  )
}

export default MasonryGrid
