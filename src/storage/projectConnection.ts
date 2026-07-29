import type { AppDispatch, RootState } from '../store';
import {
  createEmptyProjectSnapshot,
  hydrateProject,
  removeConnectedProject,
  resetProject,
  setActiveConnectedProjectId,
  upsertConnectedProject,
} from '../store/projectSlice';
import { flushSave, getActiveStorage, setActiveStorage } from './autosave';
import type { ConnectedProjectMeta } from './handleStore';
import {
  ensureDirectoryPermission,
  loadProjectHandle,
  removeProjectRecord,
  saveProjectRecord,
  setLastActiveProjectId,
} from './handleStore';
import { FolderStorage } from './folderStorage';
import type { ProjectSnapshot } from './types';

async function persistActiveSnapshot(state: RootState['project']): Promise<void> {
  const storage = getActiveStorage();
  if (!storage || state.storageMode !== 'folder') return;
  const snapshot: ProjectSnapshot = {
    manifest: state.manifest,
    documents: state.documents,
    scenes: state.scenes,
    references: state.references,
  };
  await storage.saveAll(snapshot);
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

async function activateProject(
  dispatch: AppDispatch,
  storage: FolderStorage,
  snap: ProjectSnapshot,
): Promise<boolean> {
  const meta: ConnectedProjectMeta = {
    projectId: snap.manifest.project.id,
    folderName: storage.directoryHandle.name,
    title: snap.manifest.project.title,
  };
  setActiveStorage(storage);
  await saveProjectRecord({ ...meta, handle: storage.directoryHandle });
  await setLastActiveProjectId(meta.projectId);
  dispatch(upsertConnectedProject(meta));
  dispatch(setActiveConnectedProjectId(meta.projectId));
  dispatch(hydrateProject({ ...snap, storageMode: 'folder' }));
  return true;
}

/** 빈 폴더에 새 프로젝트 생성·연결 */
export async function connectNewProject(dispatch: AppDispatch): Promise<boolean> {
  try {
    const storage = await FolderStorage.pick();
    if (!storage) {
      window.alert(
        '이 브라우저는 폴더 선택을 지원하지 않습니다. Chrome·Edge를 사용하세요.',
      );
      return false;
    }
    const snap = await storage.load();
    if (snap.documents.length > 0 || snap.scenes.length > 0) {
      const openExisting = window.confirm(
        '선택한 폴더에 기존 데이터가 있습니다. 이 프로젝트를 열까요?',
      );
      if (!openExisting) return false;
      return activateProject(dispatch, storage, snap);
    }
    const fresh = createEmptyProjectSnapshot();
    await storage.saveAll(fresh);
    return activateProject(dispatch, storage, fresh);
  } catch (e) {
    console.error(e);
    window.alert('폴더를 열 수 없습니다.');
    return false;
  }
}

/** 기존 프로젝트 폴더 연결·열기 */
export async function openProjectFolder(dispatch: AppDispatch): Promise<boolean> {
  try {
    const storage = await FolderStorage.pick();
    if (!storage) {
      window.alert(
        '이 브라우저는 폴더 선택을 지원하지 않습니다. Chrome·Edge를 사용하세요.',
      );
      return false;
    }
    const snap = await storage.load();
    if (snap.documents.length === 0 && snap.scenes.length === 0) {
      const createNew = window.confirm(
        '선택한 폴더가 비어 있습니다. 여기에 새 프로젝트를 만들까요?',
      );
      if (!createNew) return false;
      const fresh = createEmptyProjectSnapshot();
      await storage.saveAll(fresh);
      return activateProject(dispatch, storage, fresh);
    }
    return activateProject(dispatch, storage, snap);
  } catch (e) {
    console.error(e);
    window.alert('폴더를 열 수 없습니다.');
    return false;
  }
}

/** 저장된 프로젝트로 전환 */
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

  const handle = await loadProjectHandle(projectId);
  if (!handle) {
    dispatch(removeConnectedProject(projectId));
    return false;
  }
  const granted = await ensureDirectoryPermission(handle, 'readwrite');
  if (!granted) {
    window.alert('폴더 접근 권한이 필요합니다.');
    return false;
  }
  const storage = FolderStorage.fromHandle(handle);
  const snap = await storage.load();
  return activateProject(dispatch, storage, snap);
}

/** 프로젝트 연결 해제 (사이드바에서 제거) */
export async function disconnectProject(
  dispatch: AppDispatch,
  getState: () => RootState,
  projectId: string,
): Promise<boolean> {
  const state = getState().project;
  const isActive = state.activeConnectedProjectId === projectId;

  if (isActive && state.storageMode === 'folder') {
    await flushActiveSave(state);
    setActiveStorage(null);
  }

  await removeProjectRecord(projectId);
  dispatch(removeConnectedProject(projectId));

  const remaining = state.connectedProjects.filter(
    (p) => p.projectId !== projectId,
  );

  if (remaining.length === 0) {
    await setLastActiveProjectId(null);
    dispatch(resetProject());
    return true;
  }

  if (isActive) {
    return switchToProject(dispatch, getState, remaining[0].projectId);
  }
  return true;
}
