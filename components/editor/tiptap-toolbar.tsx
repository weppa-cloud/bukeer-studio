'use client';

import type { Editor } from '@tiptap/react';
import { useCallback } from 'react';

interface TiptapToolbarProps {
  editor: Editor;
  variant?: 'bubble' | 'fixed';
  onImageUpload?: (file: File) => void;
}

interface ToolbarButton {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  isActive?: () => boolean;
  disabled?: boolean;
}

export function TiptapToolbar({ editor, variant = 'bubble', onImageUpload }: TiptapToolbarProps) {
  const handleLink = useCallback(() => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt('URL del enlace:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const handleImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file && onImageUpload) {
        onImageUpload(file);
      } else if (file) {
        // Fallback: URL prompt
        const url = window.prompt('URL de la imagen:');
        if (url) editor.chain().focus().setImage({ src: url }).run();
      }
    };
    input.click();
  }, [editor, onImageUpload]);

  const buttons: ToolbarButton[] = [
    {
      id: 'bold',
      label: 'Negrita',
      icon: 'B',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
    },
    {
      id: 'italic',
      label: 'Cursiva',
      icon: 'I',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
    },
    {
      id: 'h2',
      label: 'Título H2',
      icon: 'H2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive('heading', { level: 2 }),
    },
    {
      id: 'h3',
      label: 'Título H3',
      icon: 'H3',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor.isActive('heading', { level: 3 }),
    },
    {
      id: 'bullet-list',
      label: 'Lista',
      icon: '•',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
    },
    {
      id: 'ordered-list',
      label: 'Lista numerada',
      icon: '1.',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
    },
    {
      id: 'blockquote',
      label: 'Cita',
      icon: '"',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive('blockquote'),
    },
    {
      id: 'code',
      label: 'Código',
      icon: '</>',
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.isActive('codeBlock'),
    },
    {
      id: 'link',
      label: 'Enlace',
      icon: '🔗',
      action: handleLink,
      isActive: () => editor.isActive('link'),
    },
    {
      id: 'image',
      label: 'Imagen',
      icon: '🖼',
      action: handleImage,
    },
    {
      id: 'undo',
      label: 'Deshacer',
      icon: '↩',
      action: () => editor.chain().focus().undo().run(),
      disabled: !editor.can().undo(),
    },
    {
      id: 'redo',
      label: 'Rehacer',
      icon: '↪',
      action: () => editor.chain().focus().redo().run(),
      disabled: !editor.can().redo(),
    },
  ];

  return (
    <div
      className={`tiptap-toolbar tiptap-toolbar--${variant}`}
      role="toolbar"
      aria-label="Editor formatting"
      data-testid="tiptap-toolbar"
    >
      {buttons.map((btn) => (
        <button
          key={btn.id}
          onClick={(e) => {
            e.preventDefault();
            btn.action();
          }}
          disabled={btn.disabled}
          className={`tiptap-toolbar-btn ${btn.isActive?.() ? 'is-active' : ''}`}
          title={btn.label}
          data-testid={`toolbar-${btn.id}`}
          type="button"
        >
          {btn.id === 'bold' ? <strong>{btn.icon}</strong> : null}
          {btn.id === 'italic' ? <em>{btn.icon}</em> : null}
          {btn.id !== 'bold' && btn.id !== 'italic' ? (
            <span>{btn.icon}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
