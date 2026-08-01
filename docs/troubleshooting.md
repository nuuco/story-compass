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
2. 태그도 **문자열 draft**로 두고, commit 시점에만 `parseTags`
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
- `src/utils/tags.ts` (`formatTags`)

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
