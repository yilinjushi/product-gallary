# LuxeAdmin

Product management dashboard: admin backend + public frontend. Uses Supabase (auth, database, storage) and Vite + React.

## Run locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Add env: create `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or use `.env.local`)
3. Run: `npm run dev`

## Deploy (Vercel)

1. Connect the repo to Vercel.
2. Set environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. Build command: `npm run build`; output: `dist`.
4. Admin entry: `https://your-app.vercel.app/admin`

## Supabase

See [supabase-setup.md](supabase-setup.md) for Storage bucket and `products` table schema.
