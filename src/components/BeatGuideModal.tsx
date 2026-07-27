import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { BeatGuideItem } from '../types/models';
import { getActGuide, getBeatAct } from '../data/beatGuide';

export function BeatGuideModal({
  beat,
  onClose,
}: {
  beat: BeatGuideItem;
  onClose: () => void;
}) {
  const act = getActGuide(getBeatAct(beat.beatIndex));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="focus-overlay"
      data-beat-guide-modal
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="beat-guide-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="beat-guide-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="beat-guide-modal__header">
          <div className="beat-guide-modal__eyebrow">
            {act.nameKo} · {act.labelKo} · 비트 {beat.beatIndex + 1} ·{' '}
            {beat.percentHint}% · {beat.nameEn}
          </div>
          <h2 id="beat-guide-title" className="beat-guide-modal__title">
            {beat.nameKo}
          </h2>
          <p className="beat-guide-modal__summary">{beat.guidanceKo}</p>
          <button
            type="button"
            className="icon-btn beat-guide-modal__close"
            aria-label="닫기"
            onClick={onClose}
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </header>

        <div className="beat-guide-modal__body">
          <section className="beat-guide-section">
            <h3>이 비트의 역할</h3>
            <p>{beat.purposeKo}</p>
          </section>

          <section className="beat-guide-section">
            <h3>설명</h3>
            <p>{beat.detailKo}</p>
          </section>

          <section className="beat-guide-section">
            <h3>쓰기 조언</h3>
            <ul>
              {beat.tipsKo.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>

          <section className="beat-guide-section">
            <h3>피하면 좋은 것</h3>
            <ul>
              {beat.avoidKo.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="beat-guide-section">
            <h3>스스로 점검</h3>
            <ul>
              {beat.promptsKo.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </section>
        </div>

        <footer className="beat-guide-modal__footer">
          <button type="button" className="btn-primary" onClick={onClose}>
            확인
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
