# AGENT_GUIDE — 스토리나침반

## 프로젝트

- 이름: Story Compass (스토리 나침반)
- 스택: React + TypeScript + Vite + Redux Toolkit + Toast UI Editor + `@dnd-kit` + Tailwind CSS v4

## 작업 원칙 (하네스·루프)

1. 한 번에 전체 앱을 생성하지 않는다. Task 1개만.
2. 사람(또는 승인된 계획) 없이 범위를 넓히지 않는다.
3. 변경 후 `npm run typecheck` (및 가능하면 `build`)를 실행한다.
4. 결과를 `docs/agent-worklog.md`·`AGENTS.md`에 남긴다.
5. 요구사항 밖 변경은 채택하지 않거나 되돌린다.
6. 제품 문서(PRD/SRS/TRD)와 구현이 어긋나면 문서를 현행에 맞춘다.

## 허용

- `src/**`, `docs/**`, `public/**`, 루트 설정 파일, `AGENTS.md`, `README.md`, `AGENT_GUIDE.md`
- 계획된 패키지: `@reduxjs/toolkit`, `react-redux`, `@toast-ui/editor`, `@dnd-kit/*`, Tailwind, 타입 정의

## 금지

- Google Drive OAuth·실토큰·`.env` 비밀 커밋
- LocalStorage에 **노트 원본** 저장 (UI 선호 `sidebarCollapsed` 등은 예외)
- `useState`만으로 씬/문서 원본 전체 관리
- force push, 대량 삭제, 프로젝트 전체 덮어쓰기
- 범위 밖: 인증 서버, 협업, 자동 배포

## 도메인 규칙

- Scene = Note
- 제목·본문 각각 빈값 허용. 제목 공백 시 빨간 안내만(저장 차단 아님). 리스트 카드는 제목 행 없이 본문만, 모달 제목 칸 유지. 제목·본문 모두 비면 모달 닫을 때 생성 취소
- 자동 저장 시 에디터 remount 금지 (Ctrl+Z 유지)
- 저장: 워크스페이스 폴더(File System Access, Chromium 권장). ZIP 미지원
- 연결 CTA: 새 워크스페이스 / 기존 워크스페이스 열기
- 삭제: 앱 휴지통 soft-delete → 복원·영구삭제·비우기
- 추출 피드백: `ToastProvider` / `.app-toast` (alert 금지)
- 비트 열 스크롤: `.board`만 `scrollTo` (`scrollIntoView` 금지)
- 한글 입력: `useImeDraft` / `TagChipsInput` composition 가드

## 완료 조건 (현행)

- Phase 1~2.6: 문서·씬·참고 CRUD, 15비트 칸반, 검색·태그, 워크스페이스·휴지통, 전체 원고 보기·앱 토스트, 복원·prune, typecheck/build 통과
- 저장: Chromium 워크스페이스 폴더 전용 (ZIP 제거)
- 상세: [docs/implementation-plan.md](docs/implementation-plan.md), [docs/SRS.md](docs/SRS.md)

## 오류 절차

1. 수정 전 원인 후보 기록
2. 최소 수정
3. 재검증·작업기록

## 결과 보고 형식

- 변경 파일 / 이유 / 명령 결과 / 남은 위험 / 다음 Task
