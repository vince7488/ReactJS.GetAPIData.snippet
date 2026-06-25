# API Search Playground

A provider-driven React application for searching GitHub, Open Library, and PokéAPI through one shared interface.

The project was originally built with React 16, Webpack 4, Express, Axios, React Bootstrap, and LESS. It now uses current React, Vite,
Bootstrap, the browser Fetch API, ESLint, Prettier, and Vitest. Provider adapters isolate API request and response details from the
presentation components.

## Features

- Select GitHub, Open Library, or PokéAPI from an accessible provider control.
- Change form labels, examples, validation, and links for the selected API.
- Normalize every API response into one shared result-card model.
- Keep request construction, response adaptation, validation, and error mapping inside each provider adapter.
- Display single-item and multi-item responses in a responsive Bootstrap grid.

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
  providers/    Provider adapters, contract, and registry
  services/     Provider-independent request orchestration
  styles/       Application CSS
  test/         Shared test setup
  App.jsx       Application state and composition
  main.jsx      React entry point
```

## Provider Contract

Each provider adapter supplies:

- Provider name, description, labels, placeholder, example, and link copy
- `validateQuery(query)`
- `buildRequest(validatedQuery)`
- `adaptResponse(payload)`
- `mapError(error)`

Adapters return an array of normalized results with:

```text
id, title, subtitle, description, imageUrl, externalUrl, metadata
```

Adding another provider requires registering one adapter in `src/providers/registry.js`; presentation components do not need
provider-specific branches.

## API Notes

The app calls each public API directly from the browser without credentials. Provider availability and unauthenticated rate limits
still apply:

- GitHub performs an exact username lookup.
- Open Library searches books and returns up to six matches.
- PokéAPI performs an exact Pokémon name or National Pokédex number lookup.

## Credits

Created by [Vernard Mercader](http://vernard.net)
