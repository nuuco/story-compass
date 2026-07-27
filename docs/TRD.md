# TRD — 스토리나침반

Technical Requirements / Design Document. **어떻게 구현하는지** 정의한다.  
제품 비전은 [PRD.md](./PRD.md), 요구 명세는 [SRS.md](./SRS.md).

---

## 1. 기술 스택

| 항목 | 선택 |
|---|---|
| 생성 | Vite (`react-ts`) |
| UI | React 19, Tailwind CSS v4 |
| 언어 | TypeScript |
| 상태 | Redux Toolkit (`src/store/projectSlice.ts`) |
| 에디터 | Toast UI Editor WYSIWYG (`@toast-ui/editor`) |
| DnD | `@dnd-kit` |
| 저장 | File System Access API + JSZip |
| 폰트 | Pretendard, Material Symbols Rounded |
| 패키지 | npm |

### 실행 명령

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

---

## 2. 디렉터리 구조

| 경로 | 역할 |
|---|---|
| `src/components` | UI — 아래 주요 컴포넌트 |
| `src/store` | `projectSlice` — 프로젝트·씬·참고 원본 |
| `src/storage` | Folder/ZIP I/O, 디바운스, IndexedDB 핸들, 복원, prune |
| `src/hooks` | `useImeDraft` 등 |
| `src/data` | 15비트·막 가이드 데이터 |
| `src/theme` | ThemeProvider |
| `docs` | PRD / SRS / TRD · 하네스 로그 |

### 주요 컴포넌트

| 컴포넌트 | 역할 |
|---|---|
| `ExplorerSidebar` | 문서 트리·폴더/ZIP·사이드바 접기 |
| `RouteNav` | 제목·프로그레스·1·2·3막·마커 |
| `WorkspaceActions` | 저장 배지·테마·참고 토글 |
| `SceneKanban` / `SceneCard` | 15열 칸반·삽입·DnD·비트 툴팁 |
| `SceneKeepModal` / `ReferenceKeepModal` | 킵 스타일 편집 모달 |
| `ReferenceDrawer` | 참고 목록·검색·태그 |
| `RichTextEditor` | Toast UI 래퍼 |
| `SearchInput` / `TagFilter` / `TagChipsInput` | 검색·다중 태그 |
| `BeatGuideModal` | 비트 상세 안내 |
| `ConfirmDialog` / `NoteMenuPortal` | 삭제 확인·⋯ 메뉴 포털 |

진입: `src/main.tsx` → `src/App.tsx`

---

## 3. 데이터 모델

### 3.1 스키마

`manifest.schemaVersion = 1`

### 3.2 프로젝트 폴더 트리

```text
{project}/
  manifest.json
  documents/{documentId}.json
  scenes/{sceneId}.json
  references/{referenceId}.json
  assets/{assetId}.{ext}
  beats/guide.json
```

### 3.3 핵심 타입

```ts
interface Scene {
  id: string;
  documentId: string;
  title: string;
  contentHtml: string;
  beatIndex: number; // 0~14
  order: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface ReferenceNote {
  id: string;
  title: string;
  contentHtml: string;
  tags: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface BeatGuideItem {
  beatIndex: number;
  percentHint: number;
  nameKo: string;
  nameEn: string;
  guidanceKo: string;   // RouteNav·툴팁 요약
  purposeKo: string;
  detailKo: string;
  tipsKo: string[];
  avoidKo: string[];
  promptsKo: string[];  // 툴팁·모달 핵심 질문
}
```

문서·막 가이드 등 전체는 `src/types/models.ts`를 단일 소스로 한다.

### 3.4 Store vs 로컬

| 데이터 | 위치 |
|---|---|
| manifest, documents, scenes, references | Redux store |
| selectedSceneId, selectedDocumentId, selectedReferenceId | store |
| centerTagFilter / referenceTagFilter, centerSearchQuery / referenceSearchQuery | store |
| focusBeatIndex, referenceDrawerOpen, sidebarCollapsed | store |
| sidebarCollapsed 영속 | **LocalStorage** (UI 선호만 — 노트 원본 아님) |
| IME 입력 초안 | `useImeDraft` 로컬 |
| Toast UI 인스턴스 | 에디터 내부 (`contentHtml`만 store 동기화, remount 금지) |

