/** FileSystemDirectoryHandle 영속화 — 프로젝트별 폴더 핸들만 IndexedDB에 저장 */

const DB_NAME = 'story-compass-fs';
const LEGACY_STORE = 'handles';
const LEGACY_KEY = 'project-folder';
const HANDLES_STORE = 'project-handles';
const META_STORE = 'meta';
const META_LAST_ACTIVE = 'last-active-project';
const DB_VERSION = 2;

export interface ConnectedProjectMeta {
  projectId: string;
  folderName: string;
  title: string;
}

export interface StoredProjectRecord extends ConnectedProjectMeta {
  handle: FileSystemDirectoryHandle;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
    req.onblocked = () => {
      /* 다른 탭이 구버전을 잡고 있으면 대기 — onsuccess/onerror로 종료 */
    };
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(HANDLES_STORE)) {
        db.createObjectStore(HANDLES_STORE);
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
      if (!db.objectStoreNames.contains(LEGACY_STORE)) {
        db.createObjectStore(LEGACY_STORE);
      }
    };
  });
}

let migratePromise: Promise<void> | null = null;

/** 구버전 단일 핸들을 프로젝트 레코드로 이전 (한 번만) */
async function migrateLegacyHandle(): Promise<void> {
  if (!migratePromise) {
    migratePromise = (async () => {
      try {
        const db = await openDb();
        if (!db.objectStoreNames.contains(LEGACY_STORE)) {
          db.close();
          return;
        }
        const legacy = await new Promise<FileSystemDirectoryHandle | null>(
          (resolve, reject) => {
            const tx = db.transaction(LEGACY_STORE, 'readonly');
            const req = tx.objectStore(LEGACY_STORE).get(LEGACY_KEY);
            req.onsuccess = () =>
              resolve((req.result as FileSystemDirectoryHandle) ?? null);
            req.onerror = () => reject(req.error);
          },
        );
        if (!legacy) {
          db.close();
          return;
        }

        // 페이지 로드 중 requestPermission은 제스처 없어 멈출 수 있음 → query만
        const permitted = await hasDirectoryPermission(legacy, 'readwrite');
        if (!permitted) {
          await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(LEGACY_STORE, 'readwrite');
            tx.objectStore(LEGACY_STORE).delete(LEGACY_KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          });
          db.close();
          return;
        }

        const { FolderStorage } = await import('./folderStorage');
        const storage = FolderStorage.fromHandle(legacy);
        const snap = await storage.load();
        const record: StoredProjectRecord = {
          projectId: snap.manifest.project.id,
          folderName: legacy.name,
          title: snap.manifest.project.title,
          handle: legacy,
        };
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(
            [HANDLES_STORE, META_STORE, LEGACY_STORE],
            'readwrite',
          );
          tx.objectStore(HANDLES_STORE).put(record, record.projectId);
          tx.objectStore(META_STORE).put(record.projectId, META_LAST_ACTIVE);
          tx.objectStore(LEGACY_STORE).delete(LEGACY_KEY);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        db.close();
      } catch (e) {
        console.warn('레거시 폴더 핸들 마이그레이션 건너뜀', e);
      }
    })();
  }
  return migratePromise;
}

export async function listStoredProjects(): Promise<ConnectedProjectMeta[]> {
  await migrateLegacyHandle();
  const db = await openDb();
  try {
    const records = await new Promise<StoredProjectRecord[]>((resolve, reject) => {
      const tx = db.transaction(HANDLES_STORE, 'readonly');
      const req = tx.objectStore(HANDLES_STORE).getAll();
      req.onsuccess = () =>
        resolve((req.result as StoredProjectRecord[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    return records
      .map(({ projectId, folderName, title }) => ({
        projectId,
        folderName,
        title,
      }))
      .sort((a, b) => a.title.localeCompare(b.title, 'ko'));
  } finally {
    db.close();
  }
}

export async function loadProjectHandle(
  projectId: string,
): Promise<FileSystemDirectoryHandle | null> {
  await migrateLegacyHandle();
  try {
    const db = await openDb();
    try {
      const record = await new Promise<StoredProjectRecord | null>(
        (resolve, reject) => {
          const tx = db.transaction(HANDLES_STORE, 'readonly');
          const req = tx.objectStore(HANDLES_STORE).get(projectId);
          req.onsuccess = () =>
            resolve((req.result as StoredProjectRecord) ?? null);
          req.onerror = () => reject(req.error);
        },
      );
      return record?.handle ?? null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

export async function saveProjectRecord(
  record: StoredProjectRecord,
): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HANDLES_STORE, 'readwrite');
      tx.objectStore(HANDLES_STORE).put(record, record.projectId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function removeProjectRecord(projectId: string): Promise<void> {
  try {
    const db = await openDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(HANDLES_STORE, 'readwrite');
        tx.objectStore(HANDLES_STORE).delete(projectId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  } catch {
    /* ignore */
  }
}

export async function getLastActiveProjectId(): Promise<string | null> {
  await migrateLegacyHandle();
  try {
    const db = await openDb();
    try {
      return await new Promise<string | null>((resolve, reject) => {
        const tx = db.transaction(META_STORE, 'readonly');
        const req = tx.objectStore(META_STORE).get(META_LAST_ACTIVE);
        req.onsuccess = () => resolve((req.result as string) ?? null);
        req.onerror = () => reject(req.error);
      });
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

export async function setLastActiveProjectId(
  projectId: string | null,
): Promise<void> {
  try {
    const db = await openDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(META_STORE, 'readwrite');
        if (projectId) {
          tx.objectStore(META_STORE).put(projectId, META_LAST_ACTIVE);
        } else {
          tx.objectStore(META_STORE).delete(META_LAST_ACTIVE);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  } catch {
    /* ignore */
  }
}

/** 이미 부여된 권한만 확인 (페이지 로드에서 request 호출 금지) */
export async function hasDirectoryPermission(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'readwrite',
): Promise<boolean> {
  try {
    return (await handle.queryPermission({ mode })) === 'granted';
  } catch {
    return false;
  }
}

/** 사용자 제스처 안에서만 호출 — 권한 요청 가능 */
export async function ensureDirectoryPermission(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'readwrite',
): Promise<boolean> {
  const opts = { mode } as const;
  try {
    if ((await handle.queryPermission(opts)) === 'granted') return true;
    if ((await handle.requestPermission(opts)) === 'granted') return true;
  } catch {
    return false;
  }
  return false;
}

export async function clearDirectoryHandle(): Promise<void> {
  try {
    const db = await openDb();
    const stores = [LEGACY_STORE, HANDLES_STORE, META_STORE].filter((s) =>
      db.objectStoreNames.contains(s),
    );
    if (stores.length === 0) {
      db.close();
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(stores, 'readwrite');
      if (db.objectStoreNames.contains(LEGACY_STORE)) {
        tx.objectStore(LEGACY_STORE).delete(LEGACY_KEY);
      }
      if (db.objectStoreNames.contains(HANDLES_STORE)) {
        tx.objectStore(HANDLES_STORE).clear();
      }
      if (db.objectStoreNames.contains(META_STORE)) {
        tx.objectStore(META_STORE).clear();
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}
