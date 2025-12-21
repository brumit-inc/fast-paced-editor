const { app, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const RECENT_ITEMS_FILE = path.join(app.getPath('userData'), 'recent-items.json');

const MAX_RECENT_FOLDERS = 10;
const MAX_RECENT_FILES = 10;

function loadRecentItems() {
  try {
    if (fs.existsSync(RECENT_ITEMS_FILE)) {
      const data = fs.readFileSync(RECENT_ITEMS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading recent items:', err);
  }
  return { folders: [], files: [] };
}

function saveRecentItems(items) {
  try {
    fs.writeFileSync(RECENT_ITEMS_FILE, JSON.stringify(items, null, 2));
  } catch (err) {
    console.error('Error saving recent items:', err);
  }
}

function buildRecentsSubmenu(mainWindow) {
  const items = loadRecentItems();
  const submenu = [];
  
  // Recent Files section
  if (items.files && items.files.length > 0) {
    submenu.push({
      label: 'Recent Files',
      enabled: false
    });
    
    items.files.slice(0, MAX_RECENT_FILES).forEach((file) => {
      const fileName = file.name || path.basename(file.path);
      // Include full path in label for tooltip-like behavior (works on all platforms)
      // Format: "filename — /full/path/to/file"
      const label = `${fileName} — ${file.path}`;
      submenu.push({
        label: label,
        toolTip: file.path,
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('open-file-from-menu', file.path, file.folderPath);
          }
        }
      });
    });
    
    if (items.folders && items.folders.length > 0) {
      submenu.push({ type: 'separator' });
    }
  }
  
  // Recent Folders section
  if (items.folders && items.folders.length > 0) {
    submenu.push({
      label: 'Recent Folders',
      enabled: false
    });
    
    items.folders.slice(0, MAX_RECENT_FOLDERS).forEach((folder) => {
      const folderName = folder.name || path.basename(folder.path);
      // Include full path in label for tooltip-like behavior (works on all platforms)
      // Format: "foldername — /full/path/to/folder"
      const label = `${folderName} — ${folder.path}`;
      submenu.push({
        label: label,
        toolTip: folder.path,
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('open-folder-from-menu', folder.path);
          }
        }
      });
    });
  }
  
  if (submenu.length === 0) {
    submenu.push({
      label: 'No recent items',
      enabled: false
    });
  }
  
  return submenu;
}

function createMenu(mainWindow) {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Recents',
          submenu: buildRecentsSubmenu(mainWindow)
        },
        { type: 'separator' },
        {
          label: 'Open File...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('menu-open-file');
            }
          }
        },
        {
          label: 'Open Folder...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('menu-open-folder');
            }
          }
        },
        { type: 'separator' },
        {
          role: 'quit',
          label: 'Exit'
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'Undo' },
        { role: 'redo', label: 'Redo' },
        { type: 'separator' },
        { role: 'cut', label: 'Cut' },
        { role: 'copy', label: 'Copy' },
        { role: 'paste', label: 'Paste' },
        { role: 'selectAll', label: 'Select All' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Reload' },
        { role: 'forceReload', label: 'Force Reload' },
        { role: 'toggleDevTools', label: 'Toggle Developer Tools' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Actual Size' },
        { role: 'zoomIn', label: 'Zoom In' },
        { role: 'zoomOut', label: 'Zoom Out' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Toggle Fullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('menu-show-about');
            }
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  return menu;
}

function updateMenu(mainWindow) {
  createMenu(mainWindow);
}

function addToRecentFolders(folderName, folderPath) {
  const items = loadRecentItems();
  if (!items.folders) items.folders = [];
  
  // Remove if already exists
  items.folders = items.folders.filter(f => f.path !== folderPath);
  // Add to beginning
  items.folders.unshift({ name: folderName, path: folderPath });
  // Keep only max items
  items.folders = items.folders.slice(0, MAX_RECENT_FOLDERS);
  
  saveRecentItems(items);
}

function addToRecentFiles(fileName, filePath, folderPath) {
  const items = loadRecentItems();
  if (!items.files) items.files = [];
  
  // Remove if already exists
  items.files = items.files.filter(f => f.path !== filePath);
  // Add to beginning
  items.files.unshift({ name: fileName, path: filePath, folderPath: folderPath });
  // Keep only max items
  items.files = items.files.slice(0, MAX_RECENT_FILES);
  
  saveRecentItems(items);
}

function removeInvalidFolder(folderPath) {
  const items = loadRecentItems();
  if (items.folders) {
    items.folders = items.folders.filter(f => f.path !== folderPath);
    saveRecentItems(items);
  }
}

module.exports = {
  createMenu,
  updateMenu,
  addToRecentFolders,
  addToRecentFiles,
  removeInvalidFolder,
  loadRecentItems
};
