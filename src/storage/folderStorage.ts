/// <reference lib="dom" />

import type {
  DocumentMeta,
  Manifest,
  ProjectTrash,
  ReferenceNote,
  Scene,
  TrashedDocumentBundle,
  TrashedReference,
  TrashedScene,
} from '../types/models';
import { emptyProjectTrash, SCHEMA_VERSION } from '../types/models';
import {
  ensureDir,
  listJsonFiles,
  pruneMissingJson,
  readJson,
  writeJson,
} from './fsHelpers';
import type { ProjectSnapshot, ProjectStorage } from './types';

async function loadTrash(root: FileSystemDirectoryHandle): Promise<ProjectTrash> {
  const trashRoot = await ensureDir(root, 'trash');
  const scenesDir = await ensureDir(trashRoot, 'scenes');
  const refsDir = await ensureDir(trashRoot, 'references');
  const bundlesDir = await ensureDir(trashRoot, 'bundles');

  const scenes: TrashedScene[] = [];
  for (const name of await listJsonFiles(scenesDir)) {
    const item = await readJson<TrashedScene>(scenesDir, name);
    if (item?.scene) scenes.push(item);
  }

  const references: TrashedReference[] = [];
  for (const name of await listJsonFiles(refsDir)) {
    const item = await readJson<TrashedReference>(refsDir, name);
    if (item?.reference) references.push(item);
  }

  const bundles: TrashedDocumentBundle[] = [];
  for (const name of await listJsonFiles(bundlesDir)) {
    const item = await readJson<TrashedDocumentBundle>(bundlesDir, name);
    if (item?.document) bundles.push(item);
  }

  return { scenes, references, bundles };
}

async function saveTrash(
  root: FileSystemDirectoryHandle,
  trash: ProjectTrash,
): Promise<void> {
  const trashRoot = await ensureDir(root, 'trash');
  const scenesDir = await ensureDir(trashRoot, 'scenes');
  const refsDir = await ensureDir(trashRoot, 'references');
  const bundlesDir = await ensureDir(trashRoot, 'bundles');

  for (const item of trash.scenes) {
    await writeJson(scenesDir, `${item.scene.id}.json`, item);
  }
  for (const item of trash.references) {
    await writeJson(refsDir, `${item.reference.id}.json`, item);
  }
  for (const item of trash.bundles) {
    await writeJson(bundlesDir, `${item.document.id}.json`, item);
  }

  await pruneMissingJson(
    scenesDir,
    new Set(trash.scenes.map((t) => t.scene.id)),
  );
  await pruneMissingJson(
    refsDir,
    new Set(trash.references.map((t) => t.reference.id)),
  );
  await pruneMissingJson(
    bundlesDir,
    new Set(trash.bundles.map((t) => t.document.id)),
  );
}

/** 프로젝트 루트(projects/{id}/)에 대한 FolderStorage */
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

    if (!manifest.schemaVersion) manifest.schemaVersion = SCHEMA_VERSION;

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

    const trash = await loadTrash(this.root);

    return { manifest, documents, scenes, references, trash };
  }

  async saveAll(snapshot: ProjectSnapshot): Promise<void> {
    const manifest = {
      ...snapshot.manifest,
      schemaVersion: SCHEMA_VERSION,
    };
    await writeJson(this.root, 'manifest.json', manifest);
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

    await saveTrash(this.root, snapshot.trash ?? emptyProjectTrash());
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
    await writeJson(this.root, 'manifest.json', {
      ...manifest,
      schemaVersion: SCHEMA_VERSION,
    });
  }

  async saveReference(ref: ReferenceNote): Promise<void> {
    const refsDir = await ensureDir(this.root, 'references');
    await writeJson(refsDir, `${ref.id}.json`, ref);
  }
}
