# InvitationCardApp

A cross-platform (iOS, Android, web) starter built on **Expo SDK 58** and **Expo Router**. It ships with a themed component kit, an authenticated API client, TanStack Query wiring, and server-side API routes with a multi-database SQL helper. Use it as the base for new apps.

## Tech stack

| Area          | Choice                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------- |
| Framework     | Expo SDK 58, React Native 0.88, React 19.3 (React Compiler enabled)                          |
| Navigation    | Expo Router (file-based, typed routes)                                                       |
| Data fetching | TanStack Query v5 + axios (`fetch` adapter)                                                  |
| Auth storage  | `expo-secure-store` (Keychain / Keystore); `localStorage` fallback on web                    |
| Server        | Expo Router API routes (`web.output: "server"`)                                              |
| Database      | PostgreSQL (`pg`), MySQL (`mysql2`), or SQLite (`node:sqlite`), selected by URL              |
| Backends      | Optional Express or NestJS servers in `server/` with MongoDB, Redis, and Firebase Auth       |
| Quality       | TypeScript, ESLint (`eslint-config-expo`), Prettier, Jest (`jest-expo`), Husky + lint-staged |

## Getting started

### Prerequisites

- Node.js 22.5 or newer (needed for the built-in `node:sqlite` driver; 20+ is fine if you use Postgres or MySQL)
- npm (the repo uses `package-lock.json`)
- For device testing: the iOS Simulator / Android Emulator, or a physical device

### Install and run

```bash
npm install
cp .env.example .env.local   # then set DATABASE_URL
npm start                    # or: npm run ios | npm run android | npm run web
```

