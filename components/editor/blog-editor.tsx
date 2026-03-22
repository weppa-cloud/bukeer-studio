'use client';

import { useState, useCallback, useRef } from 'react';
import { GradeBadge, ScoreDetailPanel, ScoreWarningBanner } from './score-display';
import { TiptapEditor } from './tiptap-editor';
import type { Editor } from '@tiptap/react';
import '../../styles/tiptap-bukeer.css';

interface ScoringResult {
  overall: number;
  seo: number;
  readability: number;
  structure: number;
  geo: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  checks: any[];
}

interface BlogEditorProps {
  initialContent?: string;
  initialTitle?: string;
  onChange?: (content: string) => void;
  onTitleChange?: (title: string) => void;
  onSeoDataChange?: (data: { faqItems?: any[]; seoKeywords?: string[]; tldr?: string }) => void;
  websiteId: string;
  postId?: string;
  authToken?: string;
  scoreResult?: ScoringResult | null;
  onScoreRefresh?: () => void;
  isScoring?: boolean;
}

/**
 * Blog post editor with TipTap WYSIWYG, AI generation (v1 + v2), and SEO scoring.
 *
 * v1: 800-1200 word basic draft
 * v2: 2100-2400 word answer-first structure with FAQs, multi-language
 */
export function BlogEditor({
  initialContent = '',
  initialTitle = '',
  onChange,
  onTitleChange,
  onSeoDataChange,
  websiteId,
  postId,
  authToken,
  scoreResult,
  onScoreRefresh,
  isScoring = false,
}: BlogEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const editorRef = useRef<Editor | null>(null);

  const authHeaders: Record<string, string> = authToken
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }
    : { 'Content-Type': 'application/json' };

  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(e.target.value);
      onTitleChange?.(e.target.value);
    },
    [onTitleChange]
  );

  const handleContentChange = useCallback(
    (markdown: string) => {
      setContent(markdown);
      onChange?.(markdown);
    },
    [onChange]
  );

  const handleEditorReady = useCallback((editor: Editor | null) => {
    if (editor) editorRef.current = editor;
  }, []);

  const setEditorContent = useCallback(
    (markdown: string) => {
      setContent(markdown);
      onChange?.(markdown);
      // TipTap syncs via the content prop effect in TiptapEditor
    },
    [onChange]
  );

  const handleAiGenerate = useCallback(
    async (action: 'draft' | 'draft-v2' | 'improve' | 'seo' | 'translate', targetLocale?: string) => {
      setIsGenerating(true);
      setAiError(null);

      try {
        if (action === 'draft' || action === 'draft-v2') {
          const isV2 = action === 'draft-v2';
          const res = await fetch('/api/ai/editor/generate-blog', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              topic: title || 'Travel tips',
              locale: 'es',
              version: isV2 ? 2 : 1,
            }),
          });
          if (!res.ok) throw new Error(`Failed to generate (${res.status})`);
          const data = await res.json();
          setTitle(data.post.title);
          setEditorContent(data.post.content);
          onTitleChange?.(data.post.title);
          if (isV2 && data.post.faq_items) {
            onSeoDataChange?.({
              faqItems: data.post.faq_items,
              seoKeywords: data.post.seo?.keywords,
              tldr: data.post.tldr,
            });
          }
        } else if (action === 'improve' || action === 'seo') {
          const res = await fetch('/api/ai/editor/improve-text', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ text: content, action: 'rewrite' }),
          });
          if (!res.ok) throw new Error('Failed to improve');
          const data = await res.json();
          setEditorContent(data.improved);
        } else if (action === 'translate') {
          const res = await fetch('/api/ai/editor/improve-text', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              text: content,
              action: 'translate',
              targetLocale: targetLocale ?? 'en',
            }),
          });
          if (!res.ok) throw new Error('Failed to translate');
          const data = await res.json();
          setEditorContent(data.improved);
        }
      } catch (err) {
        setAiError(err instanceof Error ? err.message : 'AI generation failed');
      } finally {
        setIsGenerating(false);
      }
    },
    [title, content, setEditorContent, onTitleChange, onSeoDataChange, authHeaders]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Warning banner for low scores */}
      <ScoreWarningBanner grade={scoreResult?.grade} />

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={handleTitleChange}
        placeholder="Título del post..."
        className="text-3xl font-bold border-none outline-none px-6 py-4 bg-transparent placeholder:text-muted-foreground/50"
        data-testid="blog-title-input"
      />

      {/* AI toolbar */}
      <div className="flex items-center gap-2 px-6 py-2 border-y bg-muted/30">
        <span className="text-xs text-muted-foreground mr-2">AI:</span>
        <button
          onClick={() => handleAiGenerate('draft')}
          disabled={isGenerating}
          className="text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary disabled:opacity-50"
          data-testid="ai-draft"
        >
          /draft
        </button>
        <button
          onClick={() => handleAiGenerate('draft-v2')}
          disabled={isGenerating}
          className="text-xs px-2 py-1 rounded bg-primary/20 hover:bg-primary/30 text-primary font-medium disabled:opacity-50 border border-primary/30"
          title="Genera post SEO-optimizado: 2100+ palabras, answer-first, FAQs"
          data-testid="ai-draft-v2"
        >
          /draft-v2 SEO
        </button>
        <button
          onClick={() => handleAiGenerate('improve')}
          disabled={isGenerating || !content}
          className="text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary disabled:opacity-50"
          data-testid="ai-improve"
        >
          /improve
        </button>
        <button
          onClick={() => handleAiGenerate('seo')}
          disabled={isGenerating || !content}
          className="text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary disabled:opacity-50"
          data-testid="ai-seo"
        >
          /seo
        </button>
        <button
          onClick={() => handleAiGenerate('translate', 'en')}
          disabled={isGenerating || !content}
          className="text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary disabled:opacity-50"
          data-testid="ai-translate-en"
        >
          /translate EN
        </button>
        <button
          onClick={() => handleAiGenerate('translate', 'pt')}
          disabled={isGenerating || !content}
          className="text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary disabled:opacity-50"
          data-testid="ai-translate-pt"
        >
          /translate PT
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Score badge */}
        <GradeBadge grade={scoreResult?.grade} score={scoreResult?.overall} isLoading={isScoring} />

        {isGenerating && (
          <span className="text-xs text-muted-foreground animate-pulse">Generando...</span>
        )}
        {aiError && <span className="text-xs text-destructive">{aiError}</span>}
      </div>

      {/* Score detail panel (collapsible) */}
      <ScoreDetailPanel score={scoreResult ?? null} isLoading={isScoring} onRefresh={onScoreRefresh} />

      {/* TipTap WYSIWYG Editor */}
      <TiptapEditor
        content={content}
        onChange={handleContentChange}
        onEditorReady={handleEditorReady}
        placeholder="Escribe tu post aquí..."
        authToken={authToken}
        websiteId={websiteId}
      />

      {/* Status bar */}
      <div className="tiptap-status-bar">
        <span className="word-count">{wordCount} palabras</span>
        <span>WYSIWYG · Markdown</span>
      </div>
    </div>
  );
}
