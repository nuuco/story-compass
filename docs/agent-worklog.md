# 에이전트 작업 기록

과제 7 Walkthrough · Review changes 대체 기록.  
**사용자 프롬프트 요지:** [docs/prompt-log.md](./prompt-log.md)

> 이력 표기 참고: 초기 `BeatNav`는 이후 `RouteNav`로 개명. 에디터는 TipTap → Toast UI.

---

### 2026-07-27 — Task 0.1 하네스 문서

- 목적: 제출용 문서 번들
- 변경 파일: `docs/*`, `AGENT_GUIDE.md`, `AGENTS.md`, `.cursor/rules/story-compass.mdc`
- 판정: 채택
- 다음: Vite 골격

### 2026-07-27 — Task 0.2~0.3 골격·store·storage

- 목적: Vite+React+TS+RTK, TipTap, Folder/ZIP 어댑터
- 변경 파일: `package.json`, `src/store/**`, `src/storage/**`, `src/types/**`, `src/data/**`
- 명령: `npm run typecheck` → 통과 / `npm run build` → 통과
- 판정: 채택

### 2026-07-27 — Task 1.1~1.4 Phase 1 Must

- 목적: Left 문서 트리, Scene CRUD 6기능, TipTap, 폴더/ZIP·디바운스 저장, 제목 검증 UI
- 변경 파일: `src/components/*`, `src/App.tsx`, `src/index.css`
- 예상: 제목 공백 시 빨간 안내, 내용 빈값 허용, 자동저장 시 에디터 remount 없음(`key={scene.id}`)
- 회귀 위험: File System Access 미지원 브라우저 → ZIP 폴백
- 명령: typecheck·build 통과
- 판정: 채택

### 2026-07-27 — Task 2.1~2.4 Phase 2 Should

- 목적: 15비트 Top, 칸반, Right 참고 드로워, Center/Right 독립 태그 필터
- 변경 파일: `BeatNav.tsx`, `SceneKanban.tsx`, `ReferenceDrawer.tsx`
- 판정: 채택
- 미포함(후순위): 전체 DnD, Drive OAuth

### 검증 시나리오 결과

| 시나리오 | 결과 |
|---|---|
| TypeScript 검사 | 통과 |
| 빌드 | 통과 |
| 빈 씬 안내 | UI 문구 구현 |
| 제목 필수 / 내용 빈값 | 검증 UI·store 규칙 구현 |
| 폴더 미연결 상태 | `no-folder` 표시 |
| Drive | 미구현(문서 Won’t) |

### 사람이 최종 판단한 문장

스토리나침반은 과제 운영 필수(Scene=Note)와 RTK·TS·로컬 파일 저장을 충족하며, PRD의 Drive는 후순위로 문서화했다.

### 2026-07-27 — UI 리디자인

- 목적: 세련된 현대적·깔끔한 워크스페이스 룩
- 변경: Tailwind CSS v4(`@tailwindcss/vite`), `src/ui.ts`, 컴포넌트·`index.css`·폰트(Newsreader / IBM Plex Sans KR)
- 명령: typecheck·build
- 판정: 채택

### 2026-07-27 — 비트 내비 UI 전면 변경

- 목적: 작은 마커 → 설명·%가 보이는 타임라인 카드
- 변경: `BeatNav.tsx` 다크 스트립 + 가로 스크롤 비트 카드 + 전체 %/눈금 + 선택 상세
- 판정: 채택 후 사용자 피드백으로 철회

### 2026-07-27 — 테마·프로그레스바 재설계

- 목적: 라이트/다크 모드, 스크롤바, 클릭 마커형 프로그레스바 복원
- 변경: `ThemeProvider`, CSS 변수 테마, 스크롤바 스타일, `BeatNav` 마커+%·설명 패널, Toolbar 테마 토글
- 판정: 채택

### 2026-07-27 — 프롬프트로그·마커·폰트 통일

