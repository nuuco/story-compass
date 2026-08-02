import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  Fragment,
} from 'react';
import { createPortal } from 'react-dom';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { DEFAULT_BEAT_GUIDE, getActGuide, getBeatAct } from '../data/beatGuide';
import type { BeatGuideItem } from '../types/models';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  selectCenterSearchQuery,
  selectCenterTagFilter,
  selectDocuments,
  selectFocusBeatIndex,
  selectScenes,
  selectSelectedDocumentId,
  selectSelectedSceneId,
} from '../store/selectors';
import {
  addScene,
  purgeSceneTag,
  selectScene,
  setCenterSearchQuery,
  setCenterTagFilter,
  setFocusBeatIndex,
} from '../store/projectSlice';
import type { Scene } from '../types/models';
import { matchesNoteSearch } from '../utils/content';
import { beatDroppableId } from '../utils/dndIds';
import {
  getFocusedBeatFromBoardScroll,
  scrollBeatColumnIntoView,
  scrollBoardSnap,
} from '../utils/scrollBeat';
import { SceneCard } from './SceneCard';
import { SceneKeepModal } from './SceneKeepModal';
import { BeatGuideModal } from './BeatGuideModal';
import { ManuscriptPreviewModal } from './ManuscriptPreviewModal';
import { SearchInput } from './SearchInput';
import { TagFilter } from './TagFilter';
import { useConfirm } from './ConfirmDialog';
import { useToast } from './Toast';

/** 하단 추가 버튼과 같은 톤의 호버 삽입 */
function SceneInsertGap({
  documentId,
  beatIndex,
  order,
}: {
  documentId: string;
  beatIndex: number;
  order: number;
}) {
  const dispatch = useAppDispatch();
  return (
    <div className="scene-insert" data-scene-insert>
      <button
        type="button"
        className="scene-insert__btn"
        aria-label="여기에 씬 추가"
        title="여기에 씬 추가"
        onClick={(e) => {
          e.stopPropagation();
          dispatch(addScene({ documentId, beatIndex, order }));
        }}
      >
        <span className="material-symbols-rounded">add</span>
        씬 추가
      </button>
    </div>
  );
}

