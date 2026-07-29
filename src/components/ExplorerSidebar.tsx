import { useEffect, useRef, useState } from 'react';
import { useStore } from 'react-redux';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import type { RootState } from '../store';
import {
  addDocument,
  deleteDocument,
  hydrateProject,
  renameDocument,
  selectDocument,
  setProjectTitle,
  setSaveStatus,
  toggleSidebarCollapsed,
} from '../store/projectSlice';
import {
  connectNewProject,
  disconnectProject,
  openProjectFolder,
  switchToProject,
} from '../storage/projectConnection';
import { ZipStorage, downloadProjectZip } from '../storage/zipStorage';
import {
  flushSave,
  getActiveStorage,
  setActiveStorage,
} from '../storage/autosave';
import { isTitleValid } from '../utils/id';
import { useConfirm } from './ConfirmDialog';

function snapshotFromState(state: RootState['project']) {
  return {
    manifest: state.manifest,
    documents: state.documents,
    scenes: state.scenes,
    references: state.references,
  };
}

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
  } = project;
  const fileRef = useRef<HTMLInputElement>(null);
  const folderConnected = storageMode === 'folder';

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

  async function persistAll() {
    const storage = getActiveStorage();
    if (!storage) {
      await downloadProjectZip(
        snapshotFromState(project),
        `${project.manifest.project.title || 'story'}.zip`,
      );
      return;
    }
    dispatch(setSaveStatus('saving'));
    try {
      await storage.saveAll(snapshotFromState(project));
      if (storage.kind === 'zip') {
        (storage as ZipStorage).download(
          `${project.manifest.project.title || 'story'}.zip`,
        );
      }
      dispatch(setSaveStatus('saved'));
    } catch {
      dispatch(setSaveStatus('error'));
    }
  }

  async function onZipSelected(file: File) {
    try {
      const storage = await ZipStorage.fromFile(file);
      const snap = await storage.load();
      setActiveStorage(null);
      dispatch(hydrateProject({ ...snap, storageMode: 'memory' }));
      dispatch(setSaveStatus('no-folder'));
    } catch (e) {
      console.error(e);
      window.alert('ZIP을 읽을 수 없습니다.');
    }
  }

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
                          <span className="explorer__project-folder-name">
                            {entry.folderName}
                          </span>
                        </span>
                      )}
                      <button
                        type="button"
                        className="explorer__unlink"
                        aria-label={`${entry.title} 연결 해제`}
                        title="연결 해제"
                        onClick={(e) => {
                          e.stopPropagation();
                          void (async () => {
                            const ok = await confirm({
                              title: '연결을 해제할까요?',
                              message: `"${entry.title}" 프로젝트가 사이드바에서 제거됩니다. 폴더의 파일은 그대로 남습니다.`,
                              confirmLabel: '연결 해제',
                              danger: true,
                            });
                            if (ok) {
                              await disconnectProject(
                                dispatch,
                                store.getState,
                                entry.projectId,
                              );
                            }
                          })();
                        }}
                      >
                        <span className="material-symbols-rounded">link_off</span>
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
                              <p className="explorer__empty-docs">
                                문서가 없습니다.
                              </p>
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
                                            message: `"${doc.title}" 문서와 관련 씬이 함께 삭제됩니다.`,
                                            confirmLabel: '삭제',
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
            <button
              type="button"
              className="explorer__save-btn"
              onClick={() => void connectNewProject(dispatch)}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
                create_new_folder
              </span>
              새 프로젝트
            </button>
            <button
              type="button"
              className="explorer__save-btn"
              onClick={() => void openProjectFolder(dispatch)}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
                folder_open
              </span>
              프로젝트 열기
            </button>
            {folderConnected ? (
              <button
                type="button"
                className="explorer__save-btn"
                onClick={() => flushSave(async () => { await persistAll(); })}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
                  download
                </span>
                ZIP으로보내기
              </button>
            ) : null}
            <button
              type="button"
              className="explorer__save-btn"
              onClick={() => fileRef.current?.click()}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
                upload
              </span>
              ZIP 가져오기
            </button>
            <input
              id="zip-import"
              name="zip-import"
              ref={fileRef}
              type="file"
              accept=".zip,application/zip"
              hidden
              aria-label="ZIP 파일 가져오기"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onZipSelected(f);
                e.target.value = '';
              }}
            />
          </div>
        </>
      ) : null}
    </aside>
  );
}
