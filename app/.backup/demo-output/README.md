# Monaco GP Demo — Layout & PDF Test Output

Temporary demo data for **Trip 4** (Scott Gilbert · Monaco GP).

## Generated PDFs

- `scott-gilbert-client.pdf` — Client export
- `scott-gilbert-concierge.pdf` — Concierge export (includes arrangements + team)

## Live preview

Open [http://localhost:3000/planner/4](http://localhost:3000/planner/4) and switch to **Client preview** to evaluate layout.

## Restore original data

Demo content is **not permanent**. To revert trip 4 to its pre-demo state:

```bash
cd app
node scripts/monaco-demo.mjs restore
```

Backup snapshot: `.backup/trip-4-pre-demo.json`

## Re-populate demo (if needed)

```bash
node scripts/monaco-demo.mjs populate
```
