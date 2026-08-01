/** FileSystemDirectoryHandle 영속화 — 워크스페이스 폴더 핸들만 IndexedDB에 저장 */

const DB_NAME = 'story-compass-fs';
const LEGACY_STORE = 'handles';
const LEGACY_KEY = 'project-folder';
const HANDLES_STORE = 'project-handles';
const META_STORE = 'meta';
const META_WORKSPACE = 'workspace-folder';
const META_LAST_ACTIVE = 'last-active-project';
const DB_VERSION = 3;

export interface WorkspaceConnectionMeta {
  folderName: string;
}

export interface StoredWorkspaceRecord extends WorkspaceConnectionMeta {
  handle: FileSystemDirectoryHandle;
}

/** @deprecated 사이드바 호환용 — 워크스페이스 내 프로젝트 요약 */
export interface ConnectedProjectMeta {
  projectId: string;
  folderName: string;
  title: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
    req.onblocked = () => {
      /* 다른 탭이 구버전을 잡고 있으면 대기 */
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

/** 구버전 단일/다중 프로젝트 핸들 → 워크스페이스 핸들로 이전 */
async function migrateLegacyHandles(): Promise<void> {
  try {
    const db = await openDb();
    try {
      const existing = await new Promise<StoredWorkspaceRecord | null>(
        (resolve, reject) => {
          const tx = db.transaction(META_STORE, 'readonly');
          const req = tx.objectStore(META_STORE).get(META_WORKSPACE);
          req.onsuccess = () =>
            resolve((req.result as StoredWorkspaceRecord) ?? null);
          req.onerror = () => reject(req.error);
        },
      );
      if (existing?.handle) {
        db.close();
        return;
      }

      // 1) 구버전 단일 핸들
      let candidate: FileSystemDirectoryHandle | null = null;
      if (db.objectStoreNames.contains(LEGACY_STORE)) {
        candidate = await new Promise<FileSystemDirectoryHandle | null>(
          (resolve, reject) => {
            const tx = db.transaction(LEGACY_STORE, 'readonly');
            const req = tx.objectStore(LEGACY_STORE).get(LEGACY_KEY);
            req.onsuccess = () =>
              resolve((req.result as FileSystemDirectoryHandle) ?? null);
            req.onerror = () => reject(req.error);
          },
        );
      }

      // 2) 다중 프로젝트 핸들 중 마지막 활성
      if (!candidate && db.objectStoreNames.contains(HANDLES_STORE)) {
        const lastActive = await new Promise<string | null>((resolve, reject) => {
          const tx = db.transaction(META_STORE, 'readonly');
          const req = tx.objectStore(META_STORE).get(META_LAST_ACTIVE);
          req.onsuccess = () => resolve((req.result as string) ?? null);
          req.onerror = () => reject(req.error);
        });
        if (lastActive) {
          const record = await new Promise<{
            handle: FileSystemDirectoryHandle;
          } | null>((resolve, reject) => {
            const tx = db.transaction(HANDLES_STORE, 'readonly');
            const req = tx.objectStore(HANDLES_STORE).get(lastActive);
            req.onsuccess = () =>
              resolve(
                (req.result as { handle: FileSystemDirectoryHandle }) ?? null,
              );
            req.onerror = () => reject(req.error);
          });
          candidate = record?.handle ?? null;
        }
        if (!candidate) {
          const all = await new Promise<
            { handle: FileSystemDirectoryHandle }[]
          >((resolve, reject) => {
            const tx = db.transaction(HANDLES_STORE, 'readonly');
            const req = tx.objectStore(HANDLES_STORE).getAll();
            req.onsuccess = () =>
              resolve(
                (req.result as { handle: FileSystemDirectoryHandle }[]) ?? [],
              );
            req.onerror = () => reject(req.error);
          });
          candidate = all[0]?.handle ?? null;
        }
      }

      if (!candidate) {
        db.close();
        return;
      }

      const permitted = await hasDirectoryPermission(candidate, 'readwrite');
      if (!permitted) {
        // 권한 없으면 레거시만 정리
        await new Promise<void>((resolve, reject) => {
          const stores = [LEGACY_STORE, HANDLES_STORE].filter((s) =>
            db.objectStoreNames.contains(s),
          );
          const tx = db.transaction([...stores, META_STORE], 'readwrite');
          if (db.objectStoreNames.contains(LEGACY_STORE)) {
            tx.objectStore(LEGACY_STORE).delete(LEGACY_KEY);
          }
          if (db.objectStoreNames.contains(HANDLES_STORE)) {
            tx.objectStore(HANDLES_STORE).clear();
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        db.close();
        return;
      }

      const record: StoredWorkspaceRecord = {
        folderName: candidate.name,
        handle: candidate,
      };
      await new Promise<void>((resolve, reject) => {
        const stores = [META_STORE, LEGACY_STORE, HANDLES_STORE].filter((s) =>
          db.objectStoreNames.contains(s),
        );
        const tx = db.transaction(stores, 'readwrite');
        tx.objectStore(META_STORE).put(record, META_WORKSPACE);
        if (db.objectStoreNames.contains(LEGACY_STORE)) {
          tx.objectStore(LEGACY_STORE).delete(LEGACY_KEY);
        }
        if (db.objectStoreNames.contains(HANDLES_STORE)) {
          tx.objectStore(HANDLES_STORE).clear();
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  } catch (e) {
    console.warn('레거시 핸들 마이그레이션 건너뜀', e);
  }
}

let migratePromise: Promise<void> | null = null;

async function ensureMigrated(): Promise<void> {
  if (!migratePromise) migratePromise = migrateLegacyHandles();
  return migratePromise;
}

export async function loadWorkspaceHandle(): Promise<FileSystemDirectoryHandle | null> {
  await ensureMigrated();
  try {
    const db = await openDb();
    try {
      const record = await new Promise<StoredWorkspaceRecord | null>(
        (resolve, reject) => {
          const tx = db.transaction(META_STORE, 'readonly');
          const req = tx.objectStore(META_STORE).get(META_WORKSPACE);
          req.onsuccess = () =>
            resolve((req.result as StoredWorkspaceRecord) ?? null);
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

export async function saveWorkspaceHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await openDb();
  try {
    const record: StoredWorkspaceRecord = {
      folderName: handle.name,
      handle,
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readwrite');
      tx.objectStore(META_STORE).put(record, META_WORKSPACE);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function clearWorkspaceHandle(): Promise<void> {
  try {
    const db = await openDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(META_STORE, 'readwrite');
        tx.objectStore(META_STORE).delete(META_WORKSPACE);
        tx.objectStore(META_STORE).delete(META_LAST_ACTIVE);
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
  await ensureMigrated();
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
