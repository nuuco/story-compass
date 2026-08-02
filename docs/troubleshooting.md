# 트러블슈팅

## 1. 한글 입력 — 마지막 글자 중복 / 자모 결합 실패

### 증상

- 제목·태그·프로젝트명·문서명 입력 시 **마지막 글자가 한 번 더** 들어가는 것처럼 보임
- 태그 입력 초기에 **자·모음이 합쳐지지 않고** 분리되어 표시됨

### 원인

React **controlled input**에서 `onChange`마다 Redux(또는 부모 state)를 갱신하면, 한글 IME **조합(composition)** 도중에 컴포넌트가 리렌더됩니다.

1. 사용자가 `ㄱ` → `가` 조합 중
2. `onChange`로 store에 중간 문자열이 들어감
3. props `value`가 다시 내려오며 입력창을 덮어씀
4. IME 조합 세션이 끊기거나, 확정 문자가 **중복**됨

태그 필드는 특히 위험합니다.

```ts
// 나쁨: 매 키입력마다 배열로 파싱 → 문자열로 재조립
value={tags.map(t => `#${t}`).join(' ')}
onChange={(e) => dispatch(update(... parseTags(e.target.value)))}
```

조합 중인 글자가 `parseTags` / `join` 과정에서 깨집니다.

Enter로 확정할 때도 `e.nativeEvent.isComposing`을 무시하면, 조합 확정용 Enter가 **blur/제출**까지 트리거되어 중복이 납니다.

### 해결

1. **로컬 draft + composition 가드** (`src/hooks/useImeDraft.ts`)
   - `compositionstart` ~ `compositionend` 동안은 store에 쓰지 않음
   - 조합이 끝난 뒤·영문 입력 시에만 commit
2. 태그는 `TagChipsInput`에서 draft로 두고, 확정(Enter/스페이스) 시에만 커밋
3. Enter 처리는 `!e.nativeEvent.isComposing`일 때만 blur

### 재현 / 확인

1. 씬 모달 제목에 `안녕` 입력 → 마지막 `녕`이 두 번 나오지 않는지
2. 태그 칸에 `#복선` 한글로 입력 → 자모가 바로 합쳐지는지
3. 사이드바 프로젝트명·문서명 더블클릭 편집 후 Enter → 글자 중복 없는지

### 관련 파일

- `src/hooks/useImeDraft.ts`
- `src/components/SceneKeepModal.tsx`
- `src/components/ReferenceKeepModal.tsx`
- `src/components/TagChipsInput.tsx`
- `src/components/ReferenceDrawer.tsx`
- `src/components/ExplorerSidebar.tsx`
- 태그 입력은 `TagChipsInput`(확정 시에만 커밋). 구 `utils/tags.ts`는 제거됨

---

## 2. 새로고침 시 폴더 연결 끊김

### 증상

「로컬 폴더에 연결」 후 새로고침하면 저장 상태가 끊기고 데이터가 초기처럼 보임.

### 원인

`FileSystemDirectoryHandle`이 **메모리 변수**에만 있어 페이지 리로드 시 소멸.

### 해결

IndexedDB에 핸들만 저장하고, 앱 시작 시 `restoreFolderConnection`으로 권한 확인 후 프로젝트 로드.  
(노트 원본은 LocalStorage에 두지 않음 — 핸들만 영속화)

### 관련 파일

- `src/storage/handleStore.ts`
- `src/storage/restoreFolder.ts`
- `src/App.tsx` (`useRestoreFolder`)

### 확인

1. 폴더 연결 후 새로고침
2. 「자동 저장됨」과 기존 문서/씬이 복원되는지

권한 팝업이 뜨면 허용. Chrome/Edge에서 워크스페이스 폴더를 연결해야 한다.

> **참고:** 앱 **시작 직후**에는 `requestPermission`을 호출하지 않는다.  
> 이미 허용된 권한(`queryPermission`)만으로 복원하고, 권한이 없으면 연결 안내/사이드바 목록만 보여 준다.  
> 권한 재요청은 사용자가 프로젝트를 클릭할 때(`switchToProject`) 한다.  
> (시작 시 `requestPermission` → 「폴더 연결 복원 중…」 멈춤: **§5**)

