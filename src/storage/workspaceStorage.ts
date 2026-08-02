/// <reference lib="dom" />

import type {
  Manifest,
  ProjectInfo,
  TrashedProject,
  WorkspaceManifest,
  WorkspaceProjectSummary,
} from '../types/models';
import { SCHEMA_VERSION } from '../types/models';
import { createId, nowIso } from '../utils/id';
import {
  copyDirectory,
  dirExists,
  ensureDir,
  fileExists,
  listDirectoryNames,
  listJsonFiles,
  readJson,
  removeDirectoryRecursive,
  writeJson,
} from './fsHelpers';
import { createEmptyProjectSnapshot } from './createEmpty';
import { FolderStorage } from './folderStorage';
import type { ProjectSnapshot } from './types';

function emptyWorkspaceManifest(): WorkspaceManifest {
  return {
    schemaVersion: SCHEMA_VERSION,
    activeProjectId: null,
    projects: [],
  };
}

/**
 * 워크스페이스 루트 폴더 관리.
 * {workspace}/workspace.json + projects/{id}/ + trash/projects/{id}/
 */
export class WorkspaceStorage {
  private root: FileSystemDirectoryHandle;

  constructor(root: FileSystemDirectoryHandle) {
    this.root = root;
  }

  get directoryHandle(): FileSystemDirectoryHandle {
    return this.root;
  }

  get folderName(): string {
    return this.root.name;
  }

  static fromHandle(root: FileSystemDirectoryHandle): WorkspaceStorage {
    return new WorkspaceStorage(root);
  }

  static async pick(): Promise<WorkspaceStorage | null> {
    const picker = window.showDirectoryPicker;
    if (!picker) return null;
    const root = await picker({ mode: 'readwrite' });
    return new WorkspaceStorage(root);
  }

  /** 레거시 단일 프로젝트 폴더 → 워크스페이스 구조로 마이그레이션 */
  async ensureWorkspaceLayout(): Promise<WorkspaceManifest> {
    const hasWorkspace = await fileExists(this.root, 'workspace.json');
    if (hasWorkspace) {
      // workspace.json만 있고 projects/에 빠진 항목·루트 레거시 잔여를 정리
      await this.migrateLeftoverLegacyRoot();
      return this.reconcileProjectsFromDisk();
    }

    const hasLegacyManifest = await fileExists(this.root, 'manifest.json');
    if (hasLegacyManifest) {
      return this.migrateLegacyProjectFolder();
    }

    // 빈 폴더 또는 미초기화
    const ws = emptyWorkspaceManifest();
    await writeJson(this.root, 'workspace.json', ws);
    await ensureDir(this.root, 'projects');
    await ensureDir(this.root, 'trash');
    return ws;
  }

