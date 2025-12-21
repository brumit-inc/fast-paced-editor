const { app, BrowserWindow } = require('electron');
const windowManager = require('./windowManager');
const ipcHandlers = require('./ipcHandlers');
const menu = require('./menu');

let mainWindow;

function createWindow() {
  mainWindow = windowManager.createMainWindow();
  
  // Initialize IPC handlers with window reference
  ipcHandlers.register(mainWindow);
  
  // Create application menu
  menu.createMenu(mainWindow);
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app shutdown
app.on('before-quit', () => {
  if (mainWindow) {
    windowManager.saveWindowState(mainWindow);
  }
});

