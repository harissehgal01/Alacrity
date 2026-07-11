# Alacrity Dota

Leaderboard, live Captain's Mode drafting, match history (via OpenDota Match IDs),
player profiles, and punctuality tracking for the Alacrity Dota 2 crew.
Installable as a PWA. Backend: Supabase (project `alacrity-dota`, already configured).

## Deploy (one time, ~10 minutes)

1. **GitHub** — create a new repository called `alacrity-dota` at github.com/new.
   Upload everything in this folder (or push with git). Do NOT include `node_modules` or `dist`.
2. **Vercel** — go to vercel.com, sign in with GitHub, click **Add New → Project**,
   pick the `alacrity-dota` repo. Vercel auto-detects Vite. Click **Deploy**.
3. Open the live URL Vercel gives you. On your phone: browser menu → **Add to Home Screen**.

## Local development

```
npm install
npm run dev
```

## Notes

- Supabase URL + publishable key live in `src/lib/supabase.js` (public by design).
- Captain's Mode ban/pick order is in `src/lib/draftSequence.js` — edit freely.
- Timers are advisory: overtime drains the team's reserve pool but never auto-skips a turn.
