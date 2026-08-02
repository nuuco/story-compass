import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  connectWorkspace,
  requestWorkspaceAccess,
} from '../storage/projectConnection';

export function FolderConnectPrompt() {
  const dispatch = useAppDispatch();
  const connectedProjects = useAppSelector((s) => s.project.connectedProjects);
  const workspaceFolderName = useAppSelector(
    (s) => s.project.workspaceFolderName,
  );
  const hasProjects = connectedProjects.length > 0;
  const needsPermission =
    Boolean(workspaceFolderName) && !hasProjects;

  return (
    <main className="canvas">
      <div className="folder-connect-prompt">
        <div className="folder-connect-prompt__icon" aria-hidden>
          <span className="material-symbols-rounded">folder_open</span>
        </div>
        <h2 className="folder-connect-prompt__title">
          {hasProjects
            ? '프로젝트를 선택하세요'
            : needsPermission
              ? '폴더 접근 권한이 필요합니다'
              : '워크스페이스 폴더를 연결해 주세요'}
        </h2>
        <p className="folder-connect-prompt__lead">
          {hasProjects ? (
            '왼쪽 사이드바에서 프로젝트를 선택하세요.'
          ) : needsPermission ? (
            <>
              이전에 연결한 폴더 「{workspaceFolderName}」에 다시 접근하려면
              <br />
              브라우저 권한을 허용해 주세요.
            </>
          ) : (
            <>
              한 폴더(워크스페이스) 안에 여러 프로젝트를 둘 수 있습니다.
              <br />
              작성한 글은 이 기기의 폴더에만 저장되며, 서버로 업로드되지 않습니다.
              <br />
              <span className="folder-connect-prompt__sample">
                체험용 샘플은 저장소의{' '}
                <code>sample-workspace</code> 루트(
                <code>workspace.json</code>이 있는 폴더)를 「기존 워크스페이스
                열기」로 선택하세요.
              </span>
            </>
          )}
        </p>
        {!hasProjects ? (
          <div className="folder-connect-prompt__actions">
            {needsPermission ? (
              <button
                type="button"
                className="btn-primary folder-connect-prompt__cta"
                onClick={() => void requestWorkspaceAccess(dispatch)}
              >
                <span className="material-symbols-rounded">folder_open</span>
                권한 허용하고 열기
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-primary folder-connect-prompt__cta"
                  onClick={() => void connectWorkspace(dispatch, 'new')}
                >
                  <span className="material-symbols-rounded">
                    create_new_folder
                  </span>
                  새 워크스페이스
                </button>
                <button
                  type="button"
                  className="btn-secondary folder-connect-prompt__cta"
                  onClick={() => void connectWorkspace(dispatch, 'open')}
                >
                  <span className="material-symbols-rounded">folder_open</span>
                  기존 워크스페이스 열기
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}