원본을 store와 컴포넌트 state에 **중복 저장하지 않는다.**

### 3.5 검증

- `title.trim().length === 0` → 유효하지 않음
- `contentHtml` 빈값·빈 `<p></p>` 허용
- `beatIndex` 0~14
- 모달 닫을 때 제목·본문 모두 비면 `discardEmptyScene` / `discardEmptyReference`

---

## 4. 저장 아키텍처

| 어댑터 | 역할 |
|---|---|
| `FolderStorage` | 디렉터리 핸들로 JSON 트리 read/write |
| `ZipStorage` | JSZip 다운로드/업로드 폴백 |
| `handleStore` | **폴더 핸들만** IndexedDB에 영속화 (노트 원본 아님) |
| `restoreFolderConnection` | 앱 시작 시 핸들·권한·스냅샷 복원 |
| `autosave` | dirty 시 500ms 디바운스 `saveAll` |
| prune | 저장 시 store에 없는 documents/scenes/references JSON 삭제 |

인터페이스: `load()`, `saveAll()`, 개별 save 헬퍼.

ZIP으로 열면 폴더 핸들은 제거하고 `storageMode: 'memory'`.

---

## 5. UI 아키텍처

```text
app-shell (CSS grid: left | top/center)
├── ExplorerSidebar   # left full-height, 접기 가능
├── RouteNav          # top — 제목·프로그레스·막·WorkspaceActions
└── SceneKanban       # center — 칸반 + SceneKeepModal

ReferenceDrawer       # shell 밖 fixed (그리드 간섭 방지)
```

- 비트 스크롤: `scrollBeatColumnIntoView` — `.board`만 `scrollTo` (`scrollIntoView` 금지)
- 보드: 좌우 호버 화살표 스크롤, 빈 곳 드래그 팬(비트명 클릭과 충돌 방지)
- 참고 패널: 우측 상단 `dock_to_left` 토글
- 테마: `data-theme` + `.dark` 클래스
- 프로그레스 좌측 마커 툴팁: RouteNav z-index > 사이드바, 끝 마커 정렬 보정

---

## 6. 씬·참고 UX

1. 칸반 카드 미리보기 → 클릭 시 Keep 모달 (참고도 동일 패턴·하늘색 톤)
2. Toast UI keep variant (툴바 하단, 테두리 최소)
3. 카드 전체 DnD + ⋯ 메뉴: top/up/down/bottom/left/right + 삭제 (`NoteMenuPortal`)
4. 사이/상단 호버로 `order` 삽입, 하단 「씬 추가」/「메모 추가」
5. 비트 헤더 호버: guidance + prompts 툴팁(포털). 인포 호버 강조 → `BeatGuideModal`
6. 한글 입력: `useImeDraft`로 composition 중 Redux commit 차단 (`TagChipsInput` 스페이스 확정)

---

## 7. Phase 구현 상태

상세 Task는 [implementation-plan.md](./implementation-plan.md).

| Phase | 내용 | 상태 |
|---|---|---|
| 0 | 하네스·골격·store·storage | ✅ |
| 1 | 문서 트리·씬 CRUD·에디터·폴더/ZIP | ✅ (에디터: TipTap→Toast UI) |
| 2 | 15비트·칸반·참고·태그 필터 | ✅ |
| 2.5 | 검색·막·킵 참고·삽입·빈 취소·사이드바·prune 등 UX | ✅ |
| 3 | Drive 등 | 후순위 |

---

## 8. 알려진 이슈·대응

[troubleshooting.md](./troubleshooting.md) 참고.

- 한글 IME → `useImeDraft` / `TagChipsInput`
- 새로고침 폴더 끊김 → IndexedDB 핸들 복원
- Vite Outdated Optimize Dep → `.vite` 캐시 삭제
- 비트 `scrollIntoView` 레이아웃 밀림 → board-only `scrollTo`
