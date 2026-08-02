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
| 저장 | File System Access API (Chromium 워크스페이스 폴더). ZIP/JSZip 없음 |
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
| `src/storage` | Workspace/Folder I/O, 디바운스, IndexedDB 핸들, 복원, prune |
| `src/hooks` | `useImeDraft` 등 |
| `src/data` | 15비트·막 가이드 데이터 |
| `src/theme` | ThemeProvider |
| `docs` | PRD / SRS / TRD · 하네스 로그 |

### 주요 컴포넌트

| 컴포넌트 | 역할 |
|---|---|
| `ExplorerSidebar` | 워크스페이스·프로젝트 트리·휴지통·폴더 연결 (CTA: 새 워크스페이스 / 기존 워크스페이스 열기) |
| `FolderConnectPrompt` | 미연결 안내·CTA·**폴더 드래그앤드롭** 존 (`getAsFileSystemHandle`) |
| `TrashPanel` | 휴지통 목록(본문 미리보기)·정렬·복원·영구삭제·비우기 |
| `Toast` | 복사·저장 등 짧은 피드백 — `.app-toast` 진한 알약형(불투명·`--shadow-md`) |
| `RouteNav` | 제목·프로그레스·1·2·3막·마커 |
| `WorkspaceActions` | 저장 배지·테마·참고 토글 |
| `WorkspaceDndProvider` | 칸반·참고 공유 DnD (크로스 드롭 변환) |
| `SceneKanban` / `SceneCard` | 15열 칸반·삽입·DnD·호버 아이콘바 |
| `SceneKeepModal` / `ReferenceKeepModal` | 킵 스타일 편집 모달 |
| `ReferenceDrawer` | 참고 목록·검색·태그·ref-tray 드롭존 |
| `RichTextEditor` | Toast UI 래퍼 |
| `SearchInput` / `TagFilter` / `TagChipsInput` | 검색·다중 태그 |
| `BeatGuideModal` | 비트 상세 안내 |
| `ConfirmDialog` / `NoteMenuPortal` | 삭제 확인·⋯ 메뉴 포털 |

진입: `src/main.tsx` → `src/App.tsx`

---

## 3. 데이터 모델

### 3.1 스키마

`schemaVersion = 2` (워크스페이스 + 휴지통)

### 3.2 워크스페이스·프로젝트 폴더 트리

연결 단위는 **워크스페이스 폴더 1개**. 그 안에 여러 프로젝트.

```text
{workspace}/
  workspace.json
  projects/{projectId}/
    manifest.json                 # project.title (표시명)
    documents/{documentId}.json
    scenes/{sceneId}.json
    references/{referenceId}.json
    trash/
      scenes|references|bundles/{id}.json
    assets/ · beats/
  trash/projects/{projectId}/     # 삭제된 프로젝트
```

구버전(루트 `manifest.json`)은 열 때 `projects/{id}/`로 자동 마이그레이션.  
이미 `workspace.json`이 있어도 (1) 디스크 `projects/`에만 있는 항목을 목록에 편입하고 (2) 루트에 남은 레거시 `manifest.json`·`documents/` 등을 프로젝트로 옮긴다 (`WorkspaceStorage.ensureWorkspaceLayout`).

### 3.3 핵심 타입

```ts
interface WorkspaceManifest {
  schemaVersion: number;
  activeProjectId: string | null;
  projects: { id; title; createdAt; updatedAt }[];
}

interface Scene { /* id, documentId, title, contentHtml, beatIndex, order, tags, createdAt, updatedAt */ }
interface ReferenceNote { /* id, title, contentHtml, tags, order, createdAt, updatedAt */ }
// TrashedScene / TrashedReference / TrashedDocumentBundle / TrashedProject
```

전체는 `src/types/models.ts`를 단일 소스로 한다.

### 3.4 Store vs 로컬

| 데이터 | 위치 |
|---|---|
| manifest, documents, scenes, references, trash | Redux store |
| trashedProjects, workspaceFolderName, connectedProjects | store |
| selectedSceneId, selectedDocumentId, selectedReferenceId | store |
| centerTagFilter / referenceTagFilter, search queries | store |
| focusBeatIndex, referenceDrawerOpen, trashPanelOpen, sidebarCollapsed | store |
| sidebarCollapsed 영속 | **LocalStorage** (UI 선호만) |
| IME 입력 초안 | `useImeDraft` 로컬 |
| Toast UI 인스턴스 | 에디터 내부 (`contentHtml`만 store 동기화) |

원본을 store와 컴포넌트 state에 **중복 저장하지 않는다.**

### 3.5 검증·삭제

- 제목 공백: UI 빨간 안내(「제목을 입력하세요」). **저장은 막지 않음**. 리스트 카드는 제목 행 숨김 + `.card-excerpt--solo`(본문 6줄). 모달 제목 칸은 유지
- `contentHtml` 빈값·빈 `<p></p>` 허용
- `beatIndex` 0~14
- 모달 닫을 때 **제목·본문 모두** 비면 `discardEmpty*` (휴지통 미포함 hard delete)
- 씬·참고·문서·프로젝트 삭제 → 앱 휴지통(soft delete). 영구삭제/비우기 = `removeEntry` (PC 휴지통 미경유)

---

## 4. 저장 아키텍처

