import { useEffect, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Scene } from '../types/models';
import { useAppDispatch } from '../store/hooks';
import {
  deleteScene,
  nudgeScene,
  selectScene,
} from '../store/projectSlice';
import { NoteMenuPortal } from './NoteMenuPortal';
import { useConfirm } from './ConfirmDialog';

type NudgeDir = 'top' | 'up' | 'down' | 'bottom' | 'left' | 'right';

interface SceneCardProps {
  scene: Scene;
}

export function SceneCard({ scene }: SceneCardProps) {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
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
  } = useSortable({ id: scene.id });

  useEffect(() => {
    if (isDragging) suppressClickRef.current = true;
  }, [isDragging]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function runNudge(dir: NudgeDir) {
    dispatch(nudgeScene({ id: scene.id, dir }));
    setMenuOpen(false);
  }

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
              ['left', '왼쪽 (이전 비트)'],
              ['right', '오른쪽 (다음 비트)'],
            ] as const
          ).map(([dir, label]) => (
            <button key={dir} type="button" onClick={() => runNudge(dir)}>
              {label}
            </button>
          ))}
          <hr />
          <button
            type="button"
            className="danger"
            onClick={() => {
              setMenuOpen(false);
              void (async () => {
                const ok = await confirm({
                  title: '씬을 삭제할까요?',
                  message: '삭제한 씬은 되돌릴 수 없습니다.',
                  confirmLabel: '삭제',
                  danger: true,
                });
                if (ok) dispatch(deleteScene(scene.id));
              })();
            }}
          >
            삭제
          </button>
        </NoteMenuPortal>
      </div>

      <div className={`card-title ${title ? '' : 'empty'}`}>
        {title || '제목 없는 씬'}
      </div>

      {plainExcerpt ? (
        <div className="card-excerpt">{plainExcerpt}</div>
      ) : (
        <div className="card-excerpt empty">내용 없음</div>
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
