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
| `npm run lint` | ESLint |
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
| `DATABASE_URL` | Vercel production | Postgres connection string (Vercel Postgres, Neon, etc.). When set, all client and planner data is stored in Postgres. When unset, local SQLite is used. |

## Data storage

### Local development (default)

When `DATABASE_URL` is **not** set, the app uses SQLite:

```
data/chambellan.db
```

The database is created automatically on first run. Back up the `data/` folder to preserve clients and planners.

### Production on Vercel

Vercel serverless functions use **ephemeral filesystems** — local SQLite in `/tmp` is wiped on every deploy and cold start. **Clients and planners disappear after redeploy** unless you use a hosted database.

**Set `DATABASE_URL`** to a Postgres connection string:

1. **Vercel Postgres** — In your Vercel project: Storage → Create Database → Postgres. Vercel adds `POSTGRES_URL` / `DATABASE_URL` automatically.
2. **Neon** — Create a free project at [neon.tech](https://neon.tech), copy the connection string, and add it as `DATABASE_URL` in Vercel Environment Variables.

The schema is created automatically on first request. No manual migration step is required.

### Previous note (SQLite-only)

~~On Vercel, SQLite runs in `/tmp` (ephemeral). Data does **not** persist across deployments or cold starts.~~

Use Postgres in production. SQLite remains for local development only.

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
5. Add environment variable:

   ```
   NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
   ```

6. Deploy.

`npm run build` must pass — Vercel runs this automatically.

### Vercel notes

- Native dependencies (`better-sqlite3`) are supported on the Node.js runtime.
- PDF routes use the **Node.js** runtime (not Edge).
- Increase function timeout on Pro plans if PDF generation exceeds 10s on Hobby.

## Project structure

```
app/
├── data/              # SQLite database (local)
├── public/brand/      # Logo and brand assets
├── src/
│   ├── app/           # Next.js App Router pages & API
│   ├── components/    # React components
│   └── lib/           # Database, PDF, planner utilities
├── .env.example
├── vercel.json
└── package.json
```

## Brand assets

Logo: `public/brand/chambellan-logo-vertical.jpg`

## License

Private — Chambellan Conciergerie.