| 어댑터 | 역할 |
|---|---|
| `WorkspaceStorage` | 워크스페이스 루트·프로젝트 생성/전환/휴지통 이동 |
| `FolderStorage` | `projects/{id}/` JSON 트리 + 프로젝트 trash |
| `handleStore` | **워크스페이스 폴더 핸들만** IndexedDB 영속화 |
| `restoreFolderConnection` | 앱 시작 시 핸들·권한·스냅샷 복원 |
| `connectWorkspace` / `connectWorkspaceFromHandle` | 피커·드롭 공통 워크스페이스 연결 |
| `autosave` | dirty 시 500ms 디바운스 `saveAll` |
| prune | 활성·trash 각각 keepIds 기준 orphan JSON 삭제 |
| `exportText` | 씬/참고 평문·클립보드·`.txt`. 원고는 `formatManuscriptPlain`·`sceneHasManuscriptContent`(프로젝트·문서 헤더, 구간 라벨 없음, 제목 토글). `manuscriptDownloadFilename` → `{프로젝트}_{문서}_{YYYYMMDD}_{HHmm}` |
| `ManuscriptPreviewModal` | 전체 원고 보기: 구간 칩·인라인 제외 슬롯(`제목 - 본문`)·제목 스위치·푸터 복사/저장. 미리보기는 보더리스·호버 하이라이트 |

`storageMode`: `none` | `folder` (ZIP/`memory` 제거).

체험용 샘플 데이터: 저장소 루트 [`sample-workspace/`](../sample-workspace/) (스키마 v2).  
미연결 시 피커 또는 연결 화면에 폴더 드롭으로 연다.

참고↔씬 변환: `convertReferenceToScene` / `convertSceneToReference` / `copySceneToReference` / `copyReferenceToScene` ([`projectSlice.ts`](../src/store/projectSlice.ts)). 드래그 처리는 [`workspaceDrag.ts`](../src/utils/workspaceDrag.ts).

---

## 5. UI 아키텍처

```text
app-shell (CSS grid: left | top/center)
├── ExplorerSidebar   # left full-height, 접기 가능
├── RouteNav          # top — 제목·프로그레스·막·WorkspaceActions
└── SceneKanban       # center — 칸반 + SceneKeepModal + ManuscriptPreviewModal

ReferenceDrawer       # shell 밖 fixed (그리드 간섭 방지)
```

- 비트 스크롤: `scrollBeatColumnIntoView` — `.board`만 `scrollTo` (`scrollIntoView` 금지)
- 보드: 좌우 호버 화살표 스크롤, 빈 곳 드래그 팬(비트명 클릭과 충돌 방지)
- 참고 패널: 우측 상단 `dock_to_left` 토글
- 테마: `data-theme` + `.dark` 클래스
- 프로그레스 좌측 마커 툴팁: RouteNav z-index > 사이드바, 끝 마커 정렬 보정
- 앱 피드백 토스트(`.app-toast`): `--text-primary` 배경·`--bg-surface` 글자·`--radius-pill`·`--shadow-md`. 오류는 `--danger` 배경. Toast UI Editor와 클래스명 충돌 방지용 `app-` 접두사
- 휴지통 패널(`.trash-panel`): `--bg-surface` + `--shadow-md` (미정의 `--bg-elevated` 사용 금지)
- 전체 원고 모달(`.manuscript-modal`): max-width ~640px. 헤더(제목+프로젝트·문서)·구간 칩·본문·푸터(제목 포함 스위치·복사·`.txt`)

---

## 6. 씬·참고 UX

1. 칸반 카드 미리보기 → 클릭 시 Keep 모달 (참고도 동일 패턴·하늘색 톤)
2. Toast UI keep variant (툴바 하단, 테두리 최소)
3. 카드 전체 DnD + ⋯ 메뉴: top/up/down/bottom/left/right + 삭제 (`NoteMenuPortal`)
4. 사이/상단 호버로 `order` 삽입, 하단 「씬 추가」/「메모 추가」
5. 비트 헤더 호버: guidance + prompts 툴팁(포털). 인포 호버 강조 → `BeatGuideModal`
6. 한글 입력: `useImeDraft`로 composition 중 Redux commit 차단 (`TagChipsInput` 스페이스 확정)
7. 전체 원고 보기: 칸반 「전체 원고 보기」→ `ManuscriptPreviewModal`. 구간 칩·인라인 제외·제목 스위치·푸터 복사/`.txt`

---

## 7. Phase 구현 상태

상세 Task는 [implementation-plan.md](./implementation-plan.md).

| Phase | 내용 | 상태 |
|---|---|---|
| 0 | 하네스·골격·store·storage | ✅ |
| 1 | 문서 트리·씬 CRUD·에디터·폴더 저장 | ✅ (에디터: TipTap→Toast UI) |
| 2 | 15비트·칸반·참고·태그 필터 | ✅ |
| 2.5 | 검색·막·킵 참고·삽입·빈 취소·사이드바·prune 등 UX | ✅ |
| 2.6 | 워크스페이스·휴지통·ZIP 제거·전체 원고 보기·앱 토스트 | ✅ |
| 3 | Drive 등 | 후순위 |

---

## 8. 알려진 이슈·대응

[troubleshooting.md](./troubleshooting.md) 참고.

- 한글 IME → `useImeDraft` / `TagChipsInput`
- 새로고침 폴더 끊김 → IndexedDB 핸들 복원
- Vite Outdated Optimize Dep → `.vite` 캐시 삭제
- 비트 `scrollIntoView` 레이아웃 밀림 → board-only `scrollTo`
- 토스트/휴지통 투명 → 존재하는 CSS 토큰만 사용(`--bg-surface` 등)
