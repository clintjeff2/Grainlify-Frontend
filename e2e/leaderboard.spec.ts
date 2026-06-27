import { test, expect } from './fixtures'

const LEADERBOARD_PAGE_SIZE = 10

async function setupAuth(page) {
  await page.route('**/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'mock-user-123',
        role: 'contributor',
        github: {
          login: 'mockdeveloper',
          avatar_url: '',
          name: 'Mock Developer',
          email: 'mockdeveloper@example.com',
        },
      }),
    })
  })
  await page.route('**/stats/landing', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        active_projects: 42,
        contributors: 1337,
        grants_distributed_usd: 125000,
      }),
    })
  })
  await page.route('**/projects/recommended*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        projects: [
          {
            id: 'proj-1',
            github_full_name: 'test-owner/test-repo',
            language: 'TypeScript',
            tags: ['TypeScript', 'e2e'],
            category: 'Testing',
            stars_count: 42,
            forks_count: 7,
            open_issues_count: 3,
            open_prs_count: 1,
            ecosystem_name: 'TestEcosystem',
            ecosystem_slug: 'testecosystem',
            description: 'A mock project for testing',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
      }),
    })
  })
  await page.route('**/projects/proj-1/issues/public', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ issues: [] }),
    })
  })
}

async function setupLeaderboard(page, totalContributors = 25) {
  const pageSize = 10

  await page.route(
    (url) => url.pathname === '/leaderboard' && url.searchParams.has('limit'),
    async (route) => {
      const url = new URL(route.request().url())
      const offset = parseInt(url.searchParams.get('offset') || '0', 10)
      const limit = parseInt(url.searchParams.get('limit') || `${pageSize}`, 10)

      const remaining = Math.max(0, totalContributors - offset)
      const count = Math.min(limit, remaining)
      const data = Array.from({ length: count }, (_, i) => ({
        rank: offset + i + 1,
        rank_tier: offset + i + 1 <= 3 ? 'gold' : 'silver',
        rank_tier_name: offset + i + 1 <= 3 ? 'Gold' : 'Silver',
        username: `user${offset + i + 1}`,
        avatar: '',
        user_id: `user-${offset + i + 1}`,
        score: (totalContributors - (offset + i + 1)) * 10,
        trend: 'same' as const,
        trendValue: 0,
        contributions: totalContributors - (offset + i + 1),
        ecosystems: ['Test Ecosystem'],
      }))

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data),
      })
    }
  )
}

async function gotoLeaderboard(page) {
  await page.goto('/dashboard/leaderboard', { waitUntil: 'domcontentloaded' })
}

test.describe('Leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('patchwork_jwt', 'mock_jwt_token_123')
    })
  })

  test('renders leaderboard page with contributors table and podium', async ({ page }) => {
    await setupLeaderboard(page, 25)
    await gotoLeaderboard(page)

    await expect(page.getByRole('tab', { name: 'Contributors' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Projects' })).toBeVisible()

    await expect(page.getByText(/user\d+/).first()).toBeVisible({ timeout: 10000 })
    const tableRows = page.locator('div[class*="divide-y divide-white/10"] > div')
    await expect(tableRows).toHaveCount(LEADERBOARD_PAGE_SIZE)

    const loadMoreButton = page.locator('button', { hasText: 'Load more' })
    await expect(loadMoreButton).toBeVisible()
  })

  test('pagination load more appends rows', async ({ page }) => {
    await setupLeaderboard(page, 25)
    await gotoLeaderboard(page)

    await expect(page.getByText(/user\d+/).first()).toBeVisible({ timeout: 10000 })
    const tableRows = page.locator('div[class*="divide-y divide-white/10"] > div')
    await expect(tableRows).toHaveCount(LEADERBOARD_PAGE_SIZE)

    await page.locator('button', { hasText: 'Load more' }).click()
    await expect(tableRows).toHaveCount(LEADERBOARD_PAGE_SIZE * 2)

    await page.locator('button', { hasText: 'Load more' }).click()
    await expect(tableRows).toHaveCount(25)

    await expect(page.locator("text=You've reached the end of the leaderboard.")).toBeVisible()
  })

  test('shows end-of-list message when fewer than one page of contributors', async ({ page }) => {
    await setupLeaderboard(page, 5)
    await gotoLeaderboard(page)

    await expect(page.getByText(/user\d+/).first()).toBeVisible({ timeout: 10000 })
    const tableRows = page.locator('div[class*="divide-y divide-white/10"] > div')
    await expect(tableRows).toHaveCount(5)

    await expect(page.locator("text=You've reached the end of the leaderboard.")).toBeVisible()
  })

  test('shows empty state when no contributors', async ({ page }) => {
    await setupLeaderboard(page, 0)
    await gotoLeaderboard(page)

    await expect(page.getByText('No contributors yet', { exact: true })).toBeVisible({
      timeout: 10000,
    })
  })

  test('projects tab renders projects', async ({ page }) => {
    await setupLeaderboard(page, 25)
    await gotoLeaderboard(page)

    await expect(page.getByText(/user\d+/).first()).toBeVisible({ timeout: 10000 })
    await page.getByRole('tab', { name: 'Projects' }).click()
    await expect(page.getByText(/test.repo/i).first()).toBeVisible({ timeout: 10000 })
  })
})
