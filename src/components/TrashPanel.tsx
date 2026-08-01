import { useMemo } from 'react';
import { useStore } from 'react-redux';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import type { RootState } from '../store';
import {
  clearProjectTrash,
  purgeTrashItem,
  restoreTrashItem,
  setTrashPanelOpen,
  setTrashSortBy,
} from '../store/projectSlice';
import {
  emptyAllTrash,
  purgeTrashedProject,
  restoreProjectFromTrash,
} from '../storage/projectConnection';
import {
  buildTrashListItems,
  sortTrashItems,
  trashKindLabel,
} from '../utils/trash';
import type { TrashKind } from '../types/models';
import { useConfirm } from './ConfirmDialog';

const PERMA_DELETE_MSG =
  '되돌릴 수 없으며 PC 휴지통에도 남지 않습니다.';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function TrashPanel() {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const confirm = useConfirm();
  const {
    trash,
    trashedProjects,
    trashSortBy,
    activeConnectedProjectId,
    storageMode,
  } = useAppSelector((s) => s.project);

  const items = useMemo(() => {
    const list = buildTrashListItems(
      activeConnectedProjectId,
      trash,
      trashedProjects,
    );
    return sortTrashItems(list, trashSortBy);
  }, [activeConnectedProjectId, trash, trashedProjects, trashSortBy]);

  async function onRestore(kind: TrashKind, id: string) {
    if (kind === 'project') {
      await restoreProjectFromTrash(dispatch, store.getState, id);
      return;
    }
    dispatch(restoreTrashItem({ kind, id }));
  }

  async function onPurge(kind: TrashKind, id: string, title: string) {
    const ok = await confirm({
      title: '영구 삭제할까요?',
      message: `"${title}"을(를) 영구 삭제합니다. ${PERMA_DELETE_MSG}`,
      confirmLabel: '영구 삭제',
      danger: true,
    });
    if (!ok) return;
    if (kind === 'project') {
      await purgeTrashedProject(dispatch, id);
      return;
    }
    dispatch(purgeTrashItem({ kind, id }));
  }

  async function onEmpty() {
    if (items.length === 0) return;
    const ok = await confirm({
      title: '휴지통을 비울까요?',
      message: `휴지통의 모든 항목(${items.length}개)을 영구 삭제합니다. ${PERMA_DELETE_MSG}`,
      confirmLabel: '비우기',
      danger: true,
    });
    if (!ok) return;

    if (storageMode === 'folder') {
      await emptyAllTrash(dispatch, store.getState);
    } else {
      dispatch(clearProjectTrash());
    }
  }

  return (
    <div className="trash-panel" role="dialog" aria-label="휴지통">
      <div className="trash-panel__header">
        <div className="trash-panel__title-row">
          <span className="material-symbols-rounded" aria-hidden>
            delete
          </span>
          <h2 className="trash-panel__title">휴지통</h2>
          <button
            type="button"
            className="trash-panel__close"
            aria-label="휴지통 닫기"
            onClick={() => dispatch(setTrashPanelOpen(false))}
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
        <div className="trash-panel__toolbar">
          <div className="trash-panel__sort" role="group" aria-label="정렬">
            <button
              type="button"
              className={trashSortBy === 'deletedAt' ? 'is-active' : ''}
              onClick={() => dispatch(setTrashSortBy('deletedAt'))}
            >
              삭제일 순
            </button>
            <button
              type="button"
              className={trashSortBy === 'createdAt' ? 'is-active' : ''}
              onClick={() => dispatch(setTrashSortBy('createdAt'))}
            >
              생성일 순
            </button>
          </div>
          <button
            type="button"
            className="trash-panel__empty"
            disabled={items.length === 0}
            onClick={() => void onEmpty()}
          >
            비우기
          </button>
        </div>
      </div>

      <div className="trash-panel__list">
        {items.length === 0 ? (
          <p className="trash-panel__empty-msg">휴지통이 비어 있습니다.</p>
        ) : (
          items.map((item) => (
            <div key={`${item.kind}-${item.id}`} className="trash-panel__item">
              <div className="trash-panel__item-main">
                <span className="trash-panel__kind">
                  {trashKindLabel(item.kind)}
                </span>
                <span className="trash-panel__item-title">{item.title}</span>
                <span className="trash-panel__item-meta">
                  삭제 {formatDate(item.deletedAt)}
                  {' · '}
                  생성 {formatDate(item.createdAt)}
                </span>
              </div>
              <div className="trash-panel__item-actions">
                <button
                  type="button"
                  title="복원"
                  aria-label={`${item.title} 복원`}
                  onClick={() => void onRestore(item.kind, item.id)}
                >
                  <span className="material-symbols-rounded">
                    restore_from_trash
                  </span>
                </button>
                <button
                  type="button"
                  className="is-danger"
                  title="영구 삭제"
                  aria-label={`${item.title} 영구 삭제`}
                  onClick={() => void onPurge(item.kind, item.id, item.title)}
                >
                  <span className="material-symbols-rounded">delete_forever</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
