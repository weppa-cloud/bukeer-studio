import type { SeoItemType, SeoScoringInput, SeoScoringResult } from '@/lib/seo/unified-scorer';

export interface ScoredItem {
  id: string;
  type: SeoItemType;
  name: string;
  image?: string;
  input: SeoScoringInput;
  result: SeoScoringResult;
  issues: string[];
}
