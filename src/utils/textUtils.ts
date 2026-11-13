export interface TextStats {
  chars: number;
  charsNoSpaces: number;
  words: number;
  lines: number;
  bytes: number;
  readingTimeMinutes: number;
}

export function computeTextStats(text: string): TextStats {
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s/g, '').length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lines = text ? text.split('\n').length : 0;
  const bytes = new Blob([text]).size;
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

  return {
    chars,
    charsNoSpaces,
    words,
    lines,
    bytes,
    readingTimeMinutes,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatTimeRemaining(expiresAt: number | null): string {
  if (!expiresAt) return 'Never expires';
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Expired';

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h remaining`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m remaining`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s remaining`;
  }
  return `${seconds}s remaining`;
}

// Text manipulation helpers
export function cleanEmptyLines(text: string): string {
  return text.replace(/\n\s*\n\s*\n+/g, '\n\n');
}

export function trimLines(text: string): string {
  return text
    .split('\n')
    .map(l => l.trim())
    .join('\n');
}

export function toTitleCase(text: string): string {
  return text.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
}

export function toCamelCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_m, chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatJson(text: string, prettify = true): string {
  try {
    const obj = JSON.parse(text);
    return prettify ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
  } catch {
    throw new Error('Invalid JSON format');
  }
}

export function encodeBase64(text: string): string {
  return btoa(unescape(encodeURIComponent(text)));
}

export function decodeBase64(text: string): string {
  try {
    return decodeURIComponent(escape(atob(text)));
  } catch {
    throw new Error('Invalid Base64 string');
  }
}

export function encodeUrl(text: string): string {
  return encodeURIComponent(text);
}

export function decodeUrl(text: string): string {
  try {
    return decodeURI(text);
  } catch {
    throw new Error('Invalid URL encoding');
  }
}
