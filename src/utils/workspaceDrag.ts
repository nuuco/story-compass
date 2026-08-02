import type { DragEndEvent } from '@dnd-kit/core';
import type { AppDispatch } from '../store';
import {
  convertReferenceToScene,
  convertSceneToReference,
  placeReference,
  placeScene,
} from '../store/projectSlice';
import type { ReferenceNote, Scene } from '../types/models';

type ToastFn = (message: string, tone?: 'info' | 'error') => void;

export function handleWorkspaceDragEnd(
  event: DragEndEvent,
  ctx: {
    dispatch: AppDispatch;
    scenes: Scene[];
    references: ReferenceNote[];
    selectedDocumentId: string | null;
    showToast: ToastFn;
  },
): void {
  const { active, over } = event;
  if (!over) return;

  const activeId = String(active.id);
  const overId = String(over.id);
  const type = active.data.current?.type as string | undefined;
  const { dispatch, scenes, references, selectedDocumentId, showToast } = ctx;

  // 참고 → 칸반 (이동)
  if (type === 'reference' || references.some((r) => r.id === activeId)) {
    if (overId.startsWith('beat-')) {
      if (!selectedDocumentId) {
        showToast('문서를 먼저 선택하세요', 'error');
        return;
      }
      const beatIndex = Number(overId.replace('beat-', ''));
      dispatch(convertReferenceToScene({ refId: activeId, beatIndex }));
      showToast('씬으로 옮겼습니다');
      return;
    }
    const overScene = scenes.find((s) => s.id === overId);
    if (overScene) {
      if (!selectedDocumentId) {
        showToast('문서를 먼저 선택하세요', 'error');
        return;
      }
      dispatch(
        convertReferenceToScene({
          refId: activeId,
          beatIndex: overScene.beatIndex,
          order: overScene.order,
        }),
      );
      showToast('씬으로 옮겼습니다');
      return;
    }
    // 참고 목록 내 재정렬
    if (references.some((r) => r.id === overId) && activeId !== overId) {
      const sorted = [...references].sort((a, b) => a.order - b.order);
      const to = sorted.findIndex((r) => r.id === overId);
      if (to >= 0) dispatch(placeReference({ id: activeId, order: to }));
    }
    return;
  }

  // 씬 → 참고 드로어 (이동)
  if (type === 'scene' || scenes.some((s) => s.id === activeId)) {
    if (overId === 'ref-tray' || references.some((r) => r.id === overId)) {
      let order: number | undefined;
      if (overId !== 'ref-tray') {
        const sorted = [...references].sort((a, b) => a.order - b.order);
        const to = sorted.findIndex((r) => r.id === overId);
        if (to >= 0) order = to;
      }
      dispatch(convertSceneToReference({ sceneId: activeId, order }));
      showToast('참고 메모로 옮겼습니다');
      return;
    }

    if (!selectedDocumentId) return;
    if (activeId === overId) return;

    const moving = scenes.find((s) => s.id === activeId);
    if (!moving) return;

    let targetBeat = moving.beatIndex;
    let targetOrder = moving.order;

    if (overId.startsWith('beat-')) {
      targetBeat = Number(overId.replace('beat-', ''));
      targetOrder = scenes.filter(
        (s) =>
          s.documentId === selectedDocumentId &&
          s.beatIndex === targetBeat &&
          s.id !== activeId,
      ).length;
    } else {
      const overScene = scenes.find((s) => s.id === overId);
      if (!overScene) return;
      targetBeat = overScene.beatIndex;

      if (moving.beatIndex === targetBeat) {
        const col = scenes
          .filter(
            (s) =>
              s.documentId === selectedDocumentId &&
              s.beatIndex === targetBeat,
          )
          .sort((a, b) => a.order - b.order);
        const oldIndex = col.findIndex((s) => s.id === activeId);
        const newIndex = col.findIndex((s) => s.id === overId);
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
        targetOrder = newIndex;
      } else {
        const col = scenes
          .filter(
            (s) =>
              s.documentId === selectedDocumentId &&
              s.beatIndex === targetBeat &&
              s.id !== activeId,
          )
          .sort((a, b) => a.order - b.order);
        const overIndex = col.findIndex((s) => s.id === overId);
        if (overIndex < 0) {
          targetOrder = col.length;
        } else {
          const overRect = over.rect;
          const activeRect =
            active.rect.current.translated ?? active.rect.current.initial;
          if (overRect && activeRect) {
            const activeCenterY = activeRect.top + activeRect.height / 2;
            const overMidY = overRect.top + overRect.height / 2;
            targetOrder =
              activeCenterY > overMidY ? overIndex + 1 : overIndex;
          } else {
            targetOrder = overIndex;
          }
        }
      }
    }

    if (moving.beatIndex === targetBeat && moving.order === targetOrder) {
      return;
    }

    dispatch(
      placeScene({
        id: activeId,
        beatIndex: targetBeat,
        order: targetOrder,
      }),
    );
  }
}
