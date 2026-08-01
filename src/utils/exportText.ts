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

export function formatDocumentPlain(opts: {
  documentTitle: string;
  scenes: Scene[];
  beatNames?: string[];
}): string {
  const sorted = [...opts.scenes].sort((a, b) => {
    if (a.beatIndex !== b.beatIndex) return a.beatIndex - b.beatIndex;
    return a.order - b.order;
  });

  const parts: string[] = [];
  const docTitle = opts.documentTitle.trim() || '(문서)';
  parts.push(docTitle);

  for (const scene of sorted) {
    const beatLabel =
      opts.beatNames?.[scene.beatIndex] != null
        ? `[${opts.beatNames[scene.beatIndex]}]`
        : `[비트 ${scene.beatIndex + 1}]`;
    const title = scene.title.trim() || '(제목 없음)';
    const body = htmlToExportPlain(scene.contentHtml);
    const block = body
      ? `${beatLabel}\n${title}\n\n${body}`
      : `${beatLabel}\n${title}`;
    parts.push(block);
  }

  return parts.join('\n\n---\n\n');
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