---

## 3. Vite `Outdated Optimize Dep` (Toast UI 등)

### 증상

`@toast-ui_editor.js` 등에서 `504 (Outdated Optimize Dep)` / 흰 화면.

### 해결

```bash
rm -rf node_modules/.vite && npm run dev
```

브라우저 강력 새로고침(`Cmd+Shift+R`).

---

## 4. 비트 열로 이동할 때 레이아웃이 밀림

### 증상

프로그레스 마커·비트 제목 클릭 시 페이지/사이드바까지 가로로 밀리는 느낌.

### 원인

`scrollIntoView`가 상위 스크롤 컨테이너까지 가로 스크롤을 유발.

### 해결

`scrollBeatColumnIntoView`로 `.board`만 `scrollTo` (상위 `scrollIntoView` 사용 금지).

### 관련 파일

- `src/components/SceneKanban.tsx` (또는 스크롤 유틸)
- `src/components/RouteNav.tsx`

---

## 5. 「폴더 연결 복원 중…」만 계속 표시

### 증상

앱을 열거나 새로고침하면 가운데에 **「폴더 연결 복원 중…」**만 보이고, 연결 안내·칸반으로 넘어가지 않음.

### 원인

1. **시작 시 `requestPermission` 호출**  
   File System Access API의 권한 요청은 **사용자 제스처**(클릭 등)가 있어야 한다.  
   `useRestoreFolder` / 레거시 핸들 마이그레이션에서 페이지 로드 직후 `handle.requestPermission()`을 호출하면, 브라우저가 권한창을 제대로 띄우지 못한 채 대기하다가 Promise가 끝나지 않을 수 있다.

2. **복원 예외 후 `ready` 미설정**  
   IndexedDB 마이그레이션·폴더 `load()` 중 에러가 나면 `setReady(true)`까지 도달하지 못해 로딩 화면에 고정된다.

### 해결

1. 앱 시작 복원(`restoreFolderConnection`)에서는 **`queryPermission`만** 사용 (`hasDirectoryPermission`).  
   권한이 없으면 스냅샷 없이 프로젝트 목록/미연결 안내만 표시.
2. 권한 재요청은 사이드바에서 프로젝트 클릭·「새 프로젝트/프로젝트 열기」 등 **사용자 동작** 안에서 `ensureDirectoryPermission`으로 처리.
3. `App`의 `useRestoreFolder`는 `try/finally`로 **성공·실패와 관계없이 `setReady(true)`**.
4. 레거시 단일 핸들 마이그레이션도 query만 확인하고, 실패 시 조용히 건너뜀.

### 확인

1. 강력 새로고침 → 「폴더 연결 복원 중…」이 잠깐 뜨더라도 **반드시** 안내 화면 또는 칸반으로 넘어가는지
2. 이전에 연결한 프로젝트가 사이드바에 보이면 클릭 → 권한 허용 후 내용 로드되는지
3. 연결이 전혀 없으면 「로컬 폴더를 연결해 주세요」 안내가 보이는지

### 관련 파일

- `src/storage/handleStore.ts` (`hasDirectoryPermission`, `ensureDirectoryPermission`, 마이그레이션)
- `src/storage/restoreFolder.ts`
- `src/storage/projectConnection.ts` (`switchToProject`)
- `src/App.tsx` (`useRestoreFolder`)

---

## 6. 토스트·휴지통 패널이 투명하거나 그림자가 과함

### 증상

- 텍스트 복사·원고 저장 후 뜨는 토스트가 **반투명**해 뒤 화면이 비침
- 그림자가 지나치게 진함
- 휴지통 패널 배경도 마찬가지로 비칠 수 있음

### 원인

`.app-toast` / `.trash-panel`이 **존재하지 않는** CSS 변수 `--bg-elevated`, `--bg-primary`를 참조했다.  
이 프로젝트의 실제 토큰은 `--bg-base` / `--bg-surface` / `--bg-surface-elevated`이다.  
변수 해석 실패 → 배경색 미적용 → 투명하게 보임.

