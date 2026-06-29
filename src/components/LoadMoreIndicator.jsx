function LoadMoreIndicator() {
  return (
    <div className='load-more-indicator' role='status' aria-live='polite'>
      <span className='spinner-border spinner-border-sm' aria-hidden='true' />
      <span>loading more</span>
    </div>
  )
}

export default LoadMoreIndicator
