import { useEffect, useRef, useState } from 'react';
import { useStore } from 'react-redux';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import type { RootState } from '../store';
import {
  addDocument,
  deleteDocument,
  renameDocument,
  selectDocument,
  setProjectTitle,
  setTrashPanelOpen,
  toggleSidebarCollapsed,
} from '../store/projectSlice';
import {
  connectWorkspace,
  createProjectInWorkspace,
  deleteProjectToTrash,
  disconnectWorkspace,
  switchToProject,
} from '../storage/projectConnection';
import { isTitleValid } from '../utils/id';
import { useConfirm } from './ConfirmDialog';

export function ExplorerSidebar() {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const confirm = useConfirm();
  const project = useAppSelector((s) => s.project);
  const {
    documents,
    selectedDocumentId,
    manifest,
    sidebarCollapsed,
    storageMode,
    connectedProjects,
    activeConnectedProjectId,
    workspaceFolderName,
    trash,
    trashedProjects,
  } = project;
  const folderConnected = storageMode === 'folder';
  const workspaceLinked =
    Boolean(workspaceFolderName) || connectedProjects.length > 0;

  const trashCount =
    trash.scenes.length +
    trash.references.length +
    trash.bundles.length +
    trashedProjects.length;

  const [projectExpanded, setProjectExpanded] = useState(true);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docDraft, setDocDraft] = useState('');
  const [projectDraft, setProjectDraft] = useState(manifest.project.title);
  const composingProjectRef = useRef(false);
  const composingDocRef = useRef(false);
  const projectValid = isTitleValid(projectDraft);

  useEffect(() => {
    if (!composingProjectRef.current) {
      setProjectDraft(manifest.project.title);
    }
  }, [manifest.project.title]);

  return (
    <aside className={`explorer ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
      <div className="explorer__brand">
        <button
          type="button"
          className="explorer__brand-toggle"
          onClick={() => dispatch(toggleSidebarCollapsed())}
          aria-expanded={!sidebarCollapsed}
          aria-label={
            sidebarCollapsed ? '사이드바 펼치기' : '사이드바 접기'
          }
          title={sidebarCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          <span className="material-symbols-rounded explorer__brand-icon">
            explore
          </span>
          {!sidebarCollapsed ? (
            <>
              <span className="explorer__brand-name">스토리 나침반</span>
              <span
                className="material-symbols-rounded explorer__brand-chevron"
                aria-hidden
              >
                chevron_left
              </span>
            </>
          ) : null}
        </button>
        {!sidebarCollapsed ? (
          <div className="explorer__brand-sub">Story Compass</div>
        ) : null}
      </div>

      {!sidebarCollapsed ? (
        <>
          {workspaceLinked ? (
            <div className="explorer__workspace-label" title={workspaceFolderName ?? ''}>
              <span className="material-symbols-rounded" aria-hidden>
                inventory_2
              </span>
              <span>{workspaceFolderName || '워크스페이스'}</span>
            </div>
          ) : null}

          {connectedProjects.length > 0 ? (
            <div className="explorer__tree">
              {connectedProjects.map((entry) => {
                const isActive =
                  folderConnected &&
                  entry.projectId === activeConnectedProjectId;
                const isExpanded = isActive && projectExpanded;

                return (
                  <div key={entry.projectId} className="explorer__project">
                    <div
                      className={`explorer__project-row ${isActive && !isExpanded ? 'active' : ''}`}
                      onClick={() => {
                        if (!isActive) {
                          void switchToProject(
                            dispatch,
                            store.getState,
                            entry.projectId,
                          );
                        } else {
                          setProjectExpanded((o) => !o);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (!isActive) {
                            void switchToProject(
                              dispatch,
                              store.getState,
                              entry.projectId,
                            );
                          } else {
                            setProjectExpanded((o) => !o);
                          }
                        }
                      }}
                    >
                      <span
                        className="material-symbols-rounded explorer__project-folder"
                        aria-hidden
                      >
                        {isExpanded ? 'folder_open' : 'folder'}
                      </span>
                      {isActive ? (
                        <input
                          id={`project-title-${entry.projectId}`}
                          name="project-title"
                          className={`explorer__project-title-input ${projectValid ? '' : 'invalid'}`}
                          value={projectDraft}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setProjectDraft(e.target.value)}
                          onCompositionStart={() => {
                            composingProjectRef.current = true;
                          }}
                          onCompositionEnd={(e) => {
                            composingProjectRef.current = false;
                            setProjectDraft(e.currentTarget.value);
                          }}
                          onBlur={() => {
                            if (composingProjectRef.current) return;
                            if (projectValid) {
                              dispatch(setProjectTitle(projectDraft.trim()));
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          aria-label="프로젝트 제목"
                        />
                      ) : (
                        <span className="explorer__project-label">
                          <span className="explorer__project-name">
                            {entry.title}
                          </span>
                        </span>
                      )}
                      <button
                        type="button"
                        className="explorer__unlink"
                        aria-label={`${entry.title} 삭제`}
                        title="휴지통으로 이동"
                        onClick={(e) => {
                          e.stopPropagation();
                          void (async () => {
                            const ok = await confirm({
                              title: '프로젝트를 삭제할까요?',
                              message: `"${entry.title}" 프로젝트를 휴지통으로 이동합니다. 나중에 복원할 수 있습니다.`,
                              confirmLabel: '휴지통으로',
                              danger: true,
                            });
                            if (ok) {
                              await deleteProjectToTrash(
                                dispatch,
                                store.getState,
                                entry.projectId,
                              );
                            }
                          })();
                        }}
                      >
                        <span className="material-symbols-rounded">delete</span>
                      </button>
                      {isActive ? (
                        <button
                          type="button"
                          className={`explorer__caret ${projectExpanded ? 'open' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectExpanded((o) => !o);
                          }}
                          aria-label={
                            projectExpanded ? '문서 목록 접기' : '문서 목록 펼치기'
                          }
                          title={projectExpanded ? '접기' : '펼치기'}
                        >
                          <span className="material-symbols-rounded">
                            expand_more
                          </span>
                        </button>
                      ) : null}
                    </div>

                    {isExpanded && isActive && (
                      <div className="explorer__docs">
                        {documents.length === 0 ? (
                          <p className="explorer__empty-docs">문서가 없습니다.</p>
                        ) : (
                          documents.map((doc) => {
                            const selected = doc.id === selectedDocumentId;
                            if (editingDocId === doc.id) {
                              return (
                                <input
                                  key={doc.id}
                                  id={`document-title-${doc.id}`}
                                  name="document-title"
                                  autoFocus
                                  className="explorer__doc-row"
                                  style={{
                                    outline: '1px solid var(--accent-blue)',
                                  }}
                                  value={docDraft}
                                  aria-label="문서 제목"
                                  onChange={(e) => setDocDraft(e.target.value)}
                                  onCompositionStart={() => {
                                    composingDocRef.current = true;
                                  }}
                                  onCompositionEnd={(e) => {
                                    composingDocRef.current = false;
                                    setDocDraft(e.currentTarget.value);
                                  }}
                                  onBlur={() => {
                                    if (composingDocRef.current) return;
                                    if (isTitleValid(docDraft)) {
                                      dispatch(
                                        renameDocument({
                                          id: doc.id,
                                          title: docDraft,
                                        }),
                                      );
                                    }
                                    setEditingDocId(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (
                                      e.key === 'Enter' &&
                                      !e.nativeEvent.isComposing
                                    ) {
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                />
                              );
                            }
                            return (
                              <div
                                key={doc.id}
                                className={`explorer__doc-row ${selected ? 'active' : ''}`}
                              >
                                <button
                                  type="button"
                                  className="explorer__doc-main"
                                  onClick={() =>
                                    dispatch(selectDocument(doc.id))
                                  }
                                  onDoubleClick={() => {
                                    setEditingDocId(doc.id);
                                    setDocDraft(doc.title);
                                  }}
                                >
                                  <span
                                    className="material-symbols-rounded"
                                    style={{ fontSize: 18 }}
                                  >
                                    {selected ? 'edit_document' : 'description'}
                                  </span>
                                  <span className="explorer__doc-title">
                                    {doc.title}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  className="explorer__icon-btn"
                                  aria-label={`${doc.title} 삭제`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void (async () => {
                                      const ok = await confirm({
                                        title: '문서를 삭제할까요?',
                                        message: `"${doc.title}" 문서와 관련 씬이 휴지통으로 이동합니다.`,
                                        confirmLabel: '휴지통으로',
                                        danger: true,
                                      });
                                      if (ok) dispatch(deleteDocument(doc.id));
                                    })();
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })
                        )}
                        <button
                          type="button"
                          className="explorer__new-doc"
                          onClick={() =>
                            dispatch(addDocument({ title: '새 문서' }))
                          }
                        >
                          + 문서 추가
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="explorer__footer">
            {workspaceLinked ? (
              <>
                <button
                  type="button"
                  className="explorer__save-btn"
                  onClick={() =>
                    void createProjectInWorkspace(dispatch, store.getState)
                  }
                >
                  <span
                    className="material-symbols-rounded"
                    style={{ fontSize: 16 }}
                  >
                    note_add
                  </span>
                  새 프로젝트
                </button>
                <button
                  type="button"
                  className="explorer__save-btn"
                  onClick={() => dispatch(setTrashPanelOpen(true))}
                >
                  <span
                    className="material-symbols-rounded"
                    style={{ fontSize: 16 }}
                  >
                    delete
                  </span>
                  휴지통
                  {trashCount > 0 ? (
                    <span className="explorer__badge">{trashCount}</span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className="explorer__save-btn"
                  onClick={() => {
                    void (async () => {
                      const ok = await confirm({
                        title: '워크스페이스 연결을 해제할까요?',
                        message:
                          '사이드바에서 제거됩니다. 폴더의 파일은 그대로 남습니다.',
                        confirmLabel: '연결 해제',
                        danger: true,
                      });
                      if (ok) {
                        await disconnectWorkspace(dispatch, store.getState);
                      }
                    })();
                  }}
                >
                  <span
                    className="material-symbols-rounded"
                    style={{ fontSize: 16 }}
                  >
                    link_off
                  </span>
                  연결 해제
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="explorer__save-btn"
                  onClick={() => void connectWorkspace(dispatch, 'new')}
                >
                  <span
                    className="material-symbols-rounded"
                    style={{ fontSize: 16 }}
                  >
                    create_new_folder
                  </span>
                  새 워크스페이스
                </button>
                <button
                  type="button"
                  className="explorer__save-btn"
                  onClick={() => void connectWorkspace(dispatch, 'open')}
                >
                  <span
                    className="material-symbols-rounded"
                    style={{ fontSize: 16 }}
                  >
                    folder_open
                  </span>
                  기존 워크스페이스 열기
                </button>
              </>
            )}
          </div>
        </>
      ) : null}
    </aside>
  );
}
