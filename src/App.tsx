import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { store } from './store';
import {
  selectConnectedProjects,
  selectReferenceDrawerOpen,
  selectSaveStatus,
  selectSidebarCollapsed,
  selectStorageMode,
  selectTrashPanelOpen,
  selectWorkspaceFolderName,
} from './store/selectors';
import {
  hydrateProject,
  setActiveConnectedProjectId,
  setConnectedProjects,
  setReferenceDrawerOpen,
  setSaveStatus,
  setTrashedProjects,
  setWorkspaceFolderName,
} from './store/projectSlice';
import {
  flushSave,
  getActiveStorage,
  getActiveWorkspace,
  requestSaveAgain,
  scheduleSave,
} from './storage/autosave';
import { restoreFolderConnection } from './storage/restoreFolder';
import { emptyProjectTrash } from './types/models';
import { ExplorerSidebar } from './components/ExplorerSidebar';
import { RouteNav } from './components/RouteNav';
import { WorkspaceDndProvider } from './components/WorkspaceDndProvider';
import { SceneKanban } from './components/SceneKanban';
import { ReferenceDrawer } from './components/ReferenceDrawer';
import { FolderConnectPrompt } from './components/FolderConnectPrompt';
import { TrashPanel } from './components/TrashPanel';

function useAutosave() {
  const dispatch = useAppDispatch();
  const saveStatus = useAppSelector(selectSaveStatus);
  const storageMode = useAppSelector(selectStorageMode);
  // dirty일 때 콘텐츠 변경으로 이펙트를 다시 돌린다
  const documents = useAppSelector((s) => s.project.documents);
  const scenes = useAppSelector((s) => s.project.scenes);
  const references = useAppSelector((s) => s.project.references);
  const trash = useAppSelector((s) => s.project.trash);
  const manifest = useAppSelector((s) => s.project.manifest);

  useEffect(() => {
    if (saveStatus !== 'dirty') return;
    if (storageMode !== 'folder') return;

    scheduleSave(async () => {
      const storage = getActiveStorage();
      if (!storage) return;

      const before = store.getState().project;
      if (before.storageMode !== 'folder') return;
      if (before.saveStatus !== 'dirty' && before.saveStatus !== 'saving') {
        return;
      }

      dispatch(setSaveStatus('saving'));
      const snap = store.getState().project;
      const payload = {
        manifest: snap.manifest,
        documents: snap.documents,
        scenes: snap.scenes,
        references: snap.references,
        trash: snap.trash ?? emptyProjectTrash(),
      };

      try {
        await storage.saveAll(payload);
        const ws = getActiveWorkspace();
        if (ws) {
          const m = store.getState().project.manifest.project;
          await ws.updateProjectSummary(m.id, {
            title: m.title,
            updatedAt: m.updatedAt,
          });
        }
        const after = store.getState().project;
        if (after.saveStatus === 'dirty') {
          // 저장 중 추가 편집 → 잠금 루프 또는 다음 dirty 이펙트
          requestSaveAgain();
          return;
        }
        if (after.saveStatus === 'saving') {
          dispatch(setSaveStatus('saved'));
        }
      } catch {
        dispatch(setSaveStatus('error'));
      }
    });
  }, [
    saveStatus,
    storageMode,
    manifest,
    documents,
    scenes,
    references,
    trash,
    dispatch,
  ]);

  // flush 리스너는 한 번만 — 스냅샷은 getState로
  useEffect(() => {
    const flush = () => {
      const project = store.getState().project;
      if (project.storageMode !== 'folder') return;
      flushSave(async () => {
        const storage = getActiveStorage();
        if (!storage) return;
        const p = store.getState().project;
        await storage.saveAll({
          manifest: p.manifest,
          documents: p.documents,
          scenes: p.scenes,
          references: p.references,
          trash: p.trash ?? emptyProjectTrash(),
        });
      });
    };
    window.addEventListener('visibilitychange', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('visibilitychange', flush);
      window.removeEventListener('beforeunload', flush);
    };
  }, []);
}

function useRestoreFolder() {
  const dispatch = useAppDispatch();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await restoreFolderConnection();
        if (cancelled) return;
        if (result.workspaceFolderName) {
          dispatch(setWorkspaceFolderName(result.workspaceFolderName));
        }
        dispatch(
          setConnectedProjects(
            result.projects.map((p) => ({
              projectId: p.id,
              folderName: result.workspaceFolderName ?? '',
              title: p.title,
            })),
          ),
        );
        dispatch(setTrashedProjects(result.trashedProjects));
        if (result.activeProjectId) {
          dispatch(setActiveConnectedProjectId(result.activeProjectId));
        }
        if (result.snapshot) {
          dispatch(
            hydrateProject({ ...result.snapshot, storageMode: 'folder' }),
          );
        }
      } catch (e) {
        console.error('폴더 복원 중 오류', e);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return ready;
}

export default function App() {
  const dispatch = useAppDispatch();
  const ready = useRestoreFolder();
  const sidebarCollapsed = useAppSelector(selectSidebarCollapsed);
  const storageMode = useAppSelector(selectStorageMode);
  const referenceDrawerOpen = useAppSelector(selectReferenceDrawerOpen);
  const trashPanelOpen = useAppSelector(selectTrashPanelOpen);
  const workspaceFolderName = useAppSelector(selectWorkspaceFolderName);
  const connectedProjects = useAppSelector(selectConnectedProjects);
  const folderConnected = storageMode === 'folder';
  const workspaceLinked =
    Boolean(workspaceFolderName) || connectedProjects.length > 0;
  useAutosave();

  useEffect(() => {
    if (!folderConnected && referenceDrawerOpen) {
      dispatch(setReferenceDrawerOpen(false));
    }
  }, [folderConnected, referenceDrawerOpen, dispatch]);

  if (!ready) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          fontSize: 14,
        }}
      >
        폴더 연결 복원 중…
      </div>
    );
  }

  const shell = (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <ExplorerSidebar />
      <RouteNav />
      {folderConnected ? <SceneKanban /> : <FolderConnectPrompt />}
    </div>
  );

  return (
    <>
      {folderConnected ? (
        <WorkspaceDndProvider>
          {shell}
          <ReferenceDrawer />
        </WorkspaceDndProvider>
      ) : (
        shell
      )}
      {workspaceLinked && trashPanelOpen ? <TrashPanel /> : null}
    </>
  );
}
