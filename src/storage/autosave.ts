import type { ProjectStorage } from './types';

let activeStorage: ProjectStorage | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 500;

export function setActiveStorage(storage: ProjectStorage | null): void {
  activeStorage = storage;
}

export function getActiveStorage(): ProjectStorage | null {
  return activeStorage;
}

export function scheduleSave(run: () => Promise<void>): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void run();
  }, DEBOUNCE_MS);
}

export function flushSave(run: () => Promise<void>): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
  void run();
}
