import type {
  DocumentMeta,
  Manifest,
  ReferenceNote,
  Scene,
} from '../types/models';

export interface ProjectSnapshot {
  manifest: Manifest;
  documents: DocumentMeta[];
  scenes: Scene[];
  references: ReferenceNote[];
}

export interface ProjectStorage {
  readonly kind: 'folder' | 'zip';
  load(): Promise<ProjectSnapshot>;
  saveAll(snapshot: ProjectSnapshot): Promise<void>;
  saveScene?(scene: Scene): Promise<void>;
  saveDocument?(doc: DocumentMeta): Promise<void>;
  saveManifest?(manifest: Manifest): Promise<void>;
  saveReference?(ref: ReferenceNote): Promise<void>;
}

export function emptySnapshot(manifest: Manifest): ProjectSnapshot {
  return {
    manifest,
    documents: [],
    scenes: [],
    references: [],
  };
}
