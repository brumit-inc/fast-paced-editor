// File and folder management

import { getFileIcon, updateStatus } from './utils.js';
import { addToRecentFolders, addToRecentFiles, removeInvalidFolder } from './recentItems.js';
import { refreshGitStatus, setCurrentRepoPath } from './git.js';

let currentFolderPath = null;
const expandedFolders = new Set(); // Track expanded folder paths
let selectedFilePath = null; // Track selected file/folder
let fileTreeData = new Map(); // Cache folder contents
let searchFilter = ''; // Current search filter
let currentFilePath = null; // Track currently open file path for saving

export function getCurrentFolderPath() {
  return currentFolderPath;
}

export function getCurrentFilePath() {
  return currentFilePath;
}

export function setCurrentFilePath(filePath) {
  currentFilePath = filePath;
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
    
    // Clear expanded folders and cache when opening a new root folder
    expandedFolders.clear();
    fileTreeData.clear();
    selectedFilePath = null;
    searchFilter = '';
    
    // Clear search input
    const searchInput = document.getElementById('fileTreeSearch');
    if (searchInput) {
      searchInput.value = '';
    }
    
    // Show full path in folder path display
    const folderPathElement = document.getElementById('folderPath');
    folderPathElement.textContent = folderPath;
    folderPathElement.title = folderPath; // Tooltip for long paths
    document.getElementById('folderContent').style.display = 'block';
    document.getElementById('noFolder').style.display = 'none';
    document.getElementById('fileTreeSearch').style.display = 'block';
    document.getElementById('collapseAllBtn').style.display = 'inline-block';
    document.getElementById('expandAllBtn').style.display = 'inline-block';
    
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

// Search functionality
export function setupFileTreeSearch() {
  const searchInput = document.getElementById('fileTreeSearch');
  if (!searchInput) return;
  
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchFilter = e.target.value;
      if (currentFolderPath) {
        const fileTree = document.getElementById('fileTree');
        fileTree.innerHTML = '';
        renderFolderTree(currentFolderPath, fileTree, currentFolderPath, 
          document.getElementById('status'), 0);
      }
    }, 300);
  });
}

// Expand/Collapse all functionality
export function setupExpandCollapseAll() {
  const collapseAllBtn = document.getElementById('collapseAllBtn');
  const expandAllBtn = document.getElementById('expandAllBtn');
  
  if (collapseAllBtn) {
    collapseAllBtn.addEventListener('click', () => {
      expandedFolders.clear();
      if (currentFolderPath) {
        const fileTree = document.getElementById('fileTree');
        fileTree.innerHTML = '';
        renderFolderTree(currentFolderPath, fileTree, currentFolderPath, 
          document.getElementById('status'), 0);
      }
    });
  }
  
  if (expandAllBtn) {
    expandAllBtn.addEventListener('click', async () => {
      if (!currentFolderPath) return;
      
      // Recursively expand all folders
      async function expandAllFolders(folderPath) {
        expandedFolders.add(folderPath);
        const result = await window.electronAPI.readFolder(folderPath);
        if (result.success) {
          for (const entry of result.entries) {
            if (entry.kind === 'directory' && entry.name !== '.git') {
              await expandAllFolders(entry.path);
            }
          }
        }
      }
      
      await expandAllFolders(currentFolderPath);
      fileTreeData.clear(); // Clear cache to force refresh
      const fileTree = document.getElementById('fileTree');
      fileTree.innerHTML = '';
      await renderFolderTree(currentFolderPath, fileTree, currentFolderPath, 
        document.getElementById('status'), 0);
    });
  }
}

// Keyboard navigation
export function setupKeyboardNavigation() {
  document.addEventListener('keydown', (e) => {
    const filesView = document.getElementById('filesView');
    if (!filesView || !filesView.classList.contains('active')) return;
    
    const selected = document.querySelector('.file-tree li.selected');
    if (!selected) return;
    
    const allItems = Array.from(document.querySelectorAll('.file-tree li'));
    const currentIndex = allItems.indexOf(selected);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < allItems.length - 1) {
          const nextItem = allItems[currentIndex + 1];
          setSelected(nextItem.dataset.path);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          const prevItem = allItems[currentIndex - 1];
          setSelected(prevItem.dataset.path);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (selected.dataset.kind === 'directory' && !expandedFolders.has(selected.dataset.path)) {
          selected.click();
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (selected.dataset.kind === 'directory' && expandedFolders.has(selected.dataset.path)) {
          selected.click();
        }
        break;
      case 'Enter':
        e.preventDefault();
        selected.click();
        break;
    }
  });
}

