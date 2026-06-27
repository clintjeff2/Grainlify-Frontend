# Contributing to Grainlify

Thank you for your interest in contributing to **Grainlify**! This document provides instructions and guidelines to help you set up your development environment, understand our project architecture, and follow our coding conventions.

---

## Table of Contents

1. [Project Setup](#project-setup)
2. [Folder Structure & Feature-Sliced Layout](#folder-structure--feature-sliced-layout)
3. [Coding Conventions](#coding-conventions)
4. [Styling & Design System (Glassmorphism)](#styling--design-system-glassmorphism)
5. [Routing Setup](#routing-setup)
6. [API Client Conventions](#api-client-conventions)
7. [Testing Setup](#testing-setup)
8. [Git Hooks](#git-hooks)
9. [Available Scripts](#available-scripts)
10. [Pull Request Checklist](#pull-request-checklist)

---

## Project Setup

Before contributing, make sure your machine meets the following prerequisites:

- **Node.js**: `v20.x` or higher (LTS recommended)
- **pnpm**: installed globally (`npm install -g pnpm`)

### Setup Steps

1. Fork and clone the repository.
2. Run `pnpm install` in the project root to install all dependencies.
3. Copy the environment variables:
   ```bash
   cp .env.example .env
   ```
4. Start the local development server:
   ```bash
   pnpm run dev
   ```

---

## Folder Structure & Feature-Sliced Layout

Grainlify uses a modular, feature-sliced layout in the `src/` directory to keep features decoupled, isolated, and easy to maintain.

```
src/
├── app/                    # Core application layer
│   ├── components/         # App-wide global layout components
│   ├── contexts/           # App-wide global contexts (Auth, Theme)
│   ├── pages/              # Top-level entry page components
│   └── utils/              # Application bootstrapping utility functions
├── features/               # Feature-sliced modules
│   ├── admin/              # Admin-only dashboards and tools
│   ├── auth/               # GitHub OAuth login/callback modules
│   ├── blog/               # Blog posts & article lists
│   ├── dashboard/          # Contributor dashboard and sub-pages
│   ├── landing/            # Public-facing landing pages
│   ├── leaderboard/        # Contribution leaderboard lists
│   ├── maintainers/        # Maintainer dashboard, issue and PR management
│   └── settings/           # Profile preferences and billing settings
└── shared/                 # Reusable helpers and generic utilities
    ├── api/                # API client helper and centralized endpoint calls
    ├── components/         # Generic UI components (e.g., Modals, Guards, Toasts)
    ├── config/             # Config files, constants, and API base URL configurations
    ├── contexts/           # Contexts shared across multiple features
    ├── hooks/              # Shared Custom React Hooks (e.g., i18n, window dimensions)
    ├── i18n/               # Internationalization catalogs and translation helpers
    ├── styles/             # Global utility styles (e.g., custom scrollbars)
    └── utils/              # Common parsing/utility functions (e.g., date formats)
```

### Feature Architecture (FSD Lite)

Each subfolder in `src/features/` represents a self-contained feature. A standard feature folder consists of:

- `components/`: UI components exclusive to this feature.
- `data/`: Mock data or local constant values used within the feature.
- `pages/`: Target pages rendered in route outlets.
- `types/`: Custom TypeScript interfaces.
- `index.ts`: The feature's public API (barrel export).

#### Import Barrel Pattern

To keep features isolated:

- **Rule**: You should never import directly from nested folders inside another feature.
- **Wrong**: `import { ApplicationCard } from '../../features/maintainers/components/issues/ApplicationCard';`
- **Right**: Ensure that any component, hook, or type intended to be used outside the feature is exported from `src/features/<feature-name>/index.ts`, and import it directly:
  `import { MaintainersPageRoute } from '@/features/maintainers';`

### Architecture Boundaries

Grainlify uses three intentional layers in `src/` so that ownership stays clear and duplicate directories do not reappear.

- **`src/app/`**: App shell and composition layer. This is where top-level app structure, routes, global layout, bootstrapping, and page-level orchestration live. The app layer may compose shared primitives and feature modules, but it should not own reusable business logic that should be shared.
- **`src/features/*`**: Feature-specific modules. Each feature owns its own pages, components, data, types, and public exports for that domain. Feature code may use shared infrastructure, but it should stay focused on one capability and not re-create app-wide concerns.
- **`src/shared/`**: Shared infrastructure layer. This is the home for reusable contexts, UI primitives, API helpers, hooks, i18n, config, styles, and utilities. If something is used by more than one feature or by the app shell itself, it belongs here.

#### Import Direction

Keep imports one-way so the layers remain easy to reason about:

- **`app` → `shared` and `features`**: The app layer may compose shared infrastructure and feature modules.
- **`features` → `shared`**: Features may consume shared primitives and helpers, but they must not import from `src/app/`.
- **`shared` → no feature/app dependency**: Shared code should stay generic and must not depend on feature-specific modules or app composition code.

#### Placement Rules

- **Contexts and UI primitives belong in `src/shared/`**. That means auth/session contexts, theme providers, common buttons, form controls, guards, and other reusable interface primitives should live under `src/shared/contexts/` or `src/shared/components/` rather than being recreated in `src/app/` or inside a feature.
- **Authentication and token handling stay in shared infrastructure**. Keep auth/token logic in `src/shared/contexts/` and `src/shared/api/` so secrets, refresh flows, and token storage remain centralized and secure.
- **When in doubt, promote to shared** if the code is reused across features or the app shell; keep only feature-specific behavior in the feature folder.

```text
src/app/            # app shell, routes, global composition
  └── imports shared + features

src/features/*/     # feature-specific business logic and UI
  └── imports shared

src/shared/         # reusable contexts, UI primitives, API, hooks, utilities
  └── imported by app and features
```

This guidance complements the duplicate-cleanup work described in [LEGACY_CLEANUP.md](LEGACY_CLEANUP.md) and [DOCUMENTATION_REFRESH_SUMMARY.md](DOCUMENTATION_REFRESH_SUMMARY.md), which already document the earlier `app/` vs `shared/` duplication cleanup.

---

## Coding Conventions

- **Type Safety**: Write clean, fully typed TypeScript code. Avoid using `any`. Write explicit interfaces and types for API request payloads and responses.
- **Component Isolation**: If a component is specific to one feature, place it inside that feature's `components/` subfolder. If it is reused across 2+ top-level features, promote it to `src/shared/components/`.
- **Internationalization (i18n)**: All user-facing text strings must support localization. Do not hardcode strings in JSX; instead, add them to `src/shared/i18n/messages.ts` and translate using:
  - `useTranslation()` hook (returns `t('key')` for static strings and arrays).
  - `<FormattedMessage id="key" />` component for inline JSX.

---

## Styling & Design System (Glassmorphism)

Grainlify implements a premium **Glassmorphism Design** featuring frosted overlays, warm neutral tones, and smooth micro-animations.

- **Variables**: Color tokens, layout borders, and themes are defined in [src/styles/theme.css](file:///c:/Trabajos%20Progra/GRANDFOX/Grainlify-Frontend/src/styles/theme.css).
- **Core Theme Colors**:
  - **Light mode**: Warm neutral background (`#e8dfd0` base), beige cards with white transparency overlays, gold accents (`#c9983a`).
  - **Dark mode**: Charcoal/dark brown background (`#1a1512`), semi-transparent overlays, adjusted gold/yellow contrast highlights.
- **Utility Classes**: Tailwind CSS v4 classes are used for layout and margins. Do not write ad-hoc style utilities or inline CSS rules.
- **Transitions**: Use smooth transition utility classes (e.g. `transition-all duration-300`) on interactive states like hover, active, or toggle switches.

---

## Routing Setup

Routing is centralized in [src/app/App.tsx](file:///c:/Trabajos%20Progra/GRANDFOX/Grainlify-Frontend/src/app/App.tsx) using **React Router DOM v7**.

- **Structure**: Nested paths are grouped under `/dashboard` using `<DashboardLayout />` as the parent wrapper.
- **Route Guards**:
  - `ProtectedRoute` / `AuthGuard`: Checks if the user is signed in. Redirects to `/signin` while keeping a `returnTo` state if unauthenticated.
  - `RoleGuard`: Restricts routes to specific roles (e.g. `allow={['maintainer', 'admin']}` or `allow={['admin']}`).
- **Scroll Position**: The `<ScrollToTop />` helper is mounted inside the router to automatically reset scroll coordinates on navigation.
- **Keyboard Access**: A skip-link target is positioned at the top of the body to allow users to skip to the main content (`#main`).

---

## API Client Conventions

All backend API requests are centralized and handled by the client helper in [src/shared/api/client.ts](file:///c:/Trabajos%20Progra/GRANDFOX/Grainlify-Frontend/src/shared/api/client.ts).

### Centralized Request helper

- `apiRequest<T>(endpoint, options)` is the core helper.
- Exposes common methods like `getCurrentUser()`, `getLeaderboard()`, `getPublicProjects()`, and `updateProfile()`.

### Conventions & Best Practices

1. **Authentication Headers**: Set `requiresAuth: true` in your `ApiRequestOptions` for paths requiring JWT credentials. The helper will fetch `patchwork_jwt` from `localStorage` and inject the `Authorization: Bearer <jwt>` header.
2. **CORS Optimization**: The client avoids sending redundant `Content-Type: application/json` headers on simple `GET` or `HEAD` requests when no body is provided, minimizing CORS preflight complexity.
3. **Token Management & Error Boundary**:
   - If an API call fails with status `401 Unauthorized`, the client automatically removes the token from `localStorage` via `removeAuthToken()` and triggers a `patchwork-auth-token` event to alert active contexts.
   - 403 Forbidden responses automatically parse detailed server error feedback and throw descriptive, user-friendly errors.

---

## Testing Setup

Grainlify requires a comprehensive test suite to prevent regressions and enforce security baselines.

### Unit & Integration Testing (Vitest)

Unit tests are written using **Vitest** and **React Testing Library**.

- **Location**: Test files must be colocated with the code under test, using the `.test.ts` or `.test.tsx` extensions.
- **Code Coverage**: The codebase maintains a strict **95% coverage threshold** across Lines, Functions, Branches, and Statements.
- **Security Assertions**: When testing authentication and tokens, assert that no raw tokens leak into stdout, console logs, or throw/catch error strings.

### End-to-End Testing (Playwright)

E2E tests verify user workflows in `e2e/`.

- **No Live Backend Dependencies**: Playwright runs utilize mocked API interceptors (`page.route()`) to mock backend responses.
- **Fixtures**: Centralized mock states are defined in `e2e/fixtures.ts`, providing:
  - `setupMockAuth`: Mocks profile details, login, and dashboard stats.
  - `setupMockBrowse`: Mocks ecosystem arrays and project directories.
  - `setupMockLeaderboard`: Mocks leaderboard statistics.

---

## Git Hooks

Grainlify uses [Husky](https://typicode.github.io/husky/) to enforce code quality locally before changes reach CI.

### Hooks

| Hook         | Trigger        | Action                                                               |
| :----------- | :------------- | :------------------------------------------------------------------- |
| `pre-commit` | `git commit`   | Runs `lint-staged` — formats and ESLint-fixes all staged `*.ts`/`*.tsx` files via Prettier and ESLint. |
| `pre-push`   | `git push`     | Runs `npm run typecheck` — verifies TypeScript compiles with zero errors. |

### How it works

- **`lint-staged`** only processes files staged for the commit, so unrelated files are never touched.
- **Prettier** reformats staged files in-place; **ESLint** auto-fixes fixable rule violations.
- **TypeScript** type-checking runs on push so type errors cannot reach the remote branch.

### Setup

Hooks are installed automatically when you run `pnpm install` (via the `prepare` script). No manual steps are needed after the initial install.

### Bypassing hooks (emergencies only)

```bash
git commit --no-verify   # skip pre-commit
git push --no-verify     # skip pre-push
```

> ⚠️ Use `--no-verify` sparingly. Bypassed commits must be cleaned up before merge.

---

## Available Scripts

Manage your dev work using the following scripts in `package.json`:

| Command                     | Action                                                                      |
| :-------------------------- | :-------------------------------------------------------------------------- |
| `pnpm run dev`              | Starts the local dev server at `http://localhost:5173`.                     |
| `pnpm run build`            | Builds a production-ready bundle inside the `dist/` folder.                 |
| `pnpm run lint`             | Analyzes code for linting issues with ESLint.                               |
| `pnpm run lint:fix`         | Fixes autofixable lint issues.                                              |
| `pnpm run format`           | Standardizes codebase files via Prettier.                                   |
| `pnpm run format:check`     | Checks code formatting without modifying files.                             |
| `pnpm run typecheck`        | Validates TypeScript compilation without outputting files.                  |
| `pnpm run test`             | Executes unit and integration tests once.                                   |
| `pnpm run test:watch`       | Starts Vitest in interactive watch mode.                                    |
| `pnpm run test:coverage`    | Runs unit tests and outputs a coverage report in `/coverage`.               |
| `pnpm run test:e2e`         | Runs Playwright E2E tests.                                                  |
| `pnpm run analyze`          | Builds the project and launches a bundle size visualization report.         |
| `pnpm run test:bundle-size` | Validates the compiled JavaScript main chunk size against the budget check. |

---

## Pull Request Checklist

Before submitting a PR, make sure your branch adheres to these criteria:

- [ ] **TypeScript Compiles**: Running `pnpm run typecheck` returns zero errors.
- [ ] **Linter & Formatting Pass**: No issues are reported by `pnpm run lint` and `pnpm run format:check`.
- [ ] **Tests Pass**: `pnpm run test` executes successfully.
- [ ] **Coverage Maintained**: Unit test coverage remains above the **95% threshold**.
- [ ] **Accessibility (a11y)**:
  - Elements use semantic HTML.
  - Interactivity supports tab key navigation.
  - Keyboard users receive clear focus rings (as configured by CSS focus-visible outlines in `theme.css`).
  - Interactive layouts support screen-reader-friendly labels and aria-attributes where necessary.
- [ ] **Security**: No real credentials, API tokens, or keys are committed to codebase files, mock datasets, or documentation guides.
- [ ] **Responsive & Cross-Theme Design**: Verify that UI elements display correctly in both light/dark modes and are responsive from mobile screens up to desktop layouts.
