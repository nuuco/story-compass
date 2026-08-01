import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addReference,
  deleteReference,
  nudgeReference,
  placeReference,
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
  } = useSortable({ id: refNote.id });

  useEffect(() => {
    if (isDragging) suppressClickRef.current = true;
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
        className="card-options"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          ref={menuBtnRef}
          type="button"
          className="icon-btn"
          aria-label="더보기"
          aria-expanded={menuOpen}
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
          {(
            [
              ['top', '맨 위로'],
              ['up', '위로'],
              ['down', '아래로'],
              ['bottom', '맨 아래로'],
            ] as const
          ).map(([dir, label]) => (
            <button
              key={dir}
              type="button"
              onClick={() => {
                dispatch(nudgeReference({ id: refNote.id, dir }));
                setMenuOpen(false);
              }}
            >
              {label}
            </button>
          ))}
          <hr />
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              void (async () => {
                const text = formatNotePlain(refNote);
                const ok = await copyTextToClipboard(text);
                showToast(
                  ok ? '클립보드에 복사했습니다' : '복사에 실패했습니다',
                  ok ? 'info' : 'error',
                );
              })();
            }}
          >
            텍스트로 복사
          </button>
          <button
            type="button"
            className="danger"
            onClick={() => {
              setMenuOpen(false);
              void (async () => {
                const ok = await confirm({
                  title: '참고 메모를 삭제할까요?',
                  message: '삭제한 메모는 휴지통으로 이동합니다. 나중에 복원할 수 있습니다.',
                  confirmLabel: '휴지통으로',
                  danger: true,
                });
                if (ok) dispatch(deleteReference(refNote.id));
              })();
            }}
          >
            삭제
          </button>
        </NoteMenuPortal>
      </div>

      <div className={`card-title ${title ? '' : 'empty'}`}>
        {title || '제목 없는 메모'}
      </div>

      {plainExcerpt ? (
        <div className="card-excerpt">{plainExcerpt}</div>
      ) : (
        <div className="card-excerpt empty">내용 없음</div>
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
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
  );

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

  const activeRef = activeId
    ? filtered.find((r) => r.id === activeId) ?? null
    : null;

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const activeRefId = String(active.id);
    const overId = String(over.id);
    if (activeRefId === overId) return;

    const sorted = [...references].sort((a, b) => a.order - b.order);
    const from = sorted.findIndex((r) => r.id === activeRefId);
    const to = sorted.findIndex((r) => r.id === overId);
    if (from < 0 || to < 0) return;
    dispatch(placeReference({ id: activeRefId, order: to }));
  }

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
        <div className="reference-drawer__list scenes-container">
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
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
            <DragOverlay dropAnimation={null}>
              {activeRef ? (
                <div
                  className="scene-card ref-preview-card scene-card--drag-overlay"
                  style={{ width: 280 }}
                >
                  <div className="scene-card__drag-hint">
                    <span className="material-symbols-rounded">open_with</span>
                    이동
                  </div>
                  <div className="card-title">
                    {activeRef.title.trim() || '제목 없는 메모'}
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
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
        </div>
      </aside>
    </div>
  );
}
