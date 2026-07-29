import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setReferenceDrawerOpen } from '../store/projectSlice';
import { useTheme } from '../theme/ThemeProvider';

const STATUS_LABEL: Record<string, string> = {
  idle: '대기 중',
  dirty: '저장 대기…',
  saving: '저장 중…',
  saved: '자동 저장됨',
  error: '저장 오류',
  'no-folder': '폴더 미연결',
};

export function WorkspaceActions() {
  const dispatch = useAppDispatch();
  const saveStatus = useAppSelector((s) => s.project.saveStatus);
  const storageMode = useAppSelector((s) => s.project.storageMode);
  const referenceDrawerOpen = useAppSelector(
    (s) => s.project.referenceDrawerOpen,
  );
  const folderConnected = storageMode === 'folder';
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="workspace-actions">
      <div className={`badge-saved badge-saved--${saveStatus}`}>
        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
          {saveStatus === 'saving' ? 'cloud_sync' : 'cloud_done'}
        </span>
        {STATUS_LABEL[saveStatus]}
      </div>
      <button
        type="button"
        className="icon-btn"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? '라이트 모드' : '다크 모드'}
        title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
      >
        <span className="material-symbols-rounded">
          {theme === 'dark' ? 'light_mode' : 'dark_mode'}
        </span>
      </button>
      <button
        type="button"
        className={`icon-btn ${referenceDrawerOpen ? 'active' : ''}`}
        disabled={!folderConnected}
        onClick={() => dispatch(setReferenceDrawerOpen(!referenceDrawerOpen))}
        aria-label="참고 자료"
        title={folderConnected ? '참고 자료' : '폴더 연결 후 사용 가능'}
      >
        <span className="material-symbols-rounded">dock_to_left</span>
      </button>
    </div>
  );
}
