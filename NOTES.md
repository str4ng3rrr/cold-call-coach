# Cold Call Coach — Build Notes

## Stack
- React + TypeScript + Vite
- Tailwind CSS v4 (uses `@import "tailwindcss"` in CSS, no tailwind.config.js, configured via `@tailwindcss/vite` plugin)
- shadcn/ui utility deps: `clsx`, `tailwind-merge`, `@radix-ui/react-slot`, `class-variance-authority`
- `lucide-react` for icons
- `react-router-dom` v6 for routing
- `react-markdown` for markdown rendering
- localStorage only — no backend
- Claude API (claude-sonnet-4-6) for all AI features

## Project Structure
```
src/
  lib/utils.ts              — cn() helper (clsx + tailwind-merge)
  components/
    DashboardLayout.tsx     — sidebar + main content shell
  pages/
    LessonsPage.tsx
    PlaybookPage.tsx
    ScriptPage.tsx
    CoachPage.tsx
  App.tsx                   — React Router setup
  main.tsx                  — entry point
  index.css                 — Tailwind import + CSS vars
```

## CSS Variables (defined in index.css)
```css
--sidebar-bg: #f8f9fa
--border: #e5e7eb
--text-primary: #111827
--text-muted: #6b7280
--accent: #3b82f6
```

## Routing
- `/` → redirect to `/lessons`
- `/lessons` → LessonsPage
- `/playbook` → PlaybookPage
- `/script` → ScriptPage
- `/coach` → CoachPage
All routes nested inside `<DashboardLayout>` which uses `<Outlet>`

## Layout
- Sidebar: 240px, `var(--sidebar-bg)`, border-right
- Active nav link: `bg-blue-50 text-blue-600`
- Inactive: `text-gray-600 hover:bg-gray-100`
- Main: white, full height, scrollable

---

## Build Steps Completed

### Prompt 1 — Scaffold + Layout Shell ✅
- Vite project already existed, installed deps
- Tailwind v4 setup via `@tailwindcss/vite` plugin in `vite.config.ts`
- Installed: `tailwindcss`, `@tailwindcss/vite`, `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `react-router-dom`, `react-markdown`
- Created DashboardLayout with sidebar nav
- Created 4 placeholder pages
- Build passes with zero errors

---

## Planned Build Steps

### Prompt 2 — Lessons Page Core
- Transcript paste input (textarea + submit button)
- localStorage schema for lessons (see below)
- Lesson grid cards (title, date, status badges)
- Inline manual title editing

### Prompt 3 — AI Analysis + Title Generation
- Claude API integration (needs API key in `.env`: `VITE_ANTHROPIC_API_KEY`)
- On lesson submit: auto-generate AI feedback stored with lesson
- Sparkle icon (✨) → AI-generated title from transcript + analysis
- Display AI feedback on lesson card / expanded view

### Prompt 4 — Lessons Export + Playbook Filter
- Export single lesson as JSON download
- Export all lessons as JSON download
- Filter toggle: "Show unadded only" (hides lessons already in playbook)

### Prompt 5 — Playbook Page
- Render playbook as markdown
- Editable textarea
- "Add to Playbook" per lesson → Claude API (append only, source-tagged, NEVER remove)
- localStorage persistence for playbook doc

### Prompt 6 — Bulk Add + Rate Limiting
- "Add All Unadded" button
- Sequential processing with ~2s delay between API calls
- Progress indicator: "Processing 3 of 7..."
- Mark lessons as `addedToPlaybook: true` after processing

### Prompt 7 — Script Page
- Split layout: script editor (left) + AI assistant panel (right)
- Full-script improvement mode
- Highlighted text improvement mode (selected text only)
- AI reads current playbook as context
- Accept/reject suggestion flow

### Prompt 8 — AI Coach Chat
- Chat UI (message bubbles, input box)
- Claude API with playbook injected as system context
- Chat history stored in localStorage per session

### Prompt 9 — Polish & UX
- Loading states + skeleton loaders
- Error handling for API failures
- Empty states for each page
- Responsive tweaks

---

## localStorage Schema (planned)

### lessons
```ts
interface Lesson {
  id: string              // uuid
  title: string           // user-editable or AI-generated
  transcript: string      // raw pasted text
  feedback: string        // AI analysis (markdown)
  createdAt: string       // ISO date
  addedToPlaybook: boolean
}
// stored as: localStorage.getItem('ccc_lessons') → JSON array
```

### playbook
```ts
// stored as: localStorage.getItem('ccc_playbook') → markdown string
// Each rule has a source tag: <!-- source: lesson-id -->
```

### script
```ts
// stored as: localStorage.getItem('ccc_script') → plain text string
```

### chat history
```ts
interface Message {
  role: 'user' | 'assistant'
  content: string
}
// stored as: localStorage.getItem('ccc_chat') → JSON array
```

---

## Key AI Constraints
- Playbook: AI can only ADD or EDIT rules — never remove existing ones
- All AI calls use `claude-sonnet-4-6`
- API key via `VITE_ANTHROPIC_API_KEY` in `.env` (never committed)
