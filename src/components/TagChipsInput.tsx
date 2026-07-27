import {
  useRef,
  useState,
  type KeyboardEvent,
  type CompositionEvent,
} from 'react';

function normalizeTag(raw: string): string {
  return raw.replace(/^#/, '').trim();
}

/**
 * 완성된 태그는 칩(+X), 입력칸은 다음 태그만 작성.
 * 스페이스/쉼표는 onChange에서 감지해 한 번에 확정 (한글 IME 두 번 스페이스 방지).
 */
export function TagChipsInput({
  tags,
  onChange,
  placeholder = '태그 추가',
  id = 'tag-input',
  name = 'tags',
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  id?: string;
  name?: string;
}) {
  const [draft, setDraft] = useState('');
  const composingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalized = tags.map((t) => normalizeTag(t)).filter(Boolean);

  function addTags(candidates: string[]) {
    let next = [...normalized];
    let changed = false;
    for (const raw of candidates) {
      const t = normalizeTag(raw);
      if (!t) continue;
      if (next.some((x) => x.toLowerCase() === t.toLowerCase())) continue;
      next.push(t);
      changed = true;
    }
    if (changed) onChange(next);
  }

  function commitDraft(raw: string = draft) {
    const next = normalizeTag(raw);
    if (!next) {
      setDraft('');
      return;
    }
    addTags([next]);
    setDraft('');
  }

  /** 스페이스·쉼표로 나뉜 입력을 칩으로 확정 */
  function ingestTyped(raw: string) {
    const v = raw.replace(/^#+/, '');
    if (!/[\s,]/.test(v)) {
      setDraft(v);
      return;
    }
    const endsWithSep = /[\s,]$/.test(v);
    const tokens = v.split(/[\s,]+/).filter(Boolean);
    if (tokens.length === 0) {
      setDraft('');
      return;
    }
    if (!endsWithSep) {
      addTags(tokens.slice(0, -1));
      setDraft(tokens[tokens.length - 1] ?? '');
      return;
    }
    addTags(tokens);
    setDraft('');
  }

  function removeTag(tag: string) {
    onChange(normalized.filter((t) => t !== tag));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const composing = composingRef.current || e.nativeEvent.isComposing;
    if (e.key === 'Enter') {
      if (composing) return;
      e.preventDefault();
      commitDraft();
      return;
    }
    if (e.key === 'Backspace' && !draft && !composing && normalized.length > 0) {
      removeTag(normalized[normalized.length - 1]!);
    }
  }

  return (
    <div
      className="tag-chips"
      onClick={() => inputRef.current?.focus()}
    >
      {normalized.map((tag) => (
        <span key={tag} className="tag-chip tag-chip--editable">
          #{tag}
          <button
            type="button"
            className="tag-chip__remove"
            aria-label={`${tag} 태그 삭제`}
            onClick={(e) => {
              e.stopPropagation();
              removeTag(tag);
            }}
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        name={name}
        className="tag-chips__input"
        value={draft}
        placeholder={normalized.length === 0 ? placeholder : ''}
        aria-label={placeholder}
        onChange={(e) => ingestTyped(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (!composingRef.current) commitDraft();
        }}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={(e: CompositionEvent<HTMLInputElement>) => {
          composingRef.current = false;
          // 조합 종료 직후 붙은 스페이스/쉼표도 한 번에 처리
          ingestTyped(e.currentTarget.value);
        }}
      />
    </div>
  );
}
