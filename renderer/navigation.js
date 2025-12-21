// Navigation between views

import { refreshGitStatus } from './git.js';

export function initializeNavigation() {
  const buttons = document.querySelectorAll('.circle-btn');
  const editor = document.getElementById('editor');
  const gitView = document.getElementById('gitView');
  const filesView = document.getElementById('filesView');
  const settingsPanel = document.getElementById('settingsPanel');
  const settingsBtn = document.getElementById('settingsBtn');

  if (!buttons.length || !editor || !gitView || !filesView) {
    console.error('Navigation elements not found');
    return;
  }

  // Navigation button handlers
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.id === 'settingsBtn') {
        settingsPanel.classList.toggle('active');
      } else {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (settingsPanel) {
          settingsPanel.classList.remove('active');
        }
        
        editor.style.display = 'none';
        gitView.classList.remove('active');
        filesView.classList.remove('active');
        
        if (btn.id === 'gitBtn') {
          gitView.classList.add('active');
          // Refresh git status when git tab is shown
          refreshGitStatus();
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
        }
      }
    });
  });

  // Close settings panel when clicking outside
  if (settingsPanel && settingsBtn) {
    document.addEventListener('click', (e) => {
      if (!settingsPanel.contains(e.target) && 
          e.target !== settingsBtn && 
          !settingsBtn.contains(e.target)) {
        settingsPanel.classList.remove('active');
      }
    });
  }
}

