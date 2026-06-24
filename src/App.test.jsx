import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { getGitHubProfile } from './services/githubService';

vi.mock('./services/githubService', () => ({
  getGitHubProfile: vi.fn(),
}));

const profile = {
  id: 1,
  login: 'octocat',
  name: 'The Octocat',
  company: 'GitHub',
  avatar_url: 'https://example.com/octocat.png',
  html_url: 'https://github.com/octocat',
};

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('searches for a username and renders the returned profile', async () => {
    const user = userEvent.setup();
    getGitHubProfile.mockResolvedValue(profile);
    render(<App />);

    await user.type(screen.getByLabelText(/github username/i), 'octocat');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(getGitHubProfile).toHaveBeenCalledWith('octocat');
    expect(await screen.findByText('The Octocat')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Profile' })).toHaveAttribute(
      'href',
      'https://github.com/octocat',
    );
  });

  it('shows an error when the GitHub request fails', async () => {
    const user = userEvent.setup();
    getGitHubProfile.mockRejectedValue(new Error('Not found'));
    render(<App />);

    await user.type(screen.getByLabelText(/github username/i), 'missing-user');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Something went wrong, the username can't be found.",
    );
  });
});
