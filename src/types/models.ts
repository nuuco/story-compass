export interface ProjectInfo {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Manifest {
  schemaVersion: number;
  project: ProjectInfo;
  activeDocumentId: string | null;
}

export interface WorkspaceProjectSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/** 워크스페이스 루트 workspace.json */
export interface WorkspaceManifest {
  schemaVersion: number;
  activeProjectId: string | null;
  projects: WorkspaceProjectSummary[];
}

export interface DocumentMeta {
  id: string;
  title: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/** 과제 Note에 대응 */
export interface Scene {
  id: string;
  documentId: string;
  title: string;
  contentHtml: string;
  beatIndex: number;
  order: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReferenceNote {
  id: string;
  title: string;
  contentHtml: string;
  tags: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type TrashKind = 'scene' | 'reference' | 'documentBundle' | 'project';

/** 프로젝트 내부 휴지통 — 씬 */
export interface TrashedScene {
  deletedAt: string;
  scene: Scene;
}

/** 프로젝트 내부 휴지통 — 참고 메모 */
export interface TrashedReference {
  deletedAt: string;
  reference: ReferenceNote;
}

/** 프로젝트 내부 휴지통 — 문서+하위 씬 묶음 */
export interface TrashedDocumentBundle {
  deletedAt: string;
  document: DocumentMeta;
  scenes: Scene[];
}

export interface ProjectTrash {
  scenes: TrashedScene[];
  references: TrashedReference[];
  bundles: TrashedDocumentBundle[];
}

/** 워크스페이스 휴지통 — 삭제된 프로젝트 요약 */
export interface TrashedProject {
  deletedAt: string;
  project: ProjectInfo;
}

/** UI용 통합 휴지통 항목 */
export interface TrashListItem {
  id: string;
  kind: TrashKind;
  title: string;
  deletedAt: string;
  createdAt: string;
  /** 프로젝트 내부 항목일 때 소속 프로젝트 id */
  projectId?: string;
}

/** Save the Cat 교육용 비트 안내 — 원서 복제 아님 */
export interface BeatGuideItem {
  beatIndex: number;
  percentHint: number;
  nameKo: string;
  nameEn: string;
  /** RouteNav 등 짧은 한 줄 요약 */
  guidanceKo: string;
  /** 이 비트가 하는 일 */
  purposeKo: string;
  /** 상세 설명 */
  detailKo: string;
  /** 쓰기 팁 */
  tipsKo: string[];
  /** 피하면 좋은 함정 */
  avoidKo: string[];
  /** 스스로 점검할 질문 */
  promptsKo: string[];
}

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'no-folder';

export const SCHEMA_VERSION = 2;
export const BEAT_COUNT = 15;

export function emptyProjectTrash(): ProjectTrash {
  return { scenes: [], references: [], bundles: [] };
}
