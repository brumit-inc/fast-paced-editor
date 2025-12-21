// Main renderer process initialization

import { initializeEditor } from './editor.js';
import { initializeNavigation } from './navigation.js';
import { initializeSettings } from './settings.js';
import { 
  loadRecentFolders, 
  loadRecentFiles, 
  updateRecentFoldersUI, 
  updateRecentFilesUI,
  getRecentFolders,
  removeInvalidFolder
} from './recentItems.js';
import { openFolderByPath, handleOpenFolder, handleOpenFile, openFileByPath } from './fileManager.js';
import { initializeGitActions, initializeCommitButton } from './git.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const status = document.getElementById('status');
  const filesView = document.getElementById('filesView');
  const openFolderBtn = document.getElementById('openFolderBtn');

  // Initialize modules
  initializeEditor();
  initializeNavigation();
  initializeSettings();
  initializeGitActions();
  initializeCommitButton();

  // Load recent items
  loadRecentFolders();
  loadRecentFiles();
  updateRecentFoldersUI((path) => openFolderByPath(path, status, filesView));
  updateRecentFilesUI((filePath, folderPath) => {
    openFileByPath(filePath, folderPath, status);
  });

  // Show recent sections if Files view is active
  if (filesView && filesView.classList.contains('active')) {
    const recentSections = document.getElementById('recentSections');
    if (recentSections) {
      recentSections.style.display = 'block';
    }
  }

  // Listen for files view shown event
  document.addEventListener('filesViewShown', () => {
    updateRecentFoldersUI((path) => openFolderByPath(path, status, filesView));
    updateRecentFilesUI((filePath, folderPath) => {
      openFileByPath(filePath, folderPath, status);
    });
  });

  // Open folder button handler
  if (openFolderBtn) {
    openFolderBtn.addEventListener('click', async () => {
      await handleOpenFolder(status, filesView);
    });
  }

  // Auto-open last folder on startup
  const recentFolders = getRecentFolders();
  if (recentFolders.length > 0 && window.electronAPI && window.electronAPI.checkPathExists) {
    const lastFolder = recentFolders[0];
    // Check if folder still exists
    window.electronAPI.checkPathExists(lastFolder.path).then(check => {
      if (check.exists && check.isDirectory) {
        // Auto-open the last folder
        openFolderByPath(lastFolder.path, status, filesView);
      } else {
        // Remove invalid folder from list
        removeInvalidFolder(lastFolder.path);
        updateRecentFoldersUI((path) => openFolderByPath(path, status, filesView));
      }
    });
  }

  // Listen for menu events
  if (window.electronAPI) {
    // Handle "Open File" from menu
    if (window.electronAPI.onMenuOpenFile) {
      window.electronAPI.onMenuOpenFile(() => {
        handleOpenFile(status);
      });
    }

    // Handle "Open Folder" from menu
    if (window.electronAPI.onMenuOpenFolder) {
      window.electronAPI.onMenuOpenFolder(() => {
        handleOpenFolder(status, filesView);
      });
    }

    // Handle opening file from Recents menu
    if (window.electronAPI.onOpenFileFromMenu) {
      window.electronAPI.onOpenFileFromMenu((filePath, folderPath) => {
        openFileByPath(filePath, folderPath, status);
      });
    }

    // Handle opening folder from Recents menu
    if (window.electronAPI.onOpenFolderFromMenu) {
      window.electronAPI.onOpenFolderFromMenu((folderPath) => {
        openFolderByPath(folderPath, status, filesView);
      });
    }

    // Handle About dialog
    if (window.electronAPI.onMenuShowAbout) {
      window.electronAPI.onMenuShowAbout(async () => {
        await showAboutDialog();
      });
    }
  }
});

// About Dialog functionality
async function showAboutDialog() {
  const aboutDialog = document.getElementById('aboutDialog');
  const aboutCloseBtn = document.getElementById('aboutCloseBtn');
  const aboutAppName = document.getElementById('aboutAppName');
  const aboutVersion = document.getElementById('aboutVersion');
  const aboutDescription = document.getElementById('aboutDescription');
  const aboutGitHubLink = document.getElementById('aboutGitHubLink');

  // Get app info
  if (window.electronAPI && window.electronAPI.getAppInfo) {
    try {
      const appInfo = await window.electronAPI.getAppInfo();
      aboutAppName.textContent = appInfo.name;
      aboutVersion.textContent = appInfo.version;
      aboutDescription.textContent = appInfo.description || 'Fast Paced Coding Editor';
      
      // Set GitHub link
      if (appInfo.repository) {
        let repoUrl = '';
        if (typeof appInfo.repository === 'string') {
          repoUrl = appInfo.repository;
        } else if (appInfo.repository.url) {
          repoUrl = appInfo.repository.url;
        } else if (appInfo.repository.type === 'git' && appInfo.repository.url) {
          repoUrl = appInfo.repository.url;
        }
        
        if (repoUrl) {
          // Convert git:// or git@ URLs to https://
          repoUrl = repoUrl.replace(/^git\+/, '').replace(/^git@/, 'https://').replace(/\.git$/, '').replace(/:/, '/');
          aboutGitHubLink.href = repoUrl;
          aboutGitHubLink.style.display = 'inline-flex';
        } else {
          aboutGitHubLink.style.display = 'none';
        }
      } else {
        // Hide link if no repository specified
        aboutGitHubLink.style.display = 'none';
      }
    } catch (err) {
      console.error('Error loading app info:', err);
      // Use defaults
      aboutAppName.textContent = 'Fast Paced Editor';
      aboutVersion.textContent = '1.0.0';
      aboutDescription.textContent = 'Fast Paced Coding Editor';
    }
  }

  // Show dialog
  aboutDialog.style.display = 'flex';

  // Close button handler
  aboutCloseBtn.onclick = () => {
    aboutDialog.style.display = 'none';
  };

  // Close on background click
  aboutDialog.onclick = (e) => {
    if (e.target === aboutDialog) {
      aboutDialog.style.display = 'none';
    }
  };

  // Close on Escape key
  const escapeHandler = (e) => {
    if (e.key === 'Escape' && aboutDialog.style.display === 'flex') {
      aboutDialog.style.display = 'none';
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

