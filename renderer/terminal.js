// Terminal full-pane view

import { getCurrentFolderPath } from './fileManager.js';

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function appendOutput(outputElement, kind, text) {
  if (!outputElement || !text) return;

  const line = document.createElement('div');
  line.className = `terminal-line terminal-line-${kind}`;
  line.innerHTML = text
    .split('\n')
    .map((lineText) => escapeHtml(lineText))
    .join('<br>');
  outputElement.appendChild(line);
  outputElement.scrollTop = outputElement.scrollHeight;
}

export function initializeTerminal() {
  const outputElement = document.getElementById('terminalOutput');
  const inputElement = document.getElementById('terminalInput');
  const runButton = document.getElementById('terminalRunBtn');

  if (!outputElement || !inputElement || !runButton) {
    return;
  }

  const runCommand = async () => {
    const command = inputElement.value.trim();
    if (!command) return;

    appendOutput(outputElement, 'command', `$ ${command}`);
    inputElement.value = '';

    if (!window.electronAPI || !window.electronAPI.runTerminalCommand) {
      appendOutput(outputElement, 'error', 'Terminal API is unavailable.');
      return;
    }

    const cwd = getCurrentFolderPath() || undefined;
    const result = await window.electronAPI.runTerminalCommand(command, cwd);

    if (result.stdout) {
      appendOutput(outputElement, 'stdout', result.stdout);
    }
    if (result.stderr) {
      appendOutput(outputElement, 'stderr', result.stderr);
    }
    if (!result.success && result.error) {
      appendOutput(outputElement, 'error', result.error);
    }
  };

  runButton.addEventListener('click', runCommand);
  inputElement.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      await runCommand();
    }
  });
}
