import { Fragment, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  selectFocusBeatIndex,
  selectReferenceDrawerOpen,
  selectReferenceSearchQuery,
  selectReferenceTagFilter,
  selectReferences,
  selectSelectedDocumentId,
  selectSelectedReferenceId,
} from '../store/selectors';
import {
  addReference,
  copyReferenceToScene,
  deleteReference,
  nudgeReference,
  purgeReferenceTag,
  selectReference,
  setReferenceDrawerOpen,
  setReferenceSearchQuery,
  setReferenceTagFilter,
} from '../store/projectSlice';
import type { ReferenceNote } from '../types/models';
import { matchesNoteSearch } from '../utils/content';
import { REF_TRAY_ID } from '../utils/dndIds';
import { TagFilter } from './TagFilter';
import { SearchInput } from './SearchInput';
import { ReferenceKeepModal } from './ReferenceKeepModal';
import { NotePreviewCard } from './NotePreviewCard';
import { useConfirm } from './ConfirmDialog';
import { useToast } from './Toast';

function RefInsertGap({ order }: { order: number }) {
  const dispatch = useAppDispatch();
  return (
    <div className="scene-insert" data-ref-insert>
      <button
        type="button"
        className="scene-insert__btn"
        aria-label="여기에 메모 추가"
        title="여기에 메모 추가"
        onClick={(e) => {
          e.stopPropagation();
          dispatch(addReference({ order }));
        }}
      >
        <span className="material-symbols-rounded">add</span>
        메모 추가
      </button>
    </div>
  );
}

function ReferencePreviewCard({ refNote }: { refNote: ReferenceNote }) {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const focusBeatIndex = useAppSelector(selectFocusBeatIndex);
  const selectedDocumentId = useAppSelector(selectSelectedDocumentId);

  return (
    <NotePreviewCard
      id={refNote.id}
      title={refNote.title}
      contentHtml={refNote.contentHtml}
      tags={refNote.tags}
      dndType="reference"
      className="ref-preview-card"
      onSelect={() => dispatch(selectReference(refNote.id))}
      onDelete={async () => {
        const ok = await confirm({
          title: '참고 메모를 삭제할까요?',
          message:
            '삭제한 메모는 휴지통으로 이동합니다. 나중에 복원할 수 있습니다.',
          confirmLabel: '휴지통으로',
          danger: true,
        });
        if (ok) dispatch(deleteReference(refNote.id));
      }}
      renderMenu={(closeMenu) => (
        <>
          <button
            type="button"
            onClick={() => {
              dispatch(nudgeReference({ id: refNote.id, dir: 'top' }));
              closeMenu();
            }}
          >
            맨 위로
          </button>
          <button
            type="button"
            onClick={() => {
              dispatch(nudgeReference({ id: refNote.id, dir: 'bottom' }));
              closeMenu();
            }}
          >
            맨 아래로
          </button>
          <hr />
          <button
            type="button"
            onClick={() => {
              if (!selectedDocumentId) {
                showToast('문서를 먼저 선택하세요', 'error');
                closeMenu();
                return;
              }
              dispatch(
                copyReferenceToScene({
                  refId: refNote.id,
                  beatIndex: focusBeatIndex ?? 0,
                }),
              );
              closeMenu();
              showToast('칸반으로 복사했습니다');
            }}
          >
            칸반으로 복사
          </button>
          <p className="note-menu__hint">이동은 칸반으로 드래그</p>
        </>
      )}
    />
  );
}

function RefTray({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: REF_TRAY_ID });
  return (
    <div
      ref={setNodeRef}
      className={`reference-drawer__list scenes-container ${isOver ? 'is-drop-target' : ''}`}
    >
      {children}
    </div>
  );
}