- 목적: 프롬프트 기록 강화, 마커 UI 개선, 명조 제거·산스 통일
- 변경: `docs/prompt-log.md`, BeatNav 칩형 마커, IBM Plex Sans KR only
- 판정: 채택

### 2026-07-27 — 씬 인라인 편집·⋯메뉴·DnD

- 목적: 하단 분리 에디터 제거, 카드 인라인 CRUD/편집, DnD 및 퀵이동
- 변경: `SceneCard.tsx`, `SceneKanban.tsx`, `projectSlice` nudge/place, `SceneEditor` 삭제, `@dnd-kit`
- 판정: 채택

### 2026-07-27 — 리치 에디터 Toast UI로 교체

- 원인: TipTap은 헤드리스라 기본 아이콘 툴바가 없음 → 텍스트 버튼만 보여 “에디터 같지 않음”
- 변경: `@toast-ui/editor` WYSIWYG, TipTap 제거
- 판정: 채택

### 2026-07-27 — 구글 킵 스타일 씬 모달

- 목적: 제목 박스 분리 없이 킵형 편집 UX
- 변경: `SceneKeepModal`, 칸반 미리보기 카드만, Toast keep variant
- 판정: 채택

### 2026-07-27 — Toss UI + Preview 레이아웃 전면 리디자인

- 목적: toss_style HTML 비주얼 + story-compass-preview.html 그리드(좌측 전체 높이 사이드바)
- 변경: `ExplorerSidebar`, `RouteNav`, `index.css` 토큰 교체, `SceneKanban`/`SceneCard`/`SceneKeepModal`/`ReferenceDrawer`/`App.tsx`, Pretendard·Material Symbols
- 기능: Redux·저장·DnD·태그필터·Toast UI 유지
- 명령: typecheck·build
- 판정: 채택

### 2026-07-27 — 참고 드로어 그리드 간섭 수정

- 원인: fixed 드로어가 app-shell grid 자식이라 접힘 시에도 레이아웃을 밀어 왼쪽이 가려짐
- 변경: `ReferenceDrawer`를 shell 밖 배치, closed 시 visibility/pointer-events 차단
- 판정: 채택

### 2026-07-27 — 우측 상단 WorkspaceActions

- 목적: 자동저장 배지·테마·참고 토글을 RouteNav 우측으로 이동
- 변경: `WorkspaceActions.tsx`, Explorer 테마 토글·edge drawer-toggle 제거
- 판정: 채택

### 2026-07-27 — 비트 스크롤이 레이아웃을 밀어냄

- 원인: `scrollIntoView`가 상위 컨테이너까지 가로 스크롤
- 변경: `scrollBeatColumnIntoView` — `.board`만 `scrollTo`
- 판정: 채택

### 2026-07-27 — RouteNav 제목을 프로젝트명으로

- 변경: `15비트 항로` → `{projectTitle} · {docName}`
- 판정: 채택

### 2026-07-27 — 폴더 연결 새로고침 유지

- 원인: FileSystemDirectoryHandle이 메모리만 있어 새로고침 시 끊김
- 변경: IndexedDB에 핸들 저장(`handleStore`), 앱 시작 시 `restoreFolderConnection`으로 권한·데이터 복원
- 판정: 채택

### 2026-07-27 — 한글 IME 입력 깨짐 수정

- 증상: 마지막 글자 중복, 태그 자모 미결합
- 원인: controlled input + onChange마다 Redux/`parseTags` 동기화로 조합 세션 파괴
- 변경: `useImeDraft`, SceneKeepModal/ReferenceDrawer/ExplorerSidebar 적용, `docs/troubleshooting.md`
- 판정: 채택

### 2026-07-27 — docs 파일명 영문화

- 목적: 문서 경로를 영문 kebab-case로 통일
- 변경: requirements, data-model, beat-guide, implementation-plan, agent-worklog, prompt-log, project-analysis, troubleshooting + README/AGENT_GUIDE/rules 링크 갱신
- 판정: 채택

### 2026-07-27 — 로그 보강

