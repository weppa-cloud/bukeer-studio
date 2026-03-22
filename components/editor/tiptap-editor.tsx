'use client';

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { useEffect, useCallback } from 'react';
import { TiptapToolbar } from './tiptap-toolbar';
import { createClient } from '@supabase/supabase-js';

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
  placeholder = 'Escribe tu post aquí...',
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
      Placeholder.configure({ placeholder }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const md = editor.storage.markdown.getMarkdown();
      onChange(md);
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
        handleImageUpload(file, view.state.selection.from);
        return true;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) handleImageUpload(file, view.state.selection.from);
            return true;
          }
        }
        return false;
      },
    },
  });

  const handleImageUpload = useCallback(
    async (file: File, pos?: number) => {
      if (!editor) return;

      // Show placeholder while uploading
      const placeholderUrl = URL.createObjectURL(file);
      editor.chain().focus().setImage({ src: placeholderUrl, alt: file.name }).run();

      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} },
        });

        const ext = file.name.split('.').pop() || 'png';
        const path = `blog/${websiteId || 'general'}/${Date.now()}.${ext}`;

        const { data, error } = await supabase.storage
          .from('images')
          .upload(path, file, { contentType: file.type, upsert: false });

        if (error) throw error;

        const { data: urlData } = supabase.storage.from('images').getPublicUrl(data.path);

        // Replace placeholder with real URL
        const html = editor.getHTML();
        const updated = html.replace(placeholderUrl, urlData.publicUrl);
        editor.commands.setContent(updated);
      } catch (err) {
        console.error('Image upload failed:', err);
        // Remove the placeholder image on failure
        editor.commands.undo();
      } finally {
        URL.revokeObjectURL(placeholderUrl);
      }
    },
    [editor, authToken, websiteId]
  );

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
