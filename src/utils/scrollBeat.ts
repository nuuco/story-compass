/** 15비트 칸반 열만 스크롤 (scrollIntoView는 상위까지 밀어 사이드바가 잘림) */
export function scrollBeatColumnIntoView(
  beatIndex: number,
  boardEl?: HTMLElement | null,
) {
  const col = document.getElementById(`beat-col-${beatIndex}`);
  const board =
    boardEl ?? document.querySelector<HTMLElement>('.board');
  if (!col || !board) return;

  const pad = 24;
  const colRect = col.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();
  const viewWidth = board.clientWidth;
  const maxScroll = Math.max(0, board.scrollWidth - viewWidth);

  let target = board.scrollLeft + (colRect.left - boardRect.left) - pad;
  target = Math.max(0, Math.min(target, maxScroll));

  board.scrollTo({ left: target, behavior: 'smooth' });
}

function listBeatIndices(board: HTMLElement): number[] {
  const cols = board.querySelectorAll<HTMLElement>('[id^="beat-col-"]');
  const indices: number[] = [];
  for (const col of cols) {
    const idx = Number(col.id.replace(/^beat-col-/, ''));
    if (!Number.isNaN(idx)) indices.push(idx);
  }
  return indices.sort((a, b) => a - b);
}

/**
 * 가로 스크롤 기준 현재 비트 — 뷰포트 왼쪽 앵커에 걸리는 열
 * (프로그레스바 focusBeatIndex 동기화용)
 */
export function getFocusedBeatFromBoardScroll(
  board: HTMLElement,
): number | null {
  const indices = listBeatIndices(board);
  if (indices.length === 0) return null;

  const boardRect = board.getBoundingClientRect();
  const maxScroll = Math.max(0, board.scrollWidth - board.clientWidth);

  if (maxScroll <= 0) return indices[0];
  // 끝으로 스크롤하면 마지막 비트
  if (board.scrollLeft >= maxScroll - 2) {
    return indices[indices.length - 1];
  }

  const anchorX = boardRect.left + Math.min(48, board.clientWidth * 0.12);
  let best = indices[0];
  let bestDist = Infinity;

  for (const idx of indices) {
    const col = document.getElementById(`beat-col-${idx}`);
    if (!col) continue;
    const rect = col.getBoundingClientRect();
    if (rect.left <= anchorX && rect.right > anchorX) {
      return idx;
    }
    const dist = Math.abs(rect.left - anchorX);
    if (dist < bestDist) {
      bestDist = dist;
      best = idx;
    }
  }
  return best;
}

/**
 * 화살표 스크롤: 뷰포트 폭만큼 비트 단위로 스냅 이동
 */
export function scrollBoardSnap(
  dir: 'left' | 'right',
  boardEl?: HTMLElement | null,
) {
  const board =
    boardEl ?? document.querySelector<HTMLElement>('.board');
  if (!board) return;

  const indices = listBeatIndices(board);
  if (indices.length === 0) return;

  const current = getFocusedBeatFromBoardScroll(board) ?? indices[0];
  const curPos = indices.indexOf(current);
  if (curPos < 0) return;

  const sample = document.getElementById(`beat-col-${indices[0]}`);
  const colWidth = sample?.getBoundingClientRect().width || 260;
  const jump = Math.max(1, Math.round(board.clientWidth / colWidth) - 1);
  const delta = dir === 'right' ? jump : -jump;

  let nextPos = Math.min(
    indices.length - 1,
    Math.max(0, curPos + delta),
  );
  // 이미 끝에 붙어 같은 자리면 한 칸이라도 이동
  if (nextPos === curPos) {
    nextPos = Math.min(
      indices.length - 1,
      Math.max(0, curPos + (dir === 'right' ? 1 : -1)),
    );
  }

  scrollBeatColumnIntoView(indices[nextPos], board);
}
