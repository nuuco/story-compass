import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Scene } from '../types/models';
import { DEFAULT_BEAT_GUIDE } from '../data/beatGuide';
import { useAppDispatch } from '../store/hooks';
import {
  deleteScene,
  nudgeScene,
  selectScene,
  updateScene,
} from '../store/projectSlice';
import { isTitleValid } from '../utils/id';
import { RichTextEditor } from './RichTextEditor';
import { imeInputProps, useImeDraft } from '../hooks/useImeDraft';
import { useConfirm } from './ConfirmDialog';
import { TagChipsInput } from './TagChipsInput';

type NudgeDir = 'top' | 'up' | 'down' | 'bottom' | 'left' | 'right';

export function SceneKeepModal({ scene }: { scene: Scene }) {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<() => void>(() => undefined);

  const titleIme = useImeDraft(
    scene.title,
    (title) => dispatch(updateScene({ id: scene.id, title })),
    scene.id,
  );

  const titleValid = isTitleValid(titleIme.value);
  const beat = DEFAULT_BEAT_GUIDE[scene.beatIndex];

  function close() {
    // IME 조합 중이어도 초안을 반영한 뒤, 빈 씬이면 selectScene이 생성 취소
    dispatch(updateScene({ id: scene.id, title: titleIme.value }));
    dispatch(selectScene(null));
  }
  closeRef.current = close;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  function runNudge(dir: NudgeDir) {
    dispatch(nudgeScene({ id: scene.id, dir }));
    setMenuOpen(false);
  }

  return createPortal(
    <div
      className="focus-overlay"
      data-keep-modal
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="focus-modal"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="씬 편집"
      >
        <div className="modal-editor-area">
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              marginBottom: 4,
            }}
          >
            {beat?.nameKo ?? ''} · {beat?.percentHint ?? 0}%
          </div>
          <input
            id={`scene-title-${scene.id}`}
            name="scene-title"
            className="editor-title"
            placeholder="제목 없는 씬"
            autoFocus
            aria-label="씬 제목"
            {...imeInputProps(titleIme)}
            onBlur={titleIme.onBlurCommit}
          />
          {!titleValid && (
            <p className="editor-title-invalid">제목을 입력하세요.</p>
          )}
          <RichTextEditor
            key={scene.id}
            contentHtml={scene.contentHtml}
            showToolbar
            editable
            height="300px"
            variant="keep"
            placeholder="이 씬에서 일어나는 일을 자세히 적어보세요…"
            onChange={(html) =>
              dispatch(updateScene({ id: scene.id, contentHtml: html }))
            }
          />
        </div>

        <div className="modal-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <div style={{ position: 'relative' }} ref={menuRef}>
              <button
                type="button"
                className="icon-btn"
                aria-label="더보기"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <span className="material-symbols-rounded">more_horiz</span>
              </button>
              {menuOpen && (
                <div className="note-menu" style={{ top: 'auto', bottom: '100%', right: 0, marginBottom: 4 }}>
                  {(
                    [
                      ['top', '맨 위로'],
                      ['up', '위로'],
                      ['down', '아래로'],
                      ['bottom', '맨 아래로'],
                      ['left', '왼쪽 (이전 비트)'],
                      ['right', '오른쪽 (다음 비트)'],
                    ] as const
                  ).map(([dir, label]) => (
                    <button key={dir} type="button" onClick={() => runNudge(dir)}>
                      {label}
                    </button>
                  ))}
                  <hr />
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      setMenuOpen(false);
                      void (async () => {
                        const ok = await confirm({
                          title: '씬을 삭제할까요?',
                          message: '삭제한 씬은 되돌릴 수 없습니다.',
                          confirmLabel: '삭제',
                          danger: true,
                        });
                        if (ok) {
                          dispatch(deleteScene(scene.id));
                          close();
                        }
                      })();
                    }}
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
            <TagChipsInput
              id={`scene-tags-${scene.id}`}
              name="scene-tags"
              tags={scene.tags}
              placeholder="태그 추가 후 Enter"
              onChange={(tags) =>
                dispatch(updateScene({ id: scene.id, tags }))
              }
            />
          </div>
          <button type="button" className="btn-primary" onClick={close}>
            저장 및 닫기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
