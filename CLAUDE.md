# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # install dependencies
npm run dev       # start dev server (http://localhost:5173/traininsgplan/)
npm run build     # production build → dist/
npm run preview   # preview production build
```

There are no tests or linter configured.

## Architecture

A **React + Vite app without routing or external state management**, in three
screens: `src/App.jsx` (the plan, styled inline with the `C` tokens) and the two
self-contained apps `src/RepsTab.jsx` and `src/MobilityTab.jsx` (styled with
Tailwind). `src/index.css` holds only the Tailwind directives, the document
background and the app-shell rules for those two.

### Data model

Independent stores, all in `localStorage`. The first five are mirrored into one
Supabase row (table `trainingsplan`, columns `weeks`, `exercise_db`, `routines`,
`reps`, `mobility`) keyed by `training_sync_key`; the last three stay on the
device.

| Key | Purpose | Root shape |
|---|---|---|
| `training_v5` | Weekly plan (weeks array) | `Week[]` |
| `training_db_v1` | Exercise database | `{ mobiliteit: Part[], gym: Part[] }` |
| `training_routines_v1` | Saved routines and videos | `Routine[]` |
| `dailyreps:v1` | Reps tab state (its own 8-week program) | see `RepsTab.jsx` |
| `dailymobility:v1` | Mobility tab state (its own 8-week program) | see `MobilityTab.jsx` |
| `training_sync_key` | This device's Supabase row id | `string` (uuid) |
| `training_rest_v1` | Rest-timer defaults for `WorkoutMode` | `{ ... }` |
| `training_v5_backup` | Raw `training_v5` from before a sync or a repair | `{ at, reason, raw }` |

A `Week` contains a `days` map keyed by `DAYS` (`ma`…`zo`). Each day holds one
morning choice (`reps` | `mobility` | `ssmobility`), one evening choice
(`kracht` | `conditioning` | `rope` | `hardlopen` | `zwemmen`), a done flag for
each and a note. Weeks are created lazily, one at a time and without an upper
bound, via `closeWeek`. Days saved by older versions still carry exercise lists,
routine links and a mood; those fields are kept in storage but never read.

A day whose morning is `reps` or `mobility` ticks itself off when that app
reports `lastCompletedDate === today` — only for today's weekday and only in the
week that is still open.

### Design tokens

All colors, shadows, and the shared `inp()` helper for inputs live in `src/tokens.js`
(the `C` object plus the `font`/`mono` constants), imported by `App.jsx`. Always
extend these rather than adding ad-hoc color values. The two Tailwind apps do not
import them.

### Key component hierarchy

The tab bar is Plan · Reps · Mobiliteit · Meer; the `Meer` sheet opens Routines,
Geschiedenis and Database.

```
ErrorBoundary         – in App.jsx, wrapped around <App/> in main.jsx
App                   – loads data, owns weeks[] and db state
├── DayCard           – collapsible day row; one morning and one evening choice
│   └── OptionPicker  – the row of choice buttons
├── WeekEval          – week note + tally of ticked-off items, triggers week close
├── RoutinesTab       – routines and videos
│   └── RoutineCard   – ExRow list, DbModal picker, ▶ Start
│       └── WorkoutMode – guided run-through: speech, rest timers, left/right
├── DatabaseTab       – editable exercise DB with drag-and-drop reordering
├── RepsTab / MobilityTab
└── Sheet             – the shared bottom sheet (Meer, DbModal, SyncModal, …)
```

`RepsTab` and `MobilityTab` are self-contained apps in their own files. Each takes
over the whole screen (`#reps-root` / `#mob-root` in `index.css`), is styled with
Tailwind instead of the inline `C` tokens, and persists through its own storage key
plus an `onPersist` callback that writes to Supabase.

### Deployment

`vite.config.js` sets `base: '/traininsgplan/'`, so all asset paths are prefixed
accordingly. The app is Dutch-language (`lang="nl"`). A push to `main` builds and
publishes to GitHub Pages (`.github/workflows/deploy.yml`), with the Supabase URL
and anon key coming from repository secrets at build time.

### Styling

The whole app is dark. The palette lives in `C` in `src/tokens.js`; changing it
there recolours Plan, Routines, History and Database at once. Buttons that sit on
an accent colour use dark text (`#0A0A0A`), not white — the accents are light.
`src/index.css` carries the document background and the placeholder colour, plus
the app-shell rules for `#reps-root` / `#mob-root`. Tailwind's preflight is off
(`tailwind.config.js`) because a global reset would silently restyle the inline
App; the resets those two apps need are scoped to their own root with `:where()`.
