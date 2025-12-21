const { dialog, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const menu = require('./menu');

const execAsync = promisify(exec);

function register(mainWindow) {
  // Show folder dialog
  ipcMain.handle('show-folder-dialog', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    } catch (err) {
      console.error('Error showing folder dialog:', err);
      return null;
    }
  });

  // Show file dialog
  ipcMain.handle('show-file-dialog', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'Text Files', extensions: ['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'java', 'cpp', 'c', 'h', 'xml', 'yaml', 'yml'] },
          { name: 'Code Files', extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'go', 'rs', 'rb', 'php'] },
          { name: 'Web Files', extensions: ['html', 'css', 'js', 'ts', 'jsx', 'tsx'] },
          { name: 'Config Files', extensions: ['json', 'yaml', 'yml', 'xml', 'toml', 'ini'] }
        ]
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    } catch (err) {
      console.error('Error showing file dialog:', err);
      return null;
    }
  });

  // Read folder contents
  ipcMain.handle('read-folder', async (event, folderPath) => {
    try {
      // Security: Validate path
      if (!folderPath || typeof folderPath !== 'string') {
        return { success: false, error: 'Invalid path' };
      }

      const entries = [];
      const items = fs.readdirSync(folderPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(folderPath, item.name);
        entries.push({
          name: item.name,
          path: fullPath,
          kind: item.isDirectory() ? 'directory' : 'file'
        });
      }
      
      return { success: true, entries };
    } catch (err) {
      console.error('Error reading folder:', err);
      return { success: false, error: err.message };
    }
  });

  // Read file contents
  ipcMain.handle('read-file', async (event, filePath) => {
    try {
      // Security: Validate path
      if (!filePath || typeof filePath !== 'string') {
        return { success: false, error: 'Invalid path' };
      }

      // Check file size (prevent reading huge files)
      const stats = fs.statSync(filePath);
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (stats.size > MAX_FILE_SIZE) {
        return { success: false, error: 'File too large (max 10MB)' };
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, content };
    } catch (err) {
      console.error('Error reading file:', err);
      return { success: false, error: err.message };
    }
  });

  // Check if path exists
  ipcMain.handle('check-path-exists', async (event, folderPath) => {
    try {
      if (!folderPath || typeof folderPath !== 'string') {
        return { exists: false };
      }

      const stats = fs.statSync(folderPath);
      return { exists: true, isDirectory: stats.isDirectory() };
    } catch (err) {
      return { exists: false };
    }
  });

  // Git operations
  // Check if a folder is a git repository
  ipcMain.handle('git-is-repo', async (event, folderPath) => {
    try {
      if (!folderPath || typeof folderPath !== 'string') {
        return { isRepo: false };
      }

      const gitPath = path.join(folderPath, '.git');
      const exists = fs.existsSync(gitPath);
      return { isRepo: exists };
    } catch (err) {
      return { isRepo: false };
    }
  });

  // Get git status
  ipcMain.handle('git-status', async (event, folderPath) => {
    try {
      if (!folderPath || typeof folderPath !== 'string') {
        return { success: false, error: 'Invalid path' };
      }

      // Check if it's a git repo first
      const gitPath = path.join(folderPath, '.git');
      if (!fs.existsSync(gitPath)) {
        return { success: false, error: 'Not a git repository' };
      }

      // Get current branch
      let branch = 'unknown';
      try {
        const { stdout: branchOutput } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: folderPath });
        branch = branchOutput.trim() || 'unknown';
      } catch (err) {
        // If branch command fails, try to get it another way or use default
        console.warn('Could not get branch name:', err);
      }

      // Get git status
      const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: folderPath });
      const lines = statusOutput.trim().split('\n').filter(line => line.length > 0);

      const staged = [];
      const unstaged = [];
      const untracked = [];

      for (const line of lines) {
        const status = line.substring(0, 2);
        const filePath = line.substring(3);
        
        const statusX = status[0]; // Index status
        const statusY = status[1]; // Working tree status

        if (statusX === '?' && statusY === '?') {
          // Untracked
          untracked.push({ path: filePath, status: 'untracked' });
        } else if (statusX !== ' ' && statusX !== '?') {
          // Staged
          const statusMap = {
            'A': 'added',
            'M': 'modified',
            'D': 'deleted',
            'R': 'renamed',
            'C': 'copied'
          };
          staged.push({ path: filePath, status: statusMap[statusX] || 'modified' });
        } else if (statusY !== ' ' && statusY !== '?') {
          // Unstaged
          const statusMap = {
            'M': 'modified',
            'D': 'deleted',
            'A': 'added'
          };
          unstaged.push({ path: filePath, status: statusMap[statusY] || 'modified' });
        }
      }

      return {
        success: true,
        branch,
        staged,
        unstaged,
        untracked
      };
    } catch (err) {
      console.error('Error getting git status:', err);
      return { success: false, error: err.message };
    }
  });

  // Stage a file
  ipcMain.handle('git-stage', async (event, folderPath, filePath) => {
    try {
      if (!folderPath || typeof folderPath !== 'string' || !filePath || typeof filePath !== 'string') {
        return { success: false, error: 'Invalid path' };
      }

      // Convert absolute path to relative path if needed
      let relativePath = filePath;
      if (path.isAbsolute(filePath) && filePath.startsWith(folderPath)) {
        relativePath = path.relative(folderPath, filePath);
      }

      // Use relative path for git command
      await execAsync(`git add "${relativePath.replace(/"/g, '\\"')}"`, { cwd: folderPath });
      return { success: true };
    } catch (err) {
      console.error('Error staging file:', err);
      return { success: false, error: err.message };
    }
  });

  // Unstage a file
  ipcMain.handle('git-unstage', async (event, folderPath, filePath) => {
    try {
      if (!folderPath || typeof folderPath !== 'string' || !filePath || typeof filePath !== 'string') {
        return { success: false, error: 'Invalid path' };
      }

      // Convert absolute path to relative path if needed
      let relativePath = filePath;
      if (path.isAbsolute(filePath) && filePath.startsWith(folderPath)) {
        relativePath = path.relative(folderPath, filePath);
      }

      // Use relative path for git command
      await execAsync(`git reset HEAD "${relativePath.replace(/"/g, '\\"')}"`, { cwd: folderPath });
      return { success: true };
    } catch (err) {
      console.error('Error unstaging file:', err);
      return { success: false, error: err.message };
    }
  });

  // Commit changes
  ipcMain.handle('git-commit', async (event, folderPath, message) => {
    try {
      if (!folderPath || typeof folderPath !== 'string') {
        return { success: false, error: 'Invalid path' };
      }

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return { success: false, error: 'Commit message is required' };
      }

      // Escape the message for shell
      const escapedMessage = message.replace(/"/g, '\\"');
      await execAsync(`git commit -m "${escapedMessage}"`, { cwd: folderPath });
      return { success: true };
    } catch (err) {
      console.error('Error committing:', err);
      return { success: false, error: err.message };
    }
  });

  // Recent items sync handlers
  ipcMain.handle('sync-recent-folder', async (event, folderName, folderPath) => {
    try {
      menu.addToRecentFolders(folderName, folderPath);
      menu.updateMenu(mainWindow);
      return { success: true };
    } catch (err) {
      console.error('Error syncing recent folder:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('sync-recent-file', async (event, fileName, filePath, folderPath) => {
    try {
      menu.addToRecentFiles(fileName, filePath, folderPath);
      menu.updateMenu(mainWindow);
      return { success: true };
    } catch (err) {
      console.error('Error syncing recent file:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('remove-invalid-folder', async (event, folderPath) => {
    try {
      menu.removeInvalidFolder(folderPath);
      menu.updateMenu(mainWindow);
      return { success: true };
    } catch (err) {
      console.error('Error removing invalid folder:', err);
      return { success: false, error: err.message };
    }
  });

  // Get app info for About dialog
  ipcMain.handle('get-app-info', async () => {
    try {
      const packagePath = path.join(__dirname, '..', 'package.json');
      const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      return {
        name: packageData.productName || packageData.name,
        version: packageData.version,
        description: packageData.description,
        author: packageData.author,
        license: packageData.license,
        repository: packageData.repository || null
      };
    } catch (err) {
      console.error('Error getting app info:', err);
      return {
        name: 'Fast Paced Editor',
        version: '1.0.0',
        description: 'Fast Paced Coding Editor',
        author: 'Brumit Inc',
        license: 'MIT',
        repository: null
      };
    }
  });
}

module.exports = { register };