### 해결

1. 토스트: `--text-primary` 배경 + `--bg-surface` 글자 + `--radius-pill` + `--shadow-md` (비트 툴팁과 같은 단색 톤)
2. 오류 토스트: `--danger` 배경 + 흰 글자
3. 휴지통 패널: `--bg-surface` + `--shadow-md`
4. Toast UI Editor와 클래스 충돌을 피하려면 `.toast` 대신 `.app-toast` 사용

### 관련 파일

- `src/index.css` (`.app-toast`, `.trash-panel`)
- `src/components/Toast.tsx`

---

## 7. 참고↔칸반 드래그 이동 후 킵 모달이 열림

### 증상

참고 메모를 칸반으로(또는 씬을 참고 드로어로) **드래그해 옮기기만** 했는데, 드롭 직후 **킵 모달**이 열린다.  
클릭으로 카드를 연 것처럼 보인다.

### 원인

1. **변환 후 자동 선택**  
   `convertReferenceToScene` / `convertSceneToReference`가 새로 만든 씬·참고의 id를 `selectedSceneId` / `selectedReferenceId`에 넣고 있었다.  
   칸반·드로어는 이 선택이 있으면 곧바로 `SceneKeepModal` / `ReferenceKeepModal`을 띄운다.  
   드래그 이동은 “위치만 바꾸기”인데, 선택이 따라붙어 모달이 열렸다.

2. **드롭 직후 click (부가)**  
   `@dnd-kit` 드래그가 끝난 뒤 브라우저가 `click`을 한 번 더 보낼 수 있다.  
   카드 `onClick` → `selectScene` / `selectReference`로도 모달이 열릴 수 있다.

### 해결

1. 변환(이동) 리듀서에서는 **선택 state를 세팅하지 않는다.** (원본 선택만 해제)
2. 카드에서 `isDragging`이 true였으면 `useSuppressClickAfterDrag`로 직후 `click`을 무시하고, 드롭 후 짧게(약 80ms) 유지한 뒤 해제한다.

메뉴의 「참고 메모로 이동」도 같은 convert 액션을 쓰므로, 이동만 하고 모달은 열지 않는 동작이 된다. 편집이 필요하면 카드를 다시 클릭한다.

### 관련 파일

- `src/store/projectSlice.ts` (`convertReferenceToScene`, `convertSceneToReference`)
- `src/hooks/useSuppressClickAfterDrag.ts` / `src/components/NotePreviewCard.tsx`
- `src/utils/workspaceDrag.ts`

---

## 8. 자동저장 직후 추가 편집이 디스크에 안 남는 것처럼

### 증상

저장 배지가 `저장됨`으로 바뀐 직후에도, 저장이 돌던 중에 친 글자가 폴더 JSON에 반영되지 않을 수 있다.

### 원인

`scheduleSave` 콜백이 **스케줄 시점의 스냅샷**을 닫아 두고, 완료 시 무조건 `setSaveStatus('saved')`를 호출했다.  
저장 `await` 중에 편집이 있으면 `dirty`로 바뀌어도, 이전 저장 완료 콜백이 `saved`로 덮어썼다.

### 해결

1. 저장 직전·직후 모두 `store.getState()`로 최신 프로젝트 스냅샷을 읽는다.
2. 완료 시 `saveStatus === 'saving'`일 때만 `saved`로 바꾼다. 이미 `dirty`면 건드리지 않고 재저장을 요청한다.
3. `autosave`에 저장 잠금 + `saveAgain` 큐로 동시 저장을 직렬화한다.
4. `visibilitychange`/`beforeunload` flush 리스너는 마운트 시 1회만 등록한다.

### 관련 파일

- `src/App.tsx` (`useAutosave`)
- `src/storage/autosave.ts`

---

## 9. 검색·태그 필터 중 드래그하면 순서가 어긋남

### 증상

