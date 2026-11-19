# Backend servers

Two interchangeable API servers for the app. Pick one — they expose the **same routes, request
bodies, and error shape**, so the app only needs `EXPO_PUBLIC_API_URL` pointed at whichever you run.

| Server  | Folder            | Default port | Stack                                                                |
| ------- | ----------------- | ------------ | -------------------------------------------------------------------- |
| Express | `server/express/` | 4000         | Express 5, Mongoose, Firebase Admin, Zod, `tsx`                      |
| NestJS  | `server/nest/`    | 4001         | NestJS 12 (ESM), `@nestjs/mongoose`, Firebase Admin, class-validator |

Both use **MongoDB** for data, **Firebase Authentication** for users, and (optionally) **Redis** for
caching and rate limiting.

## How auth works

The app keeps its existing token flow (`src/lib/api/client.ts`): it stores an access + refresh
token and calls `POST /api/auth/refresh` on a 401. The servers implement that contract on top of
Firebase, so the app doesn't need the native Firebase SDK (it keeps working in Expo Go):

- `register` / `login` / `refresh` proxy to the [Firebase Auth REST API](https://firebase.google.com/docs/reference/rest/auth)
  and return `{ accessToken, refreshToken, expiresIn, uid }`. `accessToken` is a Firebase ID token.
- Protected routes verify `Authorization: Bearer <ID token>` with the Firebase Admin SDK
  (`requireAuth` middleware in Express, `FirebaseAuthGuard` in Nest) and expose the claims as the
  current user. Tokens issued by the Firebase client SDK (Google/Apple sign-in, etc.) work too.

## Routes

All routes are under `/api`, matching the Expo API routes.

| Method   | Path                   | Auth | Description                                                |
| -------- | ---------------------- | ---- | ---------------------------------------------------------- |
| `GET`    | `/api/health`          |      | `{ status: "ok" }`, or `503` if MongoDB is unreachable     |
| `POST`   | `/api/auth/register`   |      | `{ email, password }` → `201` tokens (`409 EMAIL_EXISTS`)  |
| `POST`   | `/api/auth/login`      |      | `{ email, password }` → tokens (`401` on bad credentials)  |
| `POST`   | `/api/auth/refresh`    |      | `{ refreshToken }` → tokens (`401 INVALID_REFRESH_TOKEN`)  |
| `GET`    | `/api/auth/me`         | ✓    | `{ uid, email, emailVerified, name?, picture? }`           |
| `GET`    | `/api/invitations`     | ✓    | The current user's invitations, by `eventDate`             |
| `GET`    | `/api/invitations/:id` | ✓    | One invitation (`404` if missing or owned by someone else) |
| `POST`   | `/api/invitations`     | ✓    | `{ title, eventDate, location?, message? }` → `201`        |
| `PATCH`  | `/api/invitations/:id` | ✓    | Any subset of the create fields                            |
| `DELETE` | `/api/invitations/:id` | ✓    | `204`                                                      |

Errors are always JSON: `{ "error": "message", "details"?: ... }`. `invitations` is an example
resource — copy its model/routes (Express) or module (Nest) for new collections.

## Redis

Optional — set `REDIS_URL` to enable it. Both servers use it the same way:

- **Caching.** `GET /api/invitations` is cached per user under `invitations:<uid>` for 60 seconds and
  deleted on every create, update, or delete, so a read after a write is always fresh. Use the
  `cache.getOrSet(key, ttl, load)` / `cache.del(key)` helper (Express: `src/lib/cache.ts`; Nest:
  inject `CacheService`) for other data.
- **Rate limiting.** `register`, `login`, and `refresh` allow `AUTH_RATE_LIMIT_POINTS` requests per
  IP per `AUTH_RATE_LIMIT_WINDOW_SEC` (default 10/minute), then return `429` with `Retry-After`.
  Counters are shared through Redis, so the limit holds across instances.
- **Fails open.** Without `REDIS_URL`, caching is off and limits are kept in memory per process. If
  Redis goes down at runtime, reads fall through to MongoDB, limits switch to memory, and
  `/api/health` still returns `200` with `"redis": "error"` — the API keeps serving.

Behind a proxy or load balancer (Cloud Run, nginx), set `TRUST_PROXY=1` so limits apply to the
client's IP rather than the proxy's. On Google Cloud, use Memorystore or any hosted Redis (Upstash,
Redis Cloud) for `REDIS_URL`; `rediss://` URLs enable TLS.

## Docker

Each server has a multi-stage `Dockerfile` (Node 22 Alpine, production dependencies only, runs as
the non-root `node` user, with a `HEALTHCHECK` on `/api/health`). `docker-compose.yml` runs them
together with MongoDB and the Firebase Auth emulator, using profiles:

```bash
# from the repo root
npm run docker:express    # mongo + firebase emulator + Express → http://localhost:4000
npm run docker:nest       # mongo + firebase emulator + Nest    → http://localhost:4001
npm run docker:all        # all of the above
npm run docker:logs       # follow logs
npm run docker:down       # stop (add -v to the command to also delete the Mongo volume)
npm run server:db      # MongoDB + Redis only, for running a server on the host with npm run dev
```

| Service    | Image                                 | Ports                                |
| ---------- | ------------------------------------- | ------------------------------------ |
| `mongo`    | `mongo:8`                             | `27017` (override with `MONGO_PORT`) |
| `firebase` | `invitationcardapp/firebase-emulator` | `9099` auth, `4500` emulator UI      |
| `express`  | `invitationcardapp/server-express`    | `4000`                               |
| `nest`     | `invitationcardapp/server-nest`       | `4001`                               |

Inside the stack the servers reach `mongo:27017`, `redis:6379`, and `firebase:9099` by service name; compose sets
those, overriding anything in `server/<name>/.env`, which is still read for secrets.

- **Port 27017 already in use** (e.g. a Homebrew `mongod`): `MONGO_PORT=27018 npm run docker:all`.
- **Real Firebase instead of the emulator:** create `server/.env` with `FIREBASE_AUTH_EMULATOR_HOST=`
  (empty) and your `FIREBASE_PROJECT_ID`, and put `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`,
  and `FIREBASE_WEB_API_KEY` in `server/<name>/.env`. The emulator container still starts but is
  unused.
- **Production:** build just the server image, e.g. `docker build -t my-api server/nest`, and
  provide `MONGODB_URI` (e.g. Atlas) and the Firebase variables at runtime. The emulator image is for
  development only.

## Local setup (without Docker for the server)

```bash
# 1. MongoDB + Redis (or your own installs / Atlas; set MONGODB_URI and REDIS_URL)
npm run server:db                        # from the repo root: docker compose up -d

# 2. Firebase — either the local emulator (no account needed, requires Java 11+)...
npm run server:emulators                 # Auth emulator on :9099, UI on http://localhost:4500
# ...or a real project (see "Firebase project" below).

# 3. Pick a server
cd server/express                        # or: cd server/nest
npm install
cp .env.example .env                     # for the emulator, uncomment FIREBASE_AUTH_EMULATOR_HOST
npm run dev
```

Then in the app's `.env.local`: `EXPO_PUBLIC_API_URL=http://localhost:4000` (Express) or `:4001`
(Nest). On a physical device use your computer's LAN IP; on the Android emulator use `10.0.2.2`.

### Firebase project

1. Create a project in the [Firebase console](https://console.firebase.google.com/) and enable
   **Authentication → Sign-in method → Email/Password**.
2. **Project settings → General → Web API key** → `FIREBASE_WEB_API_KEY`.
3. **Project settings → Service accounts → Generate new private key**. Either set
   `GOOGLE_APPLICATION_CREDENTIALS` to the downloaded file's path, or copy `project_id`,
   `client_email`, and `private_key` into `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and
   `FIREBASE_PRIVATE_KEY`. Never commit the key (`*service-account*.json` is git-ignored).
4. Leave `FIREBASE_AUTH_EMULATOR_HOST` unset.

On Google Cloud (Cloud Run, Functions) Application Default Credentials are picked up automatically.

## Environment variables

| Variable                         | Default                                       | Purpose                                        |
| -------------------------------- | --------------------------------------------- | ---------------------------------------------- |
| `PORT`                           | `4000` (Express) / `4001` (Nest)              | HTTP port                                      |
| `CORS_ORIGIN`                    | `http://localhost:8081`                       | Comma-separated allowed origins (web app)      |
| `MONGODB_URI`                    | `mongodb://localhost:27017/invitationcardapp` | MongoDB connection string                      |
| `REDIS_URL`                      |                                               | Optional; enables caching + shared rate limits |
| `AUTH_RATE_LIMIT_POINTS`         | `10`                                          | Auth requests per IP per window                |
| `AUTH_RATE_LIMIT_WINDOW_SEC`     | `60`                                          | Rate-limit window                              |
| `TRUST_PROXY`                    | `0`                                           | Proxy hops in front of the server              |
| `FIREBASE_PROJECT_ID`            |                                               | Firebase project id                            |
| `FIREBASE_CLIENT_EMAIL`          |                                               | Service account email                          |
| `FIREBASE_PRIVATE_KEY`           |                                               | Service account key (keep the `\n` escapes)    |
| `GOOGLE_APPLICATION_CREDENTIALS` |                                               | Alternative: path to the service account JSON  |
| `FIREBASE_WEB_API_KEY`           |                                               | Needed for register/login/refresh              |
| `FIREBASE_AUTH_EMULATOR_HOST`    |                                               | e.g. `127.0.0.1:9099` to use the Auth emulator |

## Scripts (in either server folder)

| Command             | Express                 | Nest                                            |
| ------------------- | ----------------------- | ----------------------------------------------- |
| `npm run dev`       | `tsx watch`             | `nest start --watch`                            |
| `npm run build`     | `tsc` → `dist/`         | `nest build` → `dist/`                          |
| `npm start`         | `node dist/index.js`    | `node dist/main.js`                             |
| `npm test`          | `node:test` + supertest | Vitest (SWC for decorator metadata) + supertest |
| `npm run typecheck` | `tsc --noEmit`          | `tsc --noEmit`                                  |

`npm start` loads `.env` if present; in production set real environment variables instead.
