import { useEffect, useRef } from 'react';

/** 드래그 직후 따라오는 click 한 번을 무시한다 */
export function useSuppressClickAfterDrag(isDragging: boolean) {
  const suppressClickRef = useRef(false);

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

  return suppressClickRef;
}
