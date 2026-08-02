import type { ReferenceNote, Scene } from '../types/models';
import { createId, nowIso } from '../utils/id';
import { clampBeatIndex } from './beatIndex';

type SceneDraft = { scenes: Scene[] };
type RefDraft = { references: ReferenceNote[] };

/** 비트 열에 삽입할 order를 잡고, 필요 시 기존 씬 order를 밀어낸다 */
export function reserveSceneOrder(
  state: SceneDraft,
  documentId: string,
  beatIndex: number,
  insertOrder?: number,
): { beatIndex: number; order: number } {
  const bi = clampBeatIndex(beatIndex);
  const siblings = state.scenes.filter(
    (s) => s.documentId === documentId && s.beatIndex === bi,
  );
  let order = siblings.length;
  if (insertOrder !== undefined) {
    order = Math.min(siblings.length, Math.max(0, Math.floor(insertOrder)));
    for (const s of siblings) {
      if (s.order >= order) s.order += 1;
    }
  }
  return { beatIndex: bi, order };
}

export function buildSceneFromReference(
  ref: ReferenceNote,
  documentId: string,
  beatIndex: number,
  order: number,
  opts: { preserveCreatedAt: boolean },
): Scene {
  const ts = nowIso();
  return {
    id: createId('scene'),
    documentId,
    title: ref.title,
    contentHtml: ref.contentHtml,
    beatIndex: clampBeatIndex(beatIndex),
    order,
    tags: [...ref.tags],
    createdAt: opts.preserveCreatedAt ? ref.createdAt : ts,
    updatedAt: ts,
  };
}

export function buildReferenceFromScene(
  scene: Scene,
  order: number,
  opts: { preserveCreatedAt: boolean },
): ReferenceNote {
  const ts = nowIso();
  return {
    id: createId('ref'),
    title: scene.title,
    contentHtml: scene.contentHtml,
    tags: [...scene.tags],
    order,
    createdAt: opts.preserveCreatedAt ? scene.createdAt : ts,
    updatedAt: ts,
  };
}

export function reserveReferenceOrder(
  state: RefDraft,
  insertOrder?: number,
): number {
  let order = state.references.length;
  if (insertOrder !== undefined) {
    order = Math.min(
      state.references.length,
      Math.max(0, Math.floor(insertOrder)),
    );
    for (const r of state.references) {
      if (r.order >= order) r.order += 1;
    }
  }
  return order;
}
