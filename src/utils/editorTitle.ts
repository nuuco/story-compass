/** 제목 textarea — 내용에 맞춰 늘어남, 스크롤·잘림 없음 */
export function syncEditorTitleHeight(el: HTMLTextAreaElement | null): void {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
  el.style.overflowY = 'hidden';
}
