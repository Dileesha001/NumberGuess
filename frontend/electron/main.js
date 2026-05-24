import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// We define our application window
let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true, // Hides the top menu for a clean look
    title: "DPR Mini Games",
    icon: path.join(__dirname, '../public/logo.svg')
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
