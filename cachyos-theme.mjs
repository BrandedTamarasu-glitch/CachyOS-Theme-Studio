#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  buildThemeArtifacts,
  createThemePayload,
  ensureTokenSet,
  generateGtkImportCss,
  generateKvantumManagerConfig,
  presets,
  sanitizeThemeName
} from "./theme-studio/theme-core.mjs";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "help") {
    printHelp();
    return;
  }

  if (command === "preset") {
    await handlePreset(args.slice(1));
    return;
  }

  if (command === "build") {
    await handleBuild(args.slice(1));
    return;
  }

  if (command === "apply") {
    await handleApply(args.slice(1));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

async function handlePreset(args) {
  const presetName = args[0];
  if (!presetName) {
    throw new Error("Missing preset name.");
  }

  if (!(presetName in presets)) {
    throw new Error(
      `Unknown preset "${presetName}". Available presets: ${Object.keys(presets).join(", ")}`
    );
  }

  const outPath = readOption(args.slice(1), "--out");
  const payload = JSON.stringify(createThemePayload(presetName, presets[presetName]), null, 2);

  if (outPath) {
    await ensureParentDir(resolve(outPath));
    await writeFile(resolve(outPath), payload, "utf8");
    console.log(`Wrote preset theme JSON to ${resolve(outPath)}`);
    return;
  }

  console.log(payload);
}

async function handleBuild(args) {
  const themePath = args[0];
  if (!themePath) {
    throw new Error("Missing theme JSON path.");
  }

  const outDir = resolve(readOption(args.slice(1), "--out-dir") || "./dist");
  const theme = await loadThemeFile(themePath);
  const artifacts = buildThemeArtifacts(theme.name, theme.tokens);

  for (const artifact of artifacts) {
    const targetPath = join(outDir, artifact.relativePath);
    await ensureParentDir(targetPath);
    await writeFile(targetPath, artifact.content, "utf8");
  }

  console.log(`Built ${artifacts.length} files into ${outDir}`);
}

async function handleApply(args) {
  const themePath = args[0];
  if (!themePath) {
    throw new Error("Missing theme JSON path.");
  }

  const dryRun = args.includes("--dry-run");
  const activate = args.includes("--activate");
  const homePath = resolve(readOption(args, "--home") || homedir());
  const theme = await loadThemeFile(themePath);
  const safeName = sanitizeThemeName(theme.name);
  const artifacts = buildThemeArtifacts(theme.name, theme.tokens);
  const themedFiles = selectAppliedArtifacts(artifacts);

  const targets = [
    {
      label: "Plasma color scheme",
      path: join(homePath, ".local/share/color-schemes", `${safeName}.colors`),
      content: themedFiles.plasma
    },
    {
      label: "Kvantum theme config",
      path: join(homePath, ".config/Kvantum", safeName, `${safeName}.kvconfig`),
      content: themedFiles.kvantum
    },
    {
      label: "Kvantum active theme selector",
      path: join(homePath, ".config/Kvantum", "kvantum.kvconfig"),
      content: generateKvantumManagerConfig(theme.name)
    },
    {
      label: "GTK 3 theme stylesheet",
      path: join(homePath, ".config/gtk-3.0", "cachyos-theme.css"),
      content: themedFiles.gtk3Theme
    },
    {
      label: "GTK 4 theme stylesheet",
      path: join(homePath, ".config/gtk-4.0", "cachyos-theme.css"),
      content: themedFiles.gtk4Theme
    },
    {
      label: "Theme manifest",
      path: join(homePath, ".config/cachyos-theme-studio/themes", safeName, "manifest.json"),
      content: JSON.stringify(
        {
          name: theme.name,
          safeName,
          installedAt: new Date().toISOString(),
          targets: {
            plasma: `~/.local/share/color-schemes/${safeName}.colors`,
            kvantum: `~/.config/Kvantum/${safeName}/${safeName}.kvconfig`,
            kvantumActive: "~/.config/Kvantum/kvantum.kvconfig",
            gtk3Theme: "~/.config/gtk-3.0/cachyos-theme.css",
            gtk3Import: "~/.config/gtk-3.0/gtk.css",
            gtk4Theme: "~/.config/gtk-4.0/cachyos-theme.css",
            gtk4Import: "~/.config/gtk-4.0/gtk.css"
          }
        },
        null,
        2
      )
    }
  ];

  if (dryRun) {
    console.log("Dry run. Planned writes:");
    targets.forEach((target) => console.log(`- ${target.label}: ${target.path}`));
    console.log(`- GTK 3 import merge: ${join(homePath, ".config/gtk-3.0", "gtk.css")}`);
    console.log(`- GTK 4 import merge: ${join(homePath, ".config/gtk-4.0", "gtk.css")}`);
    if (activate) {
      printActivationPlan(safeName);
    }
    return;
  }

  for (const target of targets) {
    await ensureParentDir(target.path);
    await writeFile(target.path, target.content, "utf8");
    console.log(`Wrote ${target.label}: ${target.path}`);
  }

  const gtk3ImportPath = join(homePath, ".config/gtk-3.0", "gtk.css");
  const gtk4ImportPath = join(homePath, ".config/gtk-4.0", "gtk.css");
  await mergeGtkImport(gtk3ImportPath);
  await mergeGtkImport(gtk4ImportPath);
  console.log(`Ensured GTK import: ${gtk3ImportPath}`);
  console.log(`Ensured GTK import: ${gtk4ImportPath}`);

  if (activate) {
    await activateTheme({ homePath, safeName });
  }
}

function selectAppliedArtifacts(artifacts) {
  return {
    plasma: findArtifactContent(artifacts, ".colors"),
    kvantum: findArtifactContent(artifacts, ".kvconfig"),
    gtk3Theme: findArtifactContent(artifacts, "gtk/gtk-3.0/cachyos-theme.css"),
    gtk4Theme: findArtifactContent(artifacts, "gtk/gtk-4.0/cachyos-theme.css")
  };
}

function findArtifactContent(artifacts, suffix) {
  const artifact = artifacts.find((entry) => entry.relativePath.endsWith(suffix));
  if (!artifact) {
    throw new Error(`Missing generated artifact for suffix: ${suffix}`);
  }
  return artifact.content;
}

async function activateTheme({ homePath, safeName }) {
  console.log("");
  console.log("Activation:");

  const plasmaStatus = await tryCommand("plasma-apply-colorscheme", [safeName], {
    label: "Plasma color scheme"
  });

  if (plasmaStatus === "missing") {
    console.log(`- Plasma command unavailable. Theme file is installed at ~/.local/share/color-schemes/${safeName}.colors`);
  }

  if (plasmaStatus === "failed") {
    console.log(`- Plasma theme file is installed at ~/.local/share/color-schemes/${safeName}.colors`);
  }

  const kvantumStatus = await tryKvantumActivation(homePath, safeName);
  if (kvantumStatus === "missing") {
    console.log(`- Kvantum command unavailable. Active theme file was written to ~/.config/Kvantum/kvantum.kvconfig`);
  }

  console.log("- GTK imports were merged into ~/.config/gtk-3.0/gtk.css and ~/.config/gtk-4.0/gtk.css");
}

async function tryKvantumActivation(homePath, safeName) {
  const appliedByManager = await tryCommand("kvantummanager", ["--set", safeName], {
    label: "Kvantum theme"
  });

  if (appliedByManager === "applied") {
    return "applied";
  }

  const configToolApplied = await tryCommand("kvantumpreview", ["--set-style", safeName], {
    label: "Kvantum preview style",
    quiet: true
  });

  if (configToolApplied === "applied") {
    console.log("- Applied Kvantum theme with kvantumpreview");
    return "applied";
  }

  const kvantumConfigPath = join(homePath, ".config/Kvantum", "kvantum.kvconfig");
  if (await canReadFile(kvantumConfigPath)) {
    console.log("- Kvantum active theme selector was written to ~/.config/Kvantum/kvantum.kvconfig");
    return appliedByManager === "failed" || configToolApplied === "failed" ? "failed" : "fallback";
  }

  return appliedByManager === "missing" && configToolApplied === "missing" ? "missing" : "failed";
}

async function tryCommand(command, args, options = {}) {
  const { label = command, quiet = false } = options;
  if (!(await commandExists(command))) {
    return "missing";
  }

  try {
    await runCommand(command, args);
    if (!quiet) {
      console.log(`- Applied ${label} with ${command}`);
    }
    return "applied";
  } catch (error) {
    console.log(`- ${label} activation failed with ${command}: ${error.message}`);
    return "failed";
  }
}

async function commandExists(command) {
  try {
    await runCommand("sh", ["-lc", `command -v ${shellEscape(command)} >/dev/null 2>&1`]);
    return true;
  } catch {
    return false;
  }
}

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function runCommand(command, args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", rejectPromise);
    child.on("close", (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(new Error(stderr.trim() || (signal ? `Exited with signal ${signal}` : `Exited with code ${code}`)));
    });
  });
}

