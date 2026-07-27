import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { hydrateProject, setSaveStatus } from './store/projectSlice';
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
      const result = await restoreFolderConnection();
      if (cancelled) return;
      if (result.ok) {
        dispatch(hydrateProject({ ...result.snapshot, storageMode: 'folder' }));
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return ready;
}

export default function App() {
  const ready = useRestoreFolder();
  const sidebarCollapsed = useAppSelector((s) => s.project.sidebarCollapsed);
  useAutosave();

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
        <SceneKanban />
      </div>
      <ReferenceDrawer />
    </>
  );
}
