import type { Scene } from '../types/models';
import { DEFAULT_BEAT_GUIDE } from '../data/beatGuide';
import { useAppDispatch } from '../store/hooks';
import { deleteScene, selectScene, updateScene } from '../store/projectSlice';
import { KeepNoteModal } from './KeepNoteModal';

export function SceneKeepModal({ scene }: { scene: Scene }) {
  const dispatch = useAppDispatch();
  const beat = DEFAULT_BEAT_GUIDE[scene.beatIndex];

  return (
    <KeepNoteModal
      noteId={scene.id}
      title={scene.title}
      contentHtml={scene.contentHtml}
      tags={scene.tags}
      metaLabel={`${beat?.nameKo ?? ''} · ${beat?.percentHint ?? 0}%`}
      ariaLabel="씬 편집"
      titleInputId={`scene-title-${scene.id}`}
      titleInputName="scene-title"
      tagsInputId={`scene-tags-${scene.id}`}
      tagsInputName="scene-tags"
      titleAriaLabel="씬 제목"
      deleteAriaLabel="씬 삭제"
      deleteConfirmTitle="씬을 삭제할까요?"
      deleteConfirmMessage="삭제한 씬은 휴지통으로 이동합니다. 나중에 복원할 수 있습니다."
      onCommitTitle={(title) =>
        dispatch(updateScene({ id: scene.id, title }))
      }
      onChangeContent={(html) =>
        dispatch(updateScene({ id: scene.id, contentHtml: html }))
      }
      onChangeTags={(tags) => dispatch(updateScene({ id: scene.id, tags }))}
      onClose={() => dispatch(selectScene(null))}
      onDeleteConfirmed={() => dispatch(deleteScene(scene.id))}
    />
  );
}
