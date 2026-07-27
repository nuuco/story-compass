import { useState } from 'react';

export function SearchInput({
  id,
  name,
  value,
  onChange,
  placeholder = '제목·내용·태그 검색',
  variant = 'line',
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** line: 밑줄형 / icon: 아이콘 → 포커스 시 확장 */
  variant?: 'line' | 'icon';
}) {
  const [focused, setFocused] = useState(false);
  const expanded = focused || value.trim().length > 0;

  return (
    <label
      className={[
        'search-input',
        `search-input--${variant}`,
        expanded ? 'is-expanded' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      htmlFor={id}
    >
      <span className="material-symbols-rounded search-input__icon" aria-hidden>
        search
      </span>
      <input
        id={id}
        name={name}
        type="search"
        value={value}
        placeholder={
          variant === 'icon' && !expanded ? '' : expanded ? placeholder : '검색'
        }
        aria-label={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {value.trim() ? (
        <button
          type="button"
          className="search-input__clear"
          aria-label="검색어 지우기"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange('')}
        >
          <span className="material-symbols-rounded">close</span>
        </button>
      ) : null}
    </label>
  );
}
