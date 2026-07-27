/** 15비트 칸반 열만 스크롤 (scrollIntoView는 상위까지 밀어 사이드바가 잘림) */
export function scrollBeatColumnIntoView(beatIndex: number) {
  const col = document.getElementById(`beat-col-${beatIndex}`);
  const board = document.querySelector<HTMLElement>('.board');
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
