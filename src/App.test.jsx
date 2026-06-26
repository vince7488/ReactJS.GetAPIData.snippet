import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { searchProvider } from './services/searchService'
import { DEFAULT_SEARCH_POLICY, SEARCH_POLICY_STORAGE_KEY } from './utils/searchPolicy'

vi.mock('./services/searchService', () => ({
  searchProvider: vi.fn(),
}))

const result = {
  id: 'github:1',
  title: 'The Octocat',
  subtitle: '@octocat',
  description: 'A GitHub mascot.',
  imageUrl: 'https://example.com/octocat.png',
  externalUrl: 'https://github.com/octocat',
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

    await user.type(screen.getByLabelText(/github username/i), 'octocat')
    await user.click(screen.getByRole('button', { name: 'Find GitHub user' }))

    expect(searchProvider).toHaveBeenCalledWith('github', 'octocat', DEFAULT_SEARCH_POLICY)
    expect(await screen.findByText('The Octocat')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View GitHub profile' })).toHaveAttribute('href', 'https://github.com/octocat')
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

  it('shows the provider-mapped error message', async () => {
    const user = userEvent.setup()
    searchProvider.mockRejectedValue(new Error("That GitHub username couldn't be found."))
    render(<App />)

    await user.type(screen.getByLabelText(/github username/i), 'missing-user')
    await user.click(screen.getByRole('button', { name: 'Find GitHub user' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("That GitHub username couldn't be found.")
  })

  it('updates, persists, and applies the accessible fuzziness value', async () => {
    const user = userEvent.setup()
    searchProvider.mockResolvedValue([])
    const { unmount } = render(<App />)
    const slider = screen.getByRole('slider', { name: 'Search fuzziness' })

    expect(slider).toHaveValue('0')
    expect(slider).toHaveAttribute('aria-valuetext', '0 out of 100, strict')

    fireEvent.change(slider, { target: { value: '65' } })

    expect(slider).toHaveValue('65')
    expect(screen.getByText('65% fuzzy')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(SEARCH_POLICY_STORAGE_KEY))).toEqual({
      fuzziness: 65,
      limit: 12,
      rankingThreshold: 0.8,
    })

    await user.type(screen.getByLabelText(/github username/i), 'octocat')
    await user.click(screen.getByRole('button', { name: 'Find GitHub user' }))

    expect(searchProvider).toHaveBeenCalledWith('github', 'octocat', {
      fuzziness: 65,
      limit: 12,
      rankingThreshold: 0.8,
    })

    unmount()
    render(<App />)

    expect(screen.getByRole('slider', { name: 'Search fuzziness' })).toHaveValue('65')
  })
})
