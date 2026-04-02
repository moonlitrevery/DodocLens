const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

/** @type {import('child_process').ChildProcessWithoutNullStreams | null} */
let backendProcess = null;
/** If true, backend was already listening (we did not spawn it). */
let backendExternal = false;

const isDev = !app.isPackaged;

/** Repo root in dev; unpacked dir in production (see package.json asarUnpack). */
function projectRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app.asar.unpacked");
  }
  return path.join(__dirname, "..");
}

const MAIN_PY = path.join(projectRoot(), "backend", "main.py");

function pythonExecutable() {
  if (process.env.DODOC_PYTHON) return process.env.DODOC_PYTHON;
  if (process.platform === "win32") return "python";
  return "python3";
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
  const py = pythonExecutable();
  backendProcess = spawn(py, [MAIN_PY], {
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

  if (isDev) {
    await win.loadURL("http://127.0.0.1:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexHtml = path.join(
      __dirname,
      "..",
      "frontend",
      "dist",
      "index.html",
    );
    await win.loadFile(indexHtml);
  }
}

app.whenReady().then(() => {
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
