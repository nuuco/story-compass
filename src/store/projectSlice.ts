import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  DocumentMeta,
  Manifest,
  ProjectTrash,
  ReferenceNote,
  SaveStatus,
  Scene,
  TrashKind,
  TrashedProject,
} from '../types/models';
import { emptyProjectTrash, SCHEMA_VERSION } from '../types/models';
import { createId, nowIso } from '../utils/id';
import { isEmptyNote } from '../utils/content';
import type { TrashSortBy } from '../utils/trash';
import { clampBeatIndex } from './beatIndex';
import {
  buildReferenceFromScene,
  buildSceneFromReference,
  reserveReferenceOrder,
  reserveSceneOrder,
} from './noteConvert';

export interface ConnectedProjectMeta {
  projectId: string;
  folderName: string;
  title: string;
}

const SIDEBAR_COLLAPSED_KEY = 'story-compass-sidebar-collapsed';

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeSidebarCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export interface ProjectState {
  manifest: Manifest;
  documents: DocumentMeta[];
  scenes: Scene[];
  references: ReferenceNote[];
  trash: ProjectTrash;
  trashedProjects: TrashedProject[];
  workspaceFolderName: string | null;
  selectedDocumentId: string | null;
  selectedSceneId: string | null;
  selectedReferenceId: string | null;
  centerTagFilter: string[];
  referenceTagFilter: string[];
  centerSearchQuery: string;
  referenceSearchQuery: string;
  referenceDrawerOpen: boolean;
  trashPanelOpen: boolean;
  trashSortBy: TrashSortBy;
  sidebarCollapsed: boolean;
  saveStatus: SaveStatus;
  focusBeatIndex: number | null;
  storageMode: 'none' | 'folder';
  connectedProjects: ConnectedProjectMeta[];
  activeConnectedProjectId: string | null;
}

function createEmptyProject(): ProjectState {
  const ts = nowIso();
  const projectId = createId('proj');
  const docId = createId('doc');
  const doc: DocumentMeta = {
    id: docId,
    title: '본편',
    order: 0,
    createdAt: ts,
    updatedAt: ts,
  };
  return {
    manifest: {
      schemaVersion: SCHEMA_VERSION,
      project: {
        id: projectId,
        title: '새 스토리',
        createdAt: ts,
        updatedAt: ts,
      },
      activeDocumentId: docId,
    },
    documents: [doc],
    scenes: [],
    references: [],
    trash: emptyProjectTrash(),
    trashedProjects: [],
    workspaceFolderName: null,
    selectedDocumentId: docId,
    selectedSceneId: null,
    selectedReferenceId: null,
    centerTagFilter: [],
    referenceTagFilter: [],
    centerSearchQuery: '',
    referenceSearchQuery: '',
    referenceDrawerOpen: false,
    trashPanelOpen: false,
    trashSortBy: 'deletedAt',
    sidebarCollapsed: readSidebarCollapsed(),
    saveStatus: 'no-folder',
    focusBeatIndex: null,
    storageMode: 'none',
    connectedProjects: [],
    activeConnectedProjectId: null,
  };
}

