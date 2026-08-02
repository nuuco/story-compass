import { useEffect, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Scene } from '../types/models';
import { useAppDispatch } from '../store/hooks';
import {
  convertSceneToReference,
  copySceneToReference,
  deleteScene,
  nudgeScene,
  selectScene,
} from '../store/projectSlice';
import { copyTextToClipboard, formatNotePlain } from '../utils/exportText';
import { NoteMenuPortal } from './NoteMenuPortal';
import { useConfirm } from './ConfirmDialog';
import { useToast } from './Toast';

interface SceneCardProps {
  scene: Scene;
}

export function SceneCard({ scene }: SceneCardProps) {
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
  } = useSortable({
    id: scene.id,
    data: { type: 'scene', sceneId: scene.id },
  });

  useEffect(() => {
    if (isDragging) {
      suppressClickRef.current = true;
      return;
    }
    // 드롭 직후 따라오는 click 한 번 무시
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

  const title = scene.title.trim();
  const previewHtml =
    scene.contentHtml?.trim() &&
    scene.contentHtml !== '<p></p>' &&
    scene.contentHtml !== '<p><br></p>'
      ? scene.contentHtml
      : '';

  const plainExcerpt = previewHtml
    ? previewHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    : '';

  async function onCopyText() {
    const text = formatNotePlain(scene);
    const ok = await copyTextToClipboard(text);
    showToast(
      ok ? '클립보드에 복사했습니다' : '복사에 실패했습니다',
      ok ? 'info' : 'error',
    );
  }

  async function onDelete() {
    const ok = await confirm({
      title: '씬을 삭제할까요?',
      message: '삭제한 씬은 휴지통으로 이동합니다. 나중에 복원할 수 있습니다.',
      confirmLabel: '휴지통으로',
      danger: true,
    });
    if (ok) dispatch(deleteScene(scene.id));
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      data-scene-card
      data-scene-id={scene.id}
      className={`scene-card ${isDragging ? 'dragging' : ''} ${menuOpen ? 'menu-open' : ''}`}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        dispatch(selectScene(scene.id));
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
              dispatch(nudgeScene({ id: scene.id, dir: 'top' }));
              setMenuOpen(false);
            }}
          >
            맨 위로
          </button>
          <button
            type="button"
            onClick={() => {
              dispatch(nudgeScene({ id: scene.id, dir: 'bottom' }));
              setMenuOpen(false);
            }}
          >
            맨 아래로
          </button>
          <hr />
          <button
            type="button"
            onClick={() => {
              dispatch(convertSceneToReference({ sceneId: scene.id }));
              setMenuOpen(false);
              showToast('참고 메모로 옮겼습니다');
            }}
          >
            참고 메모로 이동
          </button>
          <p className="note-menu__hint">또는 참고 패널로 드래그</p>
          <button
            type="button"
            onClick={() => {
              dispatch(copySceneToReference({ sceneId: scene.id }));
              setMenuOpen(false);
              showToast('참고로 복사했습니다');
            }}
          >
            참고로 복사
          </button>
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

      {scene.tags.length > 0 && (
        <div className="card-tags">
          {scene.tags.map((t) => (
            <span key={t} className="tag-chip">
              #{t.replace(/^#/, '')}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