  /**
   * projects/ 디스크 폴더를 스캔해 workspace.json 목록에 없는 프로젝트를 편입한다.
   * (반쯤 마이그레이션된 폴더·수동 복사본 복구용)
   */
  async reconcileProjectsFromDisk(): Promise<WorkspaceManifest> {
    const ws = await this.loadWorkspaceManifest();
    await ensureDir(this.root, 'projects');
    await ensureDir(this.root, 'trash');

    let projectsDir: FileSystemDirectoryHandle;
    try {
      projectsDir = await this.root.getDirectoryHandle('projects');
    } catch {
      return ws;
    }

    const onDisk = await listDirectoryNames(projectsDir);
    const known = new Set(ws.projects.map((p) => p.id));
    let changed = false;

    for (const name of onDisk) {
      if (known.has(name)) continue;
      try {
        const dir = await projectsDir.getDirectoryHandle(name);
        const manifest = await readJson<Manifest>(dir, 'manifest.json');
        if (!manifest?.project?.id) continue;
        const id = manifest.project.id;
        // 폴더명과 manifest id가 다르면 폴더명을 기준으로 목록에 넣되 id는 manifest 따름
        if (ws.projects.some((p) => p.id === id)) continue;
        ws.projects.push({
          id,
          title: manifest.project.title,
          createdAt: manifest.project.createdAt,
          updatedAt: manifest.project.updatedAt,
        });
        known.add(id);
        changed = true;
      } catch {
        /* skip */
      }
    }

    // 목록에는 있으나 디스크에 없는 항목 제거
    const diskIds = new Set<string>();
    for (const name of onDisk) {
      try {
        const dir = await projectsDir.getDirectoryHandle(name);
        const manifest = await readJson<Manifest>(dir, 'manifest.json');
        if (manifest?.project?.id) diskIds.add(manifest.project.id);
        else diskIds.add(name);
      } catch {
        /* skip */
      }
    }
    const before = ws.projects.length;
    ws.projects = ws.projects.filter((p) => diskIds.has(p.id));
    if (ws.projects.length !== before) changed = true;

    if (
      ws.activeProjectId &&
      !ws.projects.some((p) => p.id === ws.activeProjectId)
    ) {
      ws.activeProjectId = ws.projects[0]?.id ?? null;
      changed = true;
    }
    if (!ws.activeProjectId && ws.projects[0]) {
      ws.activeProjectId = ws.projects[0].id;
      changed = true;
    }

    if (changed) await this.saveWorkspaceManifest(ws);
    return this.loadWorkspaceManifest();
  }

  /**
   * workspace.json이 이미 있는데 루트에 예전 단일 프로젝트 파일이 남은 경우
   * projects/{id}/ 로 옮기고 목록에 합친다.
   */
  private async migrateLeftoverLegacyRoot(): Promise<void> {
    const hasLegacyManifest = await fileExists(this.root, 'manifest.json');
    if (!hasLegacyManifest) return;

    const legacyManifest = await readJson<Manifest>(this.root, 'manifest.json');
    if (!legacyManifest?.project) return;

    const projectId = legacyManifest.project.id || createId('proj');
    const projectsDir = await ensureDir(this.root, 'projects');

    // 이미 동일 id 프로젝트가 있으면 루트 잔여만 정리(덮어쓰지 않음)
    const existing = await this.getProjectDirectory(projectId);
    if (existing) {
      await this.removeLegacyRootEntries();
      return;
    }

    const projectDir = await ensureDir(projectsDir, projectId);
    // 루트 trash/ 는 워크스페이스 휴지통(trash/projects)일 수 있어 기본 이동 목록에서 제외
    const moveNames = [
      'manifest.json',
      'documents',
      'scenes',
      'references',
      'assets',
      'beats',
    ];
    for (const name of moveNames) {
      await this.moveRootEntryIntoProject(projectDir, name);
    }
    // 프로젝트형 trash(scenes|references|bundles)만 이동. trash/projects 는 유지
    await this.moveLegacyProjectTrashIfPresent(projectDir);

    legacyManifest.schemaVersion = SCHEMA_VERSION;
    legacyManifest.project.id = projectId;
    await writeJson(projectDir, 'manifest.json', legacyManifest);
  }

  private async moveRootEntryIntoProject(
    projectDir: FileSystemDirectoryHandle,
    name: string,
  ): Promise<void> {
    try {
      const fileHandle = await this.root.getFileHandle(name).catch(() => null);
      if (fileHandle) {
        const file = await fileHandle.getFile();
        const dest = await projectDir.getFileHandle(name, { create: true });
        const writable = await dest.createWritable();
        await writable.write(await file.arrayBuffer());
        await writable.close();
        await this.root.removeEntry(name);
        return;
      }
    } catch {
      /* not a file */
    }
    try {
      const dirHandle = await this.root.getDirectoryHandle(name);
      const dest = await projectDir.getDirectoryHandle(name, { create: true });
      await copyDirectory(dirHandle, dest);
      await removeDirectoryRecursive(this.root, name);
    } catch {
      /* missing */
    }
  }

