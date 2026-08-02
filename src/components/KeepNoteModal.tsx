import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { isTitleValid } from '../utils/id';
import { countContentChars } from '../utils/content';
import { syncEditorTitleHeight } from '../utils/editorTitle';
import { copyNoteWithToast } from '../utils/copyNote';
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from './RichTextEditor';
import { imeInputProps, useImeDraft } from '../hooks/useImeDraft';
import { useConfirm } from './ConfirmDialog';
import { TagChipsInput } from './TagChipsInput';
import { useToast } from './Toast';

export type KeepNoteModalProps = {
  noteId: string;
  title: string;
  contentHtml: string;
  tags: string[];
  metaLabel: string;
  ariaLabel: string;
  titleInputId: string;
  titleInputName: string;
  tagsInputId: string;
  tagsInputName: string;
  titleAriaLabel: string;
  deleteAriaLabel: string;
  deleteConfirmTitle: string;
  deleteConfirmMessage: string;
  /** 참고 모달 톤 */
  refModal?: boolean;
  onCommitTitle: (title: string) => void;
  onChangeContent: (html: string) => void;
  onChangeTags: (tags: string[]) => void;
  onClose: () => void;
  onDeleteConfirmed: () => void;
};

export function KeepNoteModal({
  noteId,
  title,
  contentHtml,
  tags,
  metaLabel,
  ariaLabel,
  titleInputId,
  titleInputName,
  tagsInputId,
  tagsInputName,
  titleAriaLabel,
  deleteAriaLabel,
  deleteConfirmTitle,
  deleteConfirmMessage,
  refModal = false,
  onCommitTitle,
  onChangeContent,
  onChangeTags,
  onClose,
  onDeleteConfirmed,
}: KeepNoteModalProps) {
  const confirm = useConfirm();
  const { showToast } = useToast();
  const closeRef = useRef<() => void>(() => undefined);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<RichTextEditorHandle>(null);

  const titleIme = useImeDraft(title, onCommitTitle, noteId);
  const titleValid = isTitleValid(titleIme.value);
  const chars = countContentChars(contentHtml);

  useLayoutEffect(() => {
    syncEditorTitleHeight(titleRef.current);
  }, [titleIme.value]);

  function close() {
    onCommitTitle(titleIme.value);
    onClose();
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
      title: deleteConfirmTitle,
      message: deleteConfirmMessage,
      confirmLabel: '휴지통으로',
      danger: true,
    });
    if (ok) {
      onDeleteConfirmed();
      close();
    }
  }

  return createPortal(
    <div
      className="focus-overlay"
      data-keep-modal
      {...(refModal ? { 'data-ref-modal': true } : {})}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="focus-modal"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        <div className="modal-editor-area">
          <div className="modal-editor-meta">
            <span className="modal-editor-meta__label">{metaLabel}</span>
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
              id={titleInputId}
              name={titleInputName}
              className="editor-title"
              placeholder="제목"
              rows={1}
              autoFocus
              aria-label={titleAriaLabel}
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
              key={noteId}
              contentHtml={contentHtml}
              showToolbar
              editable
              height="340px"
              variant="keep"
              placeholder="메모를 입력하세요…"
              onChange={onChangeContent}
            />
          </div>
        </div>

        <div className="modal-toolbar">
          <div className="modal-toolbar__start">
            <button
              type="button"
              className="icon-btn"
              aria-label="텍스트로 복사"
              title="텍스트로 복사"
              onClick={() => {
                void copyNoteWithToast(
                  { title: titleIme.value, contentHtml },
                  showToast,
                );
              }}
            >
              <span className="material-symbols-rounded">content_copy</span>
            </button>
            <button
              type="button"
              className="icon-btn icon-btn--danger"
              aria-label={deleteAriaLabel}
              title="삭제"
              onClick={() => void handleDelete()}
            >
              <span className="material-symbols-rounded">delete</span>
            </button>
            <TagChipsInput
              id={tagsInputId}
              name={tagsInputName}
              tags={tags}
              placeholder="태그 추가 · Enter/스페이스"
              onChange={onChangeTags}
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
