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
