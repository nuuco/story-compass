# 스토리 나침반 (Story Compass)

Save the Cat 15비트 구조를 축으로 씬(메모 조각)을 집필하는 웹 노트 앱입니다.

**웹 앱:** [https://story-compass.vercel.app/](https://story-compass.vercel.app/)

Chrome 또는 Edge에서 여는 것을 권장합니다. (로컬 폴더 저장은 이 브라우저에서만 지원됩니다.)

---

## 사용 안내

서버에 원고를 올리지 않습니다. 연결한 **내 컴퓨터의 폴더**에만 저장됩니다.

### 1. 시작하기

1. [스토리 나침반](https://story-compass.vercel.app/)을 **Chrome / Edge**로 엽니다.
2. **새 워크스페이스** — 빈 폴더를 골라 새 작업 공간을 만듭니다.  
   **기존 워크스페이스 열기** — 이미 쓰던 폴더를 다시 엽니다.  
   또는 안내 화면에 **폴더를 끌어다 놓아** 연결할 수 있습니다.
3. 브라우저가 폴더 접근을 물으면 **허용**합니다. (새로고침 후에도 이어서 쓰려면 권한이 필요합니다.)

체험만 해 보려면 GitHub 저장소의 [`sample-workspace/`](sample-workspace/) 폴더를 「기존 워크스페이스 열기」또는 드롭으로 연결하세요. (`workspace.json`이 있는 폴더 루트를 고릅니다.)

### 2. 화면 구성

| 영역 | 하는 일 |
|---|---|
| 왼쪽 | 프로젝트·문서 목록, 휴지통, 사이드바 접기 |
| 위쪽 | 프로젝트·문서 제목, 이야기 진행(1·2·3막) 표시, 저장 상태·테마·참고 패널 |
| 가운데 | 15개 **구간** 칸반 — 씬 카드 작성·이동 |
| 오른쪽 | **참고** 메모 (아이디어·자료). 칸반으로 끌어다 옮기거나 복사할 수 있습니다 |

### 3. 집필하기

- 왼쪽에서 **프로젝트**와 **문서**를 고르거나 추가합니다.
- 칸반 열에서 씬을 추가하고, 카드를 눌러 제목·본문·태그를 편집합니다. (구글 킵처럼 모달에서 씁니다.)
- 카드를 **드래그**하거나 ⋯ 메뉴로 다른 구간·순서로 옮깁니다.
- 구간 이름 옆 **안내** 아이콘으로 각 구간이 무엇인지 볼 수 있습니다.
- 위쪽 **검색**·**태그**로 씬을 좁혀 볼 수 있습니다. (참고 패널에도 따로 있습니다.)

변경하면 잠시 뒤 **자동 저장**됩니다. 위쪽에 저장 상태가 표시됩니다.

### 4. 참고 메모

- 오른쪽 참고 패널에서 메모를 모아 둡니다.
- 칸반으로 **끌어다 놓으면** 씬으로 바뀌고, 반대로도 가능합니다. ⋯ 메뉴에서 **복사**만 할 수도 있습니다.

### 5. 전체 원고 보기

- 칸반 위 **전체 원고 보기**를 누릅니다.
- 포함할 **구간**을 고르고, 빼고 싶은 씬은 **제외**(다시 넣기 가능)합니다.
- **제목 포함**을 켜고 끄며 미리본 뒤, **원고 복사** 또는 **.txt 저장**합니다.  
  저장 파일 이름에는 날짜·시각이 붙습니다. (예: `프로젝트_문서_20260802_1534.txt`)

### 6. 휴지통

- 삭제한 씬·참고·문서·프로젝트는 **앱 휴지통**으로 갑니다. (PC 휴지통과는 다릅니다.)
- 왼쪽에서 휴지통을 열어 **복원**하거나 **영구 삭제**할 수 있습니다.

### 7. 알아두면 좋은 점

- 데이터는 **연결한 폴더**에만 있습니다. 폴더를 지우거나 다른 PC로 옮기지 않으면 브라우저만으로는 복구할 수 없습니다.
- Safari·Firefox에서는 폴더 연결이 되지 않을 수 있습니다.
- 에디터에서 **Ctrl+Z**는 글 편집 취소입니다. (파일 저장을 되돌리는 기능은 아닙니다.)

---

## 개발자용

과제 7 — React · TypeScript · Redux Toolkit · Agentic(하네스·루프) 개발 증거 포함.

### 공식·운영 필수 매핑

| 과제 | 본 앱 |
|---|---|
| Note | Scene (`scenes/*.json`) |
| 목록·작성·확인·수정·삭제 | 씬 CRUD + `updatedAt` (삭제 → 앱 휴지통) |
| 빈 상태·입력 오류 | 제목 공백 시 빨간 안내(저장은 허용). 카드는 제목 행 없이 본문만 |
| 상태관리 | Redux Toolkit (`src/store`) |
| 저장 | 로컬 워크스페이스 폴더(File System Access, Chrome/Edge). 노트 원본 LocalStorage 미사용 |
| 검색(권장) | 칸반·참고 텍스트 검색 + 다중 태그 필터 |
| 추출 | 씬/참고 텍스트 복사, 칸반 **전체 원고 보기**(구간·씬 선택·제목 포함) 복사·`.txt`(`YYYYMMDD_HHmm`) · 앱 토스트 |

### 실행

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

- Node 권장: 20+
- 워크스페이스 폴더 연결 후 변경 시 약 500ms 디바운스 자동 저장
- 새로고침: 폴더 핸들이 IndexedDB에 있으면 자동 복원 시도 (권한 허용 필요)

### 샘플 데이터

[`sample-workspace/`](sample-workspace/) — 「밤기차의 손님」(본편)·「짧은 스케치」(전환 체험).  
자세한 트리: [`sample-workspace/README.md`](sample-workspace/README.md).

### 폴더 구조 (워크스페이스)

```text
{workspace}/
  workspace.json
  projects/{projectId}/
    manifest.json
    documents/ scenes/ references/ trash/
  trash/projects/{projectId}/
```

상세: [docs/TRD.md](docs/TRD.md), [docs/SRS.md](docs/SRS.md)

### 화면 (구현 대응)

- **Left** 워크스페이스·프로젝트·문서 트리, 휴지통, 사이드바 접기
- **Top** 프로젝트·문서 제목, 15비트 프로그레스(1·2·3막), 저장/테마/참고
- **Center** 15열 칸반, 검색·태그, 전체 원고 보기, Toast UI 킵 모달, 비트 안내
- **피드백** 복사·저장 결과는 하단 알약형 앱 토스트(`.app-toast`)
- **Right** 참고 드로워 (검색·태그·킵 모달, 영역별 필터 분리)

### 문서

| 문서 | 역할 |
|---|---|
| [docs/PRD.md](docs/PRD.md) | 제품 비전·UX |
| [docs/SRS.md](docs/SRS.md) | 요구사항 명세·검증 |
| [docs/TRD.md](docs/TRD.md) | 기술 설계·데이터·저장 |
| [docs/implementation-plan.md](docs/implementation-plan.md) | Phase Task 체크리스트 |
| [docs/agent-worklog.md](docs/agent-worklog.md) | 에이전트 작업 기록 |
| [docs/troubleshooting.md](docs/troubleshooting.md) | 한글 IME·폴더 복원·토스트 등 |
| [AGENT_GUIDE.md](AGENT_GUIDE.md) | 하네스·루프 운영 |
| [AGENTS.md](AGENTS.md) | 작업 이력 한 줄 요약 |
