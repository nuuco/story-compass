import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppDispatch, useAppSelector } from '../store/hooks';
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
import { TagFilter } from './TagFilter';
import { SearchInput } from './SearchInput';
import { ReferenceKeepModal } from './ReferenceKeepModal';
import { copyTextToClipboard, formatNotePlain } from '../utils/exportText';
import { NoteMenuPortal } from './NoteMenuPortal';
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
  const focusBeatIndex = useAppSelector((s) => s.project.focusBeatIndex);
  const selectedDocumentId = useAppSelector((s) => s.project.selectedDocumentId);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const suppressClickRef = useRef(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: refNote.id,
    data: { type: 'reference', refId: refNote.id },
  });

  useEffect(() => {
    if (isDragging) {
      suppressClickRef.current = true;
      return;
    }
    if (!suppressClickRef.current) return;
    const t = window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 80);
    return () => window.clearTimeout(t);
  }, [isDragging]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const title = refNote.title.trim();
  const previewHtml =
    refNote.contentHtml?.trim() &&
    refNote.contentHtml !== '<p></p>' &&
    refNote.contentHtml !== '<p><br></p>'
      ? refNote.contentHtml
      : '';
  const plainExcerpt = previewHtml
    ? previewHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    : '';

  async function onCopyText() {
    const text = formatNotePlain(refNote);
    const ok = await copyTextToClipboard(text);
    showToast(
      ok ? '클립보드에 복사했습니다' : '복사에 실패했습니다',
      ok ? 'info' : 'error',
    );
  }

  async function onDelete() {
    const ok = await confirm({
      title: '참고 메모를 삭제할까요?',
      message: '삭제한 메모는 휴지통으로 이동합니다. 나중에 복원할 수 있습니다.',
      confirmLabel: '휴지통으로',
      danger: true,
    });
    if (ok) dispatch(deleteReference(refNote.id));
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      data-ref-card
      className={`scene-card ref-preview-card ${isDragging ? 'dragging' : ''} ${menuOpen ? 'menu-open' : ''}`}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        dispatch(selectReference(refNote.id));
      }}
    >
      <div
        className="card-options card-options--bar"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="icon-btn icon-btn--danger"
          aria-label="삭제"
          title="삭제"
          onClick={(e) => {
            e.stopPropagation();
            void onDelete();
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
            delete
          </span>
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="텍스트로 복사"
          title="텍스트로 복사"
          onClick={(e) => {
            e.stopPropagation();
            void onCopyText();
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
            content_copy
          </span>
        </button>
        <button
          ref={menuBtnRef}
          type="button"
          className="icon-btn"
          aria-label="더보기"
          aria-expanded={menuOpen}
          title="더보기"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((o) => !o);
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
            more_horiz
          </span>
        </button>
        <NoteMenuPortal
          open={menuOpen}
          anchorRef={menuBtnRef}
          onClose={() => setMenuOpen(false)}
        >
          <button
            type="button"
            onClick={() => {
              dispatch(nudgeReference({ id: refNote.id, dir: 'top' }));
              setMenuOpen(false);
            }}
          >
            맨 위로
          </button>
          <button
            type="button"
            onClick={() => {
              dispatch(nudgeReference({ id: refNote.id, dir: 'bottom' }));
              setMenuOpen(false);
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
                setMenuOpen(false);
                return;
              }
              dispatch(
                copyReferenceToScene({
                  refId: refNote.id,
                  beatIndex: focusBeatIndex ?? 0,
                }),
              );
              setMenuOpen(false);
              showToast('칸반으로 복사했습니다');
            }}
          >
            칸반으로 복사
          </button>
          <p className="note-menu__hint">이동은 칸반으로 드래그</p>
        </NoteMenuPortal>
      </div>

      {title ? <div className="card-title">{title}</div> : null}

      {plainExcerpt ? (
        <div
          className={`card-excerpt ${title ? '' : 'card-excerpt--solo'}`.trim()}
        >
          {plainExcerpt}
        </div>
      ) : (
        <div
          className={`card-excerpt empty ${title ? '' : 'card-excerpt--solo'}`.trim()}
        >
          내용 없음
        </div>
      )}

      {refNote.tags.length > 0 && (
        <div className="card-tags">
          {refNote.tags.map((t) => (
            <span key={t} className="tag-chip">
              #{t.replace(/^#/, '')}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function RefTray({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'ref-tray' });
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
  const {
    references,
    referenceDrawerOpen,
    referenceTagFilter,
    referenceSearchQuery,
    selectedReferenceId,
  } = useAppSelector((s) => s.project);

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
    ? references.find((r) => r.id === selectedReferenceId) ?? null
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
