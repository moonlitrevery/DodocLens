const { contextBridge } = require("electron");

/**
 * Expose a minimal, read-only bridge if the UI needs native hints later.
 * All API calls use Axios from the renderer to http://127.0.0.1:8000.
 */
contextBridge.exposeInMainWorld("dodoclens", {
  platform: process.platform,
});
