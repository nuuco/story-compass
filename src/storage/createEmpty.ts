import type { DocumentMeta } from '../types/models';
import { emptyProjectTrash, SCHEMA_VERSION } from '../types/models';
import { createId, nowIso } from '../utils/id';
import type { ProjectSnapshot } from './types';

export function createEmptyProjectSnapshot(): ProjectSnapshot {
  const ts = nowIso();
  const projectId = createId('proj');
  const docId = createId('doc');
  const doc: DocumentMeta = {
    id: docId,
    title: '본편',
    order: 0,
    createdAt: ts,
    updatedAt: ts,
  };
  return {
    manifest: {
      schemaVersion: SCHEMA_VERSION,
      project: {
        id: projectId,
        title: '새 스토리',
        createdAt: ts,
        updatedAt: ts,
      },
      activeDocumentId: docId,
    },
    documents: [doc],
    scenes: [],
    references: [],
    trash: emptyProjectTrash(),
  };
}
