import type { AppDispatch, RootState } from '../store';
import {
  hydrateProject,
  resetProject,
  setActiveConnectedProjectId,
  setConnectedProjects,
  setTrashedProjects,
  setWorkspaceFolderName,
  upsertConnectedProject,
} from '../store/projectSlice';
import {
  flushSave,
  getActiveStorage,
  getActiveWorkspace,
  setActiveStorage,
  setActiveWorkspace,
} from './autosave';
import {
  clearWorkspaceHandle,
  ensureDirectoryPermission,
  loadWorkspaceHandle,
  saveWorkspaceHandle,
  setLastActiveProjectId,
} from './handleStore';
import type { ProjectSnapshot } from './types';
import { emptyProjectTrash } from '../types/models';
import { WorkspaceStorage } from './workspaceStorage';

function snapshotFromState(state: RootState['project']): ProjectSnapshot {
  return {
    manifest: state.manifest,
    documents: state.documents,
    scenes: state.scenes,
    references: state.references,
    trash: state.trash ?? emptyProjectTrash(),
  };
}

async function persistActiveSnapshot(state: RootState['project']): Promise<void> {
  const storage = getActiveStorage();
  if (!storage || state.storageMode !== 'folder') return;
  await storage.saveAll(snapshotFromState(state));
  const ws = getActiveWorkspace();
  if (ws) {
    await ws.updateProjectSummary(state.manifest.project.id, {
      title: state.manifest.project.title,
      updatedAt: state.manifest.project.updatedAt,
    });
  }
}

export async function flushActiveSave(state: RootState['project']): Promise<void> {
  if (state.storageMode !== 'folder') return;
  await new Promise<void>((resolve) => {
    flushSave(async () => {
      try {
        await persistActiveSnapshot(state);
      } finally {
        resolve();
      }
    });
  });
}

async function syncWorkspaceToRedux(
  dispatch: AppDispatch,
  workspace: WorkspaceStorage,
): Promise<void> {
  const ws = await workspace.loadWorkspaceManifest();
  dispatch(setWorkspaceFolderName(workspace.folderName));
  dispatch(
    setConnectedProjects(
      ws.projects.map((p) => ({
        projectId: p.id,
        folderName: workspace.folderName,
        title: p.title,
      })),
    ),
  );
  const trashed = await workspace.listTrashedProjects();
  dispatch(setTrashedProjects(trashed));
}

async function activateProjectInWorkspace(
  dispatch: AppDispatch,
  workspace: WorkspaceStorage,
  projectId: string,
): Promise<boolean> {
  const storage = await workspace.openProjectStorage(projectId);
  if (!storage) return false;
  const snap = await storage.load();
  setActiveWorkspace(workspace);
  setActiveStorage(storage);
  await workspace.setActiveProjectId(projectId);
  await setLastActiveProjectId(projectId);
  await saveWorkspaceHandle(workspace.directoryHandle);
  await syncWorkspaceToRedux(dispatch, workspace);
  dispatch(setActiveConnectedProjectId(projectId));
  dispatch(hydrateProject({ ...snap, storageMode: 'folder' }));
  dispatch(
    upsertConnectedProject({
      projectId: snap.manifest.project.id,
      folderName: workspace.folderName,
      title: snap.manifest.project.title,
    }),
  );
  return true;
}

/** IndexedDB에 저장된 워크스페이스 권한 재요청·로드 */
export async function requestWorkspaceAccess(
  dispatch: AppDispatch,
): Promise<boolean> {
  try {
    const handle = await loadWorkspaceHandle();
    if (!handle) return connectWorkspace(dispatch, 'open');
    const granted = await ensureDirectoryPermission(handle, 'readwrite');
    if (!granted) {
      window.alert('폴더 접근 권한이 필요합니다.');
      return false;
    }
    const workspace = WorkspaceStorage.fromHandle(handle);
    const wsManifest = await workspace.ensureWorkspaceLayout();
    setActiveWorkspace(workspace);
    await saveWorkspaceHandle(handle);

    if (wsManifest.projects.length === 0) {
      const { snapshot } = await workspace.createProject();
      return activateProjectInWorkspace(
        dispatch,
        workspace,
        snapshot.manifest.project.id,
      );
    }

    const targetId =
      wsManifest.activeProjectId ?? wsManifest.projects[0]?.id ?? null;
    if (!targetId) return false;
    return activateProjectInWorkspace(dispatch, workspace, targetId);
  } catch (e) {
    console.error(e);
    window.alert('폴더를 열 수 없습니다.');
    return false;
  }
}

