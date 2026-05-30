# Chambellan Conciergerie

Luxury concierge operating system for Chambellan Conciergerie: weekly planner builder, client CRM, trip history, and branded A4 PDF export.

## Requirements

- **Node.js 20+**
- **npm 10+**

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Useful commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production server locally |
| `npm run db:migrate` | Apply Prisma migrations (production) |
| `npm run db:migrate:dev` | Create/apply migrations locally |
| `npm run db:import-sqlite` | One-time SQLite → Postgres import |
| `npm run dev:clean` | Clear `.next` cache and restart dev |

### Main routes

| Route | Description |
|-------|-------------|
| `/` | Dashboard |
| `/planner` | All planners |
| `/planner/new` | Create a new trip |
| `/planner/[id]` | Planner editor (concierge + client preview) |
| `/clients` | Client CRM |

## Environment variables

Copy `.env.example` to `.env.local` for local development:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Vercel | Public URL of the app. Used by PDF generation to render the print view. On Vercel, set this to your deployment URL. |
| `DATABASE_URL` | Yes | PostgreSQL connection string (Vercel Prisma Postgres). Required for local dev and production. |

## Data storage

All client, planner, activity, section, and staff data is stored in **PostgreSQL** via [Prisma ORM](https://www.prisma.io/).

### Setup

1. Connect **Vercel Prisma Postgres** (or any Postgres) to your project.
2. Set `DATABASE_URL` in `.env.local` (local) and Vercel Environment Variables (production).
3. Run migrations:

   ```bash
   npm run db:migrate:dev    # local development
   npm run db:migrate        # production (also runs during Vercel build)
   ```

4. Optional — import existing local SQLite data once:

   ```bash
   npm run db:import-sqlite
   ```

   Requires `data/chambellan.db` from a previous SQLite install. Skips if Postgres already has data.

### Persistence on Vercel

Data survives redeploys because it lives in hosted PostgreSQL, not the ephemeral serverless filesystem.

## Features

- **Weekly Planner** — destination, dates, hotel/villa/staff, day columns with luxury client itinerary
- **Concierge editor** — full CRUD for activities, team, travel info, internal notes
- **Client preview** — WYSIWYG luxury itinerary matching the exported PDF
- **PDF export** — one-page A4 landscape, client or concierge versions
- **CRM** — client profiles with preferences and internal notes
- **Trip history** — planners linked per client

## PDF export

PDFs are generated server-side via Puppeteer, rendering the same `PlannerLuxuryDocument` component used in client preview.

- **Local:** uses full `puppeteer` (Chromium bundled)
- **Vercel:** uses `@sparticuz/chromium` + `puppeteer-core`

The PDF API route allows up to 60 seconds (`maxDuration`).

## Deploy to Vercel

1. Push to GitHub.
2. [Import](https://vercel.com/new) the repository.
3. Set **Root Directory** to `app` (if the repo root is the parent folder).
4. **Framework Preset:** Next.js (auto-detected).
5. Add environment variables:

   ```
   DATABASE_URL=<from Vercel Prisma Postgres>
   NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
   ```

6. Deploy.

`npm run build` runs Prisma migrations and must pass — Vercel runs this automatically.

### Vercel notes

- PDF routes use the **Node.js** runtime (not Edge).
- Increase function timeout on Pro plans if PDF generation exceeds 10s on Hobby.

## Project structure

```
app/
├── prisma/            # Prisma schema and migrations
├── public/brand/      # Logo and brand assets
├── scripts/           # One-time SQLite import script
├── src/
│   ├── app/           # Next.js App Router pages & API
│   ├── components/    # React components
│   └── lib/           # Prisma client, PDF, planner utilities
├── .env.example
├── vercel.json
└── package.json
```

## Brand assets

Logo: `public/brand/chambellan-logo-vertical.jpg`

## License

Private — Chambellan Conciergerie.
