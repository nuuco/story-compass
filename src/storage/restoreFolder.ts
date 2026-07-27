import { FolderStorage } from './folderStorage';
import {
  clearDirectoryHandle,
  ensureDirectoryPermission,
  loadDirectoryHandle,
} from './handleStore';
import { setActiveStorage } from './autosave';
import type { ProjectSnapshot } from './types';

export type RestoreResult =
  | { ok: true; snapshot: ProjectSnapshot }
  | { ok: false; reason: 'none' | 'denied' | 'error' };

/** 새로고침 후 IndexedDB에 저장된 폴더 핸들을 복원해 프로젝트 로드 */
export async function restoreFolderConnection(): Promise<RestoreResult> {
  const handle = await loadDirectoryHandle();
  if (!handle) return { ok: false, reason: 'none' };

  try {
    const granted = await ensureDirectoryPermission(handle, 'readwrite');
    if (!granted) {
      return { ok: false, reason: 'denied' };
    }
    const storage = FolderStorage.fromHandle(handle);
    const snapshot = await storage.load();
    setActiveStorage(storage);
    return { ok: true, snapshot };
  } catch (e) {
    console.error('폴더 복원 실패', e);
    await clearDirectoryHandle();
    return { ok: false, reason: 'error' };
  }
}
