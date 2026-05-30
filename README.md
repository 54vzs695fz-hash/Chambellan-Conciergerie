# Chambellan Conciergerie

Luxury concierge operating system — weekly planner builder, client CRM, and branded PDF itineraries.

The application lives in the [`app/`](./app/) directory (Next.js 15).

## Quick start

```bash
cd app
npm install
cp .env.example .env.local   # optional locally
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Documentation

See **[app/README.md](./app/README.md)** for:

- Local development
- Environment variables
- Vercel deployment
- Data storage
- PDF export

## Stack

- **Next.js 15** — App Router, React 19
- **Prisma + PostgreSQL** — persistent data (Vercel Prisma Postgres)
- **Puppeteer** — luxury planner PDF export
- **Tailwind CSS** — admin UI styling

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Set **Root Directory** to `app`.
4. Connect **Vercel Prisma Postgres** and ensure **`DATABASE_URL`** is set.
5. Add **`NEXT_PUBLIC_APP_URL`** = your production URL (e.g. `https://your-app.vercel.app`).
6. Deploy — Prisma migrations run automatically during build.

## License

Private — Chambellan Conciergerie.
