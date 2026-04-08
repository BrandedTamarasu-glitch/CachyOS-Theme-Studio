import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const tempRoot = path.resolve(__dirname, ".tmp");
const tempHome = path.resolve(tempRoot, "home");
const logsDir = path.resolve(tempRoot, "logs");
const hostHome = process.env.ORIGINAL_HOME || process.env.HOME || os.homedir();

const tauriDriverPath =
  process.env.TAURI_DRIVER_PATH || path.resolve(hostHome, ".cargo", "bin", "tauri-driver");

const binaryName = process.platform === "win32" ? "cachyos_theme_studio.exe" : "cachyos_theme_studio";
const appBinaryPath =
  process.env.TAURI_APP_PATH ||
  path.resolve(repoRoot, "src-tauri", "target", "debug", binaryName);

let tauriDriver;
let exit = false;

function ensureDirectory(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function resetTempHome() {
  fs.rmSync(tempRoot, { recursive: true, force: true });
  ensureDirectory(path.resolve(tempHome, ".config"));
  ensureDirectory(path.resolve(tempHome, ".local", "share"));
  ensureDirectory(logsDir);
}

function assertBinaryExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`${label} was not found at ${targetPath}`);
  }
}

function closeTauriDriver() {
  exit = true;
  tauriDriver?.kill();
}

function onShutdown(fn) {
  const cleanup = () => {
    try {
      fn();
    } finally {
      process.exit();
    }
  };

  process.on("exit", cleanup);
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("SIGHUP", cleanup);
  process.on("SIGBREAK", cleanup);
}

export const config = {
  runner: "local",
  hostname: "127.0.0.1",
  port: 4444,
  specs: ["./test/specs/**/*.e2e.mjs"],
  maxInstances: 1,
  capabilities: [
    {
      maxInstances: 1,
      "tauri:options": {
        application: appBinaryPath
      }
    }
  ],
  reporters: ["spec"],
  framework: "mocha",
  mochaOpts: {
    ui: "bdd",
    timeout: 300000
  },
  onPrepare: () => {
    resetTempHome();

    process.env.HOME = tempHome;
    process.env.XDG_CONFIG_HOME = path.resolve(tempHome, ".config");
    process.env.XDG_DATA_HOME = path.resolve(tempHome, ".local", "share");
    process.env.TAURI_WEBVIEW_AUTOMATION = "true";

    const buildResult = spawnSync("npx", ["tauri", "build", "--debug", "--no-bundle"], {
      cwd: repoRoot,
      stdio: "inherit",
      shell: true
    });

    if (buildResult.status !== 0) {
      throw new Error("Tauri debug build failed for the smoke test.");
    }

    assertBinaryExists(appBinaryPath, "Built Tauri app binary");
    assertBinaryExists(tauriDriverPath, "tauri-driver");
  },
  beforeSession: () => {
    tauriDriver = spawn(tauriDriverPath, [], {
      cwd: repoRoot,
      stdio: [null, process.stdout, process.stderr],
      env: {
        ...process.env,
        HOME: tempHome,
        XDG_CONFIG_HOME: path.resolve(tempHome, ".config"),
        XDG_DATA_HOME: path.resolve(tempHome, ".local", "share"),
        TAURI_WEBVIEW_AUTOMATION: "true"
      }
    });

    tauriDriver.on("error", (error) => {
      console.error("tauri-driver error:", error);
      process.exit(1);
    });

    tauriDriver.on("exit", (code) => {
      if (!exit) {
        console.error("tauri-driver exited with code:", code);
        process.exit(1);
      }
    });
  },
  afterSession: () => {
    closeTauriDriver();
  }
};

onShutdown(() => {
  closeTauriDriver();
});
