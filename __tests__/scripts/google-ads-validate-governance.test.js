const fs = require('fs');
const os = require('os');
const path = require('path');

describe('google ads governance validator helpers', () => {
  const helpers = require('../../scripts/google-ads/validate-conversion-governance.cjs');

  it('normalizes customer ids to digits only', () => {
    expect(helpers.stripCustomerId('251-116-3613')).toBe('2511163613');
    expect(helpers.stripCustomerId(' customers/1261189646 ')).toBe('1261189646');
  });

  it('loads simple env files without overwriting existing values', () => {
    const target = { EXISTING: 'keep' };
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'google-ads-validator-'));
    const file = path.join(dir, 'test.env');
    fs.writeFileSync(
      file,
      'EXISTING=replace\nGOOGLE_ADS_CUSTOMER_ID="126-118-9646"\n# comment\n',
    );

    helpers.loadDotEnvFile(file, target);

    expect(target).toEqual({
      EXISTING: 'keep',
      GOOGLE_ADS_CUSTOMER_ID: '126-118-9646',
    });
  });

  it('reports missing required env vars without exposing values', () => {
    expect(() =>
      helpers.assertRequiredEnv({ GOOGLE_ADS_CUSTOMER_ID: '126' }),
    ).toThrow(/GOOGLE_ADS_DEVELOPER_TOKEN/);
  });

  it('redacts nested token and secret values', () => {
    expect(
      helpers.redact({
        developer_token: 'abc',
        nested: {
          accessToken: 'def',
          visible: 'ok',
        },
      }),
    ).toEqual({
      developer_token: '[redacted]',
      nested: {
        accessToken: '[redacted]',
        visible: 'ok',
      },
    });
  });

  it('summarizes conversion action rows from Google Ads API casing', () => {
    expect(
      helpers.summarizeConversionAction({
        conversionAction: {
          id: '7394880695',
          name: 'Cliente potencial calificado',
          type: 'UPLOAD_CLICKS',
          category: 'QUALIFIED_LEAD',
          primaryForGoal: false,
          includeInConversionsMetric: false,
          valueSettings: {
            defaultValue: 1,
            alwaysUseDefaultValue: false,
          },
        },
      }),
    ).toMatchObject({
      id: '7394880695',
      type: 'UPLOAD_CLICKS',
      category: 'QUALIFIED_LEAD',
      primaryForGoal: false,
      includeInConversionsMetric: false,
      defaultValue: 1,
    });
  });

  it('flags legacy imported actions still included in bidding/conversions metric', () => {
    const governance = helpers.classifyGoogleAdsGovernance([
      {
        name: 'ColombiaTours - GA4 (web) lead_calificado_form',
        type: 'GOOGLE_ANALYTICS_4_CUSTOM',
        category: 'SUBMIT_LEAD_FORM',
        primaryForGoal: true,
        includeInConversionsMetric: true,
      },
      {
        name: 'Cliente potencial calificado',
        type: 'UPLOAD_CLICKS',
        category: 'QUALIFIED_LEAD',
        primaryForGoal: false,
        includeInConversionsMetric: false,
      },
    ]);

    expect(governance).toEqual({
      canonicalUploadActionCount: 1,
      legacyBiddingActionCount: 1,
      webpageLeadBiddingActionCount: 0,
      blockers: ['legacy_imported_actions_still_in_bidding_or_conversions_metric'],
    });
  });
});
