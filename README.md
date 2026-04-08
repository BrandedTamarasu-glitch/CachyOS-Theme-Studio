# CachyOS Theme Studio

Prototype desktop theme manager for CachyOS with a guided workflow, live previewing, desktop apply actions, and rollback safety.

## What it does

- Edit shared color tokens in a browser UI
- Start from presets, the current desktop, saved themes, imports, or a wallpaper/image
- Shape drafts with higher-level controls before dropping into raw token editing
- See the palette applied immediately to a desktop-style preview
- Review apply readiness, warnings, and recovery path before touching the live desktop
- Save variants, compare snapshots, and recover from restore points
- Switch between starter presets
- Export the theme as JSON
- Generate starter output for KDE Plasma, Kvantum, and GTK from the same palette
- Import exported theme JSON back into the editor

## Run locally

```bash
npm run dev
```

Then open `http://127.0.0.1:1420`.

## Desktop app

The repo now includes a Tauri desktop shell:

- Frontend entry: [`index.html`](/home/corye/openai-cli/index.html)
- Browser/desktop controller: [`theme-studio/app.js`](/home/corye/openai-cli/theme-studio/app.js)
- Tauri backend: [`src-tauri/src/main.rs`](/home/corye/openai-cli/src-tauri/src/main.rs)

Desktop app capabilities now include:

- Guided `Start -> Style -> Apply Review -> Save & Apply -> Library & History` workflow
- Detecting the active desktop/session from the GUI
- Installing and applying the current theme directly
- Saving theme snapshots into the app library
- Listing saved themes and recent applies
- Comparing saved themes against the working draft or another saved theme
- Wallpaper/image-seeded draft generation with live refinement controls
- Rolling back to the previous applied theme from the GUI

Development commands:

```bash
npm run web:dev
npm run desktop:dev
```

Production commands:

```bash
npm run web:build
npm run desktop:build
```

Release verification:

- Checklist: [RELEASE_CHECKLIST.md](/home/corye/openai-cli/RELEASE_CHECKLIST.md)
- Automated desktop smoke test: `ORIGINAL_HOME="$HOME" npm run desktop:test:smoke --prefix /home/corye/openai-cli`
- One-shot release gate: `npm run release:check --prefix /home/corye/openai-cli`
- Current release focus: guided workflow clarity, desktop safety, keyboard access, and smoke-tested library/apply flows

## CLI workflow

Export a preset as theme JSON:

```bash
node cachyos-theme.mjs preset "Solar Drift" --out ./solar-drift.json
```

Build generated theme artifacts into `./dist`:

```bash
node cachyos-theme.mjs build ./solar-drift.json --out-dir ./dist
```

Apply generated files into your user config directories:

```bash
node cachyos-theme.mjs apply ./solar-drift.json --dry-run
node cachyos-theme.mjs apply ./solar-drift.json --activate
```

`apply` writes and wires files in these locations:

- `~/.local/share/color-schemes/<Theme>.colors`
- `~/.config/Kvantum/<Theme>/<Theme>.kvconfig`
- `~/.config/Kvantum/kvantum.kvconfig`
- `~/.config/gtk-3.0/cachyos-theme.css`
- `~/.config/gtk-3.0/gtk.css`
- `~/.config/gtk-4.0/cachyos-theme.css`
- `~/.config/gtk-4.0/gtk.css`
- `~/.config/cachyos-theme-studio/themes/<Theme>/manifest.json`

## Current scope

This is still a prototype, but it now has a usable local application path.
The CLI can generate theme files, install them into common user-level locations,
attempt live Plasma and Kvantum activation, and merge GTK imports into the
standard per-user `gtk.css` entrypoints. The desktop app scaffold now wraps that
workflow in a GUI, persists theme snapshots under `~/.config/cachyos-theme-studio/`,
and exposes load/rollback flows inside the app.
