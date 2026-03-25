'use client';

import type { Editor } from '@tiptap/react';
import { useCallback } from 'react';

// ─── SVG Icon Components ────────────────────────────────────────────
// Lightweight inline SVGs — no external icon library needed.

const icons: Record<string, JSX.Element> = {
  bold: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </svg>
  ),
  italic: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  ),
  strikethrough: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4H9a3 3 0 0 0 0 6h6" /><line x1="4" y1="12" x2="20" y2="12" /><path d="M15 12a3 3 0 0 1 0 6H8" />
    </svg>
  ),
  h1: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="M17 12l3-2v8" />
    </svg>
  ),
  h2: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" />
    </svg>
  ),
  h3: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2" /><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2" />
    </svg>
  ),
  bulletList: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" /><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  orderedList: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
      <text x="3" y="8" fontSize="8" fontWeight="600" fill="currentColor" stroke="none" fontFamily="system-ui">1</text>
      <text x="3" y="14" fontSize="8" fontWeight="600" fill="currentColor" stroke="none" fontFamily="system-ui">2</text>
      <text x="3" y="20" fontSize="8" fontWeight="600" fill="currentColor" stroke="none" fontFamily="system-ui">3</text>
    </svg>
  ),
  blockquote: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
    </svg>
  ),
  code: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  hr: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  ),
  link: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  unlink: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71" />
      <path d="m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71" />
      <line x1="8" y1="2" x2="8" y2="5" /><line x1="2" y1="8" x2="5" y2="8" /><line x1="16" y1="19" x2="16" y2="22" /><line x1="19" y1="16" x2="22" y2="16" />
    </svg>
  ),
  image: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  undo: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  ),
  redo: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
};

// ─── Types ──────────────────────────────────────────────────────────

interface TiptapToolbarProps {
  editor: Editor;
  variant?: 'bubble' | 'fixed';
  onImageUpload?: (file: File) => void;
}

interface ToolbarButton {
  id: string;
  label: string;
  iconKey: string;
  action: () => void;
  isActive?: () => boolean;
  disabled?: boolean;
}

type ToolbarItem = ToolbarButton | 'separator';

// ─── Component ──────────────────────────────────────────────────────

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
        const url = window.prompt('URL de la imagen:');
        if (url) editor.chain().focus().setImage({ src: url }).run();
      }
    };
    input.click();
  }, [editor, onImageUpload]);

  const items: ToolbarItem[] = [
    {
      id: 'bold',
      label: 'Negrita (Ctrl+B)',
      iconKey: 'bold',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
    },
    {
      id: 'italic',
      label: 'Cursiva (Ctrl+I)',
      iconKey: 'italic',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
    },
    {
      id: 'strikethrough',
      label: 'Tachado',
      iconKey: 'strikethrough',
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: () => editor.isActive('strike'),
    },
    'separator',
    {
      id: 'h2',
      label: 'Titulo',
      iconKey: 'h2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive('heading', { level: 2 }),
    },
    {
      id: 'h3',
      label: 'Subtitulo',
      iconKey: 'h3',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor.isActive('heading', { level: 3 }),
    },
    'separator',
    {
      id: 'bullet-list',
      label: 'Lista con viñetas',
      iconKey: 'bulletList',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
    },
    {
      id: 'ordered-list',
      label: 'Lista numerada',
      iconKey: 'orderedList',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
    },
    'separator',
    {
      id: 'blockquote',
      label: 'Cita',
      iconKey: 'blockquote',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive('blockquote'),
    },
    {
      id: 'code',
      label: 'Bloque de codigo',
      iconKey: 'code',
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.isActive('codeBlock'),
    },
    {
      id: 'hr',
      label: 'Separador',
      iconKey: 'hr',
      action: () => editor.chain().focus().setHorizontalRule().run(),
    },
    'separator',
    {
      id: 'link',
      label: editor.isActive('link') ? 'Quitar enlace' : 'Insertar enlace',
      iconKey: editor.isActive('link') ? 'unlink' : 'link',
      action: handleLink,
      isActive: () => editor.isActive('link'),
    },
    {
      id: 'image',
      label: 'Insertar imagen',
      iconKey: 'image',
      action: handleImage,
    },
    'separator',
    {
      id: 'undo',
      label: 'Deshacer (Ctrl+Z)',
      iconKey: 'undo',
      action: () => editor.chain().focus().undo().run(),
      disabled: !editor.can().undo(),
    },
    {
      id: 'redo',
      label: 'Rehacer (Ctrl+Y)',
      iconKey: 'redo',
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
      {items.map((item, idx) => {
        if (item === 'separator') {
          return <span key={`sep-${idx}`} className="tiptap-toolbar-separator" />;
        }
        const btn = item;
        return (
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
            {icons[btn.iconKey] ?? <span>{btn.iconKey}</span>}
          </button>
        );
      })}
    </div>
  );
}
