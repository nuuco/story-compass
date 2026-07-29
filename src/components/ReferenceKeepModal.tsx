import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReferenceNote } from '../types/models';
import { useAppDispatch } from '../store/hooks';
import {
  deleteReference,
  selectReference,
  updateReference,
} from '../store/projectSlice';
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

/** 씬 Keep 모달과 동일한 편집 UX (참고 메모용) */
export function ReferenceKeepModal({ reference }: { reference: ReferenceNote }) {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const closeRef = useRef<() => void>(() => undefined);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<RichTextEditorHandle>(null);

  const titleIme = useImeDraft(
    reference.title,
    (title) => dispatch(updateReference({ id: reference.id, title })),
    reference.id,
  );

  const titleValid = isTitleValid(titleIme.value);
  const chars = countContentChars(reference.contentHtml);

  useLayoutEffect(() => {
    syncEditorTitleHeight(titleRef.current);
  }, [titleIme.value]);

  function close() {
    dispatch(updateReference({ id: reference.id, title: titleIme.value }));
    dispatch(selectReference(null));
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
      title: '참고 메모를 삭제할까요?',
      message: '삭제한 메모는 되돌릴 수 없습니다.',
      confirmLabel: '삭제',
      danger: true,
    });
    if (ok) {
      dispatch(deleteReference(reference.id));
      close();
    }
  }

  return createPortal(
    <div
      className="focus-overlay"
      data-keep-modal
      data-ref-modal
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="focus-modal"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="참고 메모 편집"
      >
        <div className="modal-editor-area">
          <div className="modal-editor-meta">
            <span className="modal-editor-meta__label">참고 자료</span>
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
              id={`reference-title-${reference.id}`}
              name="reference-title"
              className="editor-title"
              placeholder="제목"
              rows={1}
              autoFocus
              aria-label="참고 메모 제목"
              {...imeInputProps(titleIme)}
              onBlur={titleIme.onBlurCommit}
              onInput={(e) => syncEditorTitleHeight(e.currentTarget)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
                e.preventDefault();
                titleIme.onBlurCommit();
                requestAnimationFrame(() => editorRef.current?.focus());
              }}
            />
            {!titleValid && (
              <p className="editor-title-invalid">제목을 입력하세요.</p>
            )}
            <RichTextEditor
              ref={editorRef}
              key={reference.id}
              contentHtml={reference.contentHtml}
              showToolbar
              editable
              height="340px"
              variant="keep"
              placeholder="메모를 입력하세요…"
              onChange={(html) =>
                dispatch(
                  updateReference({ id: reference.id, contentHtml: html }),
                )
              }
            />
          </div>
        </div>

        <div className="modal-toolbar">
          <div className="modal-toolbar__start">
            <button
              type="button"
              className="icon-btn icon-btn--danger"
              aria-label="참고 메모 삭제"
              title="삭제"
              onClick={() => void handleDelete()}
            >
              <span className="material-symbols-rounded">delete</span>
            </button>
            <TagChipsInput
              id={`reference-tags-${reference.id}`}
              name="reference-tags"
              tags={reference.tags}
              placeholder="태그 추가 · Enter/스페이스"
              onChange={(tags) =>
                dispatch(updateReference({ id: reference.id, tags }))
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
