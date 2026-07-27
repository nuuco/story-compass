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

권한 팝업이 뜨면 허용. ZIP 모드로 열면 폴더 핸들은 지워짐.

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
