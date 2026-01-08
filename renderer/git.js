// Git status display and operations

let currentRepoPath = null;

export function setCurrentRepoPath(path) {
  currentRepoPath = path;
}

export function getCurrentRepoPath() {
  return currentRepoPath;
}

export async function refreshGitStatus() {
  if (!currentRepoPath) {
    clearGitStatus();
    return;
  }

  if (!window.electronAPI || !window.electronAPI.gitIsRepo) {
    console.error('Git API not available');
    return;
  }

  try {
    // Check if it's a git repo
    const repoCheck = await window.electronAPI.gitIsRepo(currentRepoPath);
    if (!repoCheck.isRepo) {
      showNoGitRepo();
      return;
    }

    // Get git status
    const status = await window.electronAPI.gitStatus(currentRepoPath);
    if (!status.success) {
      showError(status.error || 'Failed to get git status');
      return;
    }

    displayGitStatus(status);
    
    // Also refresh commit history
    await refreshCommitHistory();
  } catch (err) {
    console.error('Error refreshing git status:', err);
    showError('Error refreshing git status');
  }
}

function clearGitStatus() {
  const branchName = document.getElementById('branchName');
  const repoPath = document.getElementById('repoPath');
  const stagedSection = document.getElementById('stagedSection');
  const unstagedSection = document.getElementById('unstagedSection');
  const untrackedSection = document.getElementById('untrackedSection');
  const commitHistorySection = document.getElementById('commitHistorySection');
  const noGitRepo = document.getElementById('noGitRepo');

  if (branchName) branchName.textContent = '-';
  if (repoPath) repoPath.textContent = 'No folder opened';
  if (stagedSection) stagedSection.style.display = 'none';
  if (unstagedSection) unstagedSection.style.display = 'none';
  if (untrackedSection) untrackedSection.style.display = 'none';
  if (commitHistorySection) commitHistorySection.style.display = 'none';
  if (noGitRepo) noGitRepo.style.display = 'block';
}

function showNoGitRepo() {
  const branchName = document.getElementById('branchName');
  const repoPath = document.getElementById('repoPath');
  const stagedSection = document.getElementById('stagedSection');
  const unstagedSection = document.getElementById('unstagedSection');
  const untrackedSection = document.getElementById('untrackedSection');
  const commitHistorySection = document.getElementById('commitHistorySection');
  const noGitRepo = document.getElementById('noGitRepo');

  if (branchName) branchName.textContent = '-';
  if (repoPath) repoPath.textContent = currentRepoPath ? currentRepoPath.split(/[/\\]/).pop() : 'No folder opened';
  if (stagedSection) stagedSection.style.display = 'none';
  if (unstagedSection) unstagedSection.style.display = 'none';
  if (untrackedSection) untrackedSection.style.display = 'none';
  if (commitHistorySection) commitHistorySection.style.display = 'none';
  if (noGitRepo) noGitRepo.style.display = 'block';
}

function showError(message) {
  const noGitRepo = document.getElementById('noGitRepo');
  if (noGitRepo) {
    noGitRepo.textContent = message;
    noGitRepo.style.display = 'block';
  }
}

function displayGitStatus(status) {
  const branchName = document.getElementById('branchName');
  const repoPath = document.getElementById('repoPath');
  const stagedSection = document.getElementById('stagedSection');
  const unstagedSection = document.getElementById('unstagedSection');
  const untrackedSection = document.getElementById('untrackedSection');
  const commitSection = document.getElementById('commitSection');
  const stagedFiles = document.getElementById('stagedFiles');
  const unstagedFiles = document.getElementById('unstagedFiles');
  const untrackedFiles = document.getElementById('untrackedFiles');
  const noGitRepo = document.getElementById('noGitRepo');

  // Update branch and repo info
  if (branchName) branchName.textContent = status.branch || '-';
  if (repoPath) repoPath.textContent = currentRepoPath ? currentRepoPath.split(/[/\\]/).pop() : 'No folder opened';
  if (noGitRepo) noGitRepo.style.display = 'none';

  // Display staged files
  if (status.staged && status.staged.length > 0) {
    if (stagedSection) stagedSection.style.display = 'block';
    if (stagedFiles) {
      stagedFiles.innerHTML = status.staged.map(file => createFileElement(file, true)).join('');
    }
  } else {
    if (stagedSection) stagedSection.style.display = 'none';
    if (stagedFiles) stagedFiles.innerHTML = '';
  }

  // Display unstaged files
  if (status.unstaged && status.unstaged.length > 0) {
    if (unstagedSection) unstagedSection.style.display = 'block';
    if (unstagedFiles) {
      unstagedFiles.innerHTML = status.unstaged.map(file => createFileElement(file, false)).join('');
    }
  } else {
    if (unstagedSection) unstagedSection.style.display = 'none';
    if (unstagedFiles) unstagedFiles.innerHTML = '';
  }

  // Display untracked files
  if (status.untracked && status.untracked.length > 0) {
    if (untrackedSection) untrackedSection.style.display = 'block';
    if (untrackedFiles) {
      untrackedFiles.innerHTML = status.untracked.map(file => createFileElement(file, false)).join('');
    }
  } else {
    if (untrackedSection) untrackedSection.style.display = 'none';
    if (untrackedFiles) untrackedFiles.innerHTML = '';
  }

  // Show commit section if there are staged files
  if (commitSection) {
    if (status.staged && status.staged.length > 0) {
      commitSection.style.display = 'block';
    } else {
      commitSection.style.display = 'none';
    }
  }
}

