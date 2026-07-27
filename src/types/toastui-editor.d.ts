declare module '@toast-ui/editor' {
  export type EditorType = 'markdown' | 'wysiwyg';

  export interface EditorOptions {
    el: HTMLElement;
    height?: string;
    minHeight?: string;
    initialValue?: string;
    initialEditType?: EditorType;
    previewStyle?: 'tab' | 'vertical';
    hideModeSwitch?: boolean;
    usageStatistics?: boolean;
    placeholder?: string;
    autofocus?: boolean;
    toolbarItems?: unknown[];
    hooks?: {
      addImageBlobHook?: (
        blob: Blob | File,
        callback: (url: string, altText?: string) => void,
      ) => void;
    };
  }

  export default class Editor {
    constructor(options: EditorOptions);
    getHTML(): string;
    setHTML(html: string, cursorToEnd?: boolean): void;
    on(event: string, handler: () => void): void;
    destroy(): void;
  }
}
