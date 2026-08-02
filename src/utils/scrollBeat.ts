/** 15비트 칸반 열만 스크롤 (scrollIntoView는 상위까지 밀어 사이드바가 잘림) */
export function scrollBeatColumnIntoView(
  beatIndex: number,
  boardEl?: HTMLElement | null,
) {
  const board =
    boardEl ?? document.querySelector<HTMLElement>('.board');
  if (!board) return;
  const target = idealScrollForBeat(board, beatIndex);
  if (target === null) return;
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

function idealScrollForBeat(
  board: HTMLElement,
  beatIndex: number,
): number | null {
  const col = document.getElementById(`beat-col-${beatIndex}`);
  if (!col) return null;

  const pad = 24;
  const colRect = col.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();
  const maxScroll = Math.max(0, board.scrollWidth - board.clientWidth);
  const target =
    board.scrollLeft + (colRect.left - boardRect.left) - pad;
  return Math.max(0, Math.min(target, maxScroll));
}

/**
 * 뷰포트 왼쪽 앵커에 걸리는 열 (끝 스크롤이어도 마지막 비트로 강제하지 않음)
 */
function getLeftAnchoredBeat(board: HTMLElement): number | null {
  const indices = listBeatIndices(board);
  if (indices.length === 0) return null;

  const boardRect = board.getBoundingClientRect();
  const maxScroll = Math.max(0, board.scrollWidth - board.clientWidth);
  if (maxScroll <= 0) return indices[0];

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
 * 가로 스크롤 기준 현재 비트 — 뷰포트 왼쪽 앵커에 걸리는 열
 * (프로그레스바 focusBeatIndex 동기화용)
 */
export function getFocusedBeatFromBoardScroll(
  board: HTMLElement,
): number | null {
  const indices = listBeatIndices(board);
  if (indices.length === 0) return null;

  const maxScroll = Math.max(0, board.scrollWidth - board.clientWidth);
  if (maxScroll <= 0) return indices[0];
  // 끝으로 스크롤하면 마지막 비트 (프로그레스 표시용)
  if (board.scrollLeft >= maxScroll - 2) {
    return indices[indices.length - 1];
  }

  return getLeftAnchoredBeat(board);
}

/**
 * 화살표 스크롤: 뷰포트 폭만큼 비트 단위로 스냅 이동
 * — 끝 스크롤 시 focus가 마지막 비트여도, 왼쪽 앵커 열 기준으로 점프
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

  // 끝→마지막 비트 강제 없이 왼쪽 앵커 사용 (끝에서 왼쪽 화살표가 제자리인 버그 방지)
  const current = getLeftAnchoredBeat(board) ?? indices[0];
  const curPos = indices.indexOf(current);
  if (curPos < 0) return;

  const sample = document.getElementById(`beat-col-${indices[0]}`);
  const colWidth = sample?.getBoundingClientRect().width || 260;
  const jump = Math.max(1, Math.round(board.clientWidth / colWidth) - 1);
  const step = dir === 'right' ? 1 : -1;
  const delta = step * jump;

  let nextPos = Math.min(
    indices.length - 1,
    Math.max(0, curPos + delta),
  );

  const scrollMoved = (pos: number) => {
    const target = idealScrollForBeat(board, indices[pos]);
    return target !== null && Math.abs(target - board.scrollLeft) >= 2;
  };

  // 목표 열이 이미 왼쪽에 정렬돼 스크롤이 안 바뀌면 방향으로 한 칸씩 더
  if (!scrollMoved(nextPos)) {
    let pos = nextPos;
    while (pos + step >= 0 && pos + step < indices.length) {
      pos += step;
      if (scrollMoved(pos)) {
        nextPos = pos;
        break;
      }
    }
  }

  if (!scrollMoved(nextPos)) return;
  scrollBeatColumnIntoView(indices[nextPos], board);
}
