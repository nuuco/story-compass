import type { Scene } from '../types/models';
import { useAppDispatch } from '../store/hooks';
import {
  convertSceneToReference,
  copySceneToReference,
  deleteScene,
  nudgeScene,
  selectScene,
} from '../store/projectSlice';
import { NotePreviewCard } from './NotePreviewCard';
import { useConfirm } from './ConfirmDialog';
import { useToast } from './Toast';

interface SceneCardProps {
  scene: Scene;
}

export function SceneCard({ scene }: SceneCardProps) {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const { showToast } = useToast();

  return (
    <NotePreviewCard
      id={scene.id}
      title={scene.title}
      contentHtml={scene.contentHtml}
      tags={scene.tags}
      dndType="scene"
      dataSceneId={scene.id}
      onSelect={() => dispatch(selectScene(scene.id))}
      onDelete={async () => {
        const ok = await confirm({
          title: '씬을 삭제할까요?',
          message:
            '삭제한 씬은 휴지통으로 이동합니다. 나중에 복원할 수 있습니다.',
          confirmLabel: '휴지통으로',
          danger: true,
        });
        if (ok) dispatch(deleteScene(scene.id));
      }}
      renderMenu={(closeMenu) => (
        <>
          <button
            type="button"
            onClick={() => {
              dispatch(nudgeScene({ id: scene.id, dir: 'top' }));
              closeMenu();
            }}
          >
            맨 위로
          </button>
          <button
            type="button"
            onClick={() => {
              dispatch(nudgeScene({ id: scene.id, dir: 'bottom' }));
              closeMenu();
            }}
          >
            맨 아래로
          </button>
          <hr />
          <button
            type="button"
            onClick={() => {
              dispatch(convertSceneToReference({ sceneId: scene.id }));
              closeMenu();
              showToast('참고 메모로 옮겼습니다');
            }}
          >
            참고 메모로 이동
          </button>
          <p className="note-menu__hint">또는 참고 패널로 드래그</p>
          <button
            type="button"
            onClick={() => {
              dispatch(copySceneToReference({ sceneId: scene.id }));
              closeMenu();
              showToast('참고로 복사했습니다');
            }}
          >
            참고로 복사
          </button>
        </>
      )}
    />
  );
}
