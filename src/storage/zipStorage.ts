import JSZip from 'jszip';
import type {
  DocumentMeta,
  Manifest,
  ReferenceNote,
  Scene,
} from '../types/models';
import { SCHEMA_VERSION } from '../types/models';
import type { ProjectSnapshot, ProjectStorage } from './types';

export class ZipStorage implements ProjectStorage {
  readonly kind = 'zip' as const;
  private lastZip: Blob | null = null;
  private initial?: ArrayBuffer;

  constructor(initial?: ArrayBuffer) {
    this.initial = initial;
  }

  static async fromFile(file: File): Promise<ZipStorage> {
    return new ZipStorage(await file.arrayBuffer());
  }

  async load(): Promise<ProjectSnapshot> {
    if (!this.initial) {
      throw new Error('ZIP 데이터가 없습니다.');
    }
    const zip = await JSZip.loadAsync(this.initial);
    const manifestText = await zip.file('manifest.json')?.async('string');
    if (!manifestText) throw new Error('manifest.json이 없습니다.');
    const manifest = JSON.parse(manifestText) as Manifest;
    if (!manifest.schemaVersion) manifest.schemaVersion = SCHEMA_VERSION;

    const documents: DocumentMeta[] = [];
    const scenes: Scene[] = [];
    const references: ReferenceNote[] = [];

    const docs = zip.folder('documents');
    if (docs) {
      const tasks: Promise<void>[] = [];
      docs.forEach((path, file) => {
        if (file.dir || !path.endsWith('.json')) return;
        tasks.push(
          file.async('string').then((t) => {
            documents.push(JSON.parse(t) as DocumentMeta);
          }),
        );
      });
      await Promise.all(tasks);
    }

    const scenesFolder = zip.folder('scenes');
    if (scenesFolder) {
      const tasks: Promise<void>[] = [];
      scenesFolder.forEach((path, file) => {
        if (file.dir || !path.endsWith('.json')) return;
        tasks.push(
          file.async('string').then((t) => {
            scenes.push(JSON.parse(t) as Scene);
          }),
        );
      });
      await Promise.all(tasks);
    }

    const refsFolder = zip.folder('references');
    if (refsFolder) {
      const tasks: Promise<void>[] = [];
      refsFolder.forEach((path, file) => {
        if (file.dir || !path.endsWith('.json')) return;
        tasks.push(
          file.async('string').then((t) => {
            references.push(JSON.parse(t) as ReferenceNote);
          }),
        );
      });
      await Promise.all(tasks);
    }

    documents.sort((a, b) => a.order - b.order);
    return { manifest, documents, scenes, references };
  }

  async saveAll(snapshot: ProjectSnapshot): Promise<void> {
    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify(snapshot.manifest, null, 2));
    for (const doc of snapshot.documents) {
      zip.file(`documents/${doc.id}.json`, JSON.stringify(doc, null, 2));
    }
    for (const scene of snapshot.scenes) {
      zip.file(`scenes/${scene.id}.json`, JSON.stringify(scene, null, 2));
    }
    for (const ref of snapshot.references) {
      zip.file(`references/${ref.id}.json`, JSON.stringify(ref, null, 2));
    }
    zip.folder('assets');
    zip.folder('beats');
    this.lastZip = await zip.generateAsync({ type: 'blob' });
  }

  download(filename?: string): void {
    if (!this.lastZip) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(this.lastZip);
    a.download = filename ?? 'story-compass-project.zip';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  getBlob(): Blob | null {
    return this.lastZip;
  }
}

export async function downloadProjectZip(
  snapshot: ProjectSnapshot,
  filename?: string,
): Promise<void> {
  const storage = new ZipStorage();
  await storage.saveAll(snapshot);
  storage.download(filename);
}
