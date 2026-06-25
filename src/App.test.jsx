import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { searchProvider } from './services/searchService'

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
  })

  it('searches the selected provider and renders normalized results', async () => {
    const user = userEvent.setup()
    searchProvider.mockResolvedValue([result])
    render(<App />)

    await user.type(screen.getByLabelText(/github username/i), 'octocat')
    await user.click(screen.getByRole('button', { name: 'Find GitHub user' }))

    expect(searchProvider).toHaveBeenCalledWith('github', 'octocat')
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
})
