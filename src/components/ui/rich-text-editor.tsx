import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Strikethrough,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const ToolbarButton = ({
  onClick,
  isActive,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      'p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
      isActive && 'bg-primary/10 text-primary'
    )}
  >
    {children}
  </button>
);

export const RichTextEditor = ({
  value = '',
  onChange,
  placeholder = 'Saisir du texte...',
  className,
  minHeight = 'min-h-[96px]',
}: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none outline-none p-3 text-slate-700',
          minHeight
        ),
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML();
      // Return empty string if only empty paragraph
      const isEmpty = editor.isEmpty;
      onChange?.(isEmpty ? '' : html);
    },
  });

  // Sync external value changes (e.g. when loading a candidate)
  const currentContent = editor?.getHTML();
  if (editor && value !== undefined && value !== currentContent) {
    // Only update if the new value is meaningfully different
    const incomingEmpty = !value || value === '<p></p>';
    const editorEmpty = editor.isEmpty;
    if (!(incomingEmpty && editorEmpty) && value !== currentContent) {
      editor.commands.setContent(value, false);
    }
  }

  if (!editor) return null;

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all',
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-100 bg-slate-50">
        <ToolbarButton
          title="Gras"
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
        >
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Italique"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
        >
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Barré"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolbarButton>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        <ToolbarButton
          title="Liste à puces"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
        >
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Liste numérotée"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        <ToolbarButton
          title="Annuler"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Rétablir"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <RotateCw className="w-3.5 h-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor area with placeholder */}
      <div className="relative">
        {editor.isEmpty && (
          <p className="absolute top-3 left-3 text-sm text-slate-400 pointer-events-none select-none">
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default RichTextEditor;