async function mergeGtkImport(filePath) {
  const importBlock = buildManagedGtkImportBlock();
  const existing = await readIfExists(filePath);

  if (!existing) {
    await ensureParentDir(filePath);
    await writeFile(filePath, `${importBlock}\n`, "utf8");
    return;
  }

  if (existing.includes("@import url(\"cachyos-theme.css\");")) {
    if (existing.includes("CachyOS Theme Studio")) {
      return;
    }
    await writeFile(filePath, `${importBlock}\n\n${existing}`, "utf8");
    return;
  }

  await writeFile(filePath, `${importBlock}\n\n${existing}`, "utf8");
}

function buildManagedGtkImportBlock() {
  return [
    "/* CachyOS Theme Studio: begin */",
    generateGtkImportCss(),
    "/* CachyOS Theme Studio: end */"
  ].join("\n");
}

async function readIfExists(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function canReadFile(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function loadThemeFile(themePath) {
  const raw = await readFile(resolve(themePath), "utf8");
  const payload = JSON.parse(raw);
  return {
    name: typeof payload?.name === "string" && payload.name.trim() ? payload.name.trim() : "Untitled Theme",
    tokens: ensureTokenSet(payload?.tokens || {})
  };
}

function readOption(args, name) {
  const index = args.indexOf(name);
  if (index === -1) {
    return null;
  }
  return args[index + 1] || null;
}

async function ensureParentDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

function printActivationPlan(safeName) {
  console.log("");
  console.log("Planned activation:");
  console.log(`- plasma-apply-colorscheme ${safeName}`);
  console.log(`- kvantummanager --set ${safeName}`);
  console.log("- Merge @import into ~/.config/gtk-3.0/gtk.css");
  console.log("- Merge @import into ~/.config/gtk-4.0/gtk.css");
}

function printHelp() {
  console.log(`CachyOS Theme Studio CLI

Usage:
  node cachyos-theme.mjs preset "<preset-name>" [--out ./theme.json]
  node cachyos-theme.mjs build ./theme.json [--out-dir ./dist]
  node cachyos-theme.mjs apply ./theme.json [--home /path/to/home] [--dry-run] [--activate]

Commands:
  preset   Export one of the built-in presets as theme JSON
  build    Generate theme artifacts into a build directory
  apply    Write theme files into user config locations and optionally activate them
`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
