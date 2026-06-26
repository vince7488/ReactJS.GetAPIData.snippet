import { useState } from 'react'
import SearchPolicyControl from './SearchPolicyControl'

function SearchForm({ provider, searchPolicy, onFuzzinessChange, onSearch }) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await onSearch(query)
    } catch (searchError) {
      setError(searchError.message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleQueryChange(event) {
    setQuery(event.target.value)
    setError('')
  }

  return (
    <form className='search-form' onSubmit={handleSubmit}>
      {error && (
        <div className='alert alert-danger' role='alert'>
          {error}
        </div>
      )}

      <div className='mb-2'>
        <label className='form-label fw-semibold' htmlFor='search-query'>
          {provider.inputLabel}
        </label>
        <div className='input-group'>
          <span className='input-group-text' aria-hidden='true'>
            {provider.name}
          </span>
          <input
            id='search-query'
            className='form-control'
            type='text'
            placeholder={provider.placeholder}
            value={query}
            onChange={handleQueryChange}
            autoComplete='off'
            aria-describedby='search-example'
            required
          />
          <button className='btn btn-primary' type='submit' disabled={isLoading}>
            {isLoading ? 'Searching...' : provider.submitLabel}
          </button>
        </div>
      </div>

      <p id='search-example' className='form-text mb-0'>
        Example: {provider.example}
      </p>

      <SearchPolicyControl fuzziness={searchPolicy.fuzziness} onChange={onFuzzinessChange} />
    </form>
  )
}

export default SearchForm
