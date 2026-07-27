import { useEffect, useRef } from 'react';
import Editor from '@toast-ui/editor';
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor/dist/theme/toastui-editor-dark.css';
import { useTheme } from '../theme/ThemeProvider';

interface RichTextEditorProps {
  contentHtml: string;
  onChange: (html: string) => void;
  placeholder?: string;
  showToolbar?: boolean;
  editable?: boolean;
  height?: string;
  /** keep: 구글 킵처럼 테두리 최소·툴바 하단 */
  variant?: 'default' | 'keep';
}

export function RichTextEditor({
  contentHtml,
  onChange,
  placeholder = '내용을 입력하세요',
  showToolbar = true,
  editable = true,
  height = '220px',
  variant = 'default',
}: RichTextEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const onChangeRef = useRef(onChange);
  const { theme } = useTheme();

  onChangeRef.current = onChange;

  useEffect(() => {
    if (!rootRef.current || !editable) return;

    const editor = new Editor({
      el: rootRef.current,
      height,
      initialValue: '',
      initialEditType: 'wysiwyg',
      previewStyle: 'vertical',
      hideModeSwitch: true,
      usageStatistics: false,
      placeholder,
      autofocus: false,
      toolbarItems: showToolbar
        ? [
            ['heading', 'bold', 'italic', 'strike'],
            ['hr', 'quote'],
            ['ul', 'ol', 'task'],
            ['table', 'image', 'link'],
          ]
        : [],
      hooks: {
        addImageBlobHook: (blob, callback) => {
          const reader = new FileReader();
          reader.onload = () => {
            callback(String(reader.result), 'image');
          };
          reader.readAsDataURL(blob);
        },
      },
    });

    if (contentHtml?.trim()) {
      editor.setHTML(contentHtml);
    }

    editor.on('change', () => {
      onChangeRef.current(editor.getHTML());
    });

    editorRef.current = editor;

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, showToolbar, height, placeholder, variant]);

  if (!editable) {
    return (
      <div
        className="text-sm leading-relaxed text-ink [&_p]:mb-1"
        dangerouslySetInnerHTML={{
          __html:
            contentHtml?.trim() && contentHtml !== '<p><br></p>'
              ? contentHtml
              : `<p class="text-ink-muted">${placeholder}</p>`,
        }}
      />
    );
  }

  return (
    <div
      className={`toast-editor-wrap ${variant === 'keep' ? 'toast-editor-keep' : ''} ${
        theme === 'dark' ? 'toastui-editor-dark' : ''
      }`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div ref={rootRef} />
    </div>
  );
}
