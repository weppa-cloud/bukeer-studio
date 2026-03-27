'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  StudioBadge,
  StudioButton,
  StudioInput,
  StudioPanel,
  StudioTextarea,
} from '@/components/studio/ui/primitives';
import {
  scorePageContent,
  type PageScoringResult,
  type PageScoreCheck,
} from '@/lib/studio/score-page-content';
import type { EditorSection } from '@/lib/studio/section-actions';
import {
  Plus,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface SeoPanelProps {
  websiteId: string;
  pageId: string;
  pageTitle?: string;
  sections: EditorSection[];
  seoTitle: string;
  seoDescription: string;
  onSeoChange: (field: 'seoTitle' | 'seoDescription', value: string) => void;
}

// ============================================================================
// Score gauge
// ============================================================================

function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  const gradeColors: Record<string, string> = {
    A: 'text-[var(--studio-success)] bg-[color-mix(in_srgb,var(--studio-success)_14%,transparent)] border-[color-mix(in_srgb,var(--studio-success)_32%,transparent)]',
    B: 'text-[var(--studio-primary)] bg-[color-mix(in_srgb,var(--studio-primary)_14%,transparent)] border-[color-mix(in_srgb,var(--studio-primary)_32%,transparent)]',
    C: 'text-[#d97706] bg-[color-mix(in_srgb,#f59e0b_14%,transparent)] border-[color-mix(in_srgb,#f59e0b_32%,transparent)]',
    D: 'text-[#b45309] bg-[color-mix(in_srgb,#f97316_14%,transparent)] border-[color-mix(in_srgb,#f97316_32%,transparent)]',
    F: 'text-[var(--studio-danger)] bg-[color-mix(in_srgb,var(--studio-danger)_14%,transparent)] border-[color-mix(in_srgb,var(--studio-danger)_32%,transparent)]',
  };

  return (
    <div className="flex items-center gap-4">
      <div className={cn('w-16 h-16 rounded-full border-2 flex items-center justify-center', gradeColors[grade])}>
        <span className="text-2xl font-bold">{grade}</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-[var(--studio-text)]">{score}/100</p>
        <p className="text-xs text-[var(--studio-text-muted)]">Overall score</p>
      </div>
    </div>
  );
}

// ============================================================================
// Dimension bar
// ============================================================================

function DimensionBar({ label, score }: { label: string; score: number }) {
  const color =
    score >= 70 ? 'bg-[var(--studio-success)]' : score >= 50 ? 'bg-[#f59e0b]' : 'bg-[var(--studio-danger)]';

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-[var(--studio-text-muted)]">{label}</span>
        <span className="font-medium text-[var(--studio-text)]">{score}%</span>
      </div>
      <div className="h-1.5 bg-[var(--studio-panel)] rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

// ============================================================================
// Check item
// ============================================================================

function CheckItem({ check }: { check: PageScoreCheck }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      {check.pass ? (
        <CheckCircle2 className="w-4 h-4 text-[var(--studio-success)] shrink-0 mt-0.5" />
      ) : check.score >= 50 ? (
        <AlertTriangle className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" />
      ) : (
        <XCircle className="w-4 h-4 text-[var(--studio-danger)] shrink-0 mt-0.5" />
      )}
      <p className="text-xs text-[var(--studio-text-muted)]">{check.message}</p>
    </div>
  );
}

// ============================================================================
// Keywords manager
// ============================================================================

