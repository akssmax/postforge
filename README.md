# Postforge

Design branded social posts and slide decks from a focused canvas. Built with Next.js, HeroUI, Framer Motion, and Lucide.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — production build
- `npm start` — serve the production build

## Visual assets (Vercel Blob)

The illustration/3D library (`/visuals/**`, ~115 MB) is **not** committed or
bundled in the deployment — it is served from Vercel Blob. In production the
asset base URL defaults to the `postforge-visuals` store; override it with
`NEXT_PUBLIC_ASSET_BASE_URL`. Local dev reads from `public/visuals`.

- `npm run assets:download` — fill `public/visuals` from Blob (fresh clones)
- `npm run assets:upload` — upload new/changed files to Blob (incremental)

Both require `BLOB_READ_WRITE_TOKEN` (from `vercel env pull`). After running
`fetch:storyset` / `deploy:storyset`, run `npm run assets:upload`.

## AI provider setup

Create `.env.local` with an OpenRouter key to enable the design assistant:

```bash
OPENROUTER_API_KEY=your_key_here
# Optional; defaults to openai/gpt-4o-mini
OPENROUTER_MODEL=openai/gpt-4o-mini
```

OpenRouter is preferred when configured. Existing `MISTRAL_API_KEY` and
`MISTRAL_MODEL` settings remain supported as a fallback.

## Cloud sync (optional)

Canvas designs (`/canvas`) always save on the device. With a database and
sign-in configured they also sync to Postgres, open on other devices, and can
be shared by link (view, comment or edit) with saved versions.

```bash
# Neon connection string (any other Postgres URL also works, over TCP)
DATABASE_URL=postgres://user:pass@ep-example.neon.tech/postforge?sslmode=require
# Auth.js: `npx auth secret` generates one
AUTH_SECRET=...
# One or more sign-in providers
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
# Local development only: passwordless sign-in by email (ignored in production)
AUTH_DEV_LOGIN=1
```

Create the tables with `npm run db:migrate`. `TEST_DATABASE_URL=… npm run test:db`
runs the store's integration tests against a throwaway database (its tables are
dropped). `e2e/canvas-cloud.spec.ts` runs when the server has cloud sync and
`AUTH_DEV_LOGIN=1`.

## Routes

- `/` — product landing
- `/tool` — design tool (social posts + slides)
- `/canvas` — multi-artboard canvas designs; `/canvas/[id]` is the editor
