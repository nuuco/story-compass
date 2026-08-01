import {
  getLastActiveProjectId,
  hasDirectoryPermission,
  loadWorkspaceHandle,
} from './handleStore';
import { setActiveStorage, setActiveWorkspace } from './autosave';
import type { ProjectSnapshot } from './types';
import type { WorkspaceProjectSummary } from '../types/models';
import type { TrashedProject } from '../types/models';
import { WorkspaceStorage } from './workspaceStorage';

export type RestoreResult = {
  workspaceFolderName: string | null;
  projects: WorkspaceProjectSummary[];
  trashedProjects: TrashedProject[];
  snapshot: ProjectSnapshot | null;
  activeProjectId: string | null;
};

const EMPTY: RestoreResult = {
  workspaceFolderName: null,
  projects: [],
  trashedProjects: [],
  snapshot: null,
  activeProjectId: null,
};

/**
 * 앱 시작 시 IndexedDB 워크스페이스·마지막 활성 프로젝트 복원.
 * 페이지 로드에서는 requestPermission을 쓰지 않음.
 */
export async function restoreFolderConnection(): Promise<RestoreResult> {
  try {
    const handle = await loadWorkspaceHandle();
    if (!handle) return EMPTY;

    const granted = await hasDirectoryPermission(handle, 'readwrite');
    if (!granted) {
      return {
        ...EMPTY,
        workspaceFolderName: handle.name,
      };
    }

    const workspace = WorkspaceStorage.fromHandle(handle);
    const ws = await workspace.ensureWorkspaceLayout();
    setActiveWorkspace(workspace);

    const projects = ws.projects;
    const trashedProjects = await workspace.listTrashedProjects();

    const lastActive = await getLastActiveProjectId();
    const targetId =
      (lastActive && projects.some((p) => p.id === lastActive)
        ? lastActive
        : null) ??
      ws.activeProjectId ??
      projects[0]?.id ??
      null;

    if (!targetId) {
      return {
        workspaceFolderName: handle.name,
        projects,
        trashedProjects,
        snapshot: null,
        activeProjectId: null,
      };
    }

    const storage = await workspace.openProjectStorage(targetId);
    if (!storage) {
      return {
        workspaceFolderName: handle.name,
        projects,
        trashedProjects,
        snapshot: null,
        activeProjectId: null,
      };
    }

    const snapshot = await storage.load();
    setActiveStorage(storage);
    await workspace.setActiveProjectId(targetId);

    return {
      workspaceFolderName: handle.name,
      projects,
      trashedProjects,
      snapshot,
      activeProjectId: targetId,
    };
  } catch (e) {
    console.error('폴더 복원 실패', e);
    return EMPTY;
  }
}
