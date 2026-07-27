import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

const MENU_MIN_WIDTH = 168;

/**
 * 카드 overflow/형제 z-index에 가려지지 않도록 body에 고정 위치 포털로 띄우는 메뉴
 */
export function NoteMenuPortal({
  open,
  anchorRef,
  onClose,
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setPos(null);
      return;
    }

    function place() {
      const anchor = anchorRef.current;
      const menu = menuRef.current;
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const menuH = menu?.offsetHeight ?? 220;
      const menuW = Math.max(menu?.offsetWidth ?? 0, MENU_MIN_WIDTH);
      const gap = 4;
      let top = r.bottom + gap;
      if (top + menuH > window.innerHeight - 8) {
        top = Math.max(8, r.top - menuH - gap);
      }
      let left = r.right - menuW;
      left = Math.min(left, window.innerWidth - menuW - 8);
      left = Math.max(8, left);
      setPos({ top, left });
    }

    place();
    // 메뉴 높이 측정 후 한 번 더
    requestAnimationFrame(place);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="note-menu note-menu--portal"
      style={{
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        visibility: pos ? 'visible' : 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}
