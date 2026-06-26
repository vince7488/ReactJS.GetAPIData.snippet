import { useState } from 'react'
import ProviderSelector from './components/ProviderSelector'
import ResultList from './components/ResultList'
import SearchForm from './components/SearchForm'
import { DEFAULT_PROVIDER_ID, getProvider, getProviders } from './providers/registry'
import { searchProvider } from './services/searchService'
import { createSearchPolicy, loadSearchPolicy, saveSearchPolicy } from './utils/searchPolicy'

function App() {
  const [selectedProviderId, setSelectedProviderId] = useState(DEFAULT_PROVIDER_ID)
  const [searchPolicy, setSearchPolicy] = useState(loadSearchPolicy)
  const [results, setResults] = useState([])
  const providers = getProviders()
  const selectedProvider = getProvider(selectedProviderId)

  function changeProvider(providerId) {
    setSelectedProviderId(providerId)
    setResults([])
  }

  async function handleSearch(query) {
    const nextResults = await searchProvider(selectedProviderId, query, searchPolicy)
    setResults(nextResults)
  }

  function clearSearch() {
    setResults([])
  }

  function changeFuzziness(fuzziness) {
    setSearchPolicy((currentPolicy) => {
      const nextPolicy = createSearchPolicy({ ...currentPolicy, fuzziness })
      saveSearchPolicy(nextPolicy)
      return nextPolicy
    })
  }

  return (
    <main className='app-shell'>
      <section className='container py-4 py-md-5'>
        <header className='app-header text-center'>
          <p className='app-kicker'>
            React provider adapter demo by{' '}
            <a href='https://vernard.net' target='_blank' rel='noopener noreferrer'>
              Vernard Mercader
            </a>
          </p>
          <h1>API Search Playground</h1>
          <p>{selectedProvider.description}</p>
        </header>

        <div className='search-panel'>
          <ProviderSelector providers={providers} selectedProviderId={selectedProviderId} onChange={changeProvider} />
          <SearchForm
            key={selectedProvider.id}
            provider={selectedProvider}
            searchPolicy={searchPolicy}
            onFuzzinessChange={changeFuzziness}
            onClear={clearSearch}
            onSearch={handleSearch}
          />
        </div>

        <ResultList
          results={results}
          externalLinkLabel={selectedProvider.externalLinkLabel}
          resultsLabel={selectedProvider.resultsLabel}
        />
      </section>
    </main>
  )
}

export default App
