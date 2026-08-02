# sample-workspace

스토리 나침반 **체험용 워크스페이스**입니다.  
앱의 「기존 워크스페이스 열기」로 **이 폴더 자체**를 선택하세요.  
(`projects` 하위가 아니라 `sample-workspace` 루트)

## 폴더 형식 (현재 스키마)

```text
sample-workspace/          ← 여기를 연결
  workspace.json           ← 프로젝트 목록·활성 id
  projects/
    proj_sample_nighttrain/   # 본편 샘플 「밤기차의 손님」
      manifest.json
      documents/
      scenes/
      references/
      trash/                  # 프로젝트 휴지통
      assets/ · beats/
    proj_sample_sketch/       # 짧은 두 번째 프로젝트
  trash/
    projects/                 # 삭제된 프로젝트용 (비어 있음)
```

루트에 `manifest.json`이 있으면 **예전 단일 프로젝트** 형식입니다.  
지금 앱은 루트 `workspace.json` + `projects/{id}/` 를 씁니다.

## 여는 방법

1. 앱 연결 안내에서 **체험용 샘플 받기**로 ZIP을 받거나, 이 폴더를 그대로 사용
2. Chrome/Edge에서 **기존 워크스페이스 열기**로 이 폴더를 선택하거나, 연결 안내 화면에 **폴더를 끌어다 놓기**
3. 사이드바에서 「밤기차의 손님」·「짧은 스케치」 전환

배포용 ZIP은 `public/sample-workspace.zip`이며, 샘플을 수정한 뒤 `npm run pack:sample`로 다시 만듭니다.

「밤기차의 손님」 본편은 15비트(오프닝~파이널) 샘플 씬이 채워져 있습니다.  
「짧은 스케치」는 DnD·필터 체험용으로 앞쪽 비트만 있습니다.

`projects` 하위가 아니라 **이 폴더 자체**를 연결하세요.  
브라우저 보안상 경로를 자동으로 열 수는 없습니다.