function matchesSearch(entry, searchTerm) {
  if (!searchTerm) return true;
  const lowerSearch = searchTerm.toLowerCase();
  return entry.name.toLowerCase().includes(lowerSearch) ||
         entry.path.toLowerCase().includes(lowerSearch);
}

async function renderFolderTree(folderPath, parentElement, rootFolderPath, statusElement, depth = 0) {
  try {
    // Check cache first
    let entries;
    if (fileTreeData.has(folderPath)) {
      entries = fileTreeData.get(folderPath);
    } else {
      const result = await window.electronAPI.readFolder(folderPath);
      if (!result.success) {
        return;
      }
      entries = result.entries
        .filter(entry => entry.name !== '.git') // Filter out .git folders
        .sort((a, b) => {
          if (a.kind === b.kind) return a.name.localeCompare(b.name);
          return a.kind === 'directory' ? -1 : 1;
        });
      fileTreeData.set(folderPath, entries);
    }
    
    // Apply search filter
    const filteredEntries = entries.filter(entry => matchesSearch(entry, searchFilter));
    
    // Separate folders and files
    const folders = filteredEntries.filter(entry => entry.kind === 'directory');
    const files = filteredEntries.filter(entry => entry.kind === 'file');
    
    // Render folders first
    for (const entry of folders) {
      const li = document.createElement('li');
      li.dataset.path = entry.path;
      li.dataset.kind = entry.kind;
      
      if (entry.path === selectedFilePath) {
        li.classList.add('selected');
      }
      
      li.className = 'folder';
      const isExpanded = expandedFolders.has(entry.path);
      const expandIconClass = isExpanded ? 'expanded' : '';
      const icon = '📁';
      
      li.innerHTML = `
        <span class="expand-icon ${expandIconClass}">▶</span>
        <span class="folder-icon">${icon}</span>
        <span class="file-name">${entry.name}</span>
      `;
      
      li.addEventListener('click', async (e) => {
        e.stopPropagation();
        setSelected(entry.path);
        await toggleFolder(entry.path, entry.name, rootFolderPath, statusElement, depth, li);
      });
      
      // If folder is expanded, render its contents (folders and files nested inside)
      if (isExpanded) {
        const folderHeader = document.createElement('div');
        folderHeader.className = 'folder-expanded-header';
        folderHeader.textContent = entry.name;
        li.appendChild(folderHeader);
        
        const subList = document.createElement('ul');
        subList.className = 'file-tree nested';
        li.appendChild(subList);
        await renderFolderTree(entry.path, subList, rootFolderPath, statusElement, depth + 1);
      }
      
      parentElement.appendChild(li);
    }
    
    // Render files after folders, nested under the current folder
    for (const entry of files) {
      const li = document.createElement('li');
      li.dataset.path = entry.path;
      li.dataset.kind = entry.kind;
      
      if (entry.path === selectedFilePath) {
        li.classList.add('selected');
      }
      
      li.className = 'file';
      const icon = getFileIcon(entry.name);
      
      li.innerHTML = `
        <span class="expand-icon" style="visibility: hidden;">▶</span>
        <span class="file-icon">${icon}</span>
        <span class="file-name">${entry.name}</span>
      `;
      
      li.addEventListener('click', async (e) => {
        e.stopPropagation();
        setSelected(entry.path);
        await openFileByPath(entry.path, rootFolderPath, statusElement);
      });
      
      parentElement.appendChild(li);
    }
  } catch (err) {
    console.error('Error rendering folder tree:', err);
  }
}

