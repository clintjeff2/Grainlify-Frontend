# Grainlify

[![CI](https://github.com/Phantomcall/Grainlify-Frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/Phantomcall/Grainlify-Frontend/actions/workflows/ci.yml)

**Grainlify** is an open-source contribution platform that connects contributors with maintainers through GitHub OAuth authentication. The platform enables developers to discover projects, track contributions, manage open-source work, and participate in ecosystem-driven initiatives.

## Features

- **GitHub OAuth Authentication** - Secure login using GitHub credentials
- **Contributor Dashboard** - Track your contributions, activity calendar, and ecosystem participation
- **Project Discovery** - Browse projects with filters for languages, ecosystems, categories, and tags
- **Maintainer Tools** - Manage projects, issues, and pull requests
- **Leaderboards & Analytics** - View live contribution rankings and real-time project/contributor activity charts with geographic insights.
- **Open Source Week Events** - Participate in community events and challenges
- **Ecosystem Explorer** - Discover projects across different blockchain and tech ecosystems
- **Profile Management** - Customize your profile, notification preferences, and payout settings
- **KYC Verification** - Verify identity for rewards and payments

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **UI:** Tailwind CSS 4, Radix UI, shadcn/ui components
- **Routing:** React Router DOM 7
- **State:** React Context API
- **Charts:** Recharts, D3
- **Authentication:** GitHub OAuth with JWT
- **Package Manager:** pnpm

## Prerequisites

- **Node.js**: v20.x or higher (LTS recommended)
- **pnpm**: Install with `npm install -g pnpm`
- **GitHub OAuth App**: Required for authentication (backend handles OAuth flow)

## Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd grainlify
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:
   - `VITE_API_BASE_URL`: Backend API URL (e.g., `http://localhost:8080` or production URL)
   - `VITE_FRONTEND_BASE_URL`: Frontend URL (optional, defaults to `http://localhost:5173`)

4. **Start development server**

   ```bash
   pnpm run dev
   ```

   The app will be available at `http://localhost:5173`

## Environment Variables

All environment variables must use the `VITE_` prefix to be exposed to the client.

| Variable                 | Required | Description                                    | Example                 |
| ------------------------ | -------- | ---------------------------------------------- | ----------------------- |
| `VITE_API_BASE_URL`      | Yes      | Backend API base URL                           | `http://localhost:8080` |
| `VITE_FRONTEND_BASE_URL` | No       | Frontend base URL (defaults to current origin) | `http://localhost:5173` |

## Authentication Flow

1. User clicks "Sign In" or "Sign Up" (both use GitHub OAuth)
2. Frontend redirects to backend: `{VITE_API_BASE_URL}/auth/github/login/start`
3. Backend redirects to GitHub OAuth authorization
4. User authorizes Grainlify on GitHub
5. GitHub redirects to backend callback endpoint
6. Backend processes OAuth, issues JWT, and redirects to: `/auth/callback?token=<jwt>`
7. Frontend stores JWT in `localStorage` as `patchwork_jwt`
8. Frontend fetches user info from `/me` endpoint
9. User is redirected to dashboard

All authenticated API requests include: `Authorization: Bearer <jwt>`

## Project Architecture

```
/src
├── app/                    # Core application setup
│   ├── components/         # Shared app components (LanguageIcon, UI library)
│   ├── contexts/           # Global contexts (Auth, Theme)
│   ├── pages/              # Top-level page components
│   └── utils/              # App utilities
├── features/               # Feature-based modules
│   ├── admin/              # Admin panel
│   ├── auth/               # Authentication pages (Sign In, Sign Up, Callback)
│   ├── blog/               # Blog articles
│   ├── dashboard/          # Main dashboard with sub-pages
│   │   ├── pages/          # Dashboard pages (Discover, Browse, Contributors, etc.)
│   │   └── components/     # Dashboard-specific components
│   ├── landing/            # Landing page
│   ├── leaderboard/        # Contribution rankings
│   ├── maintainers/        # Maintainer dashboard and tools
│   └── settings/           # User settings and preferences
└── shared/                 # Shared utilities across features
    ├── api/                # API client and endpoints
    ├── config/             # Configuration (API URLs)
    ├── contexts/           # Shared contexts
    └── types/              # Shared TypeScript types
```

## Internationalization (i18n)

The app uses [`react-intl`](https://formatjs.io/docs/react-intl/) for i18n. The
provider, message catalog, and helpers live in [`src/shared/i18n/`](./src/shared/i18n).

### How it is wired

- **Provider**: `<I18nProvider>` is mounted once at the very top of the tree —
  **above the router** — in [`src/app/App.tsx`](./src/app/App.tsx), so every route
  can translate.
- **Catalog**: [`src/shared/i18n/messages.ts`](./src/shared/i18n/messages.ts) holds
  the English (`en`) catalog, a flat map of dot-namespaced keys. `en` is the base
  locale and the single source of truth. Keys are namespaced per surface to avoid
  collisions — e.g. `landingNav.*` (landing navbar) vs `dashboardNav.*` (dashboard
  sidebar).
- **Locale-aware formatting**: number/currency formatting reads the active locale
  from the provider — see [`useLandingStats`](./src/shared/hooks/useLandingStats.ts),
  which feeds `intl.locale` into `Intl.NumberFormat`.

### Usage

Two interchangeable conventions:

```tsx
// 1. useTranslation() — type-checked `t(id)`, ideal for string values / arrays.
import { useTranslation } from '../shared/i18n'

const { t } = useTranslation()
const label = t('dashboardNav.discover') // 'Discover'
```

```tsx
// 2. <FormattedMessage> — ideal for inline JSX.
import { FormattedMessage } from 'react-intl'
;<FormattedMessage id="landingNav.features" />
```

`t(id)` only accepts keys that exist in the catalog (`MessageId`), so a typo is a
**compile-time error** rather than a silent missing translation.

### Adding a key (and English fallback)

1. Add `'namespace.key': 'English text'` to the `en` catalog in
   [`messages.ts`](./src/shared/i18n/messages.ts). The `MessageId` type updates
   automatically.
2. Use it via `t('namespace.key')` or `<FormattedMessage id="namespace.key" />`.
3. **Fallback**: future locales are layered on top of `en` by `resolveMessages()`
   (`{ ...en, ...localeCatalog }`), so any key missing from another locale
   transparently falls back to its English value. `en` must therefore stay
   complete. Non-fatal `MISSING_TRANSLATION` errors are swallowed by the provider's
   error policy ([`errors.ts`](./src/shared/i18n/errors.ts)).

### Security: interpolation is text-only

Interpolated values are rendered by react-intl as **React text nodes**, never as
HTML. The `t()` helper's `values` are typed to primitives only, and the app does
**not** use rich-text/HTML message interpolation or `dangerouslySetInnerHTML` for
translations. Untrusted input passed as a placeholder can therefore only ever
become inert text. This is verified by an anti-injection test in
[`i18n.test.tsx`](./src/shared/i18n/i18n.test.tsx).

## Available Scripts

| Command                     | Description                          |
| --------------------------- | ------------------------------------ |
| `pnpm run dev`              | Start development server             |
| `pnpm run build`            | Build for production                 |
| `pnpm run generate-favicon` | Generate favicon from logo           |
| `pnpm run test`             | Run unit tests once                  |
| `pnpm run test:watch`       | Run tests in watch mode              |
| `pnpm run test:coverage`    | Generate coverage report             |
| `pnpm run test:e2e`         | Run end-to-end tests with Playwright |
| `pnpm run lint`             | Lint code with ESLint                |
| `pnpm run lint:fix`         | Fix linting issues automatically     |
| `pnpm run format`           | Format code with Prettier            |
| `pnpm run typecheck`        | Type-check without emitting files    |

## Testing

The project uses **Vitest** for unit testing with a focus on high code coverage and security verification.

### Running Tests

```bash
# Run all tests once
pnpm run test

# Run tests in watch mode (during development)
pnpm run test:watch

# Generate coverage report
pnpm run test:coverage
```

### Test Coverage

The project enforces a coverage threshold (configured in `vitest.config.ts` to match the current codebase baseline) for:
- Lines (79%)
- Functions (69%)
- Branches (58%)
- Statements (78%)

These thresholds are configured in `vitest.config.ts` and are enforced in CI via the `test:coverage` step — the build fails automatically when any threshold is breached.

Coverage is measured only for source files actually exercised by the test suite (files not imported by any test are excluded automatically). Additionally excluded:
- `src/app/components/ui/` — vendored shadcn/ui components
- `src/imports/` — Figma-generated files
- Test files, type declarations, and the app entry point

| Metric | Threshold | Baseline |
|--------|-----------|---------|
| Lines | 79% | 79.94% |
| Functions | 69% | 69.96% |
| Branches | 58% | 58.49% |
| Statements | 78% | 78.03% |

Coverage reports are generated in the `coverage/` directory. Open `coverage/index.html` in a browser to view detailed coverage metrics.

### API Client Tests

The API client (`src/shared/api/client.ts`) has comprehensive test coverage including:

- **Authentication**: Token injection, header handling
- **Content-Type**: JSON vs FormData, CORS preflight optimization
- **Error Handling**: HTTP errors, network failures, status codes
- **Security**: Token leak prevention, console output verification
- **Edge Cases**: Empty bodies, various HTTP methods, response parsing

See [TEST_IMPLEMENTATION.md](./TEST_IMPLEMENTATION.md) for detailed test documentation.

### Writing Tests

Tests are colocated with source files using the `.test.ts` or `.test.tsx` suffix:

```
src/
├── shared/
│   └── api/
│       ├── client.ts
│       └── client.test.ts    # Tests for client.ts
```

Example test structure:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  })

  it('should do something specific', () => {
    // Arrange
    // Act
    // Assert
    expect(result).toBe(expected)
  })
})
```

### Security Testing

All tests that handle authentication tokens include security assertions to ensure:

- Tokens never appear in error messages
- Tokens never appear in console logs
- Tokens are not exposed in API responses
- Token handling follows best practices

## API Integration

The frontend communicates with the Patchwork backend API. All API configuration is centralized in `src/shared/config/api.ts` and uses environment variables.

See [API_INTEGRATION.md](./API_INTEGRATION.md) for detailed API documentation.

## E2E Testing

Playwright end-to-end tests are located in `e2e/`. Tests use `page.route()` to mock backend API responses for deterministic runs without a live backend.

### Running tests

To run all E2E tests across all configured engines (Chromium, Firefox, WebKit):
```bash
pnpm run test:e2e
```

To run E2E tests on a single browser locally, specify the `--project` flag:
- **Chromium:** `pnpm run test:e2e --project=chromium`
- **Firefox:** `pnpm run test:e2e --project=firefox`
- **WebKit:** `pnpm run test:e2e --project=webkit`

### CI workflow

Pull requests run the Playwright suite in
`.github/workflows/e2e.yml` across the same Chromium, Firefox, and WebKit
projects configured in `playwright.config.ts`. The workflow caches Playwright
browser binaries by `@playwright/test` version and uploads the HTML report plus
trace output as short-retention artifacts when a browser job fails.

### Test structure

| File                        | What it covers                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| `auth.spec.ts`              | Sign-in page, OAuth callback redirect, access-denied error                                      |
| `routing.spec.ts`           | Landing page render, unauthenticated redirect, 404 page                                         |
| `leaderboard.spec.ts`       | Contributor table + podium render, load-more pagination, end-of-list, empty state, projects tab |
| `browse-pagination.spec.ts` | Project grid render, load-more pagination, end-of-list, empty state, showing counter            |
| `search.spec.ts`            | Search input, dynamic results, empty results, clear button, suggestion pills                    |

### Fixtures

Custom test fixtures in `e2e/fixtures.ts` provide:

- **`setupMockAuth`** — mocks `/me`, `/stats/landing`, `/projects/recommended`, and issue endpoints
- **`setupMockBrowse`** — mocks `/ecosystems` and `/projects` (paginated list) for the browse page
- **`setupMockLeaderboard`** — mocks `/leaderboard` (paginated array) for the leaderboard page

All fixtures use synthetic data and fake tokens only. No real credentials are ever used.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) to get started and learn about our project's folder structure, feature-sliced architecture, coding conventions, styling guidelines, and API/routing setups.

Please ensure your changes:

- Follow the existing code style and architecture
- Include appropriate TypeScript types
- Maintain the glassmorphism design language
- Support both light and dark themes
- Are responsive across device sizes

### Dependency Management

This project uses [Dependabot](https://docs.github.com/en/code-security/dependabot) to automate dependency updates. Configuration lives in [`.github/dependabot.yml`](./.github/dependabot.yml).

**Update Schedule:**

- PRs are opened **every Monday at 09:00 UTC**
- **npm** (pnpm) packages from the root `package.json`
- **GitHub Actions** from `.github/workflows/` (activates when workflows are added)

**Grouping Strategy:**

- Related packages (Radix UI, MUI/Emotion, testing tools, linting, React core, build tooling) are grouped into single PRs
- All patch-level updates across unrelated packages are batched together
- Major version bumps always arrive as individual PRs for careful review

**Reviewing a Dependabot PR:**

1. Check the PR description for release notes and changelog links
2. Verify CI passes (lint, typecheck, tests, bundle size)
3. Merge if all checks are green and the changelog shows no breaking changes

**Pinned Dependencies:**

- `vite` is pinned to 6.3.x via `pnpm.overrides` — Dependabot will not propose upgrades beyond this range
- `@types/react` and `@types/react-dom` are pinned to v18 via `pnpm.overrides` — Dependabot will not propose v19+

## Security Notes

- **JWT Storage**: Tokens are stored in `localStorage` under the key `patchwork_jwt`
- **XSS Risk**: localStorage is vulnerable to XSS attacks; consider httpOnly cookies for production
- **OAuth Flow**: Backend handles all OAuth secrets; frontend only receives the final JWT
- **Admin Bootstrap**: `ADMIN_BOOTSTRAP_TOKEN` is a backend secret, never exposed to frontend

## License

See [LICENSE](./LICENSE) file for details.

## Bundle Size and Analysis

To ensure that the application bundle size does not grow uncontrollably, we enforce a strict bundle budget in our CI/CD pipeline and provide tools to analyze package sizes.

### Bundle Budget

We monitor the size of the compiled **main chunk** (`dist/assets/index-*.js`). If the size exceeds the defined budget, the build pipeline will fail.

- **Baseline Main Chunk Size**: `1,732.13 KB` (approx. `1.77 MB` raw, `464.52 KB` gzipped)
- **Main Chunk Size Budget**: `1,800 KB`

### Vendor code splitting

`react-intl` (added for [i18n](#internationalization-i18n)) and its `@formatjs` /
`intl-messageformat` dependencies are split into a dedicated `i18n-vendor-*.js`
chunk via `manualChunks` in [`vite.config.ts`](./vite.config.ts). `react-intl` is
a stable dependency that changes far less often than feature code, so isolating it
keeps the main `index-*.js` chunk lean and improves long-term caching.

> **Note on what this does and does not do:** code splitting reorganizes the
> output into separate chunks — it does **not** reduce the total bytes the browser
> downloads on first load (the provider is mounted at the app root). Its benefit is
> better caching and keeping the _measured_ main chunk (`index-*.js`) within budget.
> After adding i18n the main chunk is `~1,738 KB` (within the `1,800 KB` budget),
> with `react-intl` (`~69 KB`) living in the `i18n-vendor` chunk.

### Route-level code splitting

Dashboard, leaderboard, blog, settings, admin, and route-wrapper screens are
lazy-loaded with `React.lazy` behind a single `Suspense` boundary in
[`src/app/App.tsx`](./src/app/App.tsx). Landing and authentication routes stay
eager so first paint remains fast for unauthenticated visitors, while protected
dashboard code loads only after the auth guard allows the route to render.

### Running Local Analysis

You can generate a visual bundle analysis report to see what dependencies are consuming the most space:

1. Run the analyze script:
   ```bash
   npm run analyze
   ```
2. Open the generated report located at `dist/stats.html` in your browser. This file is automatically gitignored and will not be committed to the repository.

### Running Size Checks Locally

To manually check if the compiled bundle is within the size budget:

```bash
npm run test:bundle-size
```

## Documentation

- [Contributing Guide](./CONTRIBUTING.md) - Development setup, feature-sliced layout, styling guidelines, testing, and PR checklists.
- [API Integration Guide](./API_INTEGRATION.md) - Backend API integration details
- [Attributions](./ATTRIBUTIONS.md) - Third-party assets and licenses

## Support

For issues, questions, or contributions, please open an issue on GitHub.
