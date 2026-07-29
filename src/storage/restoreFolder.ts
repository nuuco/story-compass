import { FolderStorage } from './folderStorage';
import {
  getLastActiveProjectId,
  hasDirectoryPermission,
  listStoredProjects,
  loadProjectHandle,
} from './handleStore';
import { setActiveStorage } from './autosave';
import type { ConnectedProjectMeta } from './handleStore';
import type { ProjectSnapshot } from './types';

export type RestoreResult = {
  projects: ConnectedProjectMeta[];
  snapshot: ProjectSnapshot | null;
  activeProjectId: string | null;
};

const EMPTY: RestoreResult = {
  projects: [],
  snapshot: null,
  activeProjectId: null,
};

/**
 * 앱 시작 시 IndexedDB 프로젝트 목록·마지막 활성 프로젝트 복원.
 * 페이지 로드에서는 requestPermission을 쓰지 않음 (제스처 없이 멈추는 문제 방지).
 */
export async function restoreFolderConnection(): Promise<RestoreResult> {
  try {
    const projects = await listStoredProjects();
    if (projects.length === 0) return EMPTY;

    const lastActive = await getLastActiveProjectId();
    const targetId =
      lastActive && projects.some((p) => p.projectId === lastActive)
        ? lastActive
        : projects[0].projectId;

    const handle = await loadProjectHandle(targetId);
    if (!handle) {
      return { projects, snapshot: null, activeProjectId: null };
    }

    const granted = await hasDirectoryPermission(handle, 'readwrite');
    if (!granted) {
      // 권한 재요청은 사용자가 프로젝트를 클릭할 때 (switchToProject)
      return { projects, snapshot: null, activeProjectId: null };
    }

    const storage = FolderStorage.fromHandle(handle);
    const snapshot = await storage.load();
    setActiveStorage(storage);
    return { projects, snapshot, activeProjectId: targetId };
  } catch (e) {
    console.error('폴더 복원 실패', e);
    return EMPTY;
  }
}