function setSelected(path) {
  // Remove previous selection
  const prevSelected = document.querySelector('.file-tree li.selected');
  if (prevSelected) {
    prevSelected.classList.remove('selected');
  }
  
  // Set new selection
  selectedFilePath = path;
  const newSelected = document.querySelector(`.file-tree li[data-path="${path}"]`);
  if (newSelected) {
    newSelected.classList.add('selected');
    // Scroll into view
    newSelected.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

async function toggleFolder(folderPath, folderName, rootFolderPath, statusElement, depth, folderElement) {
  const isExpanded = expandedFolders.has(folderPath);
  const expandIcon = folderElement.querySelector('.expand-icon');
  
  if (isExpanded) {
    // Collapse: remove the nested list and header
    expandedFolders.delete(folderPath);
    expandIcon.classList.remove('expanded');
    const folderHeader = folderElement.querySelector('.folder-expanded-header');
    if (folderHeader) {
      folderHeader.remove();
    }
    const nestedList = folderElement.querySelector('.file-tree.nested');
    if (nestedList) {
      nestedList.remove();
    }
  } else {
    // Expand: add the nested list and header
    expandedFolders.add(folderPath);
    expandIcon.classList.add('expanded');
    
    // Check if we already have children rendered
    if (!folderElement.querySelector('.file-tree.nested')) {
      const folderHeader = document.createElement('div');
      folderHeader.className = 'folder-expanded-header';
      folderHeader.textContent = folderName;
      folderElement.appendChild(folderHeader);
      
      const subList = document.createElement('ul');
      subList.className = 'file-tree nested';
      folderElement.appendChild(subList);
      await renderFolderTree(folderPath, subList, rootFolderPath, statusElement, depth + 1);
    }
  }
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
    const editorContainer = document.querySelector('.editor-container');
    editor.value = result.content;
    
    if (editorContainer) {
      editorContainer.style.display = 'flex';
    }
    
    const gitView = document.getElementById('gitView');
    const filesView = document.getElementById('filesView');
    gitView.classList.remove('active');
    filesView.classList.remove('active');
    
    const buttons = document.querySelectorAll('.circle-btn');
    buttons.forEach(b => b.classList.remove('active'));
    document.getElementById('editorBtn').classList.add('active');
    
    const fileName = filePath.split(/[/\\]/).pop();
    addToRecentFiles(fileName, filePath, folderPath);
    
    // Track current file path for saving
    currentFilePath = filePath;
    
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

export async function saveCurrentFile(statusElement) {
  try {
    if (!currentFilePath) {
      // No file open, trigger Save As instead
      return await saveFileAs(statusElement);
    }

    const editor = document.getElementById('editor');
    if (!editor) {
      updateStatus('Editor not found', statusElement);
      return false;
    }

    if (!window.electronAPI || !window.electronAPI.saveFile) {
      updateStatus('Electron API not available', statusElement);
      return false;
    }

    const result = await window.electronAPI.saveFile(editor.value, currentFilePath);
    if (result.success) {
      updateStatus('File saved', statusElement);
      // Refresh git status if in a repo
      if (currentFolderPath) {
        await refreshGitStatus();
      }
      return true;
    } else {
      updateStatus(`Error: ${result.error}`, statusElement);
      return false;
    }
  } catch (err) {
    console.error('Error saving file:', err);
    updateStatus('Error saving file', statusElement);
    return false;
  }
}

export async function saveFileAs(statusElement) {
  try {
    const editor = document.getElementById('editor');
    if (!editor) {
      updateStatus('Editor not found', statusElement);
      return false;
    }

    if (!window.electronAPI || !window.electronAPI.saveFileAs) {
      updateStatus('Electron API not available', statusElement);
      return false;
    }

    const result = await window.electronAPI.saveFileAs(editor.value);
    if (result.success && result.filePath) {
      // Update current file path
      currentFilePath = result.filePath;
      
      // Extract folder path
      const lastSeparator = Math.max(result.filePath.lastIndexOf('/'), result.filePath.lastIndexOf('\\'));
      const folderPath = lastSeparator > 0 ? result.filePath.substring(0, lastSeparator) : result.filePath;
      
      // If folder is not open, open it
      if (currentFolderPath !== folderPath) {
        await openFolderByPath(folderPath, statusElement, document.getElementById('filesView'));
      }
      
      // Add to recent files
      const fileName = result.filePath.split(/[/\\]/).pop();
      addToRecentFiles(fileName, result.filePath, folderPath);
      
      updateStatus(`Saved: ${fileName}`, statusElement);
      
      // Refresh git status if in a repo
      if (currentFolderPath) {
        await refreshGitStatus();
      }
      return true;
    } else {
      if (result.error) {
        updateStatus(`Error: ${result.error}`, statusElement);
      }
      return false;
    }
  } catch (err) {
    console.error('Error saving file as:', err);
    updateStatus('Error saving file', statusElement);
    return false;
  }
}
