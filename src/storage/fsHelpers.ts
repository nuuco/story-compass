/// <reference lib="dom" />

export async function ensureDir(
  root: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle> {
  return root.getDirectoryHandle(name, { create: true });
}

export async function writeJson(
  dir: FileSystemDirectoryHandle,
  name: string,
  data: unknown,
): Promise<void> {
  const file = await dir.getFileHandle(name, { create: true });
  const writable = await file.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

export async function readJson<T>(
  dir: FileSystemDirectoryHandle,
  name: string,
): Promise<T | null> {
  try {
    const file = await dir.getFileHandle(name);
    const blob = await file.getFile();
    const text = await blob.text();
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function listJsonFiles(
  dir: FileSystemDirectoryHandle,
): Promise<string[]> {
  const names: string[] = [];
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind === 'file' && name.endsWith('.json')) names.push(name);
  }
  return names;
}

export async function listDirectoryNames(
  dir: FileSystemDirectoryHandle,
): Promise<string[]> {
  const names: string[] = [];
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind === 'directory') names.push(name);
  }
  return names;
}

export async function dirExists(
  root: FileSystemDirectoryHandle,
  name: string,
): Promise<boolean> {
  try {
    await root.getDirectoryHandle(name);
    return true;
  } catch {
    return false;
  }
}

export async function fileExists(
  root: FileSystemDirectoryHandle,
  name: string,
): Promise<boolean> {
  try {
    await root.getFileHandle(name);
    return true;
  } catch {
    return false;
  }
}

/** 스냅샷에 없는 JSON 파일을 디렉터리에서 제거 */
export async function pruneMissingJson(
  dir: FileSystemDirectoryHandle,
  keepIds: Set<string>,
): Promise<void> {
  for (const name of await listJsonFiles(dir)) {
    const id = name.replace(/\.json$/, '');
    if (!keepIds.has(id)) {
      await dir.removeEntry(name);
    }
  }
}

/**
 * 디렉터리 내용을 재귀적으로 복사 (File System Access API에는 move가 없어 복사+삭제).
 */
export async function copyDirectory(
  source: FileSystemDirectoryHandle,
  target: FileSystemDirectoryHandle,
): Promise<void> {
  for await (const [name, handle] of source.entries()) {
    if (handle.kind === 'file') {
      const file = await handle.getFile();
      const dest = await target.getFileHandle(name, { create: true });
      const writable = await dest.createWritable();
      await writable.write(await file.arrayBuffer());
      await writable.close();
    } else {
      const child = await target.getDirectoryHandle(name, { create: true });
      await copyDirectory(handle, child);
    }
  }
}

/** 디렉터리 재귀 삭제 */
export async function removeDirectoryRecursive(
  parent: FileSystemDirectoryHandle,
  name: string,
): Promise<void> {
  try {
    await parent.removeEntry(name, { recursive: true });
  } catch {
    /* 없으면 무시 */
  }
}
