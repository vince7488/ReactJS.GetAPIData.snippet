import { expect, test } from '@playwright/test'

test.describe('optional live API smoke @live', () => {
  test.skip(process.env.LIVE_API_SMOKE !== '1', 'Live API smoke checks run only when explicitly enabled.')

  test('can search each public provider against live APIs', async ({ page }) => {
    await page.goto('/')

    await page.getByLabel('GitHub username').fill('octocat')
    await page.getByRole('button', { name: 'Find GitHub user' }).click()
    await expect(page.getByText('@octocat')).toBeVisible()

    await page.getByRole('button', { name: 'Clear' }).click()
    await page.getByLabel('API provider').selectOption('open-library')
    await page.getByLabel('Book title or author').fill('the hobbit')
    await page.getByRole('button', { name: 'Search Open Library' }).click()
    await expect(page.getByRole('heading', { name: 'The Hobbit' })).toBeVisible()

    await page.getByRole('button', { name: 'Clear' }).click()
    await page.getByLabel('API provider').selectOption('pokeapi')
    await page.getByLabel('Pokémon name or Pokédex number').fill('pikachu')
    await page.getByRole('button', { name: 'Find Pokémon' }).click()
    await expect(page.getByRole('heading', { name: 'Pikachu' })).toBeVisible()
  })
})
