# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # install dependencies
npm run dev       # start dev server (http://localhost:5173/trainingsplan/)
npm run build     # production build → dist/
npm run preview   # preview production build
```

There are no tests or linter configured.

## Architecture

This is a **single-file React + Vite app** — virtually all logic lives in `src/App.jsx`. There is no routing, no external state management, and no CSS files; all styles are inline objects using design tokens.

### Data model

Independent stores, all serialized to `localStorage` and mirrored into one Supabase row keyed by `training_sync_key`:

| Key | Purpose | Root shape |
|---|---|---|
| `training_v5` | Weekly plan (weeks array) | `Week[]` |
| `training_db_v1` | Exercise database | `{ mobiliteit: Part[], gym: Part[] }` |
| `training_routines_v1` | Saved routines and videos | `Routine[]` |
| `dailyreps:v1` | Reps tab state (its own 8-week program) | see `RepsTab.jsx` |
| `dailymobility:v1` | Mobility tab state (its own 8-week program) | see `MobilityTab.jsx` |

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

All colors, shadows, and the shared `inp()` helper for inputs are defined in the `C` object and `font`/`mono` constants near the top of `App.jsx`. Always extend these rather than adding ad-hoc color values.

### Key component hierarchy

```
App                   – loads data, owns weeks[] and db state
├── DayCard           – collapsible day row; one morning and one evening choice
│   └── OptionPicker  – the row of choice buttons
├── WeekEval          – week note + tally of ticked-off items, triggers week close
├── RoutinesTab       – routines and videos; starts the guided WorkoutMode
│   └── RoutineCard   – ExRow list, DbModal picker, ▶ Start
└── DatabaseTab       – editable exercise DB with drag-and-drop reordering
```

`RepsTab` and `MobilityTab` are self-contained apps in their own files. Each takes
over the whole screen (`#reps-root` / `#mob-root` in `index.css`), is styled with
Tailwind instead of the inline `C` tokens, and persists through its own storage key
plus an `onPersist` callback that writes to Supabase.

### Deployment

`vite.config.js` sets `base: '/traininsgplan/'`, so all asset paths are prefixed accordingly. The app is Dutch-language (`lang="nl"`).

### Styling

The whole app is dark. The palette lives in `C` in `src/tokens.js`; changing it
there recolours Plan, Routines, History and Database at once. Buttons that sit on
an accent colour use dark text (`#0A0A0A`), not white — the accents are light.
`src/index.css` carries the document background and the placeholder colour.
