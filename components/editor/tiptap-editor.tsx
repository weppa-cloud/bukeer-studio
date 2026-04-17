'use client';

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

/**
 * Workaround for React 18 + ProseMirror DOM reconciliation conflict.
 * See: https://github.com/ueberdosis/tiptap/issues/3764
 *
 * When React re-renders while ProseMirror has modified the DOM,
 * `insertBefore` throws because the reference node was moved.
 * This patch silently handles the case instead of crashing.
 */
if (typeof window !== 'undefined') {
  const origInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends globalThis.Node>(newNode: T, refNode: globalThis.Node | null): T {
    if (refNode && refNode.parentNode !== this) {
      // ProseMirror moved this node — skip the insert (React will retry)
      return newNode;
    }
    return origInsertBefore.call(this, newNode, refNode) as T;
  };
}
import { Markdown } from 'tiptap-markdown';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { useEffect, useCallback } from 'react';
import { TiptapToolbar } from './tiptap-toolbar';

interface TiptapEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  onEditorReady?: (editor: ReturnType<typeof useEditor>) => void;
  placeholder?: string;
  authToken?: string;
  websiteId?: string;
}

export function TiptapEditor({
  content,
  onChange,
  onEditorReady,
  placeholder = 'Escribe aqui o presiona "/" para insertar bloques...',
  authToken,
  websiteId,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'tiptap-link' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'tiptap-image' },
        allowBase64: true,
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') return 'Titulo...';
          return placeholder;
        },
      }),
    ],
    content,
    immediatelyRender: false,
    // Prevent React re-renders on every ProseMirror transaction.
    // Without this, typing triggers: onUpdate → onChange → setContent (parent)
    // → React re-render → DOM reconciliation conflicts with ProseMirror.
    shouldRerenderOnTransaction: false,
    onUpdate: ({ editor }) => {
      requestAnimationFrame(() => {
        if (!editor.isDestroyed) {
          const md = editor.storage.markdown.getMarkdown();
          onChange(md);
        }
      });
    },
    editorProps: {
      attributes: {
        class: 'tiptap-content',
        'data-testid': 'tiptap-editor',
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved || !event.dataTransfer?.files?.length) return false;
        const file = event.dataTransfer.files[0];
        if (!file.type.startsWith('image/')) return false;
        event.preventDefault();
        handleImageUpload(file);
        return true;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) handleImageUpload(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  // ── Image upload ──────────────────────────────────────────────────
  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!editor) return;

      const placeholderUrl = URL.createObjectURL(file);
      editor.chain().focus().setImage({ src: placeholderUrl, alt: file.name }).run();

      try {
        if (!websiteId) {
          throw new Error('websiteId is required for image upload');
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('websiteId', websiteId);
        formData.append('entityType', 'blog_post');
        formData.append('entitySlug', 'editor');
        formData.append('usageContext', 'body');
        formData.append('locale', 'es');

        const response = await fetch('/api/media/upload', {
          method: 'POST',
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
          body: formData,
        });

        const payload = await response.json().catch(() => null) as
          | { success?: boolean; data?: { publicUrl?: string }; error?: { message?: string } }
          | null;
        if (!response.ok || !payload?.success || !payload.data?.publicUrl) {
          throw new Error(payload?.error?.message || 'Image upload failed');
        }

        const html = editor.getHTML();
        const updated = html.replace(placeholderUrl, payload.data.publicUrl);
        editor.commands.setContent(updated);
      } catch (err) {
        console.error('Image upload failed:', err);
        editor.commands.undo();
      } finally {
        URL.revokeObjectURL(placeholderUrl);
      }
    },
    [editor, authToken, websiteId]
  );

  // Listen for custom image upload events (from slash commands)
  useEffect(() => {
    const handler = (e: Event) => {
      const file = (e as CustomEvent).detail?.file;
      if (file) handleImageUpload(file);
    };
    document.addEventListener('tiptap:image-upload', handler);
    return () => document.removeEventListener('tiptap:image-upload', handler);
  }, [handleImageUpload]);

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor) onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  // Sync external content changes (AI generation)
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const currentMd = editor.storage.markdown.getMarkdown();
    if (content !== currentMd) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  // IMPORTANT: Only EditorContent + BubbleMenu inside the wrapper div.
  // The fixed toolbar lives in BlogEditor to avoid React/ProseMirror DOM conflicts.
  // SlashMenu is a pure React component (no ProseMirror plugin) rendered via portal.
  return (
    <div className="tiptap-wrapper" data-testid="tiptap-wrapper">
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 150, placement: 'top' }}
        className="tiptap-bubble-menu"
      >
        <TiptapToolbar editor={editor} variant="bubble" onImageUpload={handleImageUpload} />
      </BubbleMenu>

      <EditorContent editor={editor} />
    </div>
  );
}
