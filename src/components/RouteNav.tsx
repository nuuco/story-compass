import { useEffect, useState } from 'react';
import {
  ACT_GUIDE,
  DEFAULT_BEAT_GUIDE,
} from '../data/beatGuide';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setFocusBeatIndex } from '../store/projectSlice';
import { WorkspaceActions } from './WorkspaceActions';
import { scrollBeatColumnIntoView } from '../utils/scrollBeat';

export function RouteNav() {
  const dispatch = useAppDispatch();
  const focusBeatIndex = useAppSelector((s) => s.project.focusBeatIndex);
  const scenes = useAppSelector((s) => s.project.scenes);
  const selectedDocumentId = useAppSelector(
    (s) => s.project.selectedDocumentId,
  );
  const documents = useAppSelector((s) => s.project.documents);
  const projectTitle = useAppSelector(
    (s) => s.project.manifest.project.title,
  );
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const docScenes = scenes.filter((s) => s.documentId === selectedDocumentId);
  const filled = new Set(docScenes.map((s) => s.beatIndex));
  const coveredCount = filled.size;
  const progress =
    coveredCount === 0 ? 0 : Math.round((coveredCount / 15) * 100);

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);
  const docName = selectedDoc?.title ?? '문서 없음';
  const displayProjectTitle = projectTitle.trim() || '제목 없는 프로젝트';

  useEffect(() => {
    if (focusBeatIndex === null) {
      dispatch(setFocusBeatIndex(0));
    }
  }, [focusBeatIndex, dispatch]);

  const displayIndex = hoverIndex ?? focusBeatIndex ?? 0;
  const display = DEFAULT_BEAT_GUIDE[displayIndex];
  const fillPercent =
    focusBeatIndex !== null
      ? DEFAULT_BEAT_GUIDE[focusBeatIndex]?.percentHint ?? 0
      : 0;

  function selectBeat(index: number) {
    dispatch(setFocusBeatIndex(index));
    requestAnimationFrame(() => scrollBeatColumnIntoView(index));
  }

  return (
    <header className="route-nav">
      <div className="route-nav__header">
        <div>
          <div className="route-nav__title">
            {displayProjectTitle}{' '}
            <span className="route-nav__doc-name">· {docName}</span>
          </div>
        </div>
        <WorkspaceActions />
      </div>

      <div className="progress-label" id="progressLabel">
        <div className="progress-label__main">
          <span className="progress-label__name">{display.nameKo}</span>
          <span className="progress-label__meta">
            <span className="progress-label__pct">{display.percentHint}%</span>
            {display.guidanceKo}
          </span>
        </div>
        <span className="progress-label__coverage" title={`${progress}% 채워짐`}>
          씬 비트 {coveredCount}/15
        </span>
      </div>

      <div className="progress-acts" aria-hidden>
        {ACT_GUIDE.map((act) => (
          <div
            key={act.act}
            className={`progress-act progress-act--${act.act}`}
            style={{
              left: `${act.startPercent}%`,
              width: `${act.endPercent - act.startPercent}%`,
            }}
          >
            <span className="progress-act__label">
              {act.nameKo} · {act.labelKo}
            </span>
          </div>
        ))}
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${fillPercent}%` }} />
        {ACT_GUIDE.slice(1).map((act) => (
          <div
            key={`tick-${act.act}`}
            className="progress-act-tick"
            style={{ left: `${act.startPercent}%` }}
          />
        ))}
        {DEFAULT_BEAT_GUIDE.map((beat) => {
          const idx = beat.beatIndex;
          const isCurrent = focusBeatIndex === idx;
          const isCompleted = filled.has(idx) && !isCurrent;
          const markerClass = [
            'progress-marker',
            isCompleted ? 'completed' : '',
            isCurrent ? 'current' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={idx}
              type="button"
              className={markerClass}
              style={{ left: `${beat.percentHint}%` }}
              aria-label={`${beat.nameKo} (${beat.percentHint}%)`}
              onClick={() => selectBeat(idx)}
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
              onFocus={() => setHoverIndex(idx)}
              onBlur={() => setHoverIndex(null)}
            >
              <div
                className={[
                  'tooltip',
                  beat.percentHint <= 5 ? 'tooltip--start' : '',
                  beat.percentHint >= 95 ? 'tooltip--end' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {idx + 1}. {beat.nameKo} ({beat.percentHint}%)
              </div>
            </button>
          );
        })}
      </div>
    </header>
  );
}
