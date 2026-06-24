import { useState } from 'react';
import { getGitHubProfile } from '../services/githubService';

function SearchForm({ onProfileFound }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const profile = await getGitHubProfile(username);
      onProfileFound(profile);
    } catch {
      setError("Something went wrong, the username can't be found.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleUsernameChange(event) {
    setUsername(event.target.value);
    setError('');
  }

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-8 col-lg-6">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group mb-4">
            <label className="input-group-text" htmlFor="github-username">
              GitHub.com/
            </label>
            <input
              id="github-username"
              className="form-control"
              type="text"
              placeholder="Username"
              aria-label="GitHub username"
              value={username}
              onChange={handleUsernameChange}
              autoComplete="off"
              required
            />
            <button
              className="btn btn-outline-primary"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SearchForm;
