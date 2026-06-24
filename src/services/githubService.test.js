import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getGitHubProfile } from './githubService';

const profile = {
  id: 1,
  login: 'octocat',
};

describe('getGitHubProfile', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('trims the username and returns the GitHub response', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(profile),
    });

    await expect(getGitHubProfile(' octocat ')).resolves.toEqual(profile);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/users/octocat',
      {
        headers: {
          Accept: 'application/vnd.github+json',
        },
      },
    );
  });

  it('rejects unsuccessful GitHub responses', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(getGitHubProfile('missing-user')).rejects.toThrow(
      'GitHub request failed with status 404.',
    );
  });
});
