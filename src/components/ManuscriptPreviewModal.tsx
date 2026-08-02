import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_BEAT_GUIDE } from '../data/beatGuide';
import type { Scene } from '../types/models';
import {
  copyTextToClipboard,
  downloadTextFile,
  formatManuscriptPlain,
  htmlToExportPlain,
  manuscriptDownloadFilename,
  sceneHasManuscriptContent,
} from '../utils/exportText';
import { useToast } from './Toast';

const ALL_SECTIONS = DEFAULT_BEAT_GUIDE.map((_, i) => i);

function sortScenes(scenes: Scene[]): Scene[] {
  return [...scenes].sort((a, b) => {
    if (a.beatIndex !== b.beatIndex) return a.beatIndex - b.beatIndex;
    return a.order - b.order;
  });
}

function firstBodyLine(html: string): string {
  const body = htmlToExportPlain(html);
  if (!body) return '';
  const line = body.split('\n').find((l) => l.trim()) ?? body;
  return line.trim().replace(/\s+/g, ' ');
}

/** 제외 슬롯 한 줄: `제목 - 본문…` (없으면 있는 쪽만) */
function scenePreviewLabel(scene: Scene): string {
  const title = scene.title.trim();
  const body = firstBodyLine(scene.contentHtml);
  if (title && body) {
    const snippet = body.slice(0, 56);
    return `${title} - ${snippet}${body.length > 56 ? '…' : ''}`;
  }
  if (title) return title;
  if (body) {
    const snippet = body.slice(0, 72);
    return `${snippet}${body.length > 72 ? '…' : ''}`;
  }
  return '(빈 씬)';
}

