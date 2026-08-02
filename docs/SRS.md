# SRS — 스토리나침반

Software Requirements Specification. **무엇을 반드시 만족하는지** 정의한다.  
제품 비전은 [PRD.md](./PRD.md), 구현 방식은 [TRD.md](./TRD.md).

과제 7(React 노트 앱 · Agentic) 채점·검증의 기준 문서이다.

---

## 1. 문서 목적

| 구분 | 설명 |
|---|---|
| 과제 제출 범위 | React + TypeScript + 상태관리 + Scene(=Note) 운영 필수 6기능 + 로컬 워크스페이스 폴더 저장 |
| 제품 확장 | PRD의 15비트·칸반·참고·검색·막 구분 등 (Should로 구현됨) |

구현·검증은 아래 **Must**를 우선한다.

---

## 2. 공식 필수 기술

| 항목 | 확인 기준 |
|---|---|
| React 노트 앱 | `npm run dev`로 실행 가능 |
| 상태관리 | Redux Toolkit — 씬(노트) 원본은 store에서만 관리 |
| TypeScript | Scene·Props·store 타입, `any` 최소화 |
| 저장소 URL | 평가자 접근 가능 주소 (제출 시) |

---

## 3. 운영 필수 6기능 (Scene = Note)

| # | 기능 | 확인 기준 |
|---:|---|---|
| 1 | 목록 | store 씬이 칸반/목록에 표시 |
| 2 | 작성 | 씬 추가 (제목·내용 각각 빈값 허용. 제목 공백 시 빨간 안내) |
| 3 | 확인 | 선택 씬 내용 표시(모달/미리보기) |
| 4 | 수정 | 반영 + `updatedAt` 갱신 |
| 5 | 삭제 | 휴지통으로 이동(soft delete). 목록·선택 상태 동시 갱신 (확인 모달) |
| 6 | 빈 상태·입력 오류 | 빈 안내, 제목 공백 시 빨간 안내(저장은 허용) |

### 도메인 매핑

| 과제 용어 | 스토리나침반 |
|---|---|
| Note | Scene (`scenes/{id}.json`) |
| 노트 목록 | 활성 문서의 씬 칸반 |
| 작성·수정·삭제 | 씬 CRUD + `updatedAt` |
| 선택 | `selectedSceneId` |
| 검색(권장) | Center/Right **텍스트 검색**(제목·본문·태그) + **다중 태그 필터** (영역 분리) |

---

## 4. 기능 요구사항 (Must / Should / Won’t)

### 4.1 Must

- Vite + React + TypeScript + Redux Toolkit
- Left: 프로젝트 제목·문서 CRUD(추가/이름변경/삭제/선택)
- Center: 선택 문서의 씬 CRUD + 리치 HTML 에디터 (Toast UI)
- **제목·내용 모두 빈값 허용**. 제목 공백 시 빨간 안내만 표시(저장·자동저장은 계속). 리스트 카드는 제목 행 없이 본문 미리보기만(더 길게), 모달에는 제목 칸 유지
- 저장: **워크스페이스 폴더**(내부에 여러 프로젝트). **LocalStorage에 노트 원본 저장 금지**
- 폴더 연결 CTA: **새 워크스페이스** / **기존 워크스페이스 열기** / **폴더 드래그앤드롭**(Chrome·Edge, `getAsFileSystemHandle`)
- 체험: 저장소 `sample-workspace/` 를 「기존 워크스페이스 열기」또는 연결 화면에 드롭
- 참고↔칸반: 드래그로 **이동(변환)**, 케밥으로 **참고로 복사** / **칸반으로 복사**. 카드 호버 아이콘바(삭제·텍스트복사·케밥), 순서 메뉴는 맨위/맨아래만
- 폴더 연결 시 변경 감지 **디바운스 자동 저장**(기본 500ms). 에디터 Undo와 독립
- 한글 IME 조합 중 입력이 깨지지 않을 것
- 삭제: 씬·참고·문서·프로젝트 → 앱 휴지통. 복원·항목 영구삭제·휴지통 비우기(디스크 `removeEntry`, PC 휴지통 미경유)
- 추출: 씬/참고 **텍스트로 복사**, 활성 문서 **원고 복사**·`.txt` 저장 (피드백은 **앱 토스트** — alert 아님)

