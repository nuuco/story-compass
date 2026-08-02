import { useCallback, useRef, useState, type DragEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  connectWorkspace,
  connectWorkspaceFromHandle,
  requestWorkspaceAccess,
} from '../storage/projectConnection';
import { useToast } from './Toast';

function isFileDrag(e: DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes('Files');
}

export function FolderConnectPrompt() {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const connectedProjects = useAppSelector((s) => s.project.connectedProjects);
  const workspaceFolderName = useAppSelector(
    (s) => s.project.workspaceFolderName,
  );
  const hasProjects = connectedProjects.length > 0;
  const needsPermission =
    Boolean(workspaceFolderName) && !hasProjects;

  const [dragOver, setDragOver] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const dragDepthRef = useRef(0);

  const canDrop = !hasProjects && !needsPermission && !connecting;

  const onDragEnter = useCallback(
    (e: DragEvent) => {
      if (!canDrop || !isFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      dragDepthRef.current += 1;
      setDragOver(true);
    },
    [canDrop],
  );

  const onDragLeave = useCallback(
    (e: DragEvent) => {
      if (!canDrop) return;
      e.preventDefault();
      e.stopPropagation();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setDragOver(false);
    },
    [canDrop],
  );

  const onDragOver = useCallback(
    (e: DragEvent) => {
      if (!canDrop || !isFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
    },
    [canDrop],
  );

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragDepthRef.current = 0;
      setDragOver(false);
      if (!canDrop) return;

      const items = [...e.dataTransfer.items].filter((i) => i.kind === 'file');
      if (items.length === 0) {
        showToast('워크스페이스 폴더를 놓아 주세요', 'error');
        return;
      }

      // drop 틱에서 동기 호출 필수 (await 전에)
      const handlePromises = items.map((item) => {
        const fn = (
          item as DataTransferItem & {
            getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
          }
        ).getAsFileSystemHandle;
        return fn ? fn.call(item) : Promise.resolve(null);
      });

      void (async () => {
        setConnecting(true);
        try {
          if (!('getAsFileSystemHandle' in DataTransferItem.prototype)) {
            showToast(
              '이 브라우저는 폴더 드롭을 지원하지 않습니다. Chrome·Edge를 사용하세요.',
              'error',
            );
            return;
          }
          const handles = await Promise.all(handlePromises);
          const dir = handles.find(
            (h): h is FileSystemDirectoryHandle =>
              h != null && h.kind === 'directory',
          );
          if (!dir) {
            showToast('폴더를 놓아 주세요 (파일은 연결할 수 없습니다)', 'error');
            return;
          }
          const ok = await connectWorkspaceFromHandle(dispatch, dir, 'open');
          if (ok) showToast(`「${dir.name}」 워크스페이스를 연결했습니다`);
        } finally {
          setConnecting(false);
        }
      })();
    },
    [canDrop, dispatch, showToast],
  );

  return (
    <main className="canvas">
      <div className="folder-connect-prompt-shell">
        <div
          className={[
            'folder-connect-prompt',
            canDrop ? 'folder-connect-prompt--droppable' : '',
            dragOver ? 'is-drag-over' : '',
            connecting ? 'is-connecting' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {dragOver ? (
            <div
              className="folder-connect-prompt__drop-overlay"
              aria-live="polite"
            >
              <span className="material-symbols-rounded">create_new_folder</span>
              <p>폴더 드롭하여 열기</p>
            </div>
          ) : null}

          <div className="folder-connect-prompt__icon" aria-hidden>
            <span className="material-symbols-rounded">
              {connecting ? 'progress_activity' : 'folder_open'}
            </span>
          </div>
          <h2 className="folder-connect-prompt__title">
            {connecting
              ? '워크스페이스 연결 중…'
              : hasProjects
                ? '프로젝트를 선택하세요'
                : needsPermission
                  ? '폴더 접근 권한이 필요합니다'
                  : '워크스페이스 폴더를 연결해 주세요'}
          </h2>
          <p className="folder-connect-prompt__lead">
            {connecting ? (
              '폴더를 읽고 있습니다. 잠시만 기다려 주세요.'
            ) : hasProjects ? (
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
                작성한 글은 이 기기의 폴더에만 저장되며, 서버로 업로드되지
                않습니다.
              </>
            )}
          </p>
          {!hasProjects && !connecting ? (
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
          {canDrop ? (
            <p className="folder-connect-prompt__lead folder-connect-prompt__drop-hint">
              또는 폴더를 <strong>이 영역으로 끌어다 놓으세요</strong>
            </p>
          ) : null}

          {canDrop ? (
            <div className="folder-connect-prompt__sample">
              <a
                className="folder-connect-prompt__sample-link"
                href="/sample-workspace.zip"
                download="sample-workspace.zip"
              >
                <span className="material-symbols-rounded" aria-hidden>
                  download
                </span>
                체험용 샘플 받기
              </a>
              <p className="folder-connect-prompt__sample-hint">
                압축을 푼 sample-workspace 폴더를 열어 주세요
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
