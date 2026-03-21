'use client';

import { useState, useCallback } from 'react';

interface BlogEditorProps {
  initialContent?: string;
  initialTitle?: string;
  onChange?: (content: string) => void;
  onTitleChange?: (title: string) => void;
  websiteId: string;
  postId?: string;
}

/**
 * Blog post editor wrapper.
 *
 * Uses a rich text textarea with Markdown support.
 * Novel.sh integration is deferred until the package is stable with React 19.
 *
 * Slash commands are handled via the AI API routes:
 * - /draft-post → POST /api/ai/editor/generate-blog
 * - /improve → POST /api/ai/editor/improve-text
 */
export function BlogEditor({
  initialContent = '',
  initialTitle = '',
  onChange,
  onTitleChange,
  websiteId,
  postId,
}: BlogEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(e.target.value);
      onTitleChange?.(e.target.value);
    },
    [onTitleChange]
  );

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value);
      onChange?.(e.target.value);
    },
    [onChange]
  );

  const handleAiGenerate = useCallback(
    async (action: 'draft' | 'improve' | 'seo' | 'translate', targetLocale?: string) => {
      setIsGenerating(true);
      setAiError(null);

      try {
        if (action === 'draft') {
          const res = await fetch('/api/ai/editor/generate-blog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: title || 'Travel tips', locale: 'es' }),
          });
          if (!res.ok) throw new Error('Failed to generate');
          const data = await res.json();
          setTitle(data.post.title);
          setContent(data.post.content);
          onTitleChange?.(data.post.title);
          onChange?.(data.post.content);
        } else if (action === 'improve') {
          const res = await fetch('/api/ai/editor/improve-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: content, action: 'rewrite' }),
          });
          if (!res.ok) throw new Error('Failed to improve');
          const data = await res.json();
          setContent(data.improved);
          onChange?.(data.improved);
        } else if (action === 'seo') {
          const res = await fetch('/api/ai/editor/improve-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: content, action: 'rewrite' }),
          });
          if (!res.ok) throw new Error('Failed to optimize');
          const data = await res.json();
          setContent(data.improved);
          onChange?.(data.improved);
        } else if (action === 'translate') {
          const res = await fetch('/api/ai/editor/improve-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: content,
              action: 'translate',
              targetLocale: targetLocale ?? 'en',
            }),
          });
          if (!res.ok) throw new Error('Failed to translate');
          const data = await res.json();
          setContent(data.improved);
          onChange?.(data.improved);
        }
      } catch (err) {
        setAiError(err instanceof Error ? err.message : 'AI generation failed');
      } finally {
        setIsGenerating(false);
      }
    },
    [title, content, onChange, onTitleChange]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={handleTitleChange}
        placeholder="Título del post..."
        className="text-3xl font-bold border-none outline-none px-6 py-4 bg-transparent placeholder:text-muted-foreground/50"
      />

      {/* AI toolbar */}
      <div className="flex items-center gap-2 px-6 py-2 border-y bg-muted/30">
        <span className="text-xs text-muted-foreground mr-2">AI:</span>
        <button
          onClick={() => handleAiGenerate('draft')}
          disabled={isGenerating}
          className="text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary disabled:opacity-50"
        >
          /draft-post
        </button>
        <button
          onClick={() => handleAiGenerate('improve')}
          disabled={isGenerating || !content}
          className="text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary disabled:opacity-50"
        >
          /improve
        </button>
        <button
          onClick={() => handleAiGenerate('seo')}
          disabled={isGenerating || !content}
          className="text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary disabled:opacity-50"
        >
          /seo
        </button>
        <button
          onClick={() => handleAiGenerate('translate', 'en')}
          disabled={isGenerating || !content}
          className="text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary disabled:opacity-50"
        >
          /translate EN
        </button>
        <button
          onClick={() => handleAiGenerate('translate', 'pt')}
          disabled={isGenerating || !content}
          className="text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary disabled:opacity-50"
        >
          /translate PT
        </button>
        {isGenerating && (
          <span className="text-xs text-muted-foreground animate-pulse ml-2">
            Generando...
          </span>
        )}
        {aiError && (
          <span className="text-xs text-destructive ml-2">{aiError}</span>
        )}
      </div>

      {/* Editor area (Markdown) */}
      <textarea
        value={content}
        onChange={handleContentChange}
        placeholder="Escribe tu post en Markdown..."
        className="flex-1 px-6 py-4 resize-none outline-none bg-transparent font-mono text-sm leading-relaxed placeholder:text-muted-foreground/50"
      />

      {/* Status bar */}
      <div className="flex items-center justify-between px-6 py-2 border-t text-xs text-muted-foreground">
        <span>{content.split(/\s+/).filter(Boolean).length} palabras</span>
        <span>Markdown</span>
      </div>
    </div>
  );
}
