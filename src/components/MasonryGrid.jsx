import { useMemo } from 'react'
import { Masonry } from 'masonic'
import ResultCard from './ResultCard'

const DEFAULT_COLUMN_COUNT = 3
const COLUMN_WIDTH = 360
const COLUMN_GUTTER = 16
const ROW_GUTTER = 16
const ITEM_HEIGHT_ESTIMATE = 520

function MasonicResultCard({ data }) {
  return <ResultCard result={data.result} externalLinkLabel={data.externalLinkLabel} />
}

function MasonryGrid({ results, externalLinkLabel, columnCount = DEFAULT_COLUMN_COUNT }) {
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
      itemKey={(item) => item.result.id}
      items={items}
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