/** 워크스페이스 폴더 연결 (새 프로젝트 생성 또는 기존 열기) */
export async function connectWorkspace(
  dispatch: AppDispatch,
  mode: 'new' | 'open' = 'open',
): Promise<boolean> {
  try {
    const workspace = await WorkspaceStorage.pick();
    if (!workspace) {
      window.alert(
        '이 브라우저는 폴더 선택을 지원하지 않습니다. Chrome·Edge를 사용하세요.',
      );
      return false;
    }

    const hasContent = await workspace.hasAnyContent();
    let wsManifest = await workspace.ensureWorkspaceLayout();

    if (!hasContent || wsManifest.projects.length === 0) {
      if (mode === 'open') {
        const createNew = window.confirm(
          '선택한 폴더가 비어 있습니다. 여기에 새 워크스페이스·프로젝트를 만들까요?',
        );
        if (!createNew) return false;
      }
      const { snapshot } = await workspace.createProject();
      setActiveWorkspace(workspace);
      await saveWorkspaceHandle(workspace.directoryHandle);
      return activateProjectInWorkspace(
        dispatch,
        workspace,
        snapshot.manifest.project.id,
      );
    }

    // 레거시 마이그레이션 등으로 프로젝트가 생긴 경우
    wsManifest = await workspace.loadWorkspaceManifest();
    if (mode === 'new' && wsManifest.projects.length > 0) {
      const openExisting = window.confirm(
        '선택한 폴더에 기존 워크스페이스가 있습니다. 열까요?\n(취소하면 연결하지 않습니다)',
      );
      if (!openExisting) return false;
    }

    const targetId =
      wsManifest.activeProjectId ?? wsManifest.projects[0]?.id ?? null;
    if (!targetId) {
      const { snapshot } = await workspace.createProject();
      return activateProjectInWorkspace(
        dispatch,
        workspace,
        snapshot.manifest.project.id,
      );
    }

    setActiveWorkspace(workspace);
    await saveWorkspaceHandle(workspace.directoryHandle);
    return activateProjectInWorkspace(dispatch, workspace, targetId);
  } catch (e) {
    console.error(e);
    window.alert('폴더를 열 수 없습니다.');
    return false;
  }
}

/** @deprecated connectWorkspace 사용 */
export async function connectNewProject(dispatch: AppDispatch): Promise<boolean> {
  return connectWorkspace(dispatch, 'new');
}

/** @deprecated connectWorkspace 사용 */
export async function openProjectFolder(dispatch: AppDispatch): Promise<boolean> {
  return connectWorkspace(dispatch, 'open');
}

/** 워크스페이스 안에 새 프로젝트 추가 */
export async function createProjectInWorkspace(
  dispatch: AppDispatch,
  getState: () => RootState,
): Promise<boolean> {
  const workspace = getActiveWorkspace();
  if (!workspace) {
    window.alert('먼저 워크스페이스 폴더를 연결하세요.');
    return false;
  }
  await flushActiveSave(getState().project);
  const { snapshot } = await workspace.createProject();
  return activateProjectInWorkspace(
    dispatch,
    workspace,
    snapshot.manifest.project.id,
  );
}

/** 같은 워크스페이스 내 프로젝트 전환 */
export async function switchToProject(
  dispatch: AppDispatch,
  getState: () => RootState,
  projectId: string,
): Promise<boolean> {
  const state = getState().project;
  if (
    state.activeConnectedProjectId === projectId &&
    state.storageMode === 'folder'
  ) {
    return true;
  }
  await flushActiveSave(state);

  let workspace = getActiveWorkspace();
  if (!workspace) {
    const handle = await loadWorkspaceHandle();
    if (!handle) return false;
    const granted = await ensureDirectoryPermission(handle, 'readwrite');
    if (!granted) {
      window.alert('폴더 접근 권한이 필요합니다.');
      return false;
    }
    workspace = WorkspaceStorage.fromHandle(handle);
    await workspace.ensureWorkspaceLayout();
    setActiveWorkspace(workspace);
  } else {
    const granted = await ensureDirectoryPermission(
      workspace.directoryHandle,
      'readwrite',
    );
    if (!granted) {
      window.alert('폴더 접근 권한이 필요합니다.');
      return false;
    }
  }

  return activateProjectInWorkspace(dispatch, workspace, projectId);
}

