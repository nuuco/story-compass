import { useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { htmlToPlainText } from '../utils/content';
import { handleWorkspaceDragEnd } from '../utils/workspaceDrag';
import { useToast } from './Toast';

function dragHintFor(
  kind: 'scene' | 'reference',
  overId: string | null,
  sceneIds: Set<string>,
  refIds: Set<string>,
): string {
  if (kind === 'reference') {
    if (!overId) return '칸반에 놓으면 씬으로';
    if (overId.startsWith('beat-') || sceneIds.has(overId)) {
      return '여기에 놓으면 씬으로';
    }
    if (overId === 'ref-tray' || refIds.has(overId)) {
      return '참고 순서 변경';
    }
    return '칸반에 놓으면 씬으로';
  }

  // scene
  if (!overId) return '순서 변경 또는 참고로';
  if (overId === 'ref-tray' || refIds.has(overId)) {
    return '참고로 이동';
  }
  if (overId.startsWith('beat-') || sceneIds.has(overId)) {
    return '순서 변경 · 참고로 이동';
  }
  return '순서 변경 또는 참고로';
}

/** 칸반·참고 드로어를 하나의 DnD 컨텍스트로 감싼다 (크로스 드롭용) */
export function WorkspaceDndProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { scenes, references, selectedDocumentId } = useAppSelector(
    (s) => s.project,
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const activeScene = activeId
    ? scenes.find((s) => s.id === activeId) ?? null
    : null;
  const activeRef = activeId
    ? references.find((r) => r.id === activeId) ?? null
    : null;

  const sceneIds = new Set(scenes.map((s) => s.id));
  const refIds = new Set(references.map((r) => r.id));

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setOverId(null);
  }

  function onDragOver(event: DragOverEvent) {
    setOverId(event.over ? String(event.over.id) : null);
  }

  function clearDrag() {
    setActiveId(null);
    setOverId(null);
  }

  const sceneHint = dragHintFor('scene', overId, sceneIds, refIds);
  const refHint = dragHintFor('reference', overId, sceneIds, refIds);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={(event) => {
        clearDrag();
        handleWorkspaceDragEnd(event, {
          dispatch,
          scenes,
          references,
          selectedDocumentId,
          showToast,
        });
      }}
      onDragCancel={clearDrag}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {activeScene ? (
          <div className="scene-card scene-card--drag-overlay" style={{ width: 280 }}>
            <div className="scene-card__drag-hint">
              <span className="material-symbols-rounded">open_with</span>
              {sceneHint}
            </div>
            {activeScene.title.trim() ? (
              <div className="card-title">{activeScene.title.trim()}</div>
            ) : (
              <div className="card-excerpt card-excerpt--solo">
                {htmlToPlainText(activeScene.contentHtml) || '내용 없음'}
              </div>
            )}
          </div>
        ) : null}
        {activeRef ? (
          <div
            className="scene-card ref-preview-card scene-card--drag-overlay"
            style={{ width: 280 }}
          >
            <div className="scene-card__drag-hint">
              <span className="material-symbols-rounded">open_with</span>
              {refHint}
            </div>
            {activeRef.title.trim() ? (
              <div className="card-title">{activeRef.title.trim()}</div>
            ) : (
              <div className="card-excerpt card-excerpt--solo">
                {htmlToPlainText(activeRef.contentHtml) || '내용 없음'}
              </div>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
