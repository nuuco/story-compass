import { useAppDispatch, useAppSelector } from '../store/hooks';
import { connectNewProject, openProjectFolder } from '../storage/projectConnection';

export function FolderConnectPrompt() {
  const dispatch = useAppDispatch();
  const connectedProjects = useAppSelector((s) => s.project.connectedProjects);
  const hasProjects = connectedProjects.length > 0;

  return (
    <main className="canvas">
      <div className="folder-connect-prompt">
        <div className="folder-connect-prompt__icon" aria-hidden>
          <span className="material-symbols-rounded">folder_open</span>
        </div>
        <h2 className="folder-connect-prompt__title">
          {hasProjects ? '프로젝트를 선택하세요' : '로컬 폴더를 연결해 주세요'}
        </h2>
        <p className="folder-connect-prompt__lead">
          {hasProjects ? (
            '왼쪽 사이드바에서 프로젝트를 선택하거나 새로 연결하세요.'
          ) : (
            <>
              작성한 글은 이 기기의 폴더에만 저장되며, 서버로 업로드되지 않습니다.
              <br />
              씬 작성은 로컬 폴더 연결 후에 할 수 있습니다.
            </>
          )}
        </p>
        <div className="folder-connect-prompt__actions">
          <button
            type="button"
            className="btn-primary folder-connect-prompt__cta"
            onClick={() => void connectNewProject(dispatch)}
          >
            <span className="material-symbols-rounded">create_new_folder</span>
            새 프로젝트
          </button>
          <button
            type="button"
            className="btn-secondary folder-connect-prompt__cta"
            onClick={() => void openProjectFolder(dispatch)}
          >
            <span className="material-symbols-rounded">folder_open</span>
            프로젝트 열기
          </button>
        </div>
      </div>
    </main>
  );
}
