import { expect, test } from '@playwright/test'

const dataImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

async function fulfillJson(route, payload) {
  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(payload),
  })
}

async function registerMockApiRoutes(page) {
  await page.route('https://api.github.com/**', async (route) => {
    const url = new URL(route.request().url())

    if (url.pathname === '/users/vince7488') {
      await fulfillJson(route, {
        id: 7488,
        login: 'vince7488',
        name: 'Vernard Mercader',
        bio: 'Mocked GitHub profile.',
        avatar_url: dataImage,
        html_url: 'https://github.com/vince7488',
        company: 'Vernard LLC',
        location: 'United States',
        public_repos: 42,
        followers: 24,
      })
      return
    }

    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: `Unexpected GitHub request: ${url.pathname}` }),
    })
  })

  await page.route('https://openlibrary.org/**', async (route) => {
    const url = new URL(route.request().url())

    if (url.pathname === '/search.json') {
      await fulfillJson(route, {
        docs: [
          {
            key: '/works/OL262758W',
            title: 'The Hobbit',
            author_name: ['J. R. R. Tolkien'],
            first_publish_year: 1937,
            edition_count: 120,
            language: ['eng'],
          },
          {
            key: '/works/OL1W',
            title: 'The Annotated Hobbit',
            author_name: ['J. R. R. Tolkien'],
            first_publish_year: 2002,
            edition_count: 3,
            language: ['eng'],
          },
        ],
      })
      return
    }

    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: `Unexpected Open Library request: ${url.pathname}` }),
    })
  })

  await page.route('https://pokeapi.co/**', async (route) => {
    const url = new URL(route.request().url())

    if (url.pathname === '/api/v2/pokemon/pikachu') {
      await fulfillJson(route, {
        id: 25,
        name: 'pikachu',
        base_experience: 112,
        height: 4,
        weight: 60,
        sprites: {
          front_default: null,
          other: {
            'official-artwork': {
              front_default: null,
            },
          },
        },
        types: [{ type: { name: 'electric' } }],
        abilities: [{ ability: { name: 'static' } }],
      })
      return
    }

    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: `Unexpected PokéAPI request: ${url.pathname}` }),
    })
  })
}

test.beforeEach(async ({ page }) => {
  await registerMockApiRoutes(page)
  await page.goto('/')
})

test('searches GitHub with mocked API data', async ({ page }) => {
  await page.getByLabel('GitHub username').fill('vince7488')
  await page.getByRole('button', { name: 'Find GitHub user' }).click()

  await expect(page.getByRole('heading', { name: 'Vernard Mercader' })).toBeVisible()
  await expect(page.getByText('@vince7488')).toBeVisible()
  await expect(page.getByText('Vernard LLC')).toBeVisible()
})

test('searches Open Library with mocked API data', async ({ page }) => {
  await page.getByLabel('API provider').selectOption('open-library')
  await page.getByLabel('Book title or author').fill('the hobbit')
  await page.getByRole('button', { name: 'Search Open Library' }).click()

  await expect(page.getByRole('heading', { name: 'The Hobbit' })).toBeVisible()
  await expect(page.getByText('by J. R. R. Tolkien')).toBeVisible()
  await expect(page.getByText('First published in 1937.')).toBeVisible()
})

test('searches PokéAPI with mocked API data', async ({ page }) => {
  await page.getByLabel('API provider').selectOption('pokeapi')
  await page.getByLabel('Pokémon name or Pokédex number').fill('pikachu')
  await page.getByRole('button', { name: 'Find Pokémon' }).click()

  await expect(page.getByRole('heading', { name: 'Pikachu' })).toBeVisible()
  await expect(page.getByText('National Pokédex #0025')).toBeVisible()
  await expect(page.getByText('Electric', { exact: true })).toBeVisible()
})
