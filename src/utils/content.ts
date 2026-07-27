/** TipTap/Toast UI 등 HTML 본문이 실질적으로 비어 있는지 */
export function isBlankHtml(html: string | null | undefined): boolean {
  if (!html?.trim()) return true;
  const text = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length === 0;
}

/** HTML → 검색용 평문 */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html?.trim()) return '';
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 제목·본문이 모두 비어 생성 취소 대상인지 */
export function isEmptyNote(
  title: string | null | undefined,
  contentHtml: string | null | undefined,
): boolean {
  return !(title?.trim()) && isBlankHtml(contentHtml);
}

/** 제목·본문·태그 통합 검색 */
export function matchesNoteSearch(
  query: string,
  note: { title: string; contentHtml: string; tags: string[] },
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (note.title.toLowerCase().includes(q)) return true;
  if (htmlToPlainText(note.contentHtml).toLowerCase().includes(q)) return true;
  return note.tags.some((t) =>
    t.replace(/^#/, '').toLowerCase().includes(q),
  );
}
