import type { ProjectStorage } from './types';
import { FolderStorage } from './folderStorage';
import {
  clearDirectoryHandle,
  saveDirectoryHandle,
} from './handleStore';

let activeStorage: ProjectStorage | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 500;

export function setActiveStorage(storage: ProjectStorage | null): void {
  activeStorage = storage;
  if (storage?.kind === 'folder') {
    void saveDirectoryHandle((storage as FolderStorage).directoryHandle);
  } else {
    void clearDirectoryHandle();
  }
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
