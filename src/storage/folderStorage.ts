/// <reference lib="dom" />

import type {
  DocumentMeta,
  Manifest,
  ReferenceNote,
  Scene,
} from '../types/models';
import { SCHEMA_VERSION } from '../types/models';
import type { ProjectSnapshot, ProjectStorage } from './types';

async function ensureDir(
  root: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle> {
  return root.getDirectoryHandle(name, { create: true });
}

async function writeJson(
  dir: FileSystemDirectoryHandle,
  name: string,
  data: unknown,
): Promise<void> {
  const file = await dir.getFileHandle(name, { create: true });
  const writable = await file.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

async function readJson<T>(
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

async function listJsonFiles(
  dir: FileSystemDirectoryHandle,
): Promise<string[]> {
  const names: string[] = [];
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind === 'file' && name.endsWith('.json')) names.push(name);
  }
  return names;
}

/** 스냅샷에 없는 JSON 파일을 디렉터리에서 제거 (삭제 후 재로드 시 유령 메모 방지) */
async function pruneMissingJson(
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

export class FolderStorage implements ProjectStorage {
  readonly kind = 'folder' as const;
  private root: FileSystemDirectoryHandle;

  constructor(root: FileSystemDirectoryHandle) {
    this.root = root;
  }

  get directoryHandle(): FileSystemDirectoryHandle {
    return this.root;
  }

  static fromHandle(root: FileSystemDirectoryHandle): FolderStorage {
    return new FolderStorage(root);
  }

  static async pick(): Promise<FolderStorage | null> {
    const picker = window.showDirectoryPicker;
    if (!picker) return null;
    const root = await picker({ mode: 'readwrite' });
    return new FolderStorage(root);
  }

  async load(): Promise<ProjectSnapshot> {
    const manifest =
      (await readJson<Manifest>(this.root, 'manifest.json')) ??
      ({
        schemaVersion: SCHEMA_VERSION,
        project: {
          id: 'proj_imported',
          title: this.root.name || '불러온 프로젝트',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        activeDocumentId: null,
      } satisfies Manifest);

    const documentsDir = await ensureDir(this.root, 'documents');
    const scenesDir = await ensureDir(this.root, 'scenes');
    const refsDir = await ensureDir(this.root, 'references');

    const documents: DocumentMeta[] = [];
    for (const name of await listJsonFiles(documentsDir)) {
      const doc = await readJson<DocumentMeta>(documentsDir, name);
      if (doc) documents.push(doc);
    }
    documents.sort((a, b) => a.order - b.order);

    const scenes: Scene[] = [];
    for (const name of await listJsonFiles(scenesDir)) {
      const scene = await readJson<Scene>(scenesDir, name);
      if (scene) scenes.push(scene);
    }

    const references: ReferenceNote[] = [];
    for (const name of await listJsonFiles(refsDir)) {
      const ref = await readJson<ReferenceNote>(refsDir, name);
      if (ref) references.push(ref);
    }

    return { manifest, documents, scenes, references };
  }

  async saveAll(snapshot: ProjectSnapshot): Promise<void> {
    await writeJson(this.root, 'manifest.json', snapshot.manifest);
    const documentsDir = await ensureDir(this.root, 'documents');
    const scenesDir = await ensureDir(this.root, 'scenes');
    const refsDir = await ensureDir(this.root, 'references');
    await ensureDir(this.root, 'assets');
    await ensureDir(this.root, 'beats');

    for (const doc of snapshot.documents) {
      await writeJson(documentsDir, `${doc.id}.json`, doc);
    }
    for (const scene of snapshot.scenes) {
      await writeJson(scenesDir, `${scene.id}.json`, scene);
    }
    for (const ref of snapshot.references) {
      await writeJson(refsDir, `${ref.id}.json`, ref);
    }

    await pruneMissingJson(
      documentsDir,
      new Set(snapshot.documents.map((d) => d.id)),
    );
    await pruneMissingJson(
      scenesDir,
      new Set(snapshot.scenes.map((s) => s.id)),
    );
    await pruneMissingJson(
      refsDir,
      new Set(snapshot.references.map((r) => r.id)),
    );
  }

  async saveScene(scene: Scene): Promise<void> {
    const scenesDir = await ensureDir(this.root, 'scenes');
    await writeJson(scenesDir, `${scene.id}.json`, scene);
  }

  async saveDocument(doc: DocumentMeta): Promise<void> {
    const documentsDir = await ensureDir(this.root, 'documents');
    await writeJson(documentsDir, `${doc.id}.json`, doc);
  }

  async saveManifest(manifest: Manifest): Promise<void> {
    await writeJson(this.root, 'manifest.json', manifest);
  }

  async saveReference(ref: ReferenceNote): Promise<void> {
    const refsDir = await ensureDir(this.root, 'references');
    await writeJson(refsDir, `${ref.id}.json`, ref);
  }
}
