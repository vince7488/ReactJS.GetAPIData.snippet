const GITHUB_USERS_API = 'https://api.github.com/users';

export async function getGitHubProfile(username) {
  const normalizedUsername = username.trim();

  if (!normalizedUsername) {
    throw new Error('A GitHub username is required.');
  }

  const response = await fetch(
    `${GITHUB_USERS_API}/${encodeURIComponent(normalizedUsername)}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub request failed with status ${response.status}.`);
  }

  return response.json();
}
