# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend only (port 5173)
npm run dev

# Frontend + Sheets sync server (ports 5173 + 3001) — required for Google Sheets sync
npm run dev:full

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Production build
npm run build
```

The `server/` directory has its own `node_modules`. Install separately when first setting up:
```bash
cd server && npm install
```

## Architecture

**Pure client-side React 19 + TypeScript + Vite app.** No backend is required for the core app — all data lives in localStorage. The only server component (`server/index.js`) is an optional Express server for Google Sheets sync.

### Routing & Layout

`App.tsx` sets up React Router v6. All routes are nested under `DashboardLayout` (sidebar + `<Outlet>`):

- `/lessons` — import call transcripts, get AI feedback, tag lessons
- `/playbook` — editable markdown playbook; AI can only ADD/EDIT rules, never remove
- `/script` — script editor with AI improvement suggestions
- `/coach` — chat with AI coach (playbook injected as system context)
- `/offer` — sales offer builder
- `/testing` — script version A/B testing, call tally, funnel analytics

### State & Persistence

No Redux or Context. Each page manages its own state with hooks + localStorage.

- **`src/lib/storage.ts`** — all `loadJSON`/`saveJSON`/`loadString`/`saveString` helpers. Storage keys are prefixed `ccc_`. Key: `ccc_test_scripts` holds all script version + call data.
- **`src/hooks/useTestScripts.ts`** — CRUD for `TestScript[]`, persists on every mutation.
- **`src/hooks/useTallyFlow.ts`** — state machine (12 stages) for recording a call outcome step-by-step.

### Script Testing Feature (`src/components/scriptTesting/`)

The most complex feature. Data flows:

```
ScriptTestingPage → useTestScripts (state) → VersionDetail / ComparisonView
VersionDetail → TallyFlow (record calls) → FunnelAnalytics (aggregate stats)
                → CalendarHeatmap (day selection) → filters script for FunnelAnalytics
                → DetailedAnalyticsModal (full funnel tree breakdown)
                → Sync to Sheets button → /api/sync → server/index.js
```

**Key types** (all in `src/types/scriptTesting.ts`):
- `TestScript` — a script version with `calls: CallRecord[]` and `callbacks: CallbackRecord[]`
- `CallRecord` — `{ id, timestamp, path: string[], outcome: FunnelOutcome, notes? }`
- `FunnelOutcome` — 14 terminal outcomes split between direct-to-owner (`appointment_booked`, `owner_opening_fail`, `explainer_fail`, `close_fail`) and via-gatekeeper (`gk_*` variants)
- `BOOKED_OUTCOMES`, `REACHED_OWNER_OUTCOMES`, `CALLBACK_ELIGIBLE_OUTCOMES` — exported arrays used across analytics components

**`computeAnalytics(script)`** in `FunnelAnalytics.tsx` is the shared analytics computation used by both `FunnelAnalytics` and `CalendarHeatmap`'s day detail. Pass a partial `{ calls, callbacks }` cast as `TestScript` to compute stats for a subset.

### AI Integration

`src/lib/aiService.ts` calls `/api/anthropic/v1/messages` (proxied by Vite to `api.anthropic.com`). All AI calls use `claude-sonnet-4-6`. API key is `VITE_ANTHROPIC_API_KEY` in `.env`.

### Vite Proxy

```
/api/anthropic/* → https://api.anthropic.com  (path rewritten, strips prefix)
/api/auth/*      → http://localhost:3001
/api/sync        → http://localhost:3001
```

### Google Sheets Sync Server (`server/index.js`)

Express server on port 3001. ES module (`"type": "module"`). Reads `.env` from the repo root via `dotenv.config({ path: '../.env' })`.

OAuth flow: browser → `/api/auth/google` → Google consent → `localhost:3001/auth/callback` → saves `tokens.json` → redirects to `localhost:5173?auth=success`. Tokens persist in `server/tokens.json` (gitignored).

Sync endpoint `POST /api/sync` creates a sheet tab named after the script version, writes headers on first use, deduplicates by Call ID (reads column A before appending), then appends one row per `CallRecord` with 20 columns including derived boolean flags.

Required `.env` keys for sync: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_SPREADSHEET_ID`.

### Styling

Tailwind v4 via `@tailwindcss/vite` plugin — no `tailwind.config.js`. All design tokens are CSS variables in `src/index.css` (colors like `--accent`, `--text-muted`, `--border`; radii; shadows; font families). Components use inline styles with these variables rather than Tailwind utility classes for most layout work.
