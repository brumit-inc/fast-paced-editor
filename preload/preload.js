const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  onFileNew: (callback) => ipcRenderer.on('file-new', callback),
  onFileOpened: (callback) => ipcRenderer.on('file-opened', (event, data) => callback(data)),
  onRequestSaveContent: (callback) => ipcRenderer.on('request-save-content', callback),
  onFileSaved: (callback) => ipcRenderer.on('file-saved', callback),
  saveContent: (content) => ipcRenderer.send('save-content', content),
  
  // Folder and file operations
  showFolderDialog: () => ipcRenderer.invoke('show-folder-dialog'),
  showFileDialog: () => ipcRenderer.invoke('show-file-dialog'),
  readFolder: (path) => ipcRenderer.invoke('read-folder', path),
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  checkPathExists: (path) => ipcRenderer.invoke('check-path-exists', path),
  
  // Git operations
  gitIsRepo: (path) => ipcRenderer.invoke('git-is-repo', path),
  gitStatus: (path) => ipcRenderer.invoke('git-status', path),
  gitStage: (folderPath, filePath) => ipcRenderer.invoke('git-stage', folderPath, filePath),
  gitUnstage: (folderPath, filePath) => ipcRenderer.invoke('git-unstage', folderPath, filePath),
  gitCommit: (folderPath, message) => ipcRenderer.invoke('git-commit', folderPath, message),
  
  // Recent items sync
  syncRecentFolder: (folderName, folderPath) => ipcRenderer.invoke('sync-recent-folder', folderName, folderPath),
  syncRecentFile: (fileName, filePath, folderPath) => ipcRenderer.invoke('sync-recent-file', fileName, filePath, folderPath),
  removeInvalidFolder: (folderPath) => ipcRenderer.invoke('remove-invalid-folder', folderPath),
  
  // Menu events
  onMenuOpenFile: (callback) => ipcRenderer.on('menu-open-file', callback),
  onMenuOpenFolder: (callback) => ipcRenderer.on('menu-open-folder', callback),
  onOpenFileFromMenu: (callback) => ipcRenderer.on('open-file-from-menu', (event, filePath, folderPath) => callback(filePath, folderPath)),
  onOpenFolderFromMenu: (callback) => ipcRenderer.on('open-folder-from-menu', (event, folderPath) => callback(folderPath)),
  onMenuShowAbout: (callback) => ipcRenderer.on('menu-show-about', callback),
  
  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info')
});

