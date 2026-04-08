# CachyOS Theme Studio

CachyOS Theme Studio is a desktop theme manager for CachyOS that turns theme creation into a guided workflow instead of a pile of config files.

It gives you one place to:

- build a theme from a preset, your current desktop, a saved theme, imported JSON, or a wallpaper/image
- preview the result in a desktop-style canvas before touching the live system
- review apply readiness, warnings, and recovery steps before installing
- save snapshots, compare versions, and roll back when needed
- generate shared output for Plasma, GTK, and Kvantum from the same palette

## Why this exists

Desktop theming on Linux is usually fragmented.

You end up editing or generating multiple files, tracking which subsystem owns which colors, and hoping a live apply does not leave your desktop in a half-broken state. Theme Studio exists to make that process safer and easier to reason about.

The goal is not just to export colors. The goal is to help you:

- start quickly
- make visual decisions with context
- understand what will change before apply
- keep restore points and saved variants
- avoid breaking your working setup while experimenting

## What the application does

The current app includes:

- a guided workflow: `Start Here -> Style -> Apply Review -> Save & Apply -> Library & History`
- semantic theme controls for accent, mood, contrast, temperature, and bias
- advanced token editing when exact values are needed
- live desktop-style preview surfaces for windows, widgets, terminal, notifications, and readability
- compare mode for baseline-vs-draft and saved-theme-vs-saved-theme review
- wallpaper/image-seeded theme generation with live refinement controls
- desktop environment detection from the Tauri app
- direct install/apply flows for supported targets
- integration health checks and targeted repair actions
- saved theme snapshots, favorites, search, sort, variants, and restore points
- rollback to the previous applied snapshot

## What it manages

Theme Studio currently generates and manages output for:

- KDE Plasma color schemes
- GTK 3 and GTK 4 managed import files
- Kvantum theme config and selector files
- Theme Studio snapshot metadata under the app config directory

## Desktop app

The project includes a Tauri desktop shell around the theme workflow.

Main pieces:

- frontend shell: `index.html`
- app controller: `theme-studio/app.js`
- shared theme logic: `theme-studio/theme-core.mjs`
- styling: `theme-studio/styles.css`
- Tauri backend: `src-tauri/src/main.rs`

## Run locally

Browser development:

```bash
npm run web:dev
```

Desktop development:

```bash
npm run desktop:dev
```

Production build:

```bash
npm run desktop:build
```

## Verification

Frontend build:

```bash
npm run web:build
```

Desktop smoke test:

```bash
ORIGINAL_HOME="$HOME" npm run desktop:test:smoke --prefix /home/corye/openai-cli
```

One-shot release gate:

```bash
npm run release:check --prefix /home/corye/openai-cli
```

Release checklist:

- see `RELEASE_CHECKLIST.md`

## CLI support

The repo also includes a CLI for generating and applying theme artifacts directly.

Export a preset:

```bash
node cachyos-theme.mjs preset "Solar Drift" --out ./solar-drift.json
```

Build artifacts:

```bash
node cachyos-theme.mjs build ./solar-drift.json --out-dir ./dist
```

Dry-run or activate:

```bash
node cachyos-theme.mjs apply ./solar-drift.json --dry-run
node cachyos-theme.mjs apply ./solar-drift.json --activate
```

## Current status

This is still a working prototype, but it is no longer just a visual mockup.

It now has:

- a usable desktop application path
- smoke-tested install, rollback, rename, delete, clear-history, and reset flows
- documented release verification
- accessibility and keyboard-focused UX improvements

The next work is less about basic plumbing and more about continued product refinement.
