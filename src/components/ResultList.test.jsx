import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ResultList from './ResultList'

function createResult(index) {
  return {
    id: `result:${index}`,
    title: `Result ${index}`,
    subtitle: `@result-${index}`,
    description: `Description ${index}`,
    imageUrl: null,
    externalUrl: `https://example.com/result-${index}`,
    metadata: [{ label: 'Index', value: String(index) }],
  }
}

describe('ResultList', () => {
  it('renders the standard grid for ten or fewer results', () => {
    render(<ResultList results={[createResult(1)]} externalLinkLabel='View result' resultsLabel='Test results' />)

    expect(screen.getByText('1 result')).toBeInTheDocument()
    expect(screen.queryByLabelText(/virtualized/i)).not.toBeInTheDocument()
  })

  it('virtualizes results when more than ten are available', () => {
    render(
      <ResultList
        results={Array.from({ length: 11 }, (_, index) => createResult(index + 1))}
        externalLinkLabel='View result'
        resultsLabel='Test results'
      />,
    )

    expect(screen.getByText('11 results — showing 10 at a time')).toBeInTheDocument()
    expect(screen.getByLabelText('Test results, virtualized')).toBeInTheDocument()
  })
})
