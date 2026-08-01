import type {
  DocumentMeta,
  Manifest,
  ProjectTrash,
  ReferenceNote,
  Scene,
} from '../types/models';
import { emptyProjectTrash } from '../types/models';

export interface ProjectSnapshot {
  manifest: Manifest;
  documents: DocumentMeta[];
  scenes: Scene[];
  references: ReferenceNote[];
  trash: ProjectTrash;
}

export interface ProjectStorage {
  readonly kind: 'folder';
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
    trash: emptyProjectTrash(),
  };
}
