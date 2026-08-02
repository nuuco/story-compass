import type { Scene } from '../types/models';

/** 추출용 평문 — 문단·줄바꿈 보존 */
export function htmlToExportPlain(html: string | null | undefined): string {
  if (!html?.trim()) return '';
  let text = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n')
    .replace(/<\/\s*div\s*>/gi, '\n')
    .replace(/<\/\s*li\s*>/gi, '\n')
    .replace(/<\/\s*h[1-6]\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<[^>]+>/g, '');

  text = text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text;
}

export function formatNotePlain(note: {
  title: string;
  contentHtml: string;
}): string {
  const title = note.title.trim() || '(제목 없음)';
  const body = htmlToExportPlain(note.contentHtml);
  return body ? `${title}\n\n${body}` : title;
}

function sortScenesByBeatOrder(scenes: Scene[]): Scene[] {
  return [...scenes].sort((a, b) => {
    if (a.beatIndex !== b.beatIndex) return a.beatIndex - b.beatIndex;
    return a.order - b.order;
  });
}

/** 구간 라벨 없는 원고 평문 — 프로젝트·문서 헤더 + 씬 본문 */
export function formatManuscriptPlain(opts: {
  projectTitle: string;
  documentTitle: string;
  scenes: Scene[];
  includeSceneTitles: boolean;
}): string {
  const sorted = sortScenesByBeatOrder(opts.scenes);
  const project = opts.projectTitle.trim() || '프로젝트';
  const document = opts.documentTitle.trim() || '문서';
  const parts: string[] = [project, document];

  for (const scene of sorted) {
    const title = scene.title.trim();
    const body = htmlToExportPlain(scene.contentHtml);
    if (!title && !body) continue;

    if (opts.includeSceneTitles && title) {
      parts.push(body ? `${title}\n\n${body}` : title);
    } else if (body) {
      parts.push(body);
    }
  }

  return parts.join('\n\n');
}

/** 로컬 시각 `YYYYMMDD_HHmm` */
export function formatLocalTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}${mm}${dd}_${hh}${mi}`;
}

/** `{프로젝트}_{문서}_{YYYYMMDD}_{HHmm}.txt` — 타임스탬프가 잘리지 않도록 앞부분만 축소 */
export function manuscriptDownloadFilename(
  projectTitle: string,
  documentTitle: string,
  date = new Date(),
): string {
  const stamp = formatLocalTimestamp(date);
  const sanitize = (s: string, fallback: string) => {
    const t = s.trim().replace(/[\\/:*?"<>|]+/g, '_') || fallback;
    return t;
  };
  const project = sanitize(projectTitle, '프로젝트');
  const document = sanitize(documentTitle, '문서');
  const maxBase = 80 - stamp.length - 1;
  let base = `${project}_${document}`;
  if (base.length > maxBase) base = base.slice(0, Math.max(1, maxBase));
  return `${base}_${stamp}`;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.txt') ? filename : `${filename}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function safeFilename(name: string): string {
  const trimmed = name.trim() || 'export';
  return trimmed.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 80);
}