const initialState: ProjectState = createEmptyProject();

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    resetProject(state) {
      const sidebarCollapsed = state.sidebarCollapsed;
      Object.assign(state, createEmptyProject());
      state.sidebarCollapsed = sidebarCollapsed;
    },
    setWorkspaceFolderName(state, action: PayloadAction<string | null>) {
      state.workspaceFolderName = action.payload;
    },
    setConnectedProjects(state, action: PayloadAction<ConnectedProjectMeta[]>) {
      state.connectedProjects = action.payload;
    },
    upsertConnectedProject(state, action: PayloadAction<ConnectedProjectMeta>) {
      const { projectId, folderName, title } = action.payload;
      const idx = state.connectedProjects.findIndex(
        (p) => p.projectId === projectId,
      );
      if (idx >= 0) {
        if (folderName) state.connectedProjects[idx].folderName = folderName;
        state.connectedProjects[idx].title = title;
      } else {
        state.connectedProjects.push(action.payload);
      }
    },
    removeConnectedProject(state, action: PayloadAction<string>) {
      state.connectedProjects = state.connectedProjects.filter(
        (p) => p.projectId !== action.payload,
      );
      if (state.activeConnectedProjectId === action.payload) {
        state.activeConnectedProjectId = null;
      }
    },
    setActiveConnectedProjectId(state, action: PayloadAction<string | null>) {
      state.activeConnectedProjectId = action.payload;
    },
    setTrashedProjects(state, action: PayloadAction<TrashedProject[]>) {
      state.trashedProjects = action.payload;
    },
    setTrashPanelOpen(state, action: PayloadAction<boolean>) {
      state.trashPanelOpen = action.payload;
    },
    setTrashSortBy(state, action: PayloadAction<TrashSortBy>) {
      state.trashSortBy = action.payload;
    },
    hydrateProject(
      state,
      action: PayloadAction<{
        manifest: Manifest;
        documents: DocumentMeta[];
        scenes: Scene[];
        references: ReferenceNote[];
        trash?: ProjectTrash;
        storageMode: 'folder';
      }>,
    ) {
      const { manifest, documents, scenes, references, storageMode } =
        action.payload;
      state.manifest = manifest;
      state.documents = documents;
      state.scenes = scenes;
      state.references = references;
      state.trash = action.payload.trash ?? emptyProjectTrash();
      ensureReferenceOrders(state);
      state.selectedDocumentId =
        manifest.activeDocumentId ?? documents[0]?.id ?? null;
      state.selectedSceneId = null;
      state.selectedReferenceId = null;
      state.storageMode = storageMode;
      state.saveStatus = storageMode === 'folder' ? 'saved' : 'no-folder';
      if (storageMode === 'folder') {
        state.activeConnectedProjectId = manifest.project.id;
      }
    },
    setProjectTitle(state, action: PayloadAction<string>) {
      state.manifest.project.title = action.payload;
      state.manifest.project.updatedAt = nowIso();
      const entry = state.connectedProjects.find(
        (p) => p.projectId === state.manifest.project.id,
      );
      if (entry) entry.title = action.payload;
      markDirty(state);
    },
    addDocument(state, action: PayloadAction<{ title: string }>) {
      const ts = nowIso();
      const title = action.payload.title.trim() || '새 문서';
      const doc: DocumentMeta = {
        id: createId('doc'),
        title,
        order: state.documents.length,
        createdAt: ts,
        updatedAt: ts,
      };
      state.documents.push(doc);
      state.selectedDocumentId = doc.id;
      state.manifest.activeDocumentId = doc.id;
      state.selectedSceneId = null;
      markDirty(state);
    },
    renameDocument(
      state,
      action: PayloadAction<{ id: string; title: string }>,
    ) {
      const doc = state.documents.find((d) => d.id === action.payload.id);
      if (!doc) return;
      const title = action.payload.title.trim();
      if (!title) return;
      doc.title = title;
      doc.updatedAt = nowIso();
      markDirty(state);
    },
    deleteDocument(state, action: PayloadAction<string>) {
      const id = action.payload;
      const doc = state.documents.find((d) => d.id === id);
      if (!doc) return;
      const childScenes = state.scenes.filter((s) => s.documentId === id);
      state.trash.bundles.push({
        deletedAt: nowIso(),
        document: { ...doc },
        scenes: childScenes.map((s) => ({ ...s, tags: [...s.tags] })),
      });
      state.documents = state.documents.filter((d) => d.id !== id);
      state.scenes = state.scenes.filter((s) => s.documentId !== id);
      if (state.selectedDocumentId === id) {
        state.selectedDocumentId = state.documents[0]?.id ?? null;
        state.manifest.activeDocumentId = state.selectedDocumentId;
        state.selectedSceneId = null;
      }
      markDirty(state);
    },
    selectDocument(state, action: PayloadAction<string>) {
      state.selectedDocumentId = action.payload;
      state.manifest.activeDocumentId = action.payload;
      state.selectedSceneId = null;
    },
    addScene(
      state,
      action: PayloadAction<{
        documentId: string;
        beatIndex?: number;
        /** 지정 시 해당 order에 삽입 (이후 씬 order +1) */
        order?: number;
      }>,
    ) {
      const { documentId, beatIndex = 0, order: insertOrder } = action.payload;
      const ts = nowIso();
      const { beatIndex: bi, order } = reserveSceneOrder(
        state,
        documentId,
        beatIndex,
        insertOrder,
      );
      const scene: Scene = {
        id: createId('scene'),
        documentId,
        title: '',
        contentHtml: '',
        beatIndex: bi,
        order,
        tags: [],
        createdAt: ts,
        updatedAt: ts,
      };
      state.scenes.push(scene);
      state.selectedSceneId = scene.id;
      markDirty(state);
    },
    updateScene(
      state,
      action: PayloadAction<{
        id: string;
        title?: string;
        contentHtml?: string;
        beatIndex?: number;
        order?: number;
        tags?: string[];
      }>,
    ) {
      const scene = state.scenes.find((s) => s.id === action.payload.id);
      if (!scene) return;
      const { title, contentHtml, beatIndex, order, tags } = action.payload;
      if (title !== undefined) scene.title = title;
      if (contentHtml !== undefined) scene.contentHtml = contentHtml;
      if (beatIndex !== undefined) {
        scene.beatIndex = clampBeatIndex(beatIndex);
      }
      if (order !== undefined) scene.order = order;
      if (tags !== undefined) scene.tags = tags;
      scene.updatedAt = nowIso();
      markDirty(state);
    },
    deleteScene(state, action: PayloadAction<string>) {
      const id = action.payload;
      const scene = state.scenes.find((s) => s.id === id);
      if (!scene) return;
      const { documentId, beatIndex } = scene;
      state.trash.scenes.push({
        deletedAt: nowIso(),
        scene: { ...scene, tags: [...scene.tags] },
      });
      state.scenes = state.scenes.filter((s) => s.id !== id);
      if (state.selectedSceneId === id) state.selectedSceneId = null;
      renumberBeat(state, documentId, beatIndex);
      markDirty(state);
    },
    selectScene(state, action: PayloadAction<string | null>) {
      const nextId = action.payload;
      const prevId = state.selectedSceneId;
      if (prevId && prevId !== nextId) {
        discardEmptyScene(state, prevId);
      }
      state.selectedSceneId = nextId;
    },
    nudgeScene(
      state,
      action: PayloadAction<{
        id: string;
        dir: 'top' | 'up' | 'down' | 'bottom' | 'left' | 'right';
      }>,
    ) {
      const scene = state.scenes.find((s) => s.id === action.payload.id);
      if (!scene) return;
      const { dir } = action.payload;
      const docId = scene.documentId;

      if (dir === 'left' || dir === 'right') {
        const delta = dir === 'left' ? -1 : 1;
        const nextBeat = clampBeatIndex(scene.beatIndex + delta);
        if (nextBeat === scene.beatIndex) return;
        const oldBeat = scene.beatIndex;
        scene.beatIndex = nextBeat;
        const dest = state.scenes.filter(
          (s) =>
            s.documentId === docId &&
            s.beatIndex === nextBeat &&
            s.id !== scene.id,
        );
        scene.order = dest.length;
        scene.updatedAt = nowIso();
        renumberBeat(state, docId, oldBeat);
        renumberBeat(state, docId, nextBeat);
        markDirty(state);
        return;
      }

      const siblings = state.scenes
        .filter(
          (s) => s.documentId === docId && s.beatIndex === scene.beatIndex,
        )
        .sort((a, b) => a.order - b.order);
      const idx = siblings.findIndex((s) => s.id === scene.id);
      if (idx < 0) return;

      let next = [...siblings];
      if (dir === 'top' && idx > 0) {
        next = [scene, ...siblings.filter((s) => s.id !== scene.id)];
      } else if (dir === 'bottom' && idx < siblings.length - 1) {
        next = [...siblings.filter((s) => s.id !== scene.id), scene];
      } else if (dir === 'up' && idx > 0) {
        next = [...siblings];
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      } else if (dir === 'down' && idx < siblings.length - 1) {
        next = [...siblings];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      } else {
        return;
      }
      next.forEach((s, i) => {
        s.order = i;
        s.updatedAt = nowIso();
      });
      markDirty(state);
    },
    placeScene(
      state,
      action: PayloadAction<{ id: string; beatIndex: number; order: number }>,
    ) {
      const scene = state.scenes.find((s) => s.id === action.payload.id);
      if (!scene) return;
      const oldBeat = scene.beatIndex;
      const nextBeat = clampBeatIndex(action.payload.beatIndex);
      const docId = scene.documentId;

      const others = state.scenes
        .filter(
          (s) =>
            s.documentId === docId &&
            s.beatIndex === nextBeat &&
            s.id !== scene.id,
        )
        .sort((a, b) => a.order - b.order);

      const insertAt = Math.min(
        Math.max(0, action.payload.order),
        others.length,
      );
      scene.beatIndex = nextBeat;
      others.splice(insertAt, 0, scene);
      others.forEach((s, i) => {
        s.order = i;
        s.updatedAt = nowIso();
      });
      if (oldBeat !== nextBeat) {
        renumberBeat(state, docId, oldBeat);
      }
      markDirty(state);
    },
    addReference(state, action: PayloadAction<{ order?: number } | undefined>) {
      const ts = nowIso();
      const insertOrder = action.payload?.order;
      let order = state.references.length;
      if (insertOrder !== undefined) {
        order = Math.min(
          state.references.length,
          Math.max(0, Math.floor(insertOrder)),
        );
        for (const r of state.references) {
          if (r.order >= order) r.order += 1;
        }
      }
      const ref: ReferenceNote = {
        id: createId('ref'),
        title: '',
        contentHtml: '',
        tags: [],
        order,
        createdAt: ts,
        updatedAt: ts,
      };
      state.references.push(ref);
      state.selectedReferenceId = ref.id;
      markDirty(state);
    },
    placeReference(
      state,
      action: PayloadAction<{ id: string; order: number }>,
    ) {
      const moving = state.references.find((r) => r.id === action.payload.id);
      if (!moving) return;
      const others = state.references
        .filter((r) => r.id !== action.payload.id)
        .sort((a, b) => a.order - b.order);
      const target = Math.min(
        others.length,
        Math.max(0, action.payload.order),
      );
      others.splice(target, 0, moving);
      others.forEach((r, i) => {
        r.order = i;
      });
      moving.updatedAt = nowIso();
      markDirty(state);
    },
    nudgeReference(
      state,
      action: PayloadAction<{ id: string; dir: 'top' | 'up' | 'down' | 'bottom' }>,
    ) {
      const list = [...state.references].sort((a, b) => a.order - b.order);
      const idx = list.findIndex((r) => r.id === action.payload.id);
      if (idx < 0) return;
      const item = list[idx];
      list.splice(idx, 1);
      let next = idx;
      switch (action.payload.dir) {
        case 'top':
          next = 0;
          break;
        case 'up':
          next = Math.max(0, idx - 1);
          break;
        case 'down':
          next = Math.min(list.length, idx + 1);
          break;
        case 'bottom':
          next = list.length;
          break;
      }
      list.splice(next, 0, item);
      list.forEach((r, i) => {
        r.order = i;
      });
      item.updatedAt = nowIso();
      markDirty(state);
    },
    updateReference(
      state,
      action: PayloadAction<{
        id: string;
        title?: string;
        contentHtml?: string;
        tags?: string[];
      }>,
    ) {
      const ref = state.references.find((r) => r.id === action.payload.id);
      if (!ref) return;
      if (action.payload.title !== undefined) ref.title = action.payload.title;
      if (action.payload.contentHtml !== undefined) {
        ref.contentHtml = action.payload.contentHtml;
      }
      if (action.payload.tags !== undefined) ref.tags = action.payload.tags;
      ref.updatedAt = nowIso();
      markDirty(state);
    },
    deleteReference(state, action: PayloadAction<string>) {
      const ref = state.references.find((r) => r.id === action.payload);
      if (!ref) return;
      state.trash.references.push({
        deletedAt: nowIso(),
        reference: { ...ref, tags: [...ref.tags] },
      });
      state.references = state.references.filter((r) => r.id !== action.payload);
      if (state.selectedReferenceId === action.payload) {
        state.selectedReferenceId = null;
      }
      ensureReferenceOrders(state);
      markDirty(state);
    },
    /** 참고 → 씬 (이동). 참고 제거 후 활성 문서 비트에 삽입 */
    convertReferenceToScene(
      state,
      action: PayloadAction<{
        refId: string;
        beatIndex: number;
        order?: number;
      }>,
    ) {
      const docId = state.selectedDocumentId;
      if (!docId) return;
      const idx = state.references.findIndex((r) => r.id === action.payload.refId);
      if (idx < 0) return;
      const [ref] = state.references.splice(idx, 1);
      if (state.selectedReferenceId === ref.id) state.selectedReferenceId = null;
      ensureReferenceOrders(state);

      const { beatIndex: bi, order } = reserveSceneOrder(
        state,
        docId,
        action.payload.beatIndex,
        action.payload.order,
      );
      state.scenes.push(
        buildSceneFromReference(ref, docId, bi, order, {
          preserveCreatedAt: true,
        }),
      );
      // 드래그 이동 직후 모달이 열리지 않도록 선택하지 않음
      markDirty(state);
    },
    /** 씬 → 참고 (이동) */
    convertSceneToReference(
      state,
      action: PayloadAction<{ sceneId: string; order?: number }>,
    ) {
      const idx = state.scenes.findIndex((s) => s.id === action.payload.sceneId);
      if (idx < 0) return;
      const [scene] = state.scenes.splice(idx, 1);
      if (state.selectedSceneId === scene.id) state.selectedSceneId = null;
      renumberBeat(state, scene.documentId, scene.beatIndex);

      const order = reserveReferenceOrder(state, action.payload.order);
      state.references.push(
        buildReferenceFromScene(scene, order, { preserveCreatedAt: true }),
      );
      markDirty(state);
    },
    /** 씬 → 참고 복사 (원본 유지) */
    copySceneToReference(state, action: PayloadAction<{ sceneId: string }>) {
      const scene = state.scenes.find((s) => s.id === action.payload.sceneId);
      if (!scene) return;
      state.references.push(
        buildReferenceFromScene(scene, state.references.length, {
          preserveCreatedAt: false,
        }),
      );
      markDirty(state);
    },
    /** 참고 → 씬 복사 (원본 유지) */
    copyReferenceToScene(
      state,
      action: PayloadAction<{ refId: string; beatIndex: number }>,
    ) {
      const docId = state.selectedDocumentId;
      if (!docId) return;
      const ref = state.references.find((r) => r.id === action.payload.refId);
      if (!ref) return;
      const { beatIndex: bi, order } = reserveSceneOrder(
        state,
        docId,
        action.payload.beatIndex,
      );
      state.scenes.push(
        buildSceneFromReference(ref, docId, bi, order, {
          preserveCreatedAt: false,
        }),
      );
      markDirty(state);
    },
    /** 활성 프로젝트 trash 항목 복원 (project kind는 projectConnection에서 처리) */
    restoreTrashItem(
      state,
      action: PayloadAction<{ kind: TrashKind; id: string }>,
    ) {
      const { kind, id } = action.payload;
      if (kind === 'project') return;

      if (kind === 'scene') {
        const idx = state.trash.scenes.findIndex((t) => t.scene.id === id);
        if (idx < 0) return;
        const [item] = state.trash.scenes.splice(idx, 1);
        const scene = { ...item.scene, tags: [...item.scene.tags] };
        const docExists = state.documents.some((d) => d.id === scene.documentId);
        if (!docExists) {
          // 문서가 없으면 첫 문서로 귀속
          if (!state.documents[0]) {
            state.trash.scenes.push(item);
            return;
          }
          scene.documentId = state.documents[0].id;
        }
        const siblings = state.scenes.filter(
          (s) =>
            s.documentId === scene.documentId && s.beatIndex === scene.beatIndex,
        );
        scene.order = siblings.length;
        state.scenes.push(scene);
        markDirty(state);
        return;
      }

      if (kind === 'reference') {
        const idx = state.trash.references.findIndex(
          (t) => t.reference.id === id,
        );
        if (idx < 0) return;
        const [item] = state.trash.references.splice(idx, 1);
        const ref = { ...item.reference, tags: [...item.reference.tags] };
        ref.order = state.references.length;
        state.references.push(ref);
        ensureReferenceOrders(state);
        markDirty(state);
        return;
      }

      if (kind === 'documentBundle') {
        const idx = state.trash.bundles.findIndex((t) => t.document.id === id);
        if (idx < 0) return;
        const [item] = state.trash.bundles.splice(idx, 1);
        const doc = { ...item.document };
        doc.order = state.documents.length;
        state.documents.push(doc);
        for (const s of item.scenes) {
          state.scenes.push({ ...s, tags: [...s.tags] });
        }
        markDirty(state);
      }
    },
    /** 활성 프로젝트 trash 항목 영구 삭제 (디스크는 saveAll prune) */
    purgeTrashItem(
      state,
      action: PayloadAction<{ kind: TrashKind; id: string }>,
    ) {
      const { kind, id } = action.payload;
      if (kind === 'project') return;
      if (kind === 'scene') {
        state.trash.scenes = state.trash.scenes.filter((t) => t.scene.id !== id);
      } else if (kind === 'reference') {
        state.trash.references = state.trash.references.filter(
          (t) => t.reference.id !== id,
        );
      } else if (kind === 'documentBundle') {
        state.trash.bundles = state.trash.bundles.filter(
          (t) => t.document.id !== id,
        );
      }
      markDirty(state);
    },
    clearProjectTrash(state) {
      state.trash = emptyProjectTrash();
      markDirty(state);
    },
    selectReference(state, action: PayloadAction<string | null>) {
      const nextId = action.payload;
      const prevId = state.selectedReferenceId;
      if (prevId && prevId !== nextId) {
        discardEmptyReference(state, prevId);
      }
      state.selectedReferenceId = nextId;
    },
    setCenterTagFilter(state, action: PayloadAction<string[]>) {
      state.centerTagFilter = action.payload;
    },
    setReferenceTagFilter(state, action: PayloadAction<string[]>) {
      state.referenceTagFilter = action.payload;
    },
    setCenterSearchQuery(state, action: PayloadAction<string>) {
      state.centerSearchQuery = action.payload;
    },
    setReferenceSearchQuery(state, action: PayloadAction<string>) {
      state.referenceSearchQuery = action.payload;
    },
    /** 문서 씬들에서 태그 제거 (필터 X / 일괄 삭제) */
    purgeSceneTag(
      state,
      action: PayloadAction<{ tag: string; documentId?: string | null }>,
    ) {
      const needle = action.payload.tag.replace(/^#/, '').trim();
      if (!needle) return;
      let changed = false;
      for (const scene of state.scenes) {
        if (
          action.payload.documentId &&
          scene.documentId !== action.payload.documentId
        ) {
          continue;
        }
        const next = scene.tags.filter(
          (t) => t.replace(/^#/, '') !== needle,
        );
        if (next.length !== scene.tags.length) {
          scene.tags = next;
          scene.updatedAt = nowIso();
          changed = true;
        }
      }
      if (state.centerTagFilter.some((t) => t.replace(/^#/, '') === needle)) {
        state.centerTagFilter = state.centerTagFilter.filter(
          (t) => t.replace(/^#/, '') !== needle,
        );
      }
      if (changed) markDirty(state);
    },
    /** 참고 메모들에서 태그 제거 */
    purgeReferenceTag(state, action: PayloadAction<string>) {
      const needle = action.payload.replace(/^#/, '').trim();
      if (!needle) return;
      let changed = false;
      for (const ref of state.references) {
        const next = ref.tags.filter((t) => t.replace(/^#/, '') !== needle);
        if (next.length !== ref.tags.length) {
          ref.tags = next;
          ref.updatedAt = nowIso();
          changed = true;
        }
      }
      if (
        state.referenceTagFilter.some((t) => t.replace(/^#/, '') === needle)
      ) {
        state.referenceTagFilter = state.referenceTagFilter.filter(
          (t) => t.replace(/^#/, '') !== needle,
        );
      }
      if (changed) markDirty(state);
    },
    setReferenceDrawerOpen(state, action: PayloadAction<boolean>) {
      state.referenceDrawerOpen = action.payload;
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
      writeSidebarCollapsed(action.payload);
    },
    toggleSidebarCollapsed(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      writeSidebarCollapsed(state.sidebarCollapsed);
    },
    setSaveStatus(state, action: PayloadAction<SaveStatus>) {
      state.saveStatus = action.payload;
    },
    setFocusBeatIndex(state, action: PayloadAction<number | null>) {
      state.focusBeatIndex = action.payload;
    },
    setStorageMode(
      state,
      action: PayloadAction<'none' | 'folder'>,
    ) {
      state.storageMode = action.payload;
      if (action.payload === 'folder') state.saveStatus = 'saved';
      if (action.payload === 'none') state.saveStatus = 'no-folder';
    },
  },
});

function markDirty(state: ProjectState) {
  if (state.storageMode === 'folder') {
    state.saveStatus = 'dirty';
  }
}

function discardEmptyScene(state: ProjectState, sceneId: string) {
  const scene = state.scenes.find((s) => s.id === sceneId);
  if (!scene || !isEmptyNote(scene.title, scene.contentHtml)) return;
  const { documentId, beatIndex } = scene;
  state.scenes = state.scenes.filter((s) => s.id !== sceneId);
  renumberBeat(state, documentId, beatIndex);
  markDirty(state);
}

function discardEmptyReference(state: ProjectState, referenceId: string) {
  const ref = state.references.find((r) => r.id === referenceId);
  if (!ref || !isEmptyNote(ref.title, ref.contentHtml)) return;
  state.references = state.references.filter((r) => r.id !== referenceId);
  ensureReferenceOrders(state);
  markDirty(state);
}

function ensureReferenceOrders(state: ProjectState) {
  const sorted = [...state.references].sort((a, b) => {
    const ao = typeof a.order === 'number' ? a.order : Number.POSITIVE_INFINITY;
    const bo = typeof b.order === 'number' ? b.order : Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return a.createdAt.localeCompare(b.createdAt);
  });
  sorted.forEach((r, i) => {
    r.order = i;
  });
  state.references = sorted;
}

function renumberBeat(
  state: ProjectState,
  documentId: string,
  beatIndex: number,
) {
  state.scenes
    .filter((s) => s.documentId === documentId && s.beatIndex === beatIndex)
    .sort((a, b) => a.order - b.order)
    .forEach((s, i) => {
      s.order = i;
    });
}

export const {
  resetProject,
  hydrateProject,
  setWorkspaceFolderName,
  setConnectedProjects,
  upsertConnectedProject,
  removeConnectedProject,
  setActiveConnectedProjectId,
  setTrashedProjects,
  setTrashPanelOpen,
  setTrashSortBy,
  setProjectTitle,
  addDocument,
  renameDocument,
  deleteDocument,
  selectDocument,
  addScene,
  updateScene,
  deleteScene,
  selectScene,
  nudgeScene,
  placeScene,
  addReference,
  placeReference,
  nudgeReference,
  updateReference,
  deleteReference,
  convertReferenceToScene,
  convertSceneToReference,
  copySceneToReference,
  copyReferenceToScene,
  restoreTrashItem,
  purgeTrashItem,
  clearProjectTrash,
  selectReference,
  setCenterTagFilter,
  setReferenceTagFilter,
  setCenterSearchQuery,
  setReferenceSearchQuery,
  purgeSceneTag,
  purgeReferenceTag,
  setReferenceDrawerOpen,
  setSidebarCollapsed,
  toggleSidebarCollapsed,
  setSaveStatus,
  setFocusBeatIndex,
  setStorageMode,
} = projectSlice.actions;

export default projectSlice.reducer;
