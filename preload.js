const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onFileNew: (callback) => ipcRenderer.on('file-new', callback),
  onFileOpened: (callback) => ipcRenderer.on('file-opened', (event, data) => callback(data)),
  onRequestSaveContent: (callback) => ipcRenderer.on('request-save-content', callback),
  onFileSaved: (callback) => ipcRenderer.on('file-saved', callback),
  saveContent: (content) => ipcRenderer.send('save-content', content)
});