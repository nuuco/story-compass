import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from './store/hooks';
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
  scheduleSave,
} from './storage/autosave';
import { restoreFolderConnection } from './storage/restoreFolder';
import { emptyProjectTrash } from './types/models';
import { ExplorerSidebar } from './components/ExplorerSidebar';
import { RouteNav } from './components/RouteNav';
import { WorkspaceDndProvider } from './components/WorkspaceCanvas';
import { SceneKanban } from './components/SceneKanban';
import { ReferenceDrawer } from './components/ReferenceDrawer';
import { FolderConnectPrompt } from './components/FolderConnectPrompt';
import { TrashPanel } from './components/TrashPanel';

function useAutosave() {
  const dispatch = useAppDispatch();
  const project = useAppSelector((s) => s.project);

  useEffect(() => {
    if (project.saveStatus !== 'dirty') return;
    if (project.storageMode !== 'folder') return;

    scheduleSave(async () => {
      const storage = getActiveStorage();
      if (!storage) return;
      dispatch(setSaveStatus('saving'));
      try {
        await storage.saveAll({
          manifest: project.manifest,
          documents: project.documents,
          scenes: project.scenes,
          references: project.references,
          trash: project.trash ?? emptyProjectTrash(),
        });
        const ws = getActiveWorkspace();
        if (ws) {
          await ws.updateProjectSummary(project.manifest.project.id, {
            title: project.manifest.project.title,
            updatedAt: project.manifest.project.updatedAt,
          });
        }
        dispatch(setSaveStatus('saved'));
      } catch {
        dispatch(setSaveStatus('error'));
      }
    });
  }, [
    project.saveStatus,
    project.manifest,
    project.documents,
    project.scenes,
    project.references,
    project.trash,
    project.storageMode,
    dispatch,
  ]);

  useEffect(() => {
    const flush = () => {
      if (project.storageMode !== 'folder') return;
      flushSave(async () => {
        const storage = getActiveStorage();
        if (!storage) return;
        await storage.saveAll({
          manifest: project.manifest,
          documents: project.documents,
          scenes: project.scenes,
          references: project.references,
          trash: project.trash ?? emptyProjectTrash(),
        });
      });
    };
    window.addEventListener('visibilitychange', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('visibilitychange', flush);
      window.removeEventListener('beforeunload', flush);
    };
  }, [project]);
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
  const sidebarCollapsed = useAppSelector((s) => s.project.sidebarCollapsed);
  const storageMode = useAppSelector((s) => s.project.storageMode);
  const referenceDrawerOpen = useAppSelector(
    (s) => s.project.referenceDrawerOpen,
  );
  const trashPanelOpen = useAppSelector((s) => s.project.trashPanelOpen);
  const workspaceFolderName = useAppSelector(
    (s) => s.project.workspaceFolderName,
  );
  const connectedProjects = useAppSelector((s) => s.project.connectedProjects);
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
