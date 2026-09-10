# Postforge

Design branded social posts and slide decks from a focused canvas. Built with Next.js, HeroUI, Framer Motion, and Lucide.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — production build
- `npm start` — serve the production build

## AI provider setup

Create `.env.local` with an OpenRouter key to enable the design assistant:

```bash
OPENROUTER_API_KEY=your_key_here
# Optional; defaults to openai/gpt-4o-mini
OPENROUTER_MODEL=openai/gpt-4o-mini
```

OpenRouter is preferred when configured. Existing `MISTRAL_API_KEY` and
`MISTRAL_MODEL` settings remain supported as a fallback.

## Routes

- `/` — product landing
- `/tool` — design tool (social posts + slides)
