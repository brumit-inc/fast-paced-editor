// Utility functions

export function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const icons = {
    'js': '📜', 'json': '📋', 'html': '🌐', 'css': '🎨',
    'md': '📝', 'txt': '📄', 'png': '🖼️', 'jpg': '🖼️', 'gif': '🖼️',
    'ts': '📘', 'tsx': '⚛️', 'jsx': '⚛️', 'py': '🐍', 'java': '☕',
    'cpp': '⚙️', 'c': '⚙️', 'go': '🐹', 'rs': '🦀', 'php': '🐘'
  };
  return icons[ext] || '📄';
}

export function updateStatus(message, element) {
  if (element) {
    element.textContent = message;
  }
}