  private async moveLegacyProjectTrashIfPresent(
    projectDir: FileSystemDirectoryHandle,
  ): Promise<void> {
    let trashRoot: FileSystemDirectoryHandle;
    try {
      trashRoot = await this.root.getDirectoryHandle('trash');
    } catch {
      return;
    }
    const names = await listDirectoryNames(trashRoot);
    // 워크스페이스 휴지통이면 건드리지 않음
    if (names.includes('projects')) return;

    const looksLikeProjectTrash = names.some((n) =>
      ['scenes', 'references', 'bundles'].includes(n),
    );
    if (!looksLikeProjectTrash) return;

    const dest = await projectDir.getDirectoryHandle('trash', { create: true });
    await copyDirectory(trashRoot, dest);
    await removeDirectoryRecursive(this.root, 'trash');
  }

  /** 이미 projects/{id}가 있을 때 루트에 남은 레거시 파일만 제거 (워크스페이스 trash 유지) */
  private async removeLegacyRootEntries(): Promise<void> {
    for (const name of [
      'manifest.json',
      'documents',
      'scenes',
      'references',
      'assets',
      'beats',
    ]) {
      try {
        await this.root.removeEntry(name, { recursive: true });
      } catch {
        try {
          await this.root.removeEntry(name);
        } catch {
          /* missing */
        }
      }
    }
  }

  private async migrateLegacyProjectFolder(): Promise<WorkspaceManifest> {
    const legacyManifest = await readJson<Manifest>(this.root, 'manifest.json');
    if (!legacyManifest) {
      const ws = emptyWorkspaceManifest();
      await writeJson(this.root, 'workspace.json', ws);
      return ws;
    }

    const projectId = legacyManifest.project?.id || createId('proj');
    const projectsDir = await ensureDir(this.root, 'projects');
    const projectDir = await ensureDir(projectsDir, projectId);

    // 레거시 루트 항목을 프로젝트 하위로 이동
    const moveNames = [
      'manifest.json',
      'documents',
      'scenes',
      'references',
      'assets',
      'beats',
      'trash',
    ];
    for (const name of moveNames) {
      try {
        const fileHandle = await this.root.getFileHandle(name).catch(() => null);
        if (fileHandle) {
          const file = await fileHandle.getFile();
          const dest = await projectDir.getFileHandle(name, { create: true });
          const writable = await dest.createWritable();
          await writable.write(await file.arrayBuffer());
          await writable.close();
          await this.root.removeEntry(name);
          continue;
        }
      } catch {
        /* not a file */
      }
      try {
        const dirHandle = await this.root.getDirectoryHandle(name);
        const dest = await projectDir.getDirectoryHandle(name, {
          create: true,
        });
        await copyDirectory(dirHandle, dest);
        await removeDirectoryRecursive(this.root, name);
      } catch {
        /* missing */
      }
    }

    legacyManifest.schemaVersion = SCHEMA_VERSION;
    legacyManifest.project.id = projectId;
    await writeJson(projectDir, 'manifest.json', legacyManifest);

    const summary: WorkspaceProjectSummary = {
      id: projectId,
      title: legacyManifest.project.title,
      createdAt: legacyManifest.project.createdAt,
      updatedAt: legacyManifest.project.updatedAt,
    };
    const ws: WorkspaceManifest = {
      schemaVersion: SCHEMA_VERSION,
      activeProjectId: projectId,
      projects: [summary],
    };
    await writeJson(this.root, 'workspace.json', ws);
    await ensureDir(this.root, 'trash');
    return ws;
  }

  async loadWorkspaceManifest(): Promise<WorkspaceManifest> {
    const ws =
      (await readJson<WorkspaceManifest>(this.root, 'workspace.json')) ??
      emptyWorkspaceManifest();
    if (!ws.schemaVersion) ws.schemaVersion = SCHEMA_VERSION;
    if (!Array.isArray(ws.projects)) ws.projects = [];
    return ws;
  }

  async saveWorkspaceManifest(ws: WorkspaceManifest): Promise<void> {
    await writeJson(this.root, 'workspace.json', {
      ...ws,
      schemaVersion: SCHEMA_VERSION,
    });
  }

