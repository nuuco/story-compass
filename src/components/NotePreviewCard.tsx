import { useRef, useState, type ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSuppressClickAfterDrag } from '../hooks/useSuppressClickAfterDrag';
import { htmlToPlainText } from '../utils/content';
import { copyNoteWithToast } from '../utils/copyNote';
import { NoteMenuPortal } from './NoteMenuPortal';
import { useToast } from './Toast';

export type NotePreviewCardProps = {
  id: string;
  title: string;
  contentHtml: string;
  tags: string[];
  dndType: 'scene' | 'reference';
  className?: string;
  dataSceneId?: string;
  onSelect: () => void;
  onDelete: () => void | Promise<void>;
  /** 케밥 메뉴 본문. closeMenu로 포털을 닫는다 */
  renderMenu: (closeMenu: () => void) => ReactNode;
};

export function NotePreviewCard({
  id,
  title: rawTitle,
  contentHtml,
  tags,
  dndType,
  className = '',
  dataSceneId,
  onSelect,
  onDelete,
  renderMenu,
}: NotePreviewCardProps) {
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data:
      dndType === 'scene'
        ? { type: 'scene', sceneId: id }
        : { type: 'reference', refId: id },
  });
  const suppressClickRef = useSuppressClickAfterDrag(isDragging);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const title = rawTitle.trim();
  const plainExcerpt = htmlToPlainText(contentHtml);
  const closeMenu = () => setMenuOpen(false);

  return (
    <article
      ref={setNodeRef}
      style={style}
      data-scene-card={dndType === 'scene' ? '' : undefined}
      data-scene-id={dataSceneId}
      data-ref-card={dndType === 'reference' ? '' : undefined}
      className={`scene-card ${className} ${isDragging ? 'dragging' : ''} ${menuOpen ? 'menu-open' : ''}`.trim()}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        onSelect();
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
            void copyNoteWithToast(
              { title: rawTitle, contentHtml },
              showToast,
            );
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
          onClose={closeMenu}
        >
          {renderMenu(closeMenu)}
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

      {tags.length > 0 && (
        <div className="card-tags">
          {tags.map((t) => (
            <span key={t} className="tag-chip">
              #{t.replace(/^#/, '')}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
