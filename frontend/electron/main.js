import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Enable uncaught exception logging to file
process.on('uncaughtException', (err) => {
  try {
    const logDir = app.getPath('userData');
    const logPath = path.join(logDir, 'main_errors.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] Uncaught Exception: ${err.stack || err}\n`);
  } catch (e) {
    console.error("Failed to log uncaught exception", err, e);
  }
});

// We define our application window
let win;

function createWindow() {
  const iconPath = app.isPackaged
    ? path.join(__dirname, '../dist/logo.svg')
    : path.join(__dirname, '../public/logo.svg');

  win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true, // Hides the top menu for a clean look
    title: "DPR Mini Games",
    icon: iconPath
  });

  // Capture renderer process console logs
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    try {
      const logDir = app.getPath('userData');
      const logPath = path.join(logDir, 'renderer_console.log');
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] [Level ${level}] ${message} (at ${sourceId}:${line})\n`);
    } catch (e) {
      console.error("Failed to log console message", e);
    }
  });

  // Depending on whether we are in dev mode or built mode
  // The VITE_DEV_SERVER_URL environment variable is passed by vite-plugin-electron
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    // Optionally open DevTools
    win.webContents.openDevTools();
  } else {
    // When built, load the local index.html
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

