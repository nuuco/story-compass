import type { ProjectStorage } from './types';
import type { WorkspaceStorage } from './workspaceStorage';

let activeStorage: ProjectStorage | null = null;
let activeWorkspace: WorkspaceStorage | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 500;

/** 저장 중 추가 dirty가 오면 한 번 더 돌리기 위한 잠금 */
let saveLock = false;
let saveAgain = false;

export function setActiveStorage(storage: ProjectStorage | null): void {
  activeStorage = storage;
}

export function getActiveStorage(): ProjectStorage | null {
  return activeStorage;
}

export function setActiveWorkspace(ws: WorkspaceStorage | null): void {
  activeWorkspace = ws;
}

export function getActiveWorkspace(): WorkspaceStorage | null {
  return activeWorkspace;
}

async function runExclusive(run: () => Promise<void>): Promise<void> {
  if (saveLock) {
    saveAgain = true;
    return;
  }
  saveLock = true;
  try {
    do {
      saveAgain = false;
      await run();
    } while (saveAgain);
  } finally {
    saveLock = false;
  }
}

export function scheduleSave(run: () => Promise<void>): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void runExclusive(run);
  }, DEBOUNCE_MS);
}

export function flushSave(run: () => Promise<void>): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
  void runExclusive(run);
}

/** 저장 중 편집이 있으면 재실행을 요청한다 */
export function requestSaveAgain(): void {
  if (saveLock) saveAgain = true;
}
