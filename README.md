# 스토리 나침반 (Story Compass)

Save the Cat 15비트 구조를 축으로 씬(메모 조각)을 집필하는 React 노트 앱입니다.  
**과제 7** — React · TypeScript · Redux Toolkit · Agentic(하네스·루프) 개발 증거 포함.

## 공식·운영 필수 매핑

| 과제 | 본 앱 |
|---|---|
| Note | Scene (`scenes/*.json`) |
| 목록·작성·확인·수정·삭제 | 씬 CRUD + `updatedAt` |
| 빈 상태·입력 오류 | 빈 칸반/제목 빨간 안내 |
| 상태관리 | Redux Toolkit (`src/store`) |
| 저장 | 로컬 폴더(File System Access) / ZIP (노트 원본 LocalStorage 미사용) |
| 검색(권장) | 칸반·참고 텍스트 검색 + 다중 태그 필터 |

## 실행

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

- Node 권장: 20+
- 폴더 자동 저장: Chromium에서 **로컬 폴더에 연결** 후 변경 시 약 500ms 디바운스 저장 (orphan JSON prune)
- 그 외 브라우저: **ZIP 가져오기 / ZIP으로보내기**
- 새로고침: 폴더 핸들이 IndexedDB에 있으면 자동 복원 시도 (권한 허용 필요)
- Ctrl+Z: 에디터 Undo (디스크 저장과 독립)

## 폴더 구조 (프로젝트 1개)

```text
manifest.json
documents/
scenes/
references/
assets/
beats/
```

상세: [docs/TRD.md](docs/TRD.md), [docs/SRS.md](docs/SRS.md)

## 화면

- **Left** 프로젝트·문서 트리, 사이드바 접기, 폴더/ZIP
- **Top** 프로젝트·문서 제목, 15비트 프로그레스(1·2·3막), 저장/테마/참고
- **Center** 15열 칸반, 검색·태그, Toast UI 킵 모달, 비트 안내 툴팁/모달
- **Right** 참고 드로워 (검색·태그·킵 모달, 영역별 필터 분리)

## 문서

| 문서 | 역할 |
|---|---|
| [docs/PRD.md](docs/PRD.md) | 제품 비전·UX |
| [docs/SRS.md](docs/SRS.md) | 요구사항 명세·검증 |
| [docs/TRD.md](docs/TRD.md) | 기술 설계·데이터·저장 |
| [docs/implementation-plan.md](docs/implementation-plan.md) | Phase Task 체크리스트 |
| [docs/agent-worklog.md](docs/agent-worklog.md) | 에이전트 작업 기록 |
| [docs/prompt-log.md](docs/prompt-log.md) | 사용자 프롬프트 로그 |
| [docs/troubleshooting.md](docs/troubleshooting.md) | 트러블슈팅 |
| [docs/beat-guide.md](docs/beat-guide.md) | 15비트 교육용 요약 |
| [AGENT_GUIDE.md](AGENT_GUIDE.md) / [AGENTS.md](AGENTS.md) | Agentic 가이드·이력 |

## AI 활용·한계

- Cursor로 소단위 Task · 사람 승인된 계획 기준으로 구현
- Google Drive 연동은 **미구현(후순위)**. 동일 폴더 스키마로 확장 가능
- 15비트 문구는 교육용 요약이며 원서 대체가 아님

## 안전

- 비밀키·실사용자 클라우드 인증 없음
- 실제 개인정보 저장 가정하지 않음
