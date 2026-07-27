import { useEffect, useRef, useState } from 'react';

interface TagFilterProps {
  tags: string[];
  /** 선택된 태그 (다중) */
  value: string[];
  onChange: (value: string[]) => void;
  /** 태그 자체를 노트들에서 제거할 때 */
  onRemoveTag?: (tag: string) => void;
  label?: string;
  /** default: 라벨 버튼 / icon: 아이콘 + 선택 칩 */
  variant?: 'default' | 'icon';
}

function norm(tag: string): string {
  return tag.replace(/^#/, '').trim();
}

export function TagFilter({
  tags,
  value,
  onChange,
  onRemoveTag,
  label = '# 태그',
  variant = 'default',
}: TagFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = value.map(norm).filter(Boolean);
  const hasSelection = selected.length > 0;
  const isIcon = variant === 'icon';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function toggle(tag: string) {
    const t = norm(tag);
    if (!t) return;
    if (selected.includes(t)) {
      onChange(selected.filter((x) => x !== t));
    } else {
      onChange([...selected, t]);
    }
  }

  function removeSelected(tag: string) {
    onChange(selected.filter((x) => x !== norm(tag)));
  }

  const chips = selected.map((t) => (
    <span key={t} className="tag-chip tag-chip--filter">
      #{t}
      <span
        role="button"
        tabIndex={0}
        className="tag-chip__remove"
        aria-label={`${t} 필터 해제`}
        onClick={(e) => {
          e.stopPropagation();
          removeSelected(t);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            removeSelected(t);
          }
        }}
      >
        <span className="material-symbols-rounded">close</span>
      </span>
    </span>
  ));

  return (
    <div
      className={`tag-filter ${isIcon ? 'tag-filter--icon' : ''}`}
      ref={ref}
    >
      {isIcon && hasSelection ? (
        <div className="tag-filter__chips">{chips}</div>
      ) : null}
      <button
        type="button"
        className={`tag-filter__trigger ${hasSelection ? 'has-value' : ''} ${isIcon ? 'tag-filter__trigger--icon' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        title={label}
        aria-expanded={open}
      >
        <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
          sell
        </span>
        {isIcon && hasSelection ? (
          <span className="tag-filter__badge">{selected.length}</span>
        ) : null}
        {!isIcon &&
          (hasSelection ? (
            <span className="tag-filter__selected">{chips}</span>
          ) : (
            <>
              {label}
              {tags.length > 0 && (
                <span className="tag-filter__count">{tags.length}</span>
              )}
            </>
          ))}
      </button>
      {open && (
        <div className="tag-filter__panel">
          <button
            type="button"
            className={`tag-filter__option ${!hasSelection ? 'active' : ''}`}
            onClick={() => onChange([])}
          >
            전체 보기
          </button>
          {tags.length === 0 ? (
            <p className="tag-filter__empty">태그가 없습니다.</p>
          ) : (
            tags.map((t) => {
              const isOn = selected.includes(t);
              return (
                <div
                  key={t}
                  className={`tag-filter__row ${isOn ? 'active' : ''}`}
                >
                  <button
                    type="button"
                    className="tag-filter__option"
                    onClick={() => toggle(t)}
                  >
                    <span
                      className={`tag-filter__check ${isOn ? 'on' : ''}`}
                      aria-hidden
                    >
                      {isOn ? (
                        <span className="material-symbols-rounded">check</span>
                      ) : null}
                    </span>
                    #{t}
                  </button>
                  {onRemoveTag && (
                    <button
                      type="button"
                      className="tag-filter__remove"
                      aria-label={`${t} 태그 삭제`}
                      title="태그 삭제"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveTag(t);
                      }}
                    >
                      <span className="material-symbols-rounded">close</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
