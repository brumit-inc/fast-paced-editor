// Editor functionality

let useSpaces = true;
let tabSize = 4;

export function initializeEditor() {
  const editor = document.getElementById('editor');
  const cursorPosition = document.getElementById('cursor-position');
  const status = document.getElementById('status');
  
  if (!editor || !cursorPosition || !status) {
    console.error('Editor elements not found');
    return;
  }

  // Tab handling
  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const indent = useSpaces ? ' '.repeat(tabSize) : '\t';
      
      editor.value = editor.value.substring(0, start) + indent + editor.value.substring(end);
      editor.selectionStart = editor.selectionEnd = start + indent.length;
    }
  });

  // Cursor position tracking
  function updateCursorPosition() {
    const text = editor.value;
    const cursorPos = editor.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    
    cursorPosition.textContent = `Ln ${line}, Col ${col}`;
  }

  editor.addEventListener('keyup', updateCursorPosition);
  editor.addEventListener('click', updateCursorPosition);
  editor.addEventListener('input', updateCursorPosition);

  // Status updates
  let typingTimer;
  editor.addEventListener('input', () => {
    status.textContent = 'Editing...';
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      status.textContent = 'Ready';
    }, 1000);
  });
}

export function setTabSize(size) {
  tabSize = parseInt(size);
}

export function setUseSpaces(value) {
  useSpaces = value;
}

export function setFontSize(size) {
  const editor = document.getElementById('editor');
  if (editor) {
    editor.style.fontSize = size + 'px';
  }
}