  async getProjectDirectory(
    projectId: string,
  ): Promise<FileSystemDirectoryHandle | null> {
    try {
      const projectsDir = await this.root.getDirectoryHandle('projects');
      return await projectsDir.getDirectoryHandle(projectId);
    } catch {
      return null;
    }
  }

  async openProjectStorage(projectId: string): Promise<FolderStorage | null> {
    const dir = await this.getProjectDirectory(projectId);
    if (!dir) return null;
    return FolderStorage.fromHandle(dir);
  }

  async createProject(
    snapshot?: ProjectSnapshot,
  ): Promise<{ summary: WorkspaceProjectSummary; snapshot: ProjectSnapshot }> {
    const snap = snapshot ?? createEmptyProjectSnapshot();
    const projectId = snap.manifest.project.id;
    const projectsDir = await ensureDir(this.root, 'projects');
    const projectDir = await ensureDir(projectsDir, projectId);
    const storage = FolderStorage.fromHandle(projectDir);
    await storage.saveAll(snap);

    const summary: WorkspaceProjectSummary = {
      id: projectId,
      title: snap.manifest.project.title,
      createdAt: snap.manifest.project.createdAt,
      updatedAt: snap.manifest.project.updatedAt,
    };

    const ws = await this.loadWorkspaceManifest();
    if (!ws.projects.some((p) => p.id === projectId)) {
      ws.projects.push(summary);
    }
    ws.activeProjectId = projectId;
    await this.saveWorkspaceManifest(ws);

    return { summary, snapshot: snap };
  }

  async updateProjectSummary(
    projectId: string,
    patch: Partial<Pick<WorkspaceProjectSummary, 'title' | 'updatedAt'>>,
  ): Promise<void> {
    const ws = await this.loadWorkspaceManifest();
    const entry = ws.projects.find((p) => p.id === projectId);
    if (!entry) return;
    if (patch.title !== undefined) entry.title = patch.title;
    if (patch.updatedAt !== undefined) entry.updatedAt = patch.updatedAt;
    else entry.updatedAt = nowIso();
    await this.saveWorkspaceManifest(ws);
  }

  async setActiveProjectId(projectId: string | null): Promise<void> {
    const ws = await this.loadWorkspaceManifest();
    ws.activeProjectId = projectId;
    await this.saveWorkspaceManifest(ws);
  }

  /** 프로젝트를 워크스페이스 휴지통으로 이동 */
  async moveProjectToTrash(projectId: string): Promise<TrashedProject | null> {
    const projectsDir = await ensureDir(this.root, 'projects');
    let projectDir: FileSystemDirectoryHandle;
    try {
      projectDir = await projectsDir.getDirectoryHandle(projectId);
    } catch {
      return null;
    }

    const storage = FolderStorage.fromHandle(projectDir);
    const snap = await storage.load();
    const deletedAt = nowIso();
    const trashed: TrashedProject = {
      deletedAt,
      project: snap.manifest.project,
    };

    const trashRoot = await ensureDir(this.root, 'trash');
    const trashProjects = await ensureDir(trashRoot, 'projects');
    // 기존 trash에 있으면 제거 후 재복사
    await removeDirectoryRecursive(trashProjects, projectId);
    const dest = await ensureDir(trashProjects, projectId);
    await copyDirectory(projectDir, dest);
    await writeJson(dest, '_trash_meta.json', { deletedAt });
    await removeDirectoryRecursive(projectsDir, projectId);

    const ws = await this.loadWorkspaceManifest();
    ws.projects = ws.projects.filter((p) => p.id !== projectId);
    if (ws.activeProjectId === projectId) {
      ws.activeProjectId = ws.projects[0]?.id ?? null;
    }
    await this.saveWorkspaceManifest(ws);

    return trashed;
  }

