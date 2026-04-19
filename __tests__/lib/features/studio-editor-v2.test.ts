import {
  isStudioFieldEnabled,
  whichSurface,
} from '@/lib/features/studio-editor-v2';
import type { StudioEditorV2FlagResolution } from '@bukeer/website-contract';

describe('studio-editor-v2 flag resolution', () => {
  const defaultRes: StudioEditorV2FlagResolution = {
    enabled: false,
    fields: [],
    scope: 'default',
  };
  const accountWideRes: StudioEditorV2FlagResolution = {
    enabled: true,
    fields: [],
    scope: 'account',
  };
  const perFieldRes: StudioEditorV2FlagResolution = {
    enabled: false,
    fields: ['description', 'program_highlights'],
    scope: 'website',
  };
  const mixedRes: StudioEditorV2FlagResolution = {
    enabled: true,
    fields: ['description'],
    scope: 'account',
  };

  // 3 scopes + per-field whitelist — see packages/website-contract/src/schemas/marketing-patch.ts:82-86.
  describe('3-scope resolution order (field whitelist > account flag > default)', () => {
    it('default → Flutter for all fields', () => {
      expect(isStudioFieldEnabled(defaultRes, 'description')).toBe(false);
      expect(whichSurface(defaultRes, 'program_highlights')).toBe('flutter');
    });

    it('account-wide enabled → Studio for all fields', () => {
      expect(isStudioFieldEnabled(accountWideRes, 'description')).toBe(true);
      expect(isStudioFieldEnabled(accountWideRes, 'program_gallery')).toBe(true);
      expect(whichSurface(accountWideRes, 'social_image')).toBe('studio');
    });

    it('per-field whitelist takes precedence when enabled=false', () => {
      // perFieldRes.enabled=false but fields=['description','program_highlights']
      expect(isStudioFieldEnabled(perFieldRes, 'description')).toBe(true);
      expect(isStudioFieldEnabled(perFieldRes, 'program_highlights')).toBe(true);
      expect(isStudioFieldEnabled(perFieldRes, 'program_inclusions')).toBe(false);
      expect(whichSurface(perFieldRes, 'program_inclusions')).toBe('flutter');
    });

    it('account flag enabled with field exclusion — fields[] is whitelist not blacklist', () => {
      // When enabled=true + fields=['description']:
      // current behavior: enabled=true wins → all fields to Studio
      // (field list only acts as EXTRA enablement when enabled=false)
      expect(isStudioFieldEnabled(mixedRes, 'description')).toBe(true);
      expect(isStudioFieldEnabled(mixedRes, 'program_inclusions')).toBe(true);
    });
  });

  describe('product type parity (W2 #216 AC-W2-5 + ADR-025)', () => {
    // Flag resolution is product-type-agnostic: the same resolution applies
    // to both package_kits and activities rows. The caller (marketing/actions
    // or content/actions) dispatches to the right RPC based on productType,
    // but the flag gate is identical.
    it('resolution is product-type-agnostic — same rules for package + activity editors', () => {
      expect(isStudioFieldEnabled(accountWideRes, 'description')).toBe(true);
      // The editor passes the same `field` key regardless of productType,
      // so all MarketingFieldName values pass through the same gate.
      const allFields: Array<Parameters<typeof isStudioFieldEnabled>[1]> = [
        'description',
        'program_highlights',
        'program_inclusions',
        'program_exclusions',
        'program_notes',
        'program_meeting_info',
        'program_gallery',
        'social_image',
        'cover_image_url',
      ];
      for (const f of allFields) {
        expect(isStudioFieldEnabled(accountWideRes, f)).toBe(true);
        expect(isStudioFieldEnabled(defaultRes, f)).toBe(false);
      }
    });
  });
});
