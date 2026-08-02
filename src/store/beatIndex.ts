import { BEAT_COUNT } from '../types/models';

/** beatIndex를 0 .. BEAT_COUNT-1 로 클램프 */
export function clampBeatIndex(beatIndex: number): number {
  return Math.min(BEAT_COUNT - 1, Math.max(0, beatIndex));
}
