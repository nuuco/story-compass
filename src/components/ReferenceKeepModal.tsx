import type { ReferenceNote } from '../types/models';
import { useAppDispatch } from '../store/hooks';
import {
  deleteReference,
  selectReference,
  updateReference,
} from '../store/projectSlice';
import { KeepNoteModal } from './KeepNoteModal';

/** 씬 Keep 모달과 동일한 편집 UX (참고 메모용) */
export function ReferenceKeepModal({ reference }: { reference: ReferenceNote }) {
  const dispatch = useAppDispatch();

  return (
    <KeepNoteModal
      noteId={reference.id}
      title={reference.title}
      contentHtml={reference.contentHtml}
      tags={reference.tags}
      metaLabel="참고 자료"
      ariaLabel="참고 메모 편집"
      titleInputId={`reference-title-${reference.id}`}
      titleInputName="reference-title"
      tagsInputId={`reference-tags-${reference.id}`}
      tagsInputName="reference-tags"
      titleAriaLabel="참고 메모 제목"
      deleteAriaLabel="참고 메모 삭제"
      deleteConfirmTitle="참고 메모를 삭제할까요?"
      deleteConfirmMessage="삭제한 메모는 휴지통으로 이동합니다. 나중에 복원할 수 있습니다."
      refModal
      onCommitTitle={(title) =>
        dispatch(updateReference({ id: reference.id, title }))
      }
      onChangeContent={(html) =>
        dispatch(updateReference({ id: reference.id, contentHtml: html }))
      }
      onChangeTags={(tags) =>
        dispatch(updateReference({ id: reference.id, tags }))
      }
      onClose={() => dispatch(selectReference(null))}
      onDeleteConfirmed={() => dispatch(deleteReference(reference.id))}
    />
  );
}
