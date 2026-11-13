import { RecentClipItem } from '../types';

const STORAGE_KEY = 'clipshare_history_v1';

export function getRecentClips(): RecentClipItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items: RecentClipItem[] = JSON.parse(raw);
    const now = Date.now();
    // Return items that haven't explicitly expired
    return items.filter(item => !item.expiresAt || item.expiresAt > now);
  } catch (err) {
    console.warn('Failed to load recent clips from localStorage:', err);
    return [];
  }
}

export function saveRecentClip(item: RecentClipItem): void {
  try {
    const existing = getRecentClips().filter(i => i.id !== item.id);
    const updated = [item, ...existing].slice(0, 30);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save clip to localStorage:', err);
  }
}

export function removeRecentClip(id: string): RecentClipItem[] {
  try {
    const existing = getRecentClips().filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return existing;
  } catch {
    return [];
  }
}

export function clearRecentClips(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