function BeatHeaderTooltip({
  guide,
  anchorRef,
  open,
}: {
  guide: BeatGuideItem;
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 320 });

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // 제목 텍스트 시작 근처부터, 너비는 헤더의 약 80%
      const width = Math.round(r.width * 0.8);
      setPos({
        top: r.top - 8,
        left: r.left + (r.width - width) - 20,
        width,
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      className="beat-header__tooltip beat-header__tooltip--portal"
      role="tooltip"
      style={{
        top: pos.top,
        left: pos.left,
        width: pos.width,
        maxWidth: 'min(288px, 92vw)',
      }}
    >
      <p className="beat-header__tooltip-guide">{guide.guidanceKo}</p>
      {guide.promptsKo.length > 0 ? (
        <ul className="beat-header__tooltip-prompts">
          {guide.promptsKo.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      ) : null}
    </div>,
    document.body,
  );
}

function BeatColumn({
  beatIndex,
  nameKo,
  scenes,
  documentId,
  focused,
  onOpenGuide,
  actLabel,
  actStart,
}: {
  beatIndex: number;
  nameKo: string;
  scenes: Scene[];
  documentId: string;
  focused: boolean;
  onOpenGuide: (beatIndex: number) => void;
  /** 막 시작 열에만: "1막 · 설정" */
  actLabel?: string;
  actStart?: boolean;
}) {
  const dispatch = useAppDispatch();
  const { setNodeRef, isOver } = useDroppable({
    id: beatDroppableId(beatIndex),
  });
  const ids = scenes.map((s) => s.id);
  const beatGuide = DEFAULT_BEAT_GUIDE[beatIndex];
  const headerRef = useRef<HTMLDivElement>(null);
  const [tipOpen, setTipOpen] = useState(false);

  return (
    <section
      id={`beat-col-${beatIndex}`}
      className={`beat-column ${focused || isOver ? 'focused' : ''} ${actStart ? 'act-start' : ''}`}
    >
      {actLabel ? (
        <div className="beat-act-label">{actLabel}</div>
      ) : (
        <div className="beat-act-label beat-act-label--spacer" aria-hidden />
      )}
      <div
        ref={headerRef}
        className="beat-header"
        onMouseEnter={() => setTipOpen(true)}
        onMouseLeave={() => setTipOpen(false)}
      >
        <button
          type="button"
          className="beat-header__focus"
          onClick={() => scrollBeatColumnIntoView(beatIndex)}
          aria-pressed={focused}
          aria-label={`${nameKo} 열로 스크롤`}
          onFocus={() => setTipOpen(true)}
          onBlur={(e) => {
            if (!headerRef.current?.contains(e.relatedTarget as Node)) {
              setTipOpen(false);
            }
          }}
        >
          <div className="beat-number">{beatIndex + 1}</div>
          <span className="beat-title">{nameKo}</span>
        </button>
        {beatGuide ? (
          <BeatHeaderTooltip
            guide={beatGuide}
            anchorRef={headerRef}
            open={tipOpen}
          />
        ) : null}
        <button
          type="button"
          className={`beat-info-btn${tipOpen ? ' is-hint' : ''}`}
          aria-label={`${nameKo} 상세 안내 보기`}
          title="상세 안내"
          onClick={(e) => {
            e.stopPropagation();
            onOpenGuide(beatIndex);
          }}
        >
          <span className="material-symbols-rounded">info</span>
        </button>
        <div className="beat-meta">{scenes.length}개</div>
      </div>
      <div ref={setNodeRef} className="scenes-container">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {scenes.map((scene) => (
            <Fragment key={scene.id}>
              <SceneInsertGap
                documentId={documentId}
                beatIndex={beatIndex}
                order={scene.order}
              />
              <SceneCard scene={scene} />
            </Fragment>
          ))}
        </SortableContext>
        <button
          type="button"
          className="add-scene-btn"
          onClick={(e) => {
            e.stopPropagation();
            dispatch(addScene({ documentId, beatIndex }));
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
            add
          </span>
          씬 추가
        </button>
      </div>
    </section>
  );
}

export function SceneKanban() {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const scenes = useAppSelector(selectScenes);
  const selectedDocumentId = useAppSelector(selectSelectedDocumentId);
  const selectedSceneId = useAppSelector(selectSelectedSceneId);
  const centerTagFilter = useAppSelector(selectCenterTagFilter);
  const centerSearchQuery = useAppSelector(selectCenterSearchQuery);
  const focusBeatIndex = useAppSelector(selectFocusBeatIndex);
  const documents = useAppSelector(selectDocuments);
  const projectTitle = useAppSelector((s) => s.project.manifest.project.title);
  const [guideBeatIndex, setGuideBeatIndex] = useState<number | null>(null);
  const [manuscriptOpen, setManuscriptOpen] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const focusBeatRef = useRef(focusBeatIndex);
  focusBeatRef.current = focusBeatIndex;
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startScroll: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  function updateBoardScrollButtons() {
    const el = boardRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < max - 4);
  }

  function scrollBoard(dir: 'left' | 'right') {
    scrollBoardSnap(dir, boardRef.current);
  }

  function canStartBoardPan(target: HTMLElement) {
    if (target.closest('[data-scene-card]')) return false;
    if (target.closest('[data-scene-insert]')) return false;
    if (target.closest('.board-scroll-zone')) return false;
    if (target.closest('.add-scene-btn')) return false;
    if (target.closest('.beat-info-btn')) return false;
    if (target.closest('.beat-header__focus')) return false;
    if (target.closest('button')) return false;
    if (target.closest('input')) return false;
    if (target.closest('a')) return false;
    return true;
  }

  function onBoardPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (!canStartBoardPan(target)) return;
    const el = boardRef.current;
    if (!el) return;
    // 클릭과 구분: 임계값 넘기기 전에는 capture 하지 않음
    panRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
  }

  function onBoardPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const pan = panRef.current;
    const el = boardRef.current;
    if (!pan || pan.pointerId !== e.pointerId || !el) return;
    const dx = e.clientX - pan.startX;
    if (!pan.moved && Math.abs(dx) < 6) return;
    if (!pan.moved) {
      pan.moved = true;
      setIsPanning(true);
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    el.scrollLeft = pan.startScroll - dx;
  }

  function endBoardPan(e: ReactPointerEvent<HTMLDivElement>) {
    const pan = panRef.current;
    const el = boardRef.current;
    if (!pan || pan.pointerId !== e.pointerId) return;
    if (pan.moved) suppressClickRef.current = true;
    panRef.current = null;
    setIsPanning(false);
    if (el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
  }

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-keep-modal]')) return;
      if (target.closest('[data-beat-guide-modal]')) return;
      if (target.closest('[data-confirm-modal]')) return;
      if (target.closest('[data-scene-card]')) return;
      if (target.closest('[data-scene-insert]')) return;
      if (target.closest('[data-ref-card]')) return;
      if (target.closest('.note-menu')) return;
      if (target.closest('.toastui-editor-defaultUI')) return;
      dispatch(selectScene(null));
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [dispatch]);

  const selectedTags = useMemo(
    () =>
      centerTagFilter.map((t) => t.replace(/^#/, '').trim()).filter(Boolean),
    [centerTagFilter],
  );

  const docScenes = useMemo(() => {
    if (!selectedDocumentId) return [];
    return scenes.filter((s) => {
      if (s.documentId !== selectedDocumentId) return false;
      if (
        !matchesNoteSearch(centerSearchQuery, {
          title: s.title,
          contentHtml: s.contentHtml,
          tags: s.tags,
        })
      ) {
        return false;
      }
      if (selectedTags.length === 0) return true;
      const sceneTags = s.tags.map((t) => t.replace(/^#/, ''));
      return selectedTags.some((tag) => sceneTags.includes(tag));
    });
  }, [scenes, selectedDocumentId, selectedTags, centerSearchQuery]);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    let raf = 0;
    function syncFromScroll() {
      updateBoardScrollButtons();
      const board = boardRef.current;
      if (!board) return;
      const idx = getFocusedBeatFromBoardScroll(board);
      if (idx !== null && idx !== focusBeatRef.current) {
        dispatch(setFocusBeatIndex(idx));
      }
    }

    function onScroll() {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(syncFromScroll);
    }

    syncFromScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(() => onScroll());
    ro.observe(el);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [selectedDocumentId, docScenes.length, dispatch]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    scenes
      .filter((s) => s.documentId === selectedDocumentId)
      .forEach((s) => s.tags.forEach((t) => set.add(t.replace(/^#/, ''))));
    return [...set].sort();
  }, [scenes, selectedDocumentId]);

  const editingScene = selectedSceneId
    ? scenes.find((s) => s.id === selectedSceneId) ?? null
    : null;
  const guideBeat =
    guideBeatIndex !== null
      ? (DEFAULT_BEAT_GUIDE[guideBeatIndex] ?? null)
      : null;

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);
  const documentScenes = useMemo(
    () => scenes.filter((s) => s.documentId === selectedDocumentId),
    [scenes, selectedDocumentId],
  );

  if (!selectedDocumentId) {
    return (
      <main className="canvas">
        <div className="canvas__empty">
          <p className="canvas__toolbar-title">문서를 선택하세요</p>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
            왼쪽 탐색기에서 문서를 선택하거나 추가하세요.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="canvas">
      {editingScene && <SceneKeepModal scene={editingScene} />}
      {manuscriptOpen && (
        <ManuscriptPreviewModal
          projectTitle={projectTitle}
          documentTitle={selectedDoc?.title ?? '문서'}
          scenes={documentScenes}
          onClose={() => setManuscriptOpen(false)}
        />
      )}

      <div className="canvas__toolbar">
        <div className="canvas__toolbar-start">
          <span className="canvas__toolbar-title">
            {selectedDoc?.title ?? '문서'}
          </span>
          <div className="canvas__toolbar-export">
            <button
              type="button"
              className="canvas__export-btn"
              title="전체 원고 보기"
              aria-label="전체 원고 보기"
              onClick={() => {
                if (documentScenes.length === 0) {
                  showToast('볼 씬이 없습니다', 'error');
                  return;
                }
                setManuscriptOpen(true);
              }}
            >
              <span className="material-symbols-rounded">menu_book</span>
              전체 원고 보기
            </button>
          </div>
        </div>
        <div className="canvas__toolbar-tools">
          <SearchInput
            id="scene-search"
            name="scene-search"
            value={centerSearchQuery}
            onChange={(v) => dispatch(setCenterSearchQuery(v))}
          />
          <TagFilter
            tags={allTags}
            value={centerTagFilter}
            onChange={(v) => dispatch(setCenterTagFilter(v))}
            label="# 씬 태그"
            variant="icon"
            onRemoveTag={(tag) => {
              void (async () => {
                const ok = await confirm({
                  title: `#${tag} 태그를 삭제할까요?`,
                  message: '이 문서의 씬에서 해당 태그가 제거됩니다.',
                  confirmLabel: '삭제',
                  danger: true,
                });
                if (ok) {
                  dispatch(
                    purgeSceneTag({ tag, documentId: selectedDocumentId }),
                  );
                }
              })();
            }}
          />
          {centerSearchQuery.trim() || centerTagFilter.length > 0 ? (
            <button
              type="button"
              className="filter-reset-btn"
              aria-label="필터 초기화"
              title="필터 초기화"
              onClick={() => {
                dispatch(setCenterSearchQuery(''));
                dispatch(setCenterTagFilter([]));
              }}
            >
              <span className="material-symbols-rounded">filter_alt_off</span>
            </button>
          ) : null}
        </div>
      </div>

      {docScenes.length === 0 &&
      (selectedTags.length > 0 || centerSearchQuery.trim()) ? (
        <p style={{ padding: '16px 24px', fontSize: 13, color: 'var(--text-tertiary)' }}>
          검색·필터에 맞는 씬이 없습니다.
        </p>
      ) : null}

      <div className="board-viewport">
        <div
          className={`board-scroll-zone board-scroll-zone--left ${canScrollLeft ? 'active' : ''}`}
        >
          <button
            type="button"
            className="board-scroll-btn"
            aria-label="왼쪽으로 스크롤"
            disabled={!canScrollLeft}
            onClick={() => scrollBoard('left')}
          >
            <span className="material-symbols-rounded">chevron_left</span>
          </button>
        </div>
        <div
          className={`board-scroll-zone board-scroll-zone--right ${canScrollRight ? 'active' : ''}`}
        >
          <button
            type="button"
            className="board-scroll-btn"
            aria-label="오른쪽으로 스크롤"
            disabled={!canScrollRight}
            onClick={() => scrollBoard('right')}
          >
            <span className="material-symbols-rounded">chevron_right</span>
          </button>
        </div>
        <div
          className={`board ${isPanning ? 'is-panning' : ''}`}
          ref={boardRef}
          onPointerDown={onBoardPointerDown}
          onPointerMove={onBoardPointerMove}
          onPointerUp={endBoardPan}
          onPointerCancel={endBoardPan}
          onClickCapture={(e) => {
            if (!suppressClickRef.current) return;
            e.preventDefault();
            e.stopPropagation();
            suppressClickRef.current = false;
          }}
        >
          {DEFAULT_BEAT_GUIDE.map((beat) => {
            const colScenes = docScenes
              .filter((s) => s.beatIndex === beat.beatIndex)
              .sort((a, b) => a.order - b.order);
            const act = getBeatAct(beat.beatIndex);
            const actMeta = getActGuide(act);
            const isActStart =
              beat.beatIndex === 0 ||
              getBeatAct(beat.beatIndex - 1) !== act;
            return (
              <BeatColumn
                key={beat.beatIndex}
                beatIndex={beat.beatIndex}
                nameKo={beat.nameKo}
                scenes={colScenes}
                documentId={selectedDocumentId}
                focused={focusBeatIndex === beat.beatIndex}
                onOpenGuide={setGuideBeatIndex}
                actStart={isActStart && beat.beatIndex > 0}
                actLabel={
                  isActStart
                    ? `${actMeta.nameKo} · ${actMeta.labelKo}`
                    : undefined
                }
              />
            );
          })}
        </div>
      </div>
      {guideBeat && (
        <BeatGuideModal
          beat={guideBeat}
          onClose={() => setGuideBeatIndex(null)}
        />
      )}
    </main>
  );
}
