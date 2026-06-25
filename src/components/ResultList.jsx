import ResultCard from './ResultCard'

function ResultList({ results, externalLinkLabel, resultsLabel }) {
  return (
    <section aria-live='polite' aria-label={resultsLabel}>
      {results.length > 0 && (
        <p className='results-summary'>
          {results.length} {results.length === 1 ? 'result' : 'results'}
        </p>
      )}
      <div className='row align-items-stretch'>
        {results.map((result) => (
          <ResultCard key={result.id} result={result} externalLinkLabel={externalLinkLabel} />
        ))}
      </div>
    </section>
  )
}

export default ResultList
