# RSM Execution Report Tool

NUVENTA Division — Input execution report generator for RSMs.

## Features
- Upload any monthly execution CSV
- Region dropdown uses **RSM_AREA** (Col G)
- Input dropdown for product selection
- Region → DM HQ → DM Name → SO drill-down table
- One-click HTML email generation (paste directly into Outlook / Gmail)

## Local Development

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Deploy to Vercel (one-time setup)

### Option A — Vercel CLI
```bash
npm install -g vercel
vercel
# Follow prompts → auto-deploys on every git push
```

### Option B — GitHub + Vercel Dashboard
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your GitHub repo
4. Framework: **Next.js** (auto-detected)
5. Click **Deploy** — done ✅

No environment variables required.

## CSV Format Expected

| Col | Header           | Used for              |
|-----|------------------|-----------------------|
| G   | RSM_AREA         | Region dropdown       |
| J   | DM_AREA          | DM HQ column          |
| K   | DM_NAME          | DM Name column        |
| R   | EMP_NO           | SO identifier         |
| S   | EMP_NAME         | SO name               |
| X   | SGPI_TYPE        | Filter = "Input"      |
| Z   | SGPI_PRODUCTNAME | Input dropdown        |
| AA  | OPENINGQTY       | Allocated qty         |
| AC  | UTILISEDQTY      | Executed qty          |
| AD  | CLOSINGQTY       | Remaining qty         |

## Project Structure

```
rsm-tool/
├── pages/
│   ├── _app.js          # App wrapper
│   └── index.js         # Main page
├── components/
│   ├── dataUtils.js     # CSV parser, data processor, helpers
│   └── emailBuilder.js  # HTML email generator
├── styles/
│   ├── globals.css      # Global styles + CSS vars
│   └── Home.module.css  # Page styles
├── public/
│   └── favicon.ico
├── package.json
├── next.config.js
└── vercel.json
```
