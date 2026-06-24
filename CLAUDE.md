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

Two independent stores, both serialized to `localStorage`:

| Key | Purpose | Root shape |
|---|---|---|
| `training_v5` | Weekly plan (weeks array) | `Week[]` |
| `training_db_v1` | Exercise database | `{ mobiliteit: Part[], gym: Part[] }` |

A `Week` contains a `days` map keyed by `DAYS` (`ma`…`zo`), each day holding morning/evening exercise lists, routine links, and a note. Weeks are created lazily (up to 8) via `closeWeek`.

### Design tokens

All colors, shadows, and the shared `inp()` helper for inputs are defined in the `C` object and `font`/`mono` constants near the top of `App.jsx`. Always extend these rather than adding ad-hoc color values.

### Key component hierarchy

```
App                   – loads data, owns weeks[] and db state
├── DayCard           – collapsible day row; owns morning/evening sections
│   ├── ExerciseBlock – action buttons + list of ExRow items
│   │   └── ExRow     – single exercise name+sets input with optional save-to-db
│   └── DbModal       – bottom-sheet picker that reads from db
├── WeekEval          – per-skill rating + note, triggers week close
└── DatabaseTab       – editable exercise DB with drag-and-drop reordering
```

### Skill progression

`SKILL_WEEKS` (weeks 1–8) is a static data table mapping week number → `{ handstand, pullup, pistol }`. `DAY_SKILL` maps each weekday to which skill block to show. Week 4 is a deload and week 8 is a test week.

### Deployment

`vite.config.js` sets `base: '/trainingsplan/'`, so all asset paths are prefixed accordingly. The app is Dutch-language (`lang="nl"`).
