// Navigation between views

import { refreshGitStatus, refreshCommitHistory } from './git.js';

export function initializeNavigation() {
  const buttons = document.querySelectorAll('.circle-btn');
  const editor = document.getElementById('editor');
  const gitView = document.getElementById('gitView');
  const filesView = document.getElementById('filesView');
  const settingsView = document.getElementById('settingsView');
  const settingsBtn = document.getElementById('settingsBtn');

  if (!buttons.length || !editor || !gitView || !filesView || !settingsView) {
    console.error('Navigation elements not found');
    return;
  }

  // Navigation button handlers
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Hide all main views
      editor.style.display = 'none';
      gitView.classList.remove('active');
      filesView.classList.remove('active');
      settingsView.classList.remove('active');
      
      if (btn.id === 'gitBtn') {
        gitView.classList.add('active');
        // Refresh git status and commit history when git tab is shown
        refreshGitStatus();
        refreshCommitHistory();
      } else if (btn.id === 'editorBtn') {
        editor.style.display = 'block';
      } else if (btn.id === 'filesBtn') {
        filesView.classList.add('active');
        // Trigger recent items update when files view is shown
        const event = new CustomEvent('filesViewShown');
        document.dispatchEvent(event);
        // Always show recent sections when Files view is active
        const recentSections = document.getElementById('recentSections');
        if (recentSections) {
          recentSections.style.display = 'block';
        }
      } else if (btn.id === 'settingsBtn') {
        settingsView.classList.add('active');
      }
    });
  });
}