- 목적: prompt-log 공백(킵 이후) 및 중간 UX 수정 기록 보완
- 변경: `docs/prompt-log.md`, `docs/agent-worklog.md`, `AGENTS.md`
- 판정: 채택

### 2026-07-27 — PRD / SRS / TRD 문서 재구성

- 목적: 비전·명세·설계 문서 역할 분리
- 변경: `docs/PRD.md`, `docs/SRS.md`, `docs/TRD.md` 신설
- 삭제: `requirements.md`, `data-model.md`, `project-analysis.md`
- 링크: README·체크리스트 갱신
- 판정: 채택

### 2026-07-27 — 칸반 스크롤 화살표 · 참고 메모 UX 통일

- 요청: 비트 시트 좌/우 호버 시 화살표로 스무스 스크롤, 참고 메모를 씬과 동일 형태
- 변경: `board-viewport` 스크롤 버튼, `ReferenceKeepModal` + 미리보기 카드, `selectedReferenceId`
- 판정: 채택

### 2026-07-28 — UX 폴리시 (검색·막·삽입·DnD·툴팁)

- 목적: AGENTS.md 후반 기능과 문서·구현 동기화
- 변경 요약:
  - 1·2·3막 라벨·프로그레스 구간
  - Center/Right 텍스트 검색·다중 태그·필터 초기화
  - 씬/참고 사이 삽입·`order`, 카드 전체 DnD, 빈 노트 생성 취소
  - 비트 헤더 툴팁(guidance+prompts)·인포 강조, 프로그레스 마커 가림 해소
  - 사이드바 접기·orphan prune·ConfirmDialog·태그 칩 UX
- 판정: 채택

### 2026-07-28 — 문서 현행화

- 목적: PRD/SRS/TRD/README/implementation-plan/AGENT_GUIDE를 코드 기준으로 맞춤
- 변경: TipTap→Toast, Phase 2.5, 검색·막·ReferenceNote.order·컴포넌트 목록 반영
- 판정: 채택

### 2026-07-29 — 킵 모달 UX (여백·툴팁·글자 수)

- 목적: 본문과 하단 메뉴 여백 정리, 포맷 툴팁 가림 해소, 본문 글자 수 표시
- 변경: keep 에디터 flex 레이아웃·툴팁 상단 표시, `editor-char-count`(평문 글자 수)
- 판정: 채택

### 2026-07-29 — 킵 모달 후속 (제목·레이아웃·삭제)

- 목적: 킵식 제목·글자 수·툴바·스크롤·불릿 정렬 마무리
- 변경: `editorTitle.ts`, ProseMirror 패딩 0, ⋯→삭제, 태그 칩 정렬, `countContentChars`
- 판정: 채택

### 2026-07-29 — 폴더 미연결 안내

- 목적: 폴더 연결 전 메모 작성 차단·연결 유도
- 변경: `FolderConnectPrompt`, `connectLocalFolder`, App/WorkspaceActions 조건부 렌더
- 판정: 채택

### 2026-07-29 — 다중 프로젝트 연결

- 목적: 새 프로젝트·열기·전환·연결 해제·미연결 시 트리 숨김
- 변경: `handleStore` v2, `projectConnection`, ExplorerSidebar 프로젝트 목록
- 판정: 채택

### 2026-07-29 — 폴더 복원 멈춤 수정

- 목적: 「폴더 연결 복원 중…」 무한 대기 해소
- 원인: 시작 시 `requestPermission` / 미처리 예외
- 변경: `hasDirectoryPermission`(query만), restore·App try/finally, troubleshooting §5
- 판정: 채택

### 2026-07-29 — 프로그레스바·칸반 스크롤 연동

- 목적: 가로 스크롤 위치에 따라 focusBeat·프로그레스 동기화
- 변경: `getFocusedBeatFromBoardScroll`, 비트 제목→스크롤만
- 판정: 채택

### 2026-07-29 — 폴더 안내·사이드바 UX

