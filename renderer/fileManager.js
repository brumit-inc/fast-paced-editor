// File and folder management

import { getFileIcon, updateStatus } from './utils.js';
import { addToRecentFolders, addToRecentFiles, removeInvalidFolder } from './recentItems.js';
import { refreshGitStatus, setCurrentRepoPath } from './git.js';

let currentFolderPath = null;
const expandedFolders = new Set(); // Track expanded folder paths

export function getCurrentFolderPath() {
  return currentFolderPath;
}

export async function openFolderByPath(folderPath, statusElement, filesView) {
  try {
    if (!window.electronAPI || !window.electronAPI.checkPathExists) {
      updateStatus('Electron API not available', statusElement);
      return false;
    }

    const check = await window.electronAPI.checkPathExists(folderPath);
    if (!check.exists || !check.isDirectory) {
      updateStatus('Folder not found', statusElement);
      removeInvalidFolder(folderPath);
      return false;
    }

    currentFolderPath = folderPath;
    const folderName = folderPath.split(/[/\\]/).pop();
    
    // Clear expanded folders when opening a new root folder
    expandedFolders.clear();
    
    document.getElementById('folderPath').textContent = folderName;
    document.getElementById('folderContent').style.display = 'block';
    document.getElementById('noFolder').style.display = 'none';
    
    if (filesView.classList.contains('active')) {
      document.getElementById('recentSections').style.display = 'block';
    }
    
    await loadFolderContentsByPath(folderPath, statusElement);
    
    // Set current repo path and refresh git status
    setCurrentRepoPath(folderPath);
    await refreshGitStatus();
    
    addToRecentFolders(folderName, folderPath);
    
    updateStatus(`Opened: ${folderName}`, statusElement);
    return true;
  } catch (err) {
    console.error('Error opening folder by path:', err);
    updateStatus('Error opening folder', statusElement);
    return false;
  }
}

async function loadFolderContentsByPath(folderPath, statusElement) {
  const fileTree = document.getElementById('fileTree');
  fileTree.innerHTML = '';
  
  try {
    await renderFolderTree(folderPath, fileTree, folderPath, statusElement, 0);
  } catch (err) {
    console.error('Error loading folder contents:', err);
    updateStatus('Error loading folder contents', statusElement);
  }
}

async function renderFolderTree(folderPath, parentElement, rootFolderPath, statusElement, depth = 0) {
  try {
    const result = await window.electronAPI.readFolder(folderPath);
    if (!result.success) {
      return;
    }
    
    const entries = result.entries
      .filter(entry => entry.name !== '.git') // Filter out .git folders
      .sort((a, b) => {
        if (a.kind === b.kind) return a.name.localeCompare(b.name);
        return a.kind === 'directory' ? -1 : 1;
      });
    
    for (const entry of entries) {
      const li = document.createElement('li');
      if (depth > 0) {
        li.style.paddingLeft = `${depth * 20}px`;
      }
      
      if (entry.kind === 'directory') {
        li.className = 'folder';
        const isExpanded = expandedFolders.has(entry.path);
        const expandIcon = isExpanded ? '▼' : '▶';
        li.innerHTML = `<span class="expand-icon">${expandIcon}</span> 📁 ${entry.name}`;
        
        li.addEventListener('click', async (e) => {
          e.stopPropagation();
          await toggleFolder(entry.path, entry.name, rootFolderPath, statusElement, depth);
        });
        
        // If folder is expanded, render its contents
        if (isExpanded) {
          const subList = document.createElement('ul');
          subList.className = 'file-tree nested';
          subList.style.paddingLeft = '0';
          li.appendChild(subList);
          await renderFolderTree(entry.path, subList, rootFolderPath, statusElement, depth + 1);
        }
      } else {
        li.className = 'file';
        const icon = getFileIcon(entry.name);
        li.innerHTML = `<span class="expand-icon" style="visibility: hidden;">▶</span> ${icon} ${entry.name}`;
        
        li.addEventListener('click', async (e) => {
          e.stopPropagation();
          await openFileByPath(entry.path, rootFolderPath, statusElement);
        });
      }
      
      parentElement.appendChild(li);
    }
  } catch (err) {
    console.error('Error rendering folder tree:', err);
  }
}

async function toggleFolder(folderPath, folderName, rootFolderPath, statusElement, depth) {
  const isExpanded = expandedFolders.has(folderPath);
  
  if (isExpanded) {
    expandedFolders.delete(folderPath);
  } else {
    expandedFolders.add(folderPath);
  }
  
  // Re-render the entire tree to show updated state
  const fileTree = document.getElementById('fileTree');
  fileTree.innerHTML = '';
  await renderFolderTree(rootFolderPath, fileTree, rootFolderPath, statusElement, 0);
}

export async function openFileByPath(filePath, folderPath, statusElement) {
  try {
    // First, open the folder if not already open
    if (currentFolderPath !== folderPath) {
      await openFolderByPath(folderPath, statusElement, document.getElementById('filesView'));
    }
    
    // Read file content
    if (!window.electronAPI || !window.electronAPI.readFile) {
      updateStatus('Electron API not available', statusElement);
      return;
    }

    const result = await window.electronAPI.readFile(filePath);
    if (!result.success) {
      updateStatus(`Error: ${result.error}`, statusElement);
      return;
    }
    
    const editor = document.getElementById('editor');
    editor.value = result.content;
    editor.style.display = 'block';
    
    const gitView = document.getElementById('gitView');
    const filesView = document.getElementById('filesView');
    gitView.classList.remove('active');
    filesView.classList.remove('active');
    
    const buttons = document.querySelectorAll('.circle-btn');
    buttons.forEach(b => b.classList.remove('active'));
    document.getElementById('editorBtn').classList.add('active');
    
    const fileName = filePath.split(/[/\\]/).pop();
    addToRecentFiles(fileName, filePath, folderPath);
    
    updateStatus(`Opened: ${fileName}`, statusElement);
  } catch (err) {
    console.error('Error opening file:', err);
    updateStatus('Error opening file', statusElement);
  }
}

export async function handleOpenFolder(statusElement, filesView) {
  try {
    if (window.electronAPI && window.electronAPI.showFolderDialog) {
      const folderPath = await window.electronAPI.showFolderDialog();
      if (folderPath) {
        await openFolderByPath(folderPath, statusElement, filesView);
      }
    } else {
      // Fallback to File System Access API (browser only)
      const folderHandle = await window.showDirectoryPicker();
      // Note: File System Access API doesn't work in Electron, this is just a fallback
      console.warn('File System Access API not supported in Electron');
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Error opening folder:', err);
      updateStatus('Error opening folder', statusElement);
    }
  }
}

export async function handleOpenFile(statusElement) {
  try {
    if (window.electronAPI && window.electronAPI.showFileDialog) {
      const filePath = await window.electronAPI.showFileDialog();
      if (filePath) {
        // Extract folder path (parent directory)
        // Handle both Windows (\) and Unix (/) path separators
        const lastSeparator = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
        const folderPath = lastSeparator > 0 ? filePath.substring(0, lastSeparator) : filePath;
        await openFileByPath(filePath, folderPath, statusElement);
      }
    } else {
      // Fallback to File System Access API (browser only)
      const fileHandle = await window.showOpenFilePicker();
      // Note: File System Access API doesn't work in Electron, this is just a fallback
      console.warn('File System Access API not supported in Electron');
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Error opening file:', err);
      updateStatus('Error opening file', statusElement);
    }
  }
}