  async listTrashedProjects(): Promise<TrashedProject[]> {
    const trashRoot = await ensureDir(this.root, 'trash');
    const trashProjects = await ensureDir(trashRoot, 'projects');
    const names = await listDirectoryNames(trashProjects);
    const result: TrashedProject[] = [];
    for (const name of names) {
      try {
        const dir = await trashProjects.getDirectoryHandle(name);
        const manifest = await readJson<Manifest>(dir, 'manifest.json');
        const meta = await readJson<{ deletedAt: string }>(
          dir,
          '_trash_meta.json',
        );
        if (!manifest?.project) continue;
        result.push({
          deletedAt: meta?.deletedAt ?? nowIso(),
          project: manifest.project,
        });
      } catch {
        /* skip */
      }
    }
    return result;
  }

  async restoreProjectFromTrash(
    projectId: string,
  ): Promise<WorkspaceProjectSummary | null> {
    const trashRoot = await ensureDir(this.root, 'trash');
    const trashProjects = await ensureDir(trashRoot, 'projects');
    let source: FileSystemDirectoryHandle;
    try {
      source = await trashProjects.getDirectoryHandle(projectId);
    } catch {
      return null;
    }

    const projectsDir = await ensureDir(this.root, 'projects');
    await removeDirectoryRecursive(projectsDir, projectId);
    const dest = await ensureDir(projectsDir, projectId);
    await copyDirectory(source, dest);
    try {
      await dest.removeEntry('_trash_meta.json');
    } catch {
      /* ok */
    }
    await removeDirectoryRecursive(trashProjects, projectId);

    const storage = FolderStorage.fromHandle(dest);
    const snap = await storage.load();
    const summary: WorkspaceProjectSummary = {
      id: snap.manifest.project.id,
      title: snap.manifest.project.title,
      createdAt: snap.manifest.project.createdAt,
      updatedAt: snap.manifest.project.updatedAt,
    };

    const ws = await this.loadWorkspaceManifest();
    if (!ws.projects.some((p) => p.id === summary.id)) {
      ws.projects.push(summary);
    }
    ws.activeProjectId = summary.id;
    await this.saveWorkspaceManifest(ws);
    return summary;
  }

  async purgeTrashedProject(projectId: string): Promise<void> {
    const trashRoot = await ensureDir(this.root, 'trash');
    const trashProjects = await ensureDir(trashRoot, 'projects');
    await removeDirectoryRecursive(trashProjects, projectId);
  }

  /** 워크스페이스 휴지통(삭제된 프로젝트) + 활성 프로젝트 내부 trash를 모두 영구 삭제하려면 호출측에서 조합 */
  async emptyWorkspaceProjectTrash(): Promise<void> {
    const trashRoot = await ensureDir(this.root, 'trash');
    const trashProjects = await ensureDir(trashRoot, 'projects');
    for (const name of await listDirectoryNames(trashProjects)) {
      await removeDirectoryRecursive(trashProjects, name);
    }
  }

  /** 프로젝트 내부 trash 디렉터리 비우기 */
  async emptyProjectItemTrash(projectId: string): Promise<void> {
    const projectDir = await this.getProjectDirectory(projectId);
    if (!projectDir) return;
    await removeDirectoryRecursive(projectDir, 'trash');
    await ensureDir(projectDir, 'trash');
  }

  async hasAnyContent(): Promise<boolean> {
    if (await fileExists(this.root, 'workspace.json')) return true;
    if (await fileExists(this.root, 'manifest.json')) return true;
    if (await dirExists(this.root, 'projects')) {
      const projects = await this.root.getDirectoryHandle('projects');
      const names = await listDirectoryNames(projects);
      if (names.length > 0) return true;
    }
    // documents at root = legacy
    if (await dirExists(this.root, 'documents')) {
      const docs = await this.root.getDirectoryHandle('documents');
      if ((await listJsonFiles(docs)).length > 0) return true;
    }
    return false;
  }
}

export function projectInfoToSummary(
  project: ProjectInfo,
): WorkspaceProjectSummary {
  return {
    id: project.id,
    title: project.title,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}