function createFileElement(file, isStaged) {
  const statusBadge = getStatusBadge(file.status);
  const actionButton = isStaged 
    ? `<button class="git-action-btn" data-action="unstage" data-file="${escapeHtml(file.path)}" title="Unstage">−</button>`
    : `<button class="git-action-btn" data-action="stage" data-file="${escapeHtml(file.path)}" title="Stage">+</button>`;
  
  return `
    <div class="git-file">
      ${statusBadge}
      <span class="git-file-path">${escapeHtml(file.path)}</span>
      ${actionButton}
    </div>
  `;
}

function getStatusBadge(status) {
  const badges = {
    'modified': '<span class="git-status-badge modified">M</span>',
    'added': '<span class="git-status-badge added">A</span>',
    'deleted': '<span class="git-status-badge deleted">D</span>',
    'renamed': '<span class="git-status-badge renamed">R</span>',
    'copied': '<span class="git-status-badge copied">C</span>',
    'untracked': '<span class="git-status-badge untracked">U</span>'
  };
  return badges[status] || '<span class="git-status-badge modified">?</span>';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Handle file actions (stage/unstage)
export function initializeGitActions() {
  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('git-action-btn')) {
      const action = e.target.getAttribute('data-action');
      const filePath = e.target.getAttribute('data-file');
      
      if (!currentRepoPath || !filePath) {
        return;
      }

      try {
        let result;
        if (action === 'stage') {
          result = await window.electronAPI.gitStage(currentRepoPath, filePath);
        } else if (action === 'unstage') {
          result = await window.electronAPI.gitUnstage(currentRepoPath, filePath);
        }

        if (result && result.success) {
          // Refresh git status after action
          await refreshGitStatus();
        } else {
          alert(result?.error || 'Failed to perform action');
        }
      } catch (err) {
        console.error('Error performing git action:', err);
        alert('Error performing action: ' + err.message);
      }
    }
  });
}

// Handle commit
export async function commitChanges(message) {
  if (!currentRepoPath) {
    alert('No repository open');
    return false;
  }

  if (!message || message.trim().length === 0) {
    alert('Commit message is required');
    return false;
  }

  try {
    const result = await window.electronAPI.gitCommit(currentRepoPath, message);
    if (result && result.success) {
      // Clear commit message
      const commitMessage = document.getElementById('commitMessage');
      if (commitMessage) commitMessage.value = '';
      
      // Refresh git status and commit history after commit
      await refreshGitStatus();
      await refreshCommitHistory();
      return true;
    } else {
      alert(result?.error || 'Failed to commit');
      return false;
    }
  } catch (err) {
    console.error('Error committing:', err);
    alert('Error committing: ' + err.message);
    return false;
  }
}

// Initialize commit button handler
export function initializeCommitButton() {
  const commitBtn = document.getElementById('commitBtn');
  const commitMessage = document.getElementById('commitMessage');
  const refreshBtn = document.getElementById('refreshGitBtn');

  if (commitBtn && commitMessage) {
    commitBtn.addEventListener('click', async () => {
      const message = commitMessage.value.trim();
      await commitChanges(message);
    });

    // Allow committing with Ctrl+Enter
    commitMessage.addEventListener('keydown', async (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        const message = commitMessage.value.trim();
        await commitChanges(message);
      }
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await refreshGitStatus();
      await refreshCommitHistory();
    });
  }
}

// Commit history functions
export async function refreshCommitHistory() {
  if (!currentRepoPath) {
    clearCommitHistory();
    return;
  }

  if (!window.electronAPI || !window.electronAPI.gitLog) {
    console.error('Git Log API not available');
    return;
  }

  try {
    // Check if it's a git repo
    const repoCheck = await window.electronAPI.gitIsRepo(currentRepoPath);
    if (!repoCheck.isRepo) {
      clearCommitHistory();
      return;
    }

    // Get commit history (last 20 commits)
    const logResult = await window.electronAPI.gitLog(currentRepoPath, 20);
    if (!logResult.success) {
      console.error('Failed to get commit history:', logResult.error);
      clearCommitHistory();
      return;
    }

    displayCommitHistory(logResult.commits || []);
  } catch (err) {
    console.error('Error refreshing commit history:', err);
    clearCommitHistory();
  }
}

function clearCommitHistory() {
  const commitHistorySection = document.getElementById('commitHistorySection');
  const commitHistory = document.getElementById('commitHistory');
  
  if (commitHistorySection) commitHistorySection.style.display = 'none';
  if (commitHistory) commitHistory.innerHTML = '';
}

function displayCommitHistory(commits) {
  const commitHistorySection = document.getElementById('commitHistorySection');
  const commitHistory = document.getElementById('commitHistory');

  if (!commitHistorySection || !commitHistory) {
    return;
  }

  if (commits.length === 0) {
    commitHistorySection.style.display = 'none';
    commitHistory.innerHTML = '';
    return;
  }

  commitHistorySection.style.display = 'block';
  commitHistory.innerHTML = commits.map(commit => createCommitElement(commit)).join('');
}

function createCommitElement(commit) {
  const shortHash = commit.hash ? commit.hash.substring(0, 7) : '';
  const formattedDate = formatCommitDate(commit.date);
  
  return `
    <div class="git-commit-item">
      <div class="git-commit-header">
        <span class="git-commit-hash">${escapeHtml(shortHash)}</span>
        <span class="git-commit-author">${escapeHtml(commit.author)}</span>
        <span class="git-commit-date">${escapeHtml(formattedDate)}</span>
      </div>
      <div class="git-commit-message">${escapeHtml(commit.message)}</div>
    </div>
  `;
}

function formatCommitDate(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    // Format as date if older than a week
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  } catch (err) {
    return dateString;
  }
}

