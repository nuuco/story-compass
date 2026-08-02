import { useMemo, useState, type ReactNode } from 'react';
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
import { useStore } from 'react-redux';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import type { RootState } from '../store';
import {
  selectReferenceFilterActive,
  selectSceneFilterActive,
  selectSelectedDocumentId,
} from '../store/selectors';
import { htmlToPlainText } from '../utils/content';
import { REF_TRAY_ID, isBeatDroppableId } from '../utils/dndIds';
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
    if (isBeatDroppableId(overId) || sceneIds.has(overId)) {
      return '여기에 놓으면 씬으로';
    }
    if (overId === REF_TRAY_ID || refIds.has(overId)) {
      return '참고 순서 변경';
    }
    return '칸반에 놓으면 씬으로';
  }

  if (!overId) return '순서 변경 또는 참고로';
  if (overId === REF_TRAY_ID || refIds.has(overId)) {
    return '참고로 이동';
  }
  if (isBeatDroppableId(overId) || sceneIds.has(overId)) {
    return '순서 변경 · 참고로 이동';
  }
  return '순서 변경 또는 참고로';
}

function DragGhost({
  title,
  contentHtml,
  hint,
  refTone,
}: {
  title: string;
  contentHtml: string;
  hint: string;
  refTone?: boolean;
}) {
  const trimmed = title.trim();
  return (
    <div
      className={`scene-card scene-card--drag-overlay${refTone ? ' ref-preview-card' : ''}`}
      style={{ width: 280 }}
    >
      <div className="scene-card__drag-hint">
        <span className="material-symbols-rounded">open_with</span>
        {hint}
      </div>
      {trimmed ? (
        <div className="card-title">{trimmed}</div>
      ) : (
        <div className="card-excerpt card-excerpt--solo">
          {htmlToPlainText(contentHtml) || '내용 없음'}
        </div>
      )}
    </div>
  );
}

/** 칸반·참고 드로어를 하나의 DnD 컨텍스트로 감싼다 (크로스 드롭용) */
export function WorkspaceDndProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const { showToast } = useToast();
  const selectedDocumentId = useAppSelector(selectSelectedDocumentId);
  const sceneFilterActive = useAppSelector(selectSceneFilterActive);
  const referenceFilterActive = useAppSelector(selectReferenceFilterActive);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // 드래그 중 오버레이만 구독(id 키는 콘텐츠 변경에 반응하지 않음). end는 getState.
  const activeScene = useAppSelector((s) =>
    activeId ? (s.project.scenes.find((sc) => sc.id === activeId) ?? null) : null,
  );
  const activeRef = useAppSelector((s) =>
    activeId
      ? (s.project.references.find((r) => r.id === activeId) ?? null)
      : null,
  );
  const sceneIdKey = useAppSelector((s) =>
    s.project.scenes.map((sc) => sc.id).join('\0'),
  );
  const refIdKey = useAppSelector((s) =>
    s.project.references.map((r) => r.id).join('\0'),
  );
  const sceneIds = useMemo(
    () => new Set(sceneIdKey ? sceneIdKey.split('\0') : []),
    [sceneIdKey],
  );
  const refIds = useMemo(
    () => new Set(refIdKey ? refIdKey.split('\0') : []),
    [refIdKey],
  );

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
        const { scenes, references } = store.getState().project;
        handleWorkspaceDragEnd(event, {
          dispatch,
          scenes,
          references,
          selectedDocumentId,
          showToast,
          sceneFilterActive,
          referenceFilterActive,
        });
      }}
      onDragCancel={clearDrag}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {activeScene ? (
          <DragGhost
            title={activeScene.title}
            contentHtml={activeScene.contentHtml}
            hint={sceneHint}
          />
        ) : null}
        {activeRef ? (
          <DragGhost
            title={activeRef.title}
            contentHtml={activeRef.contentHtml}
            hint={refHint}
            refTone
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
