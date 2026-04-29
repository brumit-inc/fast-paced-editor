const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function getWindowStateFilePath() {
  // Resolve lazily so module initialization does not depend on app timing.
  return path.join(app.getPath('userData'), 'window-state.json');
}

function getDefaultWindowState() {
  return {
    width: 1200,
    height: 800,
    x: undefined,
    y: undefined,
    isMaximized: false
  };
}

function loadWindowState() {
  try {
    const windowStateFile = getWindowStateFilePath();
    if (fs.existsSync(windowStateFile)) {
      const data = fs.readFileSync(windowStateFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading window state:', err);
  }
  return getDefaultWindowState();
}

function saveWindowState(window) {
  try {
    const windowStateFile = getWindowStateFilePath();
    const bounds = window.getBounds();
    const state = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: window.isMaximized()
    };
    fs.writeFileSync(windowStateFile, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('Error saving window state:', err);
  }
}

function createMainWindow() {
  const state = loadWindowState();
  
  const window = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true
    },
    show: false // Don't show until ready
  });

  // Restore maximized state if needed
  if (state.isMaximized) {
    window.maximize();
  }

  // Load the HTML file
  window.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // Show window when ready to prevent visual flash
  window.once('ready-to-show', () => {
    window.show();
  });

  // Save window state on move/resize
  let saveStateTimeout;
  ['resize', 'move'].forEach(event => {
    window.on(event, () => {
      clearTimeout(saveStateTimeout);
      saveStateTimeout = setTimeout(() => {
        saveWindowState(window);
      }, 500);
    });
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    window.webContents.openDevTools();
  }

  return window;
}

module.exports = {
  createMainWindow,
  saveWindowState,
  loadWindowState
};

