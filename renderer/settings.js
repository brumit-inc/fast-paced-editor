// Settings management

import { setFontSize, setTabSize, setUseSpaces } from './editor.js';

export function initializeSettings() {
  const fontSizeInput = document.getElementById('fontSizeInput');
  const tabSizeInput = document.getElementById('tabSizeInput');
  const themeButtons = document.querySelectorAll('[data-theme]');
  const indentButtons = document.querySelectorAll('[data-indent]');

  // Font size
  if (fontSizeInput) {
    fontSizeInput.addEventListener('input', (e) => {
      setFontSize(e.target.value);
    });
  }

  // Tab size
  if (tabSizeInput) {
    tabSizeInput.addEventListener('input', (e) => {
      setTabSize(e.target.value);
    });
  }

  // Theme toggle
  themeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      themeButtons.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      if (e.target.dataset.theme === 'light') {
        document.body.classList.add('light-mode');
      } else {
        document.body.classList.remove('light-mode');
      }
    });
  });

  // Indentation toggle
  indentButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      indentButtons.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      setUseSpaces(e.target.dataset.indent === 'spaces');
    });
  });
}

