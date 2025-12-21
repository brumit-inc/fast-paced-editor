// Recent folders and files management

import { getFileIcon } from './utils.js';

const MAX_RECENT_FOLDERS = 10;
const MAX_RECENT_FILES = 10;

let recentFolders = [];
let recentFiles = [];

export function loadRecentFolders() {
  try {
    const stored = localStorage.getItem('recentFolders');
    if (stored) {
      recentFolders = JSON.parse(stored);
      // Sync to main process for menu on startup
      if (window.electronAPI && window.electronAPI.syncRecentFolder) {
        recentFolders.forEach(folder => {
          window.electronAPI.syncRecentFolder(folder.name, folder.path).catch(err => {
            console.error('Error syncing recent folder to menu on startup:', err);
          });
        });
      }
    }
  } catch (e) {
    console.error('Error loading recent folders:', e);
  }
}

function saveRecentFolders() {
  try {
    localStorage.setItem('recentFolders', JSON.stringify(recentFolders));
  } catch (e) {
    console.error('Error saving recent folders:', e);
  }
}

export function addToRecentFolders(folderName, folderPath) {
  recentFolders = recentFolders.filter(f => f.path !== folderPath);
  recentFolders.unshift({ name: folderName, path: folderPath });
  recentFolders = recentFolders.slice(0, MAX_RECENT_FOLDERS);
  saveRecentFolders();
  updateRecentFoldersUI();
  
  // Sync with main process for menu
  if (window.electronAPI && window.electronAPI.syncRecentFolder) {
    window.electronAPI.syncRecentFolder(folderName, folderPath).catch(err => {
      console.error('Error syncing recent folder to menu:', err);
    });
  }
}

export function updateRecentFoldersUI(openFolderCallback) {
  const recentFoldersList = document.getElementById('recentFoldersList');
  if (!recentFoldersList) return;
  
  recentFoldersList.innerHTML = '';
  
  if (recentFolders.length > 0) {
    recentFolders.forEach((folder) => {
      const li = document.createElement('li');
      li.className = 'folder';
      li.innerHTML = `📁 ${folder.name}`;
      li.style.cursor = 'pointer';
      li.title = folder.path;
      li.addEventListener('click', async () => {
        if (openFolderCallback) {
          await openFolderCallback(folder.path);
        }
      });
      recentFoldersList.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.style.color = '#888';
    li.textContent = 'No recent folders';
    recentFoldersList.appendChild(li);
  }
}

export function loadRecentFiles() {
  try {
    const stored = localStorage.getItem('recentFiles');
    if (stored) {
      recentFiles = JSON.parse(stored);
      // Sync to main process for menu on startup
      if (window.electronAPI && window.electronAPI.syncRecentFile) {
        recentFiles.forEach(file => {
          window.electronAPI.syncRecentFile(file.name, file.path, file.folderPath).catch(err => {
            console.error('Error syncing recent file to menu on startup:', err);
          });
        });
      }
    }
  } catch (e) {
    console.error('Error loading recent files:', e);
  }
}

function saveRecentFiles() {
  try {
    localStorage.setItem('recentFiles', JSON.stringify(recentFiles));
  } catch (e) {
    console.error('Error saving recent files:', e);
  }
}

export function addToRecentFiles(fileName, filePath, folderPath) {
  recentFiles = recentFiles.filter(f => f.path !== filePath);
  recentFiles.unshift({ 
    name: fileName, 
    path: filePath,
    folderPath: folderPath 
  });
  recentFiles = recentFiles.slice(0, MAX_RECENT_FILES);
  saveRecentFiles();
  updateRecentFilesUI();
  
  // Sync with main process for menu
  if (window.electronAPI && window.electronAPI.syncRecentFile) {
    window.electronAPI.syncRecentFile(fileName, filePath, folderPath).catch(err => {
      console.error('Error syncing recent file to menu:', err);
    });
  }
}

export function updateRecentFilesUI(openFileCallback) {
  const recentFilesList = document.getElementById('recentFilesList');
  if (!recentFilesList) return;
  
  recentFilesList.innerHTML = '';
  
  if (recentFiles.length > 0) {
    recentFiles.forEach((file) => {
      const li = document.createElement('li');
      li.className = 'file';
      const icon = getFileIcon(file.name);
      li.innerHTML = `${icon} ${file.name}`;
      li.style.cursor = 'pointer';
      li.title = file.path;
      li.addEventListener('click', async () => {
        if (openFileCallback) {
          await openFileCallback(file.path, file.folderPath);
        }
      });
      recentFilesList.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.style.color = '#888';
    li.textContent = 'No recent files';
    recentFilesList.appendChild(li);
  }
}

export function getRecentFolders() {
  return recentFolders;
}

export function removeInvalidFolder(folderPath) {
  recentFolders = recentFolders.filter(f => f.path !== folderPath);
  saveRecentFolders();
  
  // Sync with main process for menu
  if (window.electronAPI && window.electronAPI.removeInvalidFolder) {
    window.electronAPI.removeInvalidFolder(folderPath).catch(err => {
      console.error('Error removing invalid folder from menu:', err);
    });
  }
}

