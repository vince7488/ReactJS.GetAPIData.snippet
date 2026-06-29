import { List } from 'react-window'
import ResultCard from './ResultCard'

const VIRTUAL_RESULT_THRESHOLD = 10
const VIRTUAL_RESULT_ROW_HEIGHT = 340

function VirtualResultRow({ index, style, results, externalLinkLabel }) {
  return (
    <div className='result-list__virtual-row' style={style}>
      <ResultCard result={results[index]} externalLinkLabel={externalLinkLabel} className='result-list__virtual-card' />
    </div>
  )
}

function ResultList({ results, externalLinkLabel, resultsLabel }) {
  const shouldVirtualize = results.length > VIRTUAL_RESULT_THRESHOLD

  return (
    <section aria-live='polite' aria-label={resultsLabel}>
      {results.length > 0 && (
        <p className='results-summary'>
          {results.length} {results.length === 1 ? 'result' : 'results'}
          {shouldVirtualize && ` — showing ${VIRTUAL_RESULT_THRESHOLD} at a time`}
        </p>
      )}
      {shouldVirtualize ? (
        <List
          aria-label={`${resultsLabel}, virtualized`}
          className='result-list__virtual-list'
          defaultHeight={VIRTUAL_RESULT_ROW_HEIGHT * VIRTUAL_RESULT_THRESHOLD}
          rowComponent={VirtualResultRow}
          rowCount={results.length}
          rowHeight={VIRTUAL_RESULT_ROW_HEIGHT}
          rowProps={{ results, externalLinkLabel }}
          style={{
            height: VIRTUAL_RESULT_ROW_HEIGHT * VIRTUAL_RESULT_THRESHOLD,
            width: '100%',
          }}
          overscanCount={2}
        />
      ) : (
        <div className='row align-items-stretch'>
          {results.map((result) => (
            <ResultCard key={result.id} result={result} externalLinkLabel={externalLinkLabel} />
          ))}
        </div>
      )}
    </section>
  )
}

export default ResultList
