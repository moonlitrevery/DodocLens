const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

/** @type {import('child_process').ChildProcessWithoutNullStreams | null} */
let backendProcess = null;
/** If true, backend was already listening (we did not spawn it). */
let backendExternal = false;

/** Repo root in dev; unpacked dir in production (see package.json asarUnpack). */
function projectRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app.asar.unpacked");
  }
  return path.join(__dirname, "..");
}

const IMPORTABLE_EXTENSIONS = new Set([".pdf", ".txt", ".png", ".jpg", ".jpeg"]);

function getBackendPath() {
  if (app.isPackaged) {
    // extraResources lands in process.resourcesPath/backend
    const resourcesBackend = path.join(process.resourcesPath, "backend");
    if (fs.existsSync(resourcesBackend)) return resourcesBackend;
  }
  return path.join(__dirname, "..", "backend");
}

function getPythonPath() {
  if (process.env.DODOC_PYTHON) return process.env.DODOC_PYTHON;

  const isWin = process.platform === "win32";
  const binDir = isWin ? "Scripts" : "bin";
  const pyBin = isWin ? "python.exe" : "python3";

  if (app.isPackaged) {
    // In packaged app, .venv was renamed to venv during build
    const base = process.resourcesPath;
    for (const venvName of ["venv", ".venv"]) {
      const candidate = path.join(base, "backend", venvName, binDir, pyBin);
      if (fs.existsSync(candidate)) {
        console.log(`[electron] Using Python: ${candidate}`);
        return candidate;
      }
    }
    console.error("[electron] No .venv found in resources. Backend will fail.");
  }

  // Development mode
  for (const venvName of [".venv", "venv"]) {
    const candidate = path.join(__dirname, "..", "backend", venvName, binDir, pyBin);
    if (fs.existsSync(candidate)) {
      console.log(`[electron] Dev Python: ${candidate}`);
      return candidate;
    }
  }

  console.warn("[electron] Falling back to system Python.");
  return isWin ? "python" : "python3";
}

function waitForBackend(host, port, pathname, timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryOnce = () => {
      const req = http.request(
        { host, port, path: pathname, method: "GET", timeout: 2000 },
        (res) => {
          res.resume();
          if (res.statusCode === 200) resolve();
          else schedule();
        },
      );
      req.on("error", schedule);
      req.on("timeout", () => {
        req.destroy();
        schedule();
      });
      req.end();
    };
    const schedule = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error("Backend did not become ready in time."));
        return;
      }
      setTimeout(tryOnce, 400);
    };
    tryOnce();
  });
}

function startBackend() {
  const backendRoot = getBackendPath();
  const mainPy = path.join(backendRoot, "main.py");
  const py = getPythonPath();

  console.log("[electron] Backend root:", backendRoot);
  console.log("[electron] main.py path:", mainPy);
  console.log("[electron] Python path:", py);
  console.log("[electron] main.py exists:", fs.existsSync(mainPy));
  console.log("[electron] Python exists:", fs.existsSync(py));

  backendProcess = spawn(py, [mainPy], {
    cwd: projectRoot(),
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  backendProcess.stdout?.on("data", (d) =>
    process.stdout.write(`[backend] ${d}`),
  );
  backendProcess.stderr?.on("data", (d) =>
    process.stderr.write(`[backend] ${d}`),
  );
  backendProcess.on("exit", (code, signal) => {
    backendProcess = null;
    if (code != null && code !== 0) {
      console.error(`Backend exited with code ${code}`);
    }
    if (signal) console.error(`Backend killed by signal ${signal}`);
  });
}

function stopBackend() {
  if (backendExternal) return;
  if (!backendProcess) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(backendProcess.pid), "/f", "/t"]);
  } else {
    backendProcess.kill("SIGTERM");
  }
  backendProcess = null;
}

function distIndexPath() {
  return path.join(projectRoot(), "frontend", "dist", "index.html");
}

function collectImportableFiles(baseDir, maxDepth = 3) {
  const out = [];
  const walk = (dir, depth) => {
    if (depth > maxDepth) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (IMPORTABLE_EXTENSIONS.has(ext)) out.push(fullPath);
      }
    }
  };
  walk(baseDir, 0);
  return out;
}

/**
 * Packaged app always uses the built SPA. Unpackaged: use Vite when
 * DODOC_LOAD_DIST is not set (npm run dev); otherwise or if :5173 is down,
 * load frontend/dist (e.g. npm run electron:prod).
 */
async function loadRenderer(win) {
  const distHtml = distIndexPath();
  if (app.isPackaged) {
    await win.loadFile(distHtml);
    return;
  }
  if (process.env.DODOC_LOAD_DIST === "1") {
    if (!fs.existsSync(distHtml)) {
      throw new Error(
        `DODOC_LOAD_DIST=1 but missing ${distHtml}. Run npm run build:fe first.`,
      );
    }
    await win.loadFile(distHtml);
    return;
  }
  try {
    await win.loadURL("http://127.0.0.1:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } catch (e) {
    console.warn(
      "[electron] Vite not reachable at http://127.0.0.1:5173 — loading built UI if available.",
    );
    if (fs.existsSync(distHtml)) {
      await win.loadFile(distHtml);
    } else {
      console.error(
        "[electron] No built frontend. Start Vite (npm run dev:fe) or build (npm run build:fe).",
      );
      throw e;
    }
  }
}

async function createWindow() {
  backendExternal = false;
  try {
    await waitForBackend("127.0.0.1", 8000, "/health", 2000);
    backendExternal = true;
    console.info("Using existing backend on :8000");
  } catch {
    startBackend();
    try {
      await waitForBackend("127.0.0.1", 8000, "/health", 180000);
    } catch (e) {
      console.error(e);
    }
  }

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 880,
    minHeight: 600,
    title: "DodocLens",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  win.once("ready-to-show", () => win.show());

  try {
    await loadRenderer(win);
  } catch (e) {
    console.error("[electron] Failed to load UI:", e);
  }
}

app.whenReady().then(() => {
  ipcMain.handle("select-folder", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return collectImportableFiles(result.filePaths[0], 3);
  });

  void createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on("window-all-closed", () => {
  stopBackend();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  stopBackend();
});
