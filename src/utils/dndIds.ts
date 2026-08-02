/** @dnd-kit droppable / sortable id 규칙 */
export const REF_TRAY_ID = 'ref-tray';

export function beatDroppableId(beatIndex: number): string {
  return `beat-${beatIndex}`;
}

export function parseBeatDroppableId(id: string): number | null {
  if (!id.startsWith('beat-')) return null;
  const n = Number(id.slice('beat-'.length));
  return Number.isFinite(n) ? n : null;
}

export function isBeatDroppableId(id: string): boolean {
  return parseBeatDroppableId(id) !== null;
}