function KeywordsManager({
  websiteId,
  initialKeywords,
  onKeywordsChange,
}: {
  websiteId: string;
  initialKeywords: string[];
  onKeywordsChange: (keywords: string[]) => void;
}) {
  const [keywords, setKeywords] = useState<string[]>(initialKeywords);
  const [newKeyword, setNewKeyword] = useState('');

  const handleAdd = useCallback(() => {
    const kw = newKeyword.trim().toLowerCase();
    if (!kw || keywords.includes(kw)) return;
    if (keywords.length >= 50) return; // RLS limit

    const updated = [...keywords, kw];
    setKeywords(updated);
    setNewKeyword('');
    onKeywordsChange(updated);
  }, [newKeyword, keywords, onKeywordsChange]);

  const handleRemove = useCallback(
    (kw: string) => {
      const updated = keywords.filter((k) => k !== kw);
      setKeywords(updated);
      onKeywordsChange(updated);
    },
    [keywords, onKeywordsChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd]
  );

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-[var(--studio-text-muted)]">
        SEO Keywords ({keywords.length}/50)
      </label>
      <div className="flex gap-2">
        <StudioInput
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add keyword..."
          className="text-sm"
        />
        <StudioButton variant="outline" size="sm" onClick={handleAdd} disabled={!newKeyword.trim()}>
          <Plus className="w-3 h-3" />
        </StudioButton>
      </div>
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {keywords.map((kw) => (
            <StudioBadge key={kw} tone="neutral" className="text-xs gap-1 pr-1 inline-flex items-center">
              {kw}
              <button onClick={() => handleRemove(kw)} className="hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </StudioBadge>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main SEO Panel
// ============================================================================

export function SeoPanel({
  websiteId,
  pageId,
  pageTitle,
  sections,
  seoTitle,
  seoDescription,
  onSeoChange,
}: SeoPanelProps) {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [loadingKeywords, setLoadingKeywords] = useState(true);
  const supabase = createSupabaseBrowserClient();

  // Load keywords from seo_keywords table
  useEffect(() => {
    async function loadKeywords() {
      setLoadingKeywords(true);
      const { data } = await supabase
        .from('seo_keywords')
        .select('keyword')
        .eq('website_id', websiteId)
        .order('created_at', { ascending: true });

      if (data) {
        setKeywords(data.map((r: { keyword: string }) => r.keyword));
      }
      setLoadingKeywords(false);
    }
    loadKeywords();
  }, [websiteId, supabase]);

  // Save keywords to DB
  const handleKeywordsChange = useCallback(
    async (newKeywords: string[]) => {
      setKeywords(newKeywords);

      // Diff: remove deleted, add new
      const toDelete = keywords.filter((k) => !newKeywords.includes(k));
      const toAdd = newKeywords.filter((k) => !keywords.includes(k));

      if (toDelete.length > 0) {
        await supabase
          .from('seo_keywords')
          .delete()
          .eq('website_id', websiteId)
          .in('keyword', toDelete);
      }

      if (toAdd.length > 0) {
        await supabase.from('seo_keywords').insert(
          toAdd.map((kw) => ({ website_id: websiteId, keyword: kw }))
        );
      }
    },
    [keywords, websiteId, supabase]
  );

  // Score
  const scoringResult = useMemo(
    () =>
      scorePageContent({
        sections: sections.map((s) => ({
          sectionType: s.sectionType,
          isEnabled: s.isEnabled,
          content: s.content,
        })),
        seoTitle,
        seoDescription,
        keywords,
        pageTitle,
      }),
    [sections, seoTitle, seoDescription, keywords, pageTitle]
  );

  const failingChecks = scoringResult.checks.filter((c) => !c.pass);
  const passingChecks = scoringResult.checks.filter((c) => c.pass);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        <StudioPanel className="p-4">
          <ScoreGauge score={scoringResult.overall} grade={scoringResult.grade} />
        </StudioPanel>

        <StudioPanel className="space-y-2 p-4">
          <DimensionBar label="SEO" score={scoringResult.seo} />
          <DimensionBar label="Structure" score={scoringResult.structure} />
          <DimensionBar label="Content Quality" score={scoringResult.quality} />
        </StudioPanel>

        <StudioPanel className="space-y-3 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--studio-text-muted)]">
            Meta Tags
          </h4>
          <div className="space-y-1.5">
            <label htmlFor="seoTitle" className="text-xs font-semibold text-[var(--studio-text-muted)]">
              SEO Title ({seoTitle.length}/70)
            </label>
            <StudioInput
              id="seoTitle"
              value={seoTitle}
              onChange={(e) => onSeoChange('seoTitle', e.target.value)}
              placeholder="Page title for search engines"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="seoDescription" className="text-xs font-semibold text-[var(--studio-text-muted)]">
              Meta Description ({seoDescription.length}/160)
            </label>
            <StudioTextarea
              id="seoDescription"
              value={seoDescription}
              onChange={(e) => onSeoChange('seoDescription', e.target.value)}
              placeholder="Brief description for search results"
              rows={3}
              className="text-sm"
            />
          </div>
        </StudioPanel>

        {!loadingKeywords && (
          <StudioPanel className="p-4">
            <KeywordsManager
              websiteId={websiteId}
              initialKeywords={keywords}
              onKeywordsChange={handleKeywordsChange}
            />
          </StudioPanel>
        )}

        {failingChecks.length > 0 && (
          <StudioPanel className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--studio-text-muted)] mb-2">
              Issues ({failingChecks.length})
            </h4>
            <div className="space-y-0.5">
              {failingChecks.map((check) => (
                <CheckItem key={check.id} check={check} />
              ))}
            </div>
          </StudioPanel>
        )}

        {passingChecks.length > 0 && (
          <StudioPanel className="p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--studio-text-muted)] mb-2">
              Passing ({passingChecks.length})
            </h4>
            <div className="space-y-0.5">
              {passingChecks.map((check) => (
                <CheckItem key={check.id} check={check} />
              ))}
            </div>
          </StudioPanel>
        )}
      </div>
    </ScrollArea>
  );
}
