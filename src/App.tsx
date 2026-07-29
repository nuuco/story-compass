import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { hydrateProject, setActiveConnectedProjectId, setConnectedProjects, setReferenceDrawerOpen, setSaveStatus } from './store/projectSlice';
import {
  flushSave,
  getActiveStorage,
  scheduleSave,
} from './storage/autosave';
import { restoreFolderConnection } from './storage/restoreFolder';
import { ExplorerSidebar } from './components/ExplorerSidebar';
import { RouteNav } from './components/RouteNav';
import { SceneKanban } from './components/SceneKanban';
import { ReferenceDrawer } from './components/ReferenceDrawer';
import { FolderConnectPrompt } from './components/FolderConnectPrompt';

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
        });
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
        dispatch(setConnectedProjects(result.projects));
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
  const referenceDrawerOpen = useAppSelector((s) => s.project.referenceDrawerOpen);
  const folderConnected = storageMode === 'folder';
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

  return (
    <>
      <div
        className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
      >
        <ExplorerSidebar />
        <RouteNav />
        {folderConnected ? <SceneKanban /> : <FolderConnectPrompt />}
      </div>
      {folderConnected ? <ReferenceDrawer /> : null}
    </>
  );
}
