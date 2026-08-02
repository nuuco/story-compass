import type { RootState } from './index';

export const selectSaveStatus = (s: RootState) => s.project.saveStatus;
export const selectStorageMode = (s: RootState) => s.project.storageMode;
export const selectSidebarCollapsed = (s: RootState) =>
  s.project.sidebarCollapsed;
export const selectReferenceDrawerOpen = (s: RootState) =>
  s.project.referenceDrawerOpen;
export const selectTrashPanelOpen = (s: RootState) => s.project.trashPanelOpen;
export const selectWorkspaceFolderName = (s: RootState) =>
  s.project.workspaceFolderName;
export const selectConnectedProjects = (s: RootState) =>
  s.project.connectedProjects;
export const selectActiveConnectedProjectId = (s: RootState) =>
  s.project.activeConnectedProjectId;

export const selectScenes = (s: RootState) => s.project.scenes;
export const selectReferences = (s: RootState) => s.project.references;
export const selectDocuments = (s: RootState) => s.project.documents;
export const selectManifest = (s: RootState) => s.project.manifest;
export const selectTrash = (s: RootState) => s.project.trash;
export const selectTrashedProjects = (s: RootState) =>
  s.project.trashedProjects;
export const selectTrashSortBy = (s: RootState) => s.project.trashSortBy;

export const selectSelectedDocumentId = (s: RootState) =>
  s.project.selectedDocumentId;
export const selectSelectedSceneId = (s: RootState) =>
  s.project.selectedSceneId;
export const selectSelectedReferenceId = (s: RootState) =>
  s.project.selectedReferenceId;
export const selectFocusBeatIndex = (s: RootState) => s.project.focusBeatIndex;

export const selectCenterTagFilter = (s: RootState) =>
  s.project.centerTagFilter;
export const selectCenterSearchQuery = (s: RootState) =>
  s.project.centerSearchQuery;
export const selectReferenceTagFilter = (s: RootState) =>
  s.project.referenceTagFilter;
export const selectReferenceSearchQuery = (s: RootState) =>
  s.project.referenceSearchQuery;

export function selectSceneFilterActive(s: RootState): boolean {
  return (
    s.project.centerSearchQuery.trim().length > 0 ||
    s.project.centerTagFilter.length > 0
  );
}

export function selectReferenceFilterActive(s: RootState): boolean {
  return (
    s.project.referenceSearchQuery.trim().length > 0 ||
    s.project.referenceTagFilter.length > 0
  );
}