- 목적: 연결 안내 문구·레이아웃, 미연결 footer 고정, 프로젝트 row 배경
- 변경: FolderConnectPrompt, explorer footer/active row CSS
- 판정: 채택

### 2026-07-29 — 칸반 화살표 비트 스냅

- 목적: 화살표 스크롤을 비트 열 단위로 정렬
- 변경: `scrollBoardSnap`
- 판정: 채택

### 2026-07-29 — 비트 숫자 트랜지션

- 목적: 비트명과 동일 색 전환(0.2s)을 숫자 원형에 적용
- 변경: `.beat-number` transition·hover
- 판정: 채택

### 2026-07-29 — RouteNav 제목 편집

- 목적: 메인 상단 프로젝트·문서 제목 인라인 수정
- 변경: RouteNav input + IME 가드
- 판정: 채택

### 2026-07-29 — 태그 안내 · 제목→본문 포커스

- 목적: 태그 Enter/스페이스 안내, 제목 Enter 시 본문 이동
- 변경: TagChips placeholder, RichTextEditor `forwardRef`+`editor.focus()`
- 판정: 채택

### 2026-07-29 — 글자 수·참고 모달 UI

- 목적: 글자 수 숫자 강조, 참고 모달 흰색·상단 라운드 수정
- 변경: char-count 스타일, focus-modal overflow hidden, ref 모달 하늘색 배경 제거
- 판정: 채택

### 2026-08-01 — 워크스페이스 다중 프로젝트 + 휴지통

- 목적: 연결 단위를 워크스페이스로 바꾸고 앱 휴지통(soft delete) 도입
- 변경: `WorkspaceStorage`, `handleStore` v3, soft-delete Redux, `TrashPanel`, 사이드바 UX, PRD/SRS/TRD
- 스키마: `schemaVersion = 2`, 구 단일 프로젝트 폴더 자동 마이그레이션
- 명령: typecheck·build 통과
- 판정: 채택

### 2026-08-01 — ZIP 제거 + 텍스트/문서 추출

- 목적: ZIP 폴백 제거, 작가용 평문 추출·토스트 피드백
- 변경: `zipStorage`/`jszip` 삭제, `exportText`, `ToastProvider`, 씬/참고/칸반 UI, docs
- 명령: typecheck·build 통과
- 판정: 채택

### 2026-08-01 — 토스트·휴지통 패널 스타일

- 목적: 토스트가 투명·그림자 과다로 보이던 UX 수정
- 원인: `.app-toast` / `.trash-panel`이 미정의 CSS 변수(`--bg-elevated`, `--bg-primary`)를 참조
- 변경: 진한 알약형 토스트(`--text-primary` 배경·`--shadow-md`), 휴지통 패널 `--bg-surface`, docs 현행화
- 판정: 채택

### 2026-08-02 — CTA 문구·제목 규칙 문서 정합

- 목적: 워크스페이스 CTA·제목 검증을 구현과 문서에 맞춤
- 변경: CTA「새 워크스페이스」/「기존 워크스페이스 열기」, TRD JSZip 제거, 제목=빨간 안내만(저장 허용)·본문만 노트 허용을 PRD/SRS/TRD/README/AGENT_GUIDE/rules에 반영
- 판정: 채택

### 2026-08-02 — 제목 없는 카드 미리보기

- 목적: 빈 제목 시 「제목 없음」 문구 대신 본문 위주 카드
- 변경: SceneCard/참고 카드·드래그 오버레이에서 제목 행 숨김, `.card-excerpt--solo` 6줄, 모달 제목 칸 유지
- 판정: 채택

### 2026-08-02 — sample-workspace·카드 아이콘바·참고↔칸반

- 목적: 체험용 샘플 폴더 + 참고/씬 양방향 이동·복사 UX
- 변경: `sample-workspace/`, `WorkspaceDndProvider`, convert/copy 액션, 호버 아이콘바, 케밥 축소
- 판정: 채택
