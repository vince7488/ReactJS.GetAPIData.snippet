function ResultCard({ result, externalLinkLabel, className = 'col-12 col-md-6 col-xl-4 p-2' }) {
  return (
    <article className={className}>
      <div className='result-card h-100'>
        <div className='result-card__media'>
          {result.imageUrl ? (
            <img className='result-card__image' src={result.imageUrl} alt='' />
          ) : (
            <div className='result-card__placeholder' aria-hidden='true'>
              {result.title.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className='result-card__body'>
          <h2 className='result-card__title'>{result.title}</h2>
          <p className='result-card__subtitle'>{result.subtitle}</p>
          <p className='result-card__description'>{result.description}</p>

          <dl className='result-card__metadata'>
            {result.metadata.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>

          <a className='btn btn-outline-primary mt-auto align-self-start' href={result.externalUrl} target='_blank' rel='noreferrer'>
            {externalLinkLabel}
          </a>
        </div>
      </div>
    </article>
  )
}

export default ResultCard
