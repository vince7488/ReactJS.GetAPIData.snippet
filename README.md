# React GitHub Profile Search

A small React application that searches GitHub by username and displays each
result as a responsive profile card.

The project was originally built with React 16, Webpack 4, Express, Axios,
React Bootstrap, and LESS. It now uses current React, Vite, Bootstrap, the
browser Fetch API, ESLint, Prettier, and Vitest.

## Features

- Search GitHub's public users API by username.
- Display the user's name, login, company, avatar, and profile link.
- Show readable fallback values when optional profile fields are missing.
- Report unsuccessful searches without removing existing results.
- Keep multiple search results visible in a responsive Bootstrap grid.

## Requirements

- Node.js 20.19 or newer
- npm

## Setup

```bash
npm install
npm run dev
```

Vite prints the local development URL when the server starts.

## Scripts

| Command                | Purpose                                 |
| ---------------------- | --------------------------------------- |
| `npm run dev`          | Start the Vite development server       |
| `npm run build`        | Create a production build in `dist/`    |
| `npm run preview`      | Preview the production build locally    |
| `npm run lint`         | Run ESLint                              |
| `npm run format`       | Format supported files with Prettier    |
| `npm run format:check` | Check formatting without changing files |
| `npm test`             | Run the Vitest test suite once          |
| `npm run test:watch`   | Run Vitest in watch mode                |

## Project Structure

```text
src/
  components/   React UI components
  services/     GitHub API access
  styles/       Application CSS
  test/         Shared test setup
  utils/        Profile display helpers
  App.jsx       Application state and composition
  main.jsx      React entry point
```

## API Notes

The app calls `https://api.github.com/users/{username}` directly from the
browser. GitHub applies a low hourly rate limit to unauthenticated requests, so
heavy use can temporarily produce the same error shown for a missing username.

## Credits

Created by [Vernard Mercader](http://vernard.net)
