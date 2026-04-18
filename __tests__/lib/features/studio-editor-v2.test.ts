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

  describe('3-level resolution order (field > account > default)', () => {
    it('default → Flutter for all fields', () => {
      expect(isStudioFieldEnabled(defaultRes, 'description')).toBe(false);
      expect(whichSurface(defaultRes, 'program_highlights')).toBe('flutter');
    });

    it('account-wide enabled → Studio for all fields', () => {
      expect(isStudioFieldEnabled(accountWideRes, 'description')).toBe(true);
      expect(isStudioFieldEnabled(accountWideRes, 'program_gallery')).toBe(true);
      expect(whichSurface(accountWideRes, 'social_image')).toBe('studio');
    });

    it('per-field override takes precedence over account flag', () => {
      // perFieldRes.enabled=false but fields=['description','program_highlights']
      expect(isStudioFieldEnabled(perFieldRes, 'description')).toBe(true);
      expect(isStudioFieldEnabled(perFieldRes, 'program_highlights')).toBe(true);
      expect(isStudioFieldEnabled(perFieldRes, 'program_inclusions')).toBe(false);
      expect(whichSurface(perFieldRes, 'program_inclusions')).toBe('flutter');
    });

    it('account flag with field exclusion — fields[] is whitelist not blacklist', () => {
      // When enabled=true + fields=['description']:
      // current behavior: enabled=true wins → all fields to Studio
      // (field list only acts as EXTRA enablement when enabled=false)
      expect(isStudioFieldEnabled(mixedRes, 'description')).toBe(true);
      expect(isStudioFieldEnabled(mixedRes, 'program_inclusions')).toBe(true);
    });
  });
});