export function ReferenceDrawer() {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const references = useAppSelector(selectReferences);
  const referenceDrawerOpen = useAppSelector(selectReferenceDrawerOpen);
  const referenceTagFilter = useAppSelector(selectReferenceTagFilter);
  const referenceSearchQuery = useAppSelector(selectReferenceSearchQuery);
  const selectedReferenceId = useAppSelector(selectSelectedReferenceId);

  const selectedTags = referenceTagFilter
    .map((t) => t.replace(/^#/, '').trim())
    .filter(Boolean);

  const filtered = useMemo(() => {
    return [...references]
      .filter((r) => {
        if (
          !matchesNoteSearch(referenceSearchQuery, {
            title: r.title,
            contentHtml: r.contentHtml,
            tags: r.tags,
          })
        ) {
          return false;
        }
        if (selectedTags.length === 0) return true;
        const refTags = r.tags.map((t) => t.replace(/^#/, ''));
        return selectedTags.some((tag) => refTags.includes(tag));
      })
      .sort((a, b) => a.order - b.order);
  }, [references, referenceSearchQuery, selectedTags]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    references.forEach((r) =>
      r.tags.forEach((t) => set.add(t.replace(/^#/, ''))),
    );
    return [...set].sort();
  }, [references]);

  const editing = selectedReferenceId
    ? (references.find((r) => r.id === selectedReferenceId) ?? null)
    : null;

  const emptyMessage =
    selectedTags.length > 0 || referenceSearchQuery.trim()
      ? '검색·필터에 맞는 메모가 없습니다.'
      : null;

  return (
    <div className="reference-drawer-root" aria-hidden={!referenceDrawerOpen}>
      {editing && <ReferenceKeepModal reference={editing} />}
      <aside
        className={`reference-drawer ${referenceDrawerOpen ? 'open' : ''}`}
      >
        <div className="reference-drawer__header">
          <div className="reference-drawer__header-top">
            <span className="reference-drawer__title">참고 자료</span>
            <button
              type="button"
              className="icon-btn"
              onClick={() => dispatch(setReferenceDrawerOpen(false))}
              aria-label="참고 자료 닫기"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>
          <div className="reference-drawer__header-actions">
            <SearchInput
              id="reference-search"
              name="reference-search"
              value={referenceSearchQuery}
              onChange={(v) => dispatch(setReferenceSearchQuery(v))}
            />
            <TagFilter
              tags={allTags}
              value={referenceTagFilter}
              onChange={(v) => dispatch(setReferenceTagFilter(v))}
              label="# 참고 태그"
              variant="icon"
              onRemoveTag={(tag) => {
                void (async () => {
                  const ok = await confirm({
                    title: `#${tag} 태그를 삭제할까요?`,
                    message: '참고 메모에서 해당 태그가 제거됩니다.',
                    confirmLabel: '삭제',
                    danger: true,
                  });
                  if (ok) dispatch(purgeReferenceTag(tag));
                })();
              }}
            />
            {referenceSearchQuery.trim() || referenceTagFilter.length > 0 ? (
              <button
                type="button"
                className="filter-reset-btn"
                aria-label="필터 초기화"
                title="필터 초기화"
                onClick={() => {
                  dispatch(setReferenceSearchQuery(''));
                  dispatch(setReferenceTagFilter([]));
                }}
              >
                <span className="material-symbols-rounded">filter_alt_off</span>
              </button>
            ) : null}
          </div>
        </div>
        <RefTray>
          <p className="panel-drag-hint reference-drawer__list-hint">
            드래그로 순서 변경 · 칸반으로 이동
          </p>
          {emptyMessage && filtered.length === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-tertiary)',
                textAlign: 'center',
                padding: 24,
              }}
            >
              {emptyMessage}
            </p>
          ) : null}
          <SortableContext
            items={filtered.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            {filtered.map((ref) => (
              <Fragment key={ref.id}>
                <RefInsertGap order={ref.order} />
                <ReferencePreviewCard refNote={ref} />
              </Fragment>
            ))}
          </SortableContext>
          <button
            type="button"
            className="add-scene-btn"
            onClick={() => dispatch(addReference({}))}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
              add
            </span>
            메모 추가
          </button>
        </RefTray>
      </aside>
    </div>
  );
}
