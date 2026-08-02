import { copyTextToClipboard, formatNotePlain } from './exportText';

type ToastFn = (message: string, tone?: 'info' | 'error') => void;

/** 노트 평문 복사 + 공통 토스트 */
export async function copyNoteWithToast(
  note: { title: string; contentHtml: string },
  showToast: ToastFn,
): Promise<boolean> {
  const ok = await copyTextToClipboard(formatNotePlain(note));
  showToast(
    ok ? '클립보드에 복사했습니다' : '복사에 실패했습니다',
    ok ? 'info' : 'error',
  );
  return ok;
}
