# Alacrity Dota v4 — deploy notes

## What's new
- Google login (accounts + sessions)
- Admin model: harissehgal01@gmail.com controls matches/punctuality/roster
- Players link to their roster name on first login; edit only their own profile
- Draft ROOMS: create (code + link) / join, seat claiming (Radiant/Dire/Spectator),
  live turn control, spectators, and saved draft history
- Top navigation (moved from bottom)
- Black logo in light mode / white in dark
- Punctuality reliability dot on each leaderboard row

## IMPORTANT — one-time Google setup (≈10 min, only you can do it)
Google login won't work until you connect Google to Supabase:

1. Google Cloud Console → https://console.cloud.google.com
   - Create/select a project
   - APIs & Services → OAuth consent screen → External → fill app name + your email
   - Credentials → Create credentials → OAuth client ID → Web application
   - Authorised JavaScript origins:  https://alacrity-gray.vercel.app
   - Authorised redirect URIs:  https://emkboolambrwikodknnv.supabase.co/auth/v1/callback
   - Copy the Client ID and Client Secret

2. Supabase → your project → Authentication → Providers → Google
   - Enable, paste Client ID + Client Secret, Save

3. Supabase → Authentication → URL Configuration
   - Site URL: https://alacrity-gray.vercel.app
   - Add redirect URL: https://alacrity-gray.vercel.app

Then deploy this code (GitHub upload → Vercel auto-redeploy), open the site,
and sign in with Google. Your account is auto-flagged admin.

## Deploy
Upload everything EXCEPT src/lib/supabase.js (keep your corrected key on GitHub).
Make sure public/ and src/ folders both upload.
