import { getSectionFieldConfig } from '@/lib/studio/section-fields';

describe('section-fields: hero variants', () => {
  it('exposes all supported hero layout variants in studio form', () => {
    const heroConfig = getSectionFieldConfig('hero');
    expect(heroConfig).not.toBeNull();

    const variantField = heroConfig?.fields.find((field) => field.name === 'variant');
    expect(variantField).toBeDefined();
    expect(variantField?.type).toBe('select');

    const optionValues = (variantField?.options ?? []).map((option) => option.value);

    expect(optionValues).toEqual(
      expect.arrayContaining([
        'default',
        'full',
        'split',
        'centered',
        'minimal',
        'parallax',
        'wavy',
        'globe',
        'immersive',
      ]),
    );
  });
});