칸반/참고에서 검색·태그로 **일부만 보이는 상태**에서 카드를 드래그하면, 숨겨진 항목과 순서가 뒤섞이거나 예상과 다른 위치에 떨어진다.

### 원인

`SortableContext`에는 **필터된 목록**만 넣고, `placeScene`/`placeReference`는 **전체 siblings** 기준으로 order를 계산했다.

### 해결

필터 활성 시 해당 영역의 **순서 변경(place)** 만 막고 토스트로 안내한다.  
참고↔칸반 **이동·변환** 드래그는 그대로 허용한다. (`useSortable`을 disabled 하면 변환 드래그까지 막히므로 핸들러에서만 차단)

### 관련 파일

- `src/utils/workspaceDrag.ts`
- `src/components/WorkspaceDndProvider.tsx`
- `src/store/selectors.ts` (`selectSceneFilterActive` 등)

---

## 10. 기존 폴더를 열었는데 문서·프로젝트가 비어 보임

### 증상

예전에 쓰던 폴더를 「기존 워크스페이스 열기」로 연결했는데, 사이드바에 빈 「새 스토리」만 보이거나 문서가 없다.  
디스크에는 `projects/다른id/` 에 씬·문서 JSON이 남아 있다.

### 원인

1. 저장 형식이 **단일 프로젝트 루트** → **워크스페이스(`workspace.json` + `projects/{id}/`)** 로 바뀜
2. `workspace.json`만 먼저 생기고, 실제 데이터가 있는 프로젝트 폴더가 **목록에 등록되지 않은** 반쯤 마이그레이션 상태
3. 예전에는 `workspace.json`이 있으면 디스크 스캔/루트 잔여 마이그레이션을 하지 않았다

### 해결 (앱)

폴더를 열 때 `ensureWorkspaceLayout`이:

1. `projects/`를 스캔해 목록에 없는 프로젝트를 `workspace.json`에 편입
2. 루트에 남은 `manifest.json`·`documents/` 등 레거시를 `projects/{id}/`로 이동 (워크스페이스 `trash/projects`는 유지)

그래도 활성이 빈 프로젝트면 사이드바에서 다른 프로젝트로 전환하면 된다.

### 체험용 샘플

레포의 `sample-workspace/` 는 위 형식의 정상 예시이다.
앱 연결 안내 하단 **체험용 샘플 받기** 텍스트 링크(`public/sample-workspace.zip`)로도 받을 수 있다. (`npm run pack:sample`로 ZIP 재생성)
**sample-workspace** 폴더를 「기존 워크스페이스 열기」로 선택하거나, 연결 안내 화면에 **폴더를 드래그앤드롭**해도 된다.

### 관련 파일

- `src/storage/workspaceStorage.ts` (`reconcileProjectsFromDisk`, `migrateLeftoverLegacyRoot`)
- `src/storage/projectConnection.ts` (`connectWorkspaceFromHandle`)
- `src/components/FolderConnectPrompt.tsx`
- `sample-workspace/README.md`

---

## 11. 칸반 끝에서 왼쪽 화살표가 안 움직임

### 증상

가로 스크롤을 **맨 끝**(마지막 비트 쪽)까지 보낸 뒤 왼쪽 화살표를 눌러도 보드가 이동하지 않는다.

### 원인

`getFocusedBeatFromBoardScroll`은 끝 스크롤 시 프로그레스 동기화용으로 **마지막 비트**를 반환한다.  
`scrollBoardSnap`이 이를 기준으로 N열을 왼쪽으로 점프하면, 목표가 **이미 뷰포트 왼쪽**에 있는 열이라 `scrollLeft`가 거의 변하지 않았다.

### 해결

화살표 스냅은 끝→마지막 비트 강제 없이 **왼쪽 앵커 열**을 기준으로 점프한다.  
목표 열로 스크롤해도 위치가 같으면 방향으로 한 칸씩 더 이동한다.

### 관련 파일

- `src/utils/scrollBeat.ts` (`scrollBoardSnap`, `getLeftAnchoredBeat`)
