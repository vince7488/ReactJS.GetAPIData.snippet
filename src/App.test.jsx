import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { searchProvider } from './services/searchService'
import { DEFAULT_SEARCH_POLICY, SEARCH_POLICY_STORAGE_KEY } from './utils/searchPolicy'

vi.mock('./services/searchService', () => ({
  searchProvider: vi.fn(),
}))

vi.mock('./components/MasonryGrid', () => ({
  default({ results, externalLinkLabel }) {
    return (
      <div className='masonry-grid' role='list'>
        {results.map((result) => (
          <article key={result.id}>
            <h2>{result.title}</h2>
            <p>{result.subtitle}</p>
            <p>{result.description}</p>
            <dl>
              {result.metadata.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
            <a href={result.externalUrl}>{externalLinkLabel}</a>
          </article>
        ))}
      </div>
    )
  },
}))

const result = {
  id: 'github:1',
  title: 'The vince7488',
  subtitle: '@vince7488',
  description: 'A GitHub mascot.',
  imageUrl: 'https://example.com/vince7488.png',
  externalUrl: 'https://github.com/vince7488',
  metadata: [{ label: 'Followers', value: '20' }],
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('searches the selected provider and renders normalized results', async () => {
    const user = userEvent.setup()
    searchProvider.mockResolvedValue([result])
    render(<App />)

    await user.type(screen.getByLabelText(/github username/i), 'vince7488')
    await user.click(screen.getByRole('button', { name: 'Find GitHub user' }))

    expect(searchProvider).toHaveBeenCalledWith('github', 'vince7488', DEFAULT_SEARCH_POLICY)
    expect(await screen.findByText('The vince7488')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View GitHub profile' })).toHaveAttribute('href', 'https://github.com/vince7488')
    expect(screen.getByText('Followers')).toBeInTheDocument()
  })

  it('updates search copy when the provider changes', async () => {
    const user = userEvent.setup()
    searchProvider.mockResolvedValue([])
    render(<App />)

    await user.selectOptions(screen.getByLabelText('API provider'), 'open-library')

    expect(screen.getByLabelText('Book title or author')).toHaveAttribute('placeholder', 'The Lord of the Rings')
    expect(screen.getByText('Example: The Lord of the Rings')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Search Open Library' })).toBeVisible()
  })

  it('applies the larger result cap when searching Open Library', async () => {
    const user = userEvent.setup()
    searchProvider.mockResolvedValue([])
    render(<App />)

    await user.selectOptions(screen.getByLabelText('API provider'), 'open-library')
    await user.type(screen.getByLabelText('Book title or author'), 'hobbit')
    await user.click(screen.getByRole('button', { name: 'Search Open Library' }))

    expect(searchProvider).toHaveBeenCalledWith('open-library', 'hobbit', {
      matchLevel: 0,
      limit: 54,
      rankingThreshold: 0.8,
    })
  })

  it('clears the current query and rendered results', async () => {
    const user = userEvent.setup()
    searchProvider.mockResolvedValue([result])
    render(<App />)

    const queryInput = screen.getByLabelText(/github username/i)
    await user.type(queryInput, 'vince7488')
    await user.click(screen.getByRole('button', { name: 'Find GitHub user' }))

    expect(await screen.findByText('The vince7488')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(queryInput).toHaveValue('')
    expect(screen.queryByText('The vince7488')).not.toBeInTheDocument()
  })

  it('shows the provider-mapped error message', async () => {
    const user = userEvent.setup()
    searchProvider.mockRejectedValue(new Error("That GitHub username couldn't be found."))
    render(<App />)

    await user.type(screen.getByLabelText(/github username/i), 'missing-user')
    await user.click(screen.getByRole('button', { name: 'Find GitHub user' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("That GitHub username couldn't be found.")
  })

  it('updates, persists, and applies the accessible match level value', async () => {
    const user = userEvent.setup()
    searchProvider.mockResolvedValue([])
    const { unmount } = render(<App />)
    const slider = screen.getByRole('slider', { name: 'Search match level' })

    expect(slider).toHaveValue('0')
    expect(slider).toHaveAttribute('aria-valuetext', 'Level 0 of 4, Strict: exact, case-insensitive matching')

    fireEvent.change(slider, { target: { value: '3' } })

    expect(slider).toHaveValue('3')
    expect(screen.getByText('Level 3: Semi-lenient')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(SEARCH_POLICY_STORAGE_KEY))).toEqual({
      matchLevel: 3,
      limit: 12,
      rankingThreshold: 0.8,
    })

    await user.type(screen.getByLabelText(/github username/i), 'vince7488')
    await user.click(screen.getByRole('button', { name: 'Find GitHub user' }))

    expect(searchProvider).toHaveBeenCalledWith('github', 'vince7488', {
      matchLevel: 3,
      limit: 12,
      rankingThreshold: 0.8,
    })

    unmount()
    render(<App />)

    expect(screen.getByRole('slider', { name: 'Search match level' })).toHaveValue('3')
  })
})
