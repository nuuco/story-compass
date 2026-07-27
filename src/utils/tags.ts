export function parseTags(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#/, '').trim())
    .filter(Boolean);
}

/** 태그 배열 → 입력창용 문자열 (조합 중에는 로컬 draft를 써야 함) */
export function formatTags(tags: string[]): string {
  return tags.map((t) => `#${t.replace(/^#/, '')}`).join(' ');
}
