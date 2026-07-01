# API Search Playground

A provider-driven React application for searching GitHub, Open Library, and PokéAPI through one shared interface.

The project was originally built with React 16, Webpack 4, Express, Axios, React Bootstrap, and LESS css. I've updated and it now uses
current React, Vite, Bootstrap, the browser Fetch API, ESLint, Prettier, and Vitest. Provider adapters isolate API request and response
details from the presentation components.

_\*Intentionally kept in React JSX (and not TypeScript) to showcase ability to be versatile with JSX (I do love TypeScript better,
though.)_

## Features

- Select to try out GitHub API, Open Library API, or PokéAPI from a drop down control.
- Tune the search string matching with a slider from "strict" to "lenient". This adjusts how exactly you want your query to match the
  results.
- You can clear the current query and rendered results from the search form.
- Normalize every API response into one shared result-card model.
- Keeps request construction, response adaptation, validation, ranking, hydration, and error mapping inside each provider adapter.
- Display results as `masonic`-backed virtualized masonry cards with page-scroll progressive reveal instead of a fixed-height result
  scroller.

[<img width="500" alt="image" src="https://github.com/user-attachments/assets/3d4a1d10-e056-471e-a131-1694fd23aaa2" />](https://youtu.be/xQuGRXs0y9c)

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

| Command                 | Purpose                                 |
| ----------------------- | --------------------------------------- |
| `npm run dev`           | Start the Vite development server       |
| `npm run build`         | Create a production build in `dist/`    |
| `npm run preview`       | Preview the production build locally    |
| `npm run lint`          | Run ESLint                              |
| `npm run format`        | Format supported files with Prettier    |
| `npm run format:check`  | Check formatting without changing files |
| `npm test`              | Run the Vitest test suite once          |
| `npm run test:coverage` | Run Vitest with V8 coverage output      |
| `npm run test:e2e`      | Run Playwright end-to-end tests         |
| `npm run test:e2e:live` | Run optional live API smoke tests       |
| `npm run test:watch`    | Run Vitest in watch mode                |

## Test Strategy

- Provider contract tests verify every registered adapter exposes the required fields, request builders, response adapters, ranking,
  hydration, candidate fields, and error mapping.
- Provider integration tests exercise `searchProvider` against mocked GitHub, Open Library, and PokéAPI payloads.
- Playwright end-to-end tests run against the production preview and mock third-party API hosts, so normal CI does not depend on live
  public APIs.
- Optional live API smoke checks are isolated in a separate scheduled/manual workflow and are allowed to fail without blocking normal
  CI.

## Provider Contract

Each provider adapter supplies:

- Provider name, description, labels, placeholder, example, and link copy
- `validateQuery(query)`
- `buildRequest(validatedQuery, searchPolicy)`
- `adaptResponse(payload, context)`
- `getCandidateFields(result)`
- `mapError(error)`

Providers can also supply optional hooks:

- `rankResults(query, results, searchPolicy)`
- `hydrateResults(results, context)`

Adapters return an array of normalized results with:

```text
id, title, subtitle, description, imageUrl, externalUrl, metadata
```

Adding another provider requires registering one adapter in `src/providers/registry.js`; presentation components do not need
provider-specific branches.

## Search Policy

The shared search policy is provider-independent:

```js
{
  matchLevel: 0, // 0 strict → 4 lenient
  limit: 12,
  rankingThreshold: 0.8
}
```

The match slider is intentionally not a universal fuzzy-search algorithm. At first I did want fuzzy, but I wasn't satisfied with the
results. Makes me think fuzzy is overrated. Each provider maps the five levels to behavior that fits its API surface:

- Level 0: strict
- Level 1: semi-strict
- Level 2: median
- Level 3: semi-lenient
- Level 4: lenient

Result display caps are provider-specific: GitHub searches up to 12 results and reveals 6 cards first, then 3 more at a time. Open
Library and PokéAPI search up to 54 results and reveal 9 cards first, then 6 more at a time.

## API Notes

The app calls each public API directly from the browser without credentials. Provider availability and unauthenticated rate limits
still apply:

### GitHub API

- GitHub requires at least two characters (alphanumeric), searches public users by provider-specific match level.
- Only searches within the `username` value.
- Hydrates displayed results through `GET /users/:login` so company, location, repository, and follower metadata are complete.
- Broader levels can consume GitHub rate limits quickly.

### Open Library API

- Open Library searches books with provider-owned title, author, and alternate-title ranking: exact title, title prefix, unordered
  title tokens, title-and-author matching, then lenient token coverage.

### PokéAPI

- PokéAPI accepts letter-only queries of two or more characters, or number-only Pokédex queries of one or more digits. Mixed
  alphanumeric queries such as `ra1chu` are rejected. Broader levels use the Pokémon catalog, hydrate displayed Pokémon records, and
  level 4 applies the lenient matching rule to Pokémon names and Pokédex numbers.

## Previews

<img width="400" height="225" alt="image" src="https://github.com/user-attachments/assets/64c225f2-f738-499d-833c-274d0e7a9d16" />

<img width="400" height="225" alt="image" src="https://github.com/user-attachments/assets/6041117a-4b68-4cf7-a205-fafdc18bad5f" />

<img width="400" height="225" alt="image" src="https://github.com/user-attachments/assets/d33ee84e-0d34-4b31-b9a4-ee4f357de9aa" />

<img width="400" height="225" alt="image" src="https://github.com/user-attachments/assets/4a317b90-bef7-45b3-be7a-e4bbfedc430e" />

<img width="400" height="225" alt="image" src="https://github.com/user-attachments/assets/ea9ba294-f69b-41fa-8548-7eea6e5a1426" />

<img width="400" height="225" alt="image" src="https://github.com/user-attachments/assets/394aa89f-c1df-4a3e-87ec-0d57de105432" />

<img width="400" height="225" alt="image" src="https://github.com/user-attachments/assets/ba78b55b-8481-4fb4-8eab-fab63e022acf" />

[<img width="280" height="1205" alt="image" src="https://github.com/user-attachments/assets/c410b31b-821e-4f35-a2f5-e7264877cb9d" />](https://github.com/user-attachments/assets/c410b31b-821e-4f35-a2f5-e7264877cb9d)

## Yours truly

Created by [Vernard Mercader](http://vernard.net)