/** 프로젝트를 앱 휴지통으로 이동 */
export async function deleteProjectToTrash(
  dispatch: AppDispatch,
  getState: () => RootState,
  projectId: string,
): Promise<boolean> {
  const workspace = getActiveWorkspace();
  if (!workspace) return false;

  const state = getState().project;
  const isActive = state.activeConnectedProjectId === projectId;
  if (isActive) {
    await flushActiveSave(state);
  }

  const trashed = await workspace.moveProjectToTrash(projectId);
  if (!trashed) return false;

  await syncWorkspaceToRedux(dispatch, workspace);

  const ws = await workspace.loadWorkspaceManifest();
  if (ws.projects.length === 0) {
    setActiveStorage(null);
    dispatch(setActiveConnectedProjectId(null));
    dispatch(resetProject());
    dispatch(setWorkspaceFolderName(workspace.folderName));
    await syncWorkspaceToRedux(dispatch, workspace);
    await setLastActiveProjectId(null);
    return true;
  }

  if (isActive && ws.activeProjectId) {
    return activateProjectInWorkspace(dispatch, workspace, ws.activeProjectId);
  }
  return true;
}

/** 휴지통에서 프로젝트 복원 */
export async function restoreProjectFromTrash(
  dispatch: AppDispatch,
  getState: () => RootState,
  projectId: string,
): Promise<boolean> {
  const workspace = getActiveWorkspace();
  if (!workspace) return false;
  await flushActiveSave(getState().project);
  const summary = await workspace.restoreProjectFromTrash(projectId);
  if (!summary) return false;
  return activateProjectInWorkspace(dispatch, workspace, summary.id);
}

/** 휴지통 프로젝트 영구 삭제 */
export async function purgeTrashedProject(
  dispatch: AppDispatch,
  projectId: string,
): Promise<boolean> {
  const workspace = getActiveWorkspace();
  if (!workspace) return false;
  await workspace.purgeTrashedProject(projectId);
  await syncWorkspaceToRedux(dispatch, workspace);
  return true;
}

/** 휴지통 전체 비우기 (프로젝트 trash + 활성 프로젝트 내부 trash) */
export async function emptyAllTrash(
  dispatch: AppDispatch,
  getState: () => RootState,
): Promise<boolean> {
  const workspace = getActiveWorkspace();
  if (!workspace) return false;

  await flushActiveSave(getState().project);
  await workspace.emptyWorkspaceProjectTrash();

  const ws = await workspace.loadWorkspaceManifest();
  for (const p of ws.projects) {
    await workspace.emptyProjectItemTrash(p.id);
  }

  // 활성 프로젝트 trash 상태 갱신
  const state = getState().project;
  if (state.activeConnectedProjectId && state.storageMode === 'folder') {
    const storage = await workspace.openProjectStorage(
      state.activeConnectedProjectId,
    );
    if (storage) {
      const snap = await storage.load();
      setActiveStorage(storage);
      dispatch(hydrateProject({ ...snap, storageMode: 'folder' }));
    }
  }

  await syncWorkspaceToRedux(dispatch, workspace);
  return true;
}

/** 워크스페이스 연결 해제 (디스크 파일은 유지) */
export async function disconnectWorkspace(
  dispatch: AppDispatch,
  getState: () => RootState,
): Promise<boolean> {
  const state = getState().project;
  if (state.storageMode === 'folder') {
    await flushActiveSave(state);
  }
  setActiveStorage(null);
  setActiveWorkspace(null);
  await clearWorkspaceHandle();
  await setLastActiveProjectId(null);
  dispatch(resetProject());
  return true;
}

/** @deprecated disconnectWorkspace — 프로젝트 단위 연결 해제 대신 워크스페이스 해제 */
export async function disconnectProject(
  dispatch: AppDispatch,
  getState: () => RootState,
  _projectId?: string,
): Promise<boolean> {
  return disconnectWorkspace(dispatch, getState);
}
