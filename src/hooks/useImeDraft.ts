import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CompositionEvent,
} from 'react';

/**
 * 한글 IME 조합 중 Redux/부모 동기화를 막아
 * 마지막 글자 중복·자모 분리 문제를 방지하는 로컬 초안 훅.
 */
export function useImeDraft(
  externalValue: string,
  onCommit: (value: string) => void,
  resetKey?: string,
) {
  const [draft, setDraft] = useState(externalValue);
  const composingRef = useRef(false);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  useEffect(() => {
    if (resetKey !== undefined) {
      setDraft(externalValue);
      composingRef.current = false;
    }
    // resetKey 변경 시에만 외부값으로 리셋 (씬/참고 전환)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    if (!composingRef.current) {
      setDraft(externalValue);
    }
  }, [externalValue]);

  const commit = useCallback((value: string) => {
    onCommitRef.current(value);
  }, []);

  return {
    value: draft,
    composing: composingRef,
    onChange: (next: string) => {
      setDraft(next);
      if (!composingRef.current) {
        commit(next);
      }
    },
    onCompositionStart: () => {
      composingRef.current = true;
    },
    onCompositionEnd: (next: string) => {
      composingRef.current = false;
      setDraft(next);
      commit(next);
    },
    onBlurCommit: () => {
      if (composingRef.current) return;
      commit(draft);
    },
    setDraft,
  };
}

/** input/textarea에 바로 붙일 수 있는 props */
export function imeInputProps(ime: ReturnType<typeof useImeDraft>): {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onCompositionStart: () => void;
  onCompositionEnd: (
    e: CompositionEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
} {
  return {
    value: ime.value,
    onChange: (e) => ime.onChange(e.target.value),
    onCompositionStart: ime.onCompositionStart,
    onCompositionEnd: (e) => ime.onCompositionEnd(e.currentTarget.value),
  };
}
