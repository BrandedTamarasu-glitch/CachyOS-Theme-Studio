# Release Checklist

Use this checklist before calling the desktop app ready to ship.

Current release focus:

- guided workflow clarity from `Start Here` through `Save & Apply`
- preflight/apply safety and restore-point behavior
- keyboard-visible focus and basic screen-reader naming
- smoke-tested desktop mutation flows

Fast path:

```bash
npm run release:check --prefix /home/corye/openai-cli
```

This runs the build checks and the automated desktop smoke test in order.

## 1. Verify toolchain and system prerequisites

Required for the automated desktop smoke test on Linux:

- `tauri-driver` installed in `~/.cargo/bin/tauri-driver`
- `WebKitWebDriver` installed and available in `PATH`
- E2E dependencies installed:

```bash
npm --prefix /home/corye/openai-cli/e2e-tests install
```

Quick verification:

```bash
command -v /home/corye/.cargo/bin/tauri-driver
command -v WebKitWebDriver
```

## 2. Verify builds

Run both:

```bash
cargo check --manifest-path /home/corye/openai-cli/src-tauri/Cargo.toml
npm run web:build --prefix /home/corye/openai-cli
```

Expected result:

- `cargo check` exits successfully
- `npm run web:build` exits successfully

## 3. Run the automated desktop smoke test

Run:

```bash
ORIGINAL_HOME="$HOME" npm run desktop:test:smoke --prefix /home/corye/openai-cli
```

What the smoke test covers:

- install files
- health action execution
- rollback
- rename saved theme
- delete saved theme
- clear history
- reset app state

The test runs the desktop app against an isolated temporary home under:

```bash
/home/corye/openai-cli/e2e-tests/.tmp/home
```

So it does not write to the real user config.

Expected result:

- WebdriverIO reports `1 passing`

## 4. Optional manual spot-check

If you want one final human confirmation, open the desktop app once and confirm:

- the guided workflow reads clearly from `Start Here` through `Library & History`
- `Apply Review` clearly communicates `ready`, `caution`, or `blocked` state
- desktop status updates are readable
- saved-theme selection and actions work with keyboard navigation
- visible focus outlines appear on buttons, inputs, selects, disclosure controls, and preview chips
- wallpaper/image controls announce state changes and remain understandable without pointer-only context
- health action buttons disable while another desktop mutation is active

## 5. Ship decision

If steps 1-3 pass, the app is in a releasable state for the current desktop-management scope.
