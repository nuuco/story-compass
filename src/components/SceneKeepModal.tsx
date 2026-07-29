import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Scene } from '../types/models';
import { DEFAULT_BEAT_GUIDE } from '../data/beatGuide';
import { useAppDispatch } from '../store/hooks';
import { deleteScene, selectScene, updateScene } from '../store/projectSlice';
import { isTitleValid } from '../utils/id';
import { countContentChars } from '../utils/content';
import { syncEditorTitleHeight } from '../utils/editorTitle';
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from './RichTextEditor';
import { imeInputProps, useImeDraft } from '../hooks/useImeDraft';
import { useConfirm } from './ConfirmDialog';
import { TagChipsInput } from './TagChipsInput';

export function SceneKeepModal({ scene }: { scene: Scene }) {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const closeRef = useRef<() => void>(() => undefined);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<RichTextEditorHandle>(null);

  const titleIme = useImeDraft(
    scene.title,
    (title) => dispatch(updateScene({ id: scene.id, title })),
    scene.id,
  );

  const titleValid = isTitleValid(titleIme.value);
  const beat = DEFAULT_BEAT_GUIDE[scene.beatIndex];
  const chars = countContentChars(scene.contentHtml);

  useLayoutEffect(() => {
    syncEditorTitleHeight(titleRef.current);
  }, [titleIme.value]);

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

  async function handleDelete() {
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
          <div className="modal-editor-meta">
            <span className="modal-editor-meta__label">
              {beat?.nameKo ?? ''} · {beat?.percentHint ?? 0}%
            </span>
            <span className="editor-char-count" aria-live="polite">
              <span className="editor-char-count__num">
                {chars.total.toLocaleString('ko-KR')}
              </span>
              {' '}자 (공백제외{' '}
              <span className="editor-char-count__num">
                {chars.withoutSpaces.toLocaleString('ko-KR')}
              </span>
              {' '}자)
            </span>
          </div>
          <div className="modal-note-surface">
            <textarea
              ref={titleRef}
              id={`scene-title-${scene.id}`}
              name="scene-title"
              className="editor-title"
              placeholder="제목"
              rows={1}
              autoFocus
              aria-label="씬 제목"
              {...imeInputProps(titleIme)}
              onBlur={titleIme.onBlurCommit}
              onInput={(e) => syncEditorTitleHeight(e.currentTarget)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
                e.preventDefault();
                titleIme.onBlurCommit();
                // Toast UI는 DOM focus만으로는 안 잡힘 → editor.focus()
                requestAnimationFrame(() => editorRef.current?.focus());
              }}
            />
            {!titleValid && (
              <p className="editor-title-invalid">제목을 입력하세요.</p>
            )}
            <RichTextEditor
              ref={editorRef}
              key={scene.id}
              contentHtml={scene.contentHtml}
              showToolbar
              editable
              height="340px"
              variant="keep"
              placeholder="메모를 입력하세요…"
              onChange={(html) =>
                dispatch(updateScene({ id: scene.id, contentHtml: html }))
              }
            />
          </div>
        </div>

        <div className="modal-toolbar">
          <div className="modal-toolbar__start">
            <button
              type="button"
              className="icon-btn icon-btn--danger"
              aria-label="씬 삭제"
              title="삭제"
              onClick={() => void handleDelete()}
            >
              <span className="material-symbols-rounded">delete</span>
            </button>
            <TagChipsInput
              id={`scene-tags-${scene.id}`}
              name="scene-tags"
              tags={scene.tags}
              placeholder="태그 추가 · Enter/스페이스"
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
