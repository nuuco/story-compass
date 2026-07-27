import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReferenceNote } from '../types/models';
import { useAppDispatch } from '../store/hooks';
import {
  deleteReference,
  selectReference,
  updateReference,
} from '../store/projectSlice';
import { isTitleValid } from '../utils/id';
import { RichTextEditor } from './RichTextEditor';
import { imeInputProps, useImeDraft } from '../hooks/useImeDraft';
import { useConfirm } from './ConfirmDialog';
import { TagChipsInput } from './TagChipsInput';

/** 씬 Keep 모달과 동일한 편집 UX (참고 메모용) */
export function ReferenceKeepModal({ reference }: { reference: ReferenceNote }) {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<() => void>(() => undefined);

  const titleIme = useImeDraft(
    reference.title,
    (title) => dispatch(updateReference({ id: reference.id, title })),
    reference.id,
  );

  const titleValid = isTitleValid(titleIme.value);

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

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

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
        className="focus-modal focus-modal--ref"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="참고 메모 편집"
      >
        <div className="modal-editor-area">
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              marginBottom: 4,
            }}
          >
            참고 자료
          </div>
          <input
            id={`reference-title-${reference.id}`}
            name="reference-title"
            className="editor-title"
            placeholder="제목 없는 메모"
            autoFocus
            aria-label="참고 메모 제목"
            {...imeInputProps(titleIme)}
            onBlur={titleIme.onBlurCommit}
          />
          {!titleValid && (
            <p className="editor-title-invalid">제목을 입력하세요.</p>
          )}
          <RichTextEditor
            key={reference.id}
            contentHtml={reference.contentHtml}
            showToolbar
            editable
            height="300px"
            variant="keep"
            placeholder="캐릭터·세계관·설정 등을 적어보세요…"
            onChange={(html) =>
              dispatch(
                updateReference({ id: reference.id, contentHtml: html }),
              )
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
                <div
                  className="note-menu"
                  style={{
                    top: 'auto',
                    bottom: '100%',
                    right: 0,
                    marginBottom: 4,
                  }}
                >
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      setMenuOpen(false);
                      void (async () => {
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
                      })();
                    }}
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
            <TagChipsInput
              id={`reference-tags-${reference.id}`}
              name="reference-tags"
              tags={reference.tags}
              placeholder="태그 추가 후 Enter"
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
