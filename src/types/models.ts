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

export const SCHEMA_VERSION = 1;
export const BEAT_COUNT = 15;