From the Expo CLI you can open the app in a [development build](https://docs.expo.dev/develop/development-builds/introduction/), an emulator/simulator, [Expo Go](https://expo.dev/go), or the browser.

> Expo Go only includes the native modules it bundles. After adding a library with native code, build a development client with `npx expo run:ios` / `npx expo run:android` or `npx eas-cli@latest build --profile development`.

## Environment variables

| Variable              | Where it's read | Purpose                                                                                                                                                                |
| --------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`        | Server only     | Database connection. The URL scheme picks the driver: `postgresql://`, `mysql://`, or `sqlite:./path.db`. Defaults to `postgresql://localhost:5432/invitationcardapp`. |
| `EXPO_PUBLIC_API_URL` | Client          | Base URL for the API client. Leave unset to call the app's own API routes (`/api/...`).                                                                                |

Keep secrets in `.env.local` (git-ignored) and **never** prefix server-only values with `EXPO_PUBLIC_`; anything with that prefix is inlined into the client bundle.

## Scripts

| Command                           | Description                                                      |
| --------------------------------- | ---------------------------------------------------------------- |
| `npm start`                       | Start the Expo dev server                                        |
| `npm run ios` / `android` / `web` | Start and open on a specific platform                            |
| `npm run lint`                    | Lint with `expo lint`                                            |
| `npm run typecheck`               | Type-check with `tsc --noEmit`                                   |
| `npm test`                        | Run Jest tests (`npm run test:watch` for watch mode)             |
| `npm run format`                  | Format with Prettier (`format:check` to verify only)             |
| `npm run reset-project`           | Move the starter code to `example/` and create a blank `src/app` |

Other useful commands:

```bash
npx expo install <package>   # add dependencies (resolves SDK-compatible versions)
npx expo install --fix       # fix incompatible package versions
npx expo-doctor              # diagnose dependency and config issues
```

## Project structure

```
src/
├── app/                    # Routes (Expo Router) — every file is a screen
│   ├── _layout.tsx         # Root layout: QueryProvider → AuthProvider → ThemeProvider → tabs
│   ├── index.tsx           # Home tab
│   ├── explore.tsx         # Explore tab (component & palette showcase)
│   └── api/
│       └── health+api.ts   # GET /api/health — database health check
├── components/             # Themed UI kit (ThemedText, ThemedView, ThemedButton, ThemedCard, …)
│   └── ui/                 # Small UI primitives (Collapsible)
├── constants/
│   ├── palette.ts          # Brand color scale (light/dark) and status colors
│   └── theme.ts            # Semantic color roles, spacing, layout constants
├── hooks/                  # useTheme, useColorScheme (with .web variants)
├── lib/
│   ├── api/client.ts       # Shared axios client with auth + token refresh
│   └── auth/               # Token storage and the "unauthorized" event bus
├── providers/              # QueryProvider, AuthProvider
├── server/db.ts            # Server-only SQL helper (Postgres / MySQL / SQLite)
└── global.css              # Web-only global styles
assets/                     # Icons, splash, images
scripts/reset-project.js    # Starter reset script
test/                       # Jest stubs
```

Keep non-route code (components, hooks, utilities) outside `src/app/`. Files ending in `.web.tsx` / `.web.ts` override their native counterparts on web. Import from `src` with the `@/` alias (e.g. `@/components/themed-text`).

## Architecture

### Theming

Colors are defined in two layers:

1. **`constants/palette.ts`** — the raw brand scale (`100`–`900`) for light and dark mode, plus status colors.
2. **`constants/theme.ts`** — semantic roles (`text`, `background`, `accent`, `primaryBtnBackground`, …) mapped from the palette.

Change shades in the palette and roles in the theme. Components read the active colors with `useTheme()`. The themed components expose variants:

- `ThemedText` — `type`, `tone` (`primary | secondary | accent | success | danger`), `weight`
- `ThemedButton` — `variant` (`primary | secondary | border | text | shadow`), `tone`, `size`
- `ThemedCard` — `variant` (`filled | outlined | elevated`), `padding`

The **Explore** tab renders all variants and the full palette, so you can preview changes live.

### API client and authentication

`src/lib/api/client.ts` exports a shared axios instance (`apiClient`):

- Uses the **`fetch` adapter**, so relative URLs like `/api/...` resolve against the Expo dev server (and the configured origin in production).
- Attaches `Authorization: Bearer <accessToken>` to every request. Pass `{ skipAuth: true }` to opt out.
- On a `401`, it calls `POST /api/auth/refresh` with `{ refreshToken }` once (concurrent 401s share one refresh), saves the new tokens, and replays the request. If refreshing fails, it clears tokens and emits an _unauthorized_ event.

`AuthProvider` exposes `useAuth()`:

```tsx
const { status, isAuthenticated, signIn, signOut } = useAuth();
await signIn({ accessToken, refreshToken }); // store tokens returned by your login endpoint
```

`status` is `'loading' | 'signedIn' | 'signedOut'`. Signing out (or an unrecoverable 401) clears tokens and the query cache.

The login, register, and `/api/auth/refresh` endpoints are implemented by the backends in [`server/`](server/README.md) (Firebase Auth). Point `EXPO_PUBLIC_API_URL` at one of them and sign in with the helpers in `src/lib/auth/auth-api.ts`:

```tsx
const { signIn } = useAuth();
await signIn(await loginWithEmail({ email, password })); // or registerWithEmail(...)
```

Any other backend works too if it implements `POST { refreshToken } → 200 { accessToken, refreshToken? }`.

### Data fetching

`QueryProvider` creates the TanStack Query client with sensible mobile defaults:

- `staleTime` of 30 seconds
- Retries network and 5xx errors up to twice; never retries 4xx errors. Mutations never retry.
- Refetches stale queries when the app returns to the foreground (`AppState`)
- Pauses queries while offline and resumes on reconnect (`expo-network`)

```tsx
const { data } = useQuery({
  queryKey: ['invitations'],
  queryFn: async () => (await apiClient.get('/api/invitations')).data,
});
```

### API routes and database

Server code lives in `+api.ts` files under `src/app/` and runs on the server only. Use the `sql` tagged template from `@/server/db`:

```ts
import { sql } from '@/server/db';

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  const rows = await sql<{
    id: number;
    title: string;
  }>`SELECT id, title FROM invitations WHERE id = ${id}`;
  return Response.json(rows);
}
```

- Interpolated values are always sent as **bound parameters**, so they are safe from SQL injection and the same query runs on every driver.
- The connection is created lazily and shared across routes; only the driver for the selected database needs to be installed at runtime.
- **Never import `@/server/db` from screens or components** — database drivers don't run on devices, and credentials must stay off the client.

Check the connection with `GET /api/health` (returns `{ "status": "ok" }`, or `503` on failure).

## Backend servers (MongoDB + Firebase)

`server/` holds two interchangeable API servers — **Express** (port 4000) and **NestJS** (port 4001) — with the same routes: auth (register, login, refresh, me) backed by Firebase Authentication, an example `invitations` resource stored in MongoDB, and Redis for caching and auth rate limiting. Each is its own npm package and is ignored by the app's TypeScript, ESLint, Jest, and Metro setup.

```bash
npm run server:db           # MongoDB + Redis via Docker
npm run server:emulators    # Firebase Auth emulator (or configure a real project)
npm --prefix server/express install && npm run server:express   # or server/nest + server:nest
```

Or run a whole stack (MongoDB + Firebase Auth emulator + server) in Docker:

```bash
npm run docker:express      # or docker:nest, docker:all; stop with docker:down
```

See [`server/README.md`](server/README.md) for routes, Firebase project setup, and environment variables.

## Testing and code quality

- Tests live next to the code in `__tests__/` folders and run with `jest-expo`.
- **Pre-commit** (Husky + lint-staged): Prettier, `eslint --fix`, and related Jest tests on staged files.
- **Pre-push**: `npm run typecheck` and the full test suite.

Run `npm run lint` and `npm run typecheck` before opening a pull request.

## Building and deploying

Native projects (`ios/`, `android/`) are generated by [Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/). Don't edit them by hand; configure native behavior in `app.json` and config plugins.

Use [EAS](https://docs.expo.dev/eas/) to build, submit, and update:

```bash
npx eas-cli@latest build --platform all       # cloud builds
npx eas-cli@latest submit                     # submit to the stores
npx eas-cli@latest update                     # over-the-air JS updates
```

Because the web build uses server output, deploy it to a host that supports Expo Router API routes (for example [EAS Hosting](https://docs.expo.dev/eas/hosting/introduction/)).

## Resources

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [API routes](https://docs.expo.dev/router/web/api-routes/)
- [TanStack Query](https://tanstack.com/query/latest)

## License

[MIT](LICENSE)
