'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  scorePageContent,
  type PageScoringResult,
  type PageScoreCheck,
} from '@/lib/studio/score-page-content';
import type { EditorSection } from '@/lib/studio/section-actions';
import {
  Search,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
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
    A: 'text-green-600 bg-green-50 border-green-200',
    B: 'text-blue-600 bg-blue-50 border-blue-200',
    C: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    D: 'text-orange-600 bg-orange-50 border-orange-200',
    F: 'text-red-600 bg-red-50 border-red-200',
  };

  return (
    <div className="flex items-center gap-4">
      <div className={cn('w-16 h-16 rounded-full border-2 flex items-center justify-center', gradeColors[grade])}>
        <span className="text-2xl font-bold">{grade}</span>
      </div>
      <div>
        <p className="text-2xl font-bold">{score}/100</p>
        <p className="text-xs text-muted-foreground">Overall score</p>
      </div>
    </div>
  );
}

// ============================================================================
// Dimension bar
// ============================================================================

function DimensionBar({ label, score }: { label: string; score: number }) {
  const color = score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{score}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
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
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
      ) : check.score >= 50 ? (
        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
      ) : (
        <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
      )}
      <p className="text-xs text-muted-foreground">{check.message}</p>
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
  const [saving, setSaving] = useState(false);
  const supabase = createSupabaseBrowserClient();

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
      <Label className="text-xs">SEO Keywords ({keywords.length}/50)</Label>
      <div className="flex gap-2">
        <Input
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add keyword..."
          className="text-sm"
        />
        <Button variant="outline" size="sm" onClick={handleAdd} disabled={!newKeyword.trim()}>
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {keywords.map((kw) => (
            <Badge key={kw} variant="secondary" className="text-xs gap-1 pr-1">
              {kw}
              <button onClick={() => handleRemove(kw)} className="hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
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
        {/* Score overview */}
        <div className="flex items-center justify-between">
          <ScoreGauge score={scoringResult.overall} grade={scoringResult.grade} />
        </div>

        {/* Dimension bars */}
        <div className="space-y-2">
          <DimensionBar label="SEO" score={scoringResult.seo} />
          <DimensionBar label="Structure" score={scoringResult.structure} />
          <DimensionBar label="Content Quality" score={scoringResult.quality} />
        </div>

        <Separator />

        {/* SEO Meta fields */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Meta Tags
          </h4>
          <div className="space-y-1.5">
            <Label htmlFor="seoTitle" className="text-xs">
              SEO Title ({seoTitle.length}/70)
            </Label>
            <Input
              id="seoTitle"
              value={seoTitle}
              onChange={(e) => onSeoChange('seoTitle', e.target.value)}
              placeholder="Page title for search engines"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seoDescription" className="text-xs">
              Meta Description ({seoDescription.length}/160)
            </Label>
            <Textarea
              id="seoDescription"
              value={seoDescription}
              onChange={(e) => onSeoChange('seoDescription', e.target.value)}
              placeholder="Brief description for search results"
              rows={3}
              className="text-sm"
            />
          </div>
        </div>

        <Separator />

        {/* Keywords */}
        {!loadingKeywords && (
          <KeywordsManager
            websiteId={websiteId}
            initialKeywords={keywords}
            onKeywordsChange={handleKeywordsChange}
          />
        )}

        <Separator />

        {/* Issues */}
        {failingChecks.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Issues ({failingChecks.length})
            </h4>
            <div className="space-y-0.5">
              {failingChecks.map((check) => (
                <CheckItem key={check.id} check={check} />
              ))}
            </div>
          </div>
        )}

        {/* Passing */}
        {passingChecks.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Passing ({passingChecks.length})
            </h4>
            <div className="space-y-0.5">
              {passingChecks.map((check) => (
                <CheckItem key={check.id} check={check} />
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
