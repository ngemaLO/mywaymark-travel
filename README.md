# Waymark

Waymark is a travel journal and trip history app built with React, Vite, TypeScript, Tailwind, and Supabase.

The app currently supports:
- travel timeline and trip logging
- country detail pages, notes, and images
- chapters and home base tracking
- share links
- reflective travel letters
- early AI trip summary support

## Tech Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui-style components
- TanStack Query
- Supabase

## Project Structure

```text
src/
  components/        Reusable UI and feature components
  contexts/          React context providers
  hooks/             Data-fetching and mutation hooks
  integrations/      Supabase client and generated types
  pages/             Route-level screens
supabase/
  functions/         Edge Functions
  migrations/        Database schema migrations
```

## Getting Started

Prerequisites:
- Node.js 18+
- npm
- a Supabase project

Install dependencies:

```sh
npm install
```

Start the development server:

```sh
npm run dev
```

Build for production:

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

## Environment Variables

Create a local env file and configure the frontend Supabase client:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

Supabase Edge Functions also rely on project secrets for server-side integrations. Current functions may require values such as:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LOVABLE_API_KEY`
- `ELEVENLABS_API_KEY`

Set those in your Supabase project or local Supabase function environment as needed.

## Database and Supabase

The project uses:
- `supabase/migrations` for schema changes
- `supabase/functions` for Edge Functions
- `src/integrations/supabase/types.ts` for generated database types

If you add or change database tables, regenerate the Supabase types so the frontend stays in sync.

## Scripts

- `npm run dev` starts the Vite dev server
- `npm run build` creates a production build
- `npm run build:dev` creates a development-mode build
- `npm run lint` runs ESLint
- `npm run preview` serves the built app locally

## Notes

- The app is client-rendered and uses React Router for navigation.
- Most authenticated app data is read directly from Supabase with React Query.
- Privileged or AI-related operations are handled in Supabase Edge Functions.
