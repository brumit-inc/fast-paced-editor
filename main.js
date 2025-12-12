const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

let mainWindow;
let currentFilePath = null;
let recentFiles = [];
const MAX_RECENT_FILES = 10;
const CONFIG_DIR = path.join(os.homedir(), '.config', 'fast-paced-editor');
const RECENT_FILES_PATH = path.join(CONFIG_DIR, 'recent-files.json');

async function ensureConfigDir() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create config directory:', error);
  }
}

async function loadRecentFiles() {
  try {
    await ensureConfigDir();
    const data = await fs.readFile(RECENT_FILES_PATH, 'utf-8');
    const filePaths = JSON.parse(data);
    // Filter out files that no longer exist
    const validFiles = [];
    for (const filePath of filePaths) {
      try {
        await fs.access(filePath);
        validFiles.push(filePath);
      } catch {
        // File doesn't exist, skip it
      }
    }
    // Limit to MAX_RECENT_FILES
    recentFiles = validFiles.slice(0, MAX_RECENT_FILES);
  } catch (error) {
    // File doesn't exist yet, start with empty array
    recentFiles = [];
  }
}

async function saveRecentFiles() {
  try {
    await ensureConfigDir();
    await fs.writeFile(RECENT_FILES_PATH, JSON.stringify(recentFiles, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save recent files:', error);
  }
}

function addToRecentFiles(filePath) {
  // Remove if already exists
  recentFiles = recentFiles.filter(fp => fp !== filePath);
  // Add to beginning
  recentFiles.unshift(filePath);
  // Limit to MAX_RECENT_FILES
  recentFiles = recentFiles.slice(0, MAX_RECENT_FILES);
  saveRecentFiles();
  updateMenu();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  
  loadRecentFiles().then(() => {
    createMenu();
  });
}

function createMenu() {
  const fileSubmenu = [
    {
      label: 'New',
      accelerator: 'CmdOrCtrl+N',
      click: () => mainWindow.webContents.send('file-new')
    },
    {
      label: 'Open',
      accelerator: 'CmdOrCtrl+O',
      click: () => openFile()
    },
    {
      label: 'Save',
      accelerator: 'CmdOrCtrl+S',
      click: () => saveFile()
    },
    {
      label: 'Save As',
      accelerator: 'CmdOrCtrl+Shift+S',
      click: () => saveFileAs()
    },
    { type: 'separator' }
  ];

  // Add Recent Files submenu if there are recent files
  if (recentFiles.length > 0) {
    fileSubmenu.push({
      label: 'Recent Files',
      submenu: recentFiles.map((filePath, index) => {
        const fileName = path.basename(filePath);
        const displayPath = filePath.length > 50 ? '...' + filePath.slice(-47) : filePath;
        return {
          label: `${index + 1}. ${fileName}`,
          tooltip: displayPath,
          click: () => openRecentFile(filePath)
        };
      })
    });
    fileSubmenu.push({ type: 'separator' });
  }

  fileSubmenu.push({
    label: 'Exit',
    accelerator: 'CmdOrCtrl+Q',
    click: () => app.quit()
  });

  const template = [
    {
      label: 'File',
      submenu: fileSubmenu
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function updateMenu() {
  createMenu();
}

async function openFile() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    await openFileByPath(result.filePaths[0]);
  }
}

async function openFileByPath(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    currentFilePath = filePath;
    addToRecentFiles(filePath);
    mainWindow.webContents.send('file-opened', { content, filePath });
    mainWindow.setTitle(`${path.basename(filePath)} - Notepad`);
  } catch (error) {
    dialog.showErrorBox('Error', `Failed to open file: ${error.message}`);
    // Remove from recent files if it doesn't exist
    recentFiles = recentFiles.filter(fp => fp !== filePath);
    saveRecentFiles();
    updateMenu();
  }
}

async function openRecentFile(filePath) {
  await openFileByPath(filePath);
}

async function saveFile() {
  if (currentFilePath) {
    mainWindow.webContents.send('request-save-content');
  } else {
    await saveFileAs();
  }
}

async function saveFileAs() {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    currentFilePath = result.filePath;
    mainWindow.webContents.send('request-save-content');
  }
}

ipcMain.on('save-content', async (event, content) => {
  if (currentFilePath) {
    try {
      await fs.writeFile(currentFilePath, content, 'utf-8');
      mainWindow.setTitle(`${path.basename(currentFilePath)} - Notepad`);
      mainWindow.webContents.send('file-saved');
    } catch (error) {
      dialog.showErrorBox('Error', `Failed to save file: ${error.message}`);
    }
  }
});

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