export function ManuscriptPreviewModal({
  projectTitle,
  documentTitle,
  scenes,
  onClose,
}: {
  projectTitle: string;
  documentTitle: string;
  scenes: Scene[];
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [selectedSections, setSelectedSections] = useState<Set<number>>(
    () => new Set(ALL_SECTIONS),
  );
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => new Set());
  const [includeTitles, setIncludeTitles] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const candidates = useMemo(
    () => sortScenes(scenes).filter((s) => selectedSections.has(s.beatIndex)),
    [scenes, selectedSections],
  );

  const includedScenes = useMemo(
    () => candidates.filter((s) => !excludedIds.has(s.id)),
    [candidates, excludedIds],
  );

  const exportableScenes = useMemo(
    () =>
      includedScenes.filter((s) =>
        sceneHasManuscriptContent(s, includeTitles),
      ),
    [includedScenes, includeTitles],
  );

  const plainText = useMemo(
    () =>
      formatManuscriptPlain({
        projectTitle,
        documentTitle,
        scenes: exportableScenes,
        includeSceneTitles: includeTitles,
      }),
    [projectTitle, documentTitle, exportableScenes, includeTitles],
  );

  function toggleSection(index: number) {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function toggleAllSections() {
    setSelectedSections((prev) =>
      prev.size === ALL_SECTIONS.length ? new Set() : new Set(ALL_SECTIONS),
    );
  }

  function excludeScene(id: string) {
    setExcludedIds((prev) => new Set(prev).add(id));
  }

  function restoreScene(id: string) {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function handleCopy() {
    if (exportableScenes.length === 0) {
      showToast('복사할 내용이 없습니다', 'error');
      return;
    }
    const ok = await copyTextToClipboard(plainText);
    showToast(
      ok ? '클립보드에 복사했습니다' : '복사에 실패했습니다',
      ok ? 'info' : 'error',
    );
  }

  function handleDownload() {
    if (exportableScenes.length === 0) {
      showToast('저장할 내용이 없습니다', 'error');
      return;
    }
    downloadTextFile(
      manuscriptDownloadFilename(projectTitle, documentTitle),
      plainText,
    );
    showToast('텍스트 파일을 저장했습니다');
  }

  const displayProject = projectTitle.trim() || '프로젝트';
  const displayDocument = documentTitle.trim() || '문서';

  return createPortal(
    <div
      className="focus-overlay"
      data-manuscript-modal
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="manuscript-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manuscript-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="manuscript-modal__header">
          <div className="manuscript-modal__heading">
            <h2 id="manuscript-modal-title" className="manuscript-modal__title">
              전체 원고
            </h2>
            <span
              className="manuscript-modal__meta"
              title={`${displayProject} · ${displayDocument}`}
            >
              {displayProject} · {displayDocument}
            </span>
          </div>
          <button
            type="button"
            className="icon-btn manuscript-modal__close"
            aria-label="닫기"
            onClick={onClose}
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </header>

        <div className="manuscript-modal__filters" role="group" aria-label="구간 필터">
          <button
            type="button"
            className={`manuscript-section-chip ${
              selectedSections.size === ALL_SECTIONS.length ? 'is-active' : ''
            }`}
            aria-pressed={selectedSections.size === ALL_SECTIONS.length}
            onClick={toggleAllSections}
          >
            전체
          </button>
          {DEFAULT_BEAT_GUIDE.map((beat) => {
            const active = selectedSections.has(beat.beatIndex);
            return (
              <button
                key={beat.beatIndex}
                type="button"
                className={`manuscript-section-chip ${active ? 'is-active' : ''}`}
                aria-pressed={active}
                onClick={() => toggleSection(beat.beatIndex)}
              >
                {beat.nameKo}
              </button>
            );
          })}
        </div>

        <div className="manuscript-modal__body">
          {selectedSections.size === 0 ? (
            <p className="manuscript-modal__empty">
              구간을 하나 이상 선택하세요
            </p>
          ) : candidates.length === 0 ? (
            <p className="manuscript-modal__empty">이 구간에 씬이 없습니다</p>
          ) : (
            candidates.map((scene) => {
              const excluded = excludedIds.has(scene.id);
              if (excluded) {
                return (
                  <div
                    key={scene.id}
                    className="manuscript-scene manuscript-scene--excluded"
                  >
                    <span className="manuscript-scene__slot-label">
                      제외됨 · {scenePreviewLabel(scene)}
                    </span>
                    <button
                      type="button"
                      className="manuscript-scene__restore"
                      onClick={() => restoreScene(scene.id)}
                    >
                      <span className="material-symbols-rounded">
                        visibility
                      </span>
                      다시 넣기
                    </button>
                  </div>
                );
              }

              const title = scene.title.trim();
              const body = htmlToExportPlain(scene.contentHtml);
              return (
                <article key={scene.id} className="manuscript-scene">
                  <button
                    type="button"
                    className="manuscript-scene__exclude"
                    title="이 씬 제외"
                    aria-label="이 씬 제외"
                    onClick={() => excludeScene(scene.id)}
                  >
                    <span className="material-symbols-rounded">
                      visibility_off
                    </span>
                    제외
                  </button>
                  {includeTitles && title ? (
                    <h3 className="manuscript-scene__title">{title}</h3>
                  ) : null}
                  {body ? (
                    <pre className="manuscript-scene__body">{body}</pre>
                  ) : (
                    <p className="manuscript-scene__body-empty">(본문 없음)</p>
                  )}
                </article>
              );
            })
          )}
        </div>

        <footer className="manuscript-modal__footer">
          <button
            type="button"
            className={`manuscript-title-switch ${includeTitles ? 'is-on' : ''}`}
            role="switch"
            aria-checked={includeTitles}
            onClick={() => setIncludeTitles((v) => !v)}
          >
            <span className="manuscript-title-switch__label">제목 포함</span>
            <span className="manuscript-title-switch__track" aria-hidden>
              <span className="manuscript-title-switch__knob" />
            </span>
          </button>
          <div className="manuscript-modal__actions">
            <button
              type="button"
              className="canvas__export-btn"
              onClick={() => void handleCopy()}
            >
              <span className="material-symbols-rounded">content_copy</span>
              원고 복사
            </button>
            <button
              type="button"
              className="canvas__export-btn"
              onClick={handleDownload}
            >
              <span className="material-symbols-rounded">download</span>
              .txt 저장
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
