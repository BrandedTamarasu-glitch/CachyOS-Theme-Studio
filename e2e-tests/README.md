# Desktop Smoke Test

This directory contains a minimal Tauri WebDriver smoke test for the desktop app.

## What it covers

The smoke spec exercises:

- install files
- health action execution
- rollback
- rename saved theme
- delete saved theme
- clear history
- reset app state

The test runs the Tauri app against an isolated temporary home directory under `e2e-tests/.tmp/home` so it does not write to the real user config.

## Prerequisites

- Node dependencies installed for this directory:
  `npm --prefix e2e-tests install`
- `tauri-driver` installed and available at `~/.cargo/bin/tauri-driver`
- On Linux, the system WebDriver dependency required by Tauri's WebKit runtime must also be installed

## Run

From the repo root:

```bash
npm run desktop:test:smoke
```

The WebDriver config will:

- build a debug, no-bundle Tauri binary
- set `HOME`, `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, and `TAURI_WEBVIEW_AUTOMATION`
- launch `tauri-driver`
- run the smoke spec
