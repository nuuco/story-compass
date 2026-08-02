# 스토리 나침반 (Story Compass)

Save the Cat 15비트 구조를 축으로 씬(메모 조각)을 집필하는 React 노트 앱입니다.  
**과제 7** — React · TypeScript · Redux Toolkit · Agentic(하네스·루프) 개발 증거 포함.

## 공식·운영 필수 매핑

| 과제 | 본 앱 |
|---|---|
| Note | Scene (`scenes/*.json`) |
| 목록·작성·확인·수정·삭제 | 씬 CRUD + `updatedAt` (삭제 → 앱 휴지통) |
| 빈 상태·입력 오류 | 제목 공백 시 빨간 안내(저장은 허용). 카드는 제목 행 없이 본문만 |
| 상태관리 | Redux Toolkit (`src/store`) |
| 저장 | 로컬 워크스페이스 폴더(File System Access, Chrome/Edge). 노트 원본 LocalStorage 미사용 |
| 검색(권장) | 칸반·참고 텍스트 검색 + 다중 태그 필터 |
| 추출 | 씬/참고 텍스트 복사, 문서 전체 원고 복사·`.txt` 저장 (피드백: 앱 토스트) |

## 실행

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

- Node 권장: 20+
- **Chrome / Edge** 권장 (File System Access API). Safari/Firefox는 폴더 연결 미지원
- 연결: **새 워크스페이스** 또는 **기존 워크스페이스 열기**
- 워크스페이스 폴더 연결 후 변경 시 약 500ms 디바운스 자동 저장
- 새로고침: 폴더 핸들이 IndexedDB에 있으면 자동 복원 시도 (권한 허용 필요)
- Ctrl+Z: 에디터 Undo (디스크 저장과 독립)

## 샘플 체험

저장소에 포함된 [`sample-workspace/`](sample-workspace/)를 열면 샘플 스토리로 바로 둘러볼 수 있습니다.

1. `npm run dev` 후 Chrome/Edge에서 앱 열기
2. **기존 워크스페이스 열기**로 선택하거나, 연결 안내 화면에 **폴더를 끌어다 놓기**
3. 클론한 레포의 **`sample-workspace` 폴더 자체**를 선택·드롭  
   (`projects` 안이 아니라 `workspace.json`이 있는 루트)

포함 프로젝트: 「밤기차의 손님」(본편)·「짧은 스케치」(전환 체험).  
자세한 트리 설명은 [`sample-workspace/README.md`](sample-workspace/README.md).

## 폴더 구조 (워크스페이스)

```text
{workspace}/
  workspace.json
  projects/{projectId}/
    manifest.json
    documents/ scenes/ references/ trash/
  trash/projects/{projectId}/
```

상세: [docs/TRD.md](docs/TRD.md), [docs/SRS.md](docs/SRS.md)

## 화면

- **Left** 워크스페이스·프로젝트·문서 트리, 휴지통, 사이드바 접기
- **Top** 프로젝트·문서 제목, 15비트 프로그레스(1·2·3막), 저장/테마/참고
- **Center** 15열 칸반, 검색·태그, 원고 추출, Toast UI 킵 모달, 비트 안내
- **피드백** 복사·저장 결과는 하단 알약형 앱 토스트(`.app-toast`)
- **Right** 참고 드로워 (검색·태그·킵 모달, 영역별 필터 분리)

## 문서

| 문서 | 역할 |
|---|---|
| [docs/PRD.md](docs/PRD.md) | 제품 비전·UX |
| [docs/SRS.md](docs/SRS.md) | 요구사항 명세·검증 |
| [docs/TRD.md](docs/TRD.md) | 기술 설계·데이터·저장 |
| [docs/implementation-plan.md](docs/implementation-plan.md) | Phase Task 체크리스트 |
| [docs/agent-worklog.md](docs/agent-worklog.md) | 에이전트 작업 기록 |
| [docs/troubleshooting.md](docs/troubleshooting.md) | 한글 IME·폴더 복원·토스트 투명 등 |
| [AGENT_GUIDE.md](AGENT_GUIDE.md) | 하네스·루프 운영 |
| [AGENTS.md](AGENTS.md) | 작업 이력 한 줄 요약 |

## 라이선스

과제 제출용. 비트 안내는 교육용 요약이며 원서 복제가 아닙니다.
