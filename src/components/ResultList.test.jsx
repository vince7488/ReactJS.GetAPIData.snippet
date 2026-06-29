import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ResultList from './ResultList'

vi.mock('./MasonryGrid', () => ({
  default({ results }) {
    return (
      <div className='masonry-grid' role='list'>
        {results.map((result) => (
          <article key={result.id}>{result.title}</article>
        ))}
      </div>
    )
  },
}))

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
  let triggerIntersection

  beforeEach(() => {
    triggerIntersection = undefined
    globalThis.IntersectionObserver = vi.fn(function IntersectionObserverMock(callback) {
      triggerIntersection = callback

      return {
        observe: vi.fn(),
        disconnect: vi.fn(),
      }
    })
  })

  afterEach(() => {
    delete globalThis.IntersectionObserver
  })

  it('renders masonry cards without switching to a virtualized row list', () => {
    render(<ResultList providerId='github' results={[createResult(1)]} externalLinkLabel='View result' resultsLabel='Test results' />)

    expect(screen.getByRole('list')).toHaveClass('masonry-grid')
    expect(screen.getByText('1 result')).toBeInTheDocument()
    expect(screen.queryByLabelText(/virtualized/i)).not.toBeInTheDocument()
  })

  it('progressively reveals GitHub results from six cards in groups of three', async () => {
    render(
      <ResultList
        providerId='github'
        results={Array.from({ length: 12 }, (_, index) => createResult(index + 1))}
        externalLinkLabel='View result'
        resultsLabel='Test results'
      />,
    )

    expect(screen.getByText('12 results — showing 6; scroll to load 3 more')).toBeInTheDocument()
    expect(screen.getByText('Result 6')).toBeInTheDocument()
    expect(screen.queryByText('Result 7')).not.toBeInTheDocument()

    await waitFor(() => expect(globalThis.IntersectionObserver).toHaveBeenCalled())

    act(() => {
      triggerIntersection([{ isIntersecting: true }])
    })

    expect(screen.getByText('12 results — showing 9; scroll to load 3 more')).toBeInTheDocument()
    expect(screen.getByText('Result 9')).toBeInTheDocument()
    expect(screen.queryByText('Result 10')).not.toBeInTheDocument()

    act(() => {
      triggerIntersection([{ isIntersecting: true }])
    })

    expect(screen.getByText('12 results')).toBeInTheDocument()
    expect(screen.getByText('Result 12')).toBeInTheDocument()
  })

  it('progressively reveals Open Library and PokéAPI sized result sets from nine cards in groups of six', async () => {
    render(
      <ResultList
        providerId='open-library'
        results={Array.from({ length: 52 }, (_, index) => createResult(index + 1))}
        externalLinkLabel='View result'
        resultsLabel='Test results'
      />,
    )

    expect(screen.getByText('52 results — showing 9; scroll to load 6 more')).toBeInTheDocument()
    expect(screen.getByText('Result 9')).toBeInTheDocument()
    expect(screen.queryByText('Result 10')).not.toBeInTheDocument()

    await waitFor(() => expect(globalThis.IntersectionObserver).toHaveBeenCalled())

    act(() => {
      triggerIntersection([{ isIntersecting: true }])
    })

    expect(screen.getByText('52 results — showing 15; scroll to load 6 more')).toBeInTheDocument()
    expect(screen.getByText('Result 15')).toBeInTheDocument()
  })
})
