const editor = document.getElementById('editor');
const statusElement = document.getElementById('status');
const cursorPosition = document.getElementById('cursor-position');

let isDirty = false;

// Update cursor position
editor.addEventListener('input', () => {
  isDirty = true;
  updateCursorPosition();
  updateStatus();
});

editor.addEventListener('keyup', updateCursorPosition);
editor.addEventListener('click', updateCursorPosition);

function updateCursorPosition() {
  const text = editor.value.substring(0, editor.selectionStart);
  const lines = text.split('\n');
  const line = lines.length;
  const col = lines[lines.length - 1].length + 1;
  cursorPosition.textContent = `Ln ${line}, Col ${col}`;
}

function updateStatus() {
  statusElement.textContent = isDirty ? 'Modified' : 'Ready';
}

// File operations
window.electronAPI.onFileNew(() => {
  if (isDirty) {
    if (confirm('You have unsaved changes. Continue?')) {
      editor.value = '';
      isDirty = false;
      updateStatus();
      document.title = 'Untitled - Notepad';
    }
  } else {
    editor.value = '';
    document.title = 'Untitled - Notepad';
  }
});

window.electronAPI.onFileOpened((data) => {
  editor.value = data.content;
  isDirty = false;
  updateStatus();
  updateCursorPosition();
});

window.electronAPI.onRequestSaveContent(() => {
  window.electronAPI.saveContent(editor.value);
});

window.electronAPI.onFileSaved(() => {
  isDirty = false;
  updateStatus();
  statusElement.textContent = 'File saved';
  setTimeout(() => {
    statusElement.textContent = 'Ready';
  }, 2000);
});

// Initialize
updateCursorPosition();