### 4.2 Should (구현됨)

- Top: 프로젝트·문서 제목, 15비트 프로그레스·1·2·3막·클릭 마커·채움 통계·비트 열 스크롤
- Center 15열 칸반 + 막 시작 라벨
- 비트 헤더 호버 툴팁(guidance·prompts), 인포 → 상세 안내 모달
- Right 참고 메모 CRUD + 킵 모달 + 드로워 (`order`·사이 삽입·DnD)
- Center / Right **독립** 텍스트 검색 + 다중 태그 필터 + 필터 초기화
- 씬: 사이/상단 호버 삽입, 카드 전체 DnD, ⋯ 메뉴 6방향 이동
- 빈 제목·본문으로 모달을 닫으면 생성 취소(씬·참고) — 휴지통 미포함
- 라이트/다크 테마, 사이드바 접기(LocalStorage — UI 선호만)
- 워크스페이스 핸들 새로고침 복원(IndexedDB), 저장 시 orphan JSON prune
- 휴지통 UI: 삭제일/생성일 정렬, 씬/참고 본문·문서 묶음 미리보기, 복원, 영구삭제, 비우기
- 텍스트/문서 추출 + 앱 토스트 피드백 (불투명 알약형 `.app-toast`)
- 칸반 좌우 호버 스크롤·빈 영역 드래그 팬

### 4.3 Won’t (이번 제출)

- Google Drive OAuth·실시간 동기화
- 인증·협업·자동 배포·실사용자 개인정보
- ZIP 가져오기/내보내기 (제거됨 — Chromium 워크스페이스 폴더 전용)

---

## 5. 비기능 요구사항

| 항목 | 기준 |
|---|---|
| 타입 안전 | `npm run typecheck` 통과 |
| 빌드 | `npm run build` 통과 |
| 브라우저 | Chromium(Chrome/Edge) 권장 — File System Access |
| 보안 | `.env` 토큰 커밋 금지, force push·대량 삭제 금지 |
| Agentic | 소단위 Task, 승인된 계획, 작업·프롬프트 기록 |

---

## 6. 검증 시나리오

| 시나리오 | 예상 |
|---|---|
| TypeScript 검사 | 오류 없음 |
| 앱 최초 실행 | 기본 워크스페이스 |
| 씬 없음 | 빈 상태 안내 |
| 유효 작성 | 칸반·모달에 반영 |
| 제목 공백 + 본문 있음 | 빨간 안내·저장 허용. 카드는 제목 행 없이 본문만(길게) |
| 내용 빈 채 저장 | 허용 |
| 제목·본문 모두 빈 채 모달 닫기 | 방금 만든 빈 씬/참고 삭제(생성 취소) |
| 수정·삭제 | 갱신·선택 정리·확인 모달 |
| 검색·태그 필터 | 칸반/참고 각각 독립 필터 |
| 폴더 연결 후 수정 | 디바운스 후 파일 반영·삭제분 prune |
| 새로고침(폴더 연결 후) | IndexedDB 핸들로 프로젝트 복원 시도 |
| 사이드바 접기 | 새로고침 후에도 접힘 유지 |
| Ctrl+Z | 에디터 Undo (디스크 저장과 독립) |
| 한글 제목·태그 | 마지막 글자 중복·자모 분리 없음 |

---

## 7. Agentic 산출물 체크리스트

- [x] `docs/PRD.md`
- [x] `docs/SRS.md`
- [x] `docs/TRD.md`
- [x] `docs/beat-guide.md`
- [x] `docs/implementation-plan.md`
- [x] `docs/agent-worklog.md`
- [x] `docs/prompt-log.md`
- [x] `docs/troubleshooting.md`
- [x] `AGENT_GUIDE.md`
- [x] `AGENTS.md`
- [x] `.cursor/rules`
- [x] `README.md`
- [x] `npm run typecheck` / `build` 통과
