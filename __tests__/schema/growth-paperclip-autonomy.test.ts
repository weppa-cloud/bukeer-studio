import {
  GrowthAutonomyPolicyInsertSchema,
  GrowthPublicationJobInsertSchema,
  GrowthWorkItemOutcomeInsertSchema,
} from '@/packages/website-contract/src/schemas/growth-paperclip-autonomy';

describe('Growth Paperclip autonomy contracts', () => {
  const accountId = '11111111-1111-4111-8111-111111111111';
  const websiteId = '22222222-2222-4222-8222-222222222222';
  const workItemId = '33333333-3333-4333-8333-333333333333';
  const changeSetId = '44444444-4444-4444-8444-444444444444';
  const publicationJobId = '55555555-5555-4555-8555-555555555555';

  const tenantScope = {
    account_id: accountId,
    website_id: websiteId,
    locale: 'es-CO',
    market: 'CO',
  } as const;

  const validPublicationJob = {
    ...tenantScope,
    work_item_id: workItemId,
    change_set_id: changeSetId,
    lane: 'content_creator',
    action_class: 'content_publish',
    target_table: 'website_blog_posts',
    target_id: publicationJobId,
    target_path: '/blog/cartagena-travel-guide',
    idempotency_key: 'paperclip-content-publish-001',
    before_snapshot: { exists: false },
    after_payload: {
      table: 'website_blog_posts',
      target_id: publicationJobId,
      content_publish: {
        target: {
          target_table: 'website_blog_posts',
          target_id: publicationJobId,
          target_path: '/blog/cartagena-travel-guide',
        },
        rollback_expectation: {
          strategy: 'restore_before_snapshot',
          target_table: 'website_blog_posts',
          target_id: publicationJobId,
        },
        title: 'Cartagena travel guide',
        slug: 'cartagena-travel-guide',
        content_word_count: 620,
        seo_title: 'Cartagena Travel Guide',
        seo_description:
          'Plan Cartagena with local context, practical routes, cultural stops, and responsible travel guidance.',
      },
    },
    rollback_payload: {
      table: 'website_blog_posts',
      target_id: publicationJobId,
      restore: { exists: false },
    },
    baseline: { organic_clicks_28d: 12 },
    success_metric: 'organic_clicks_21d',
    evaluation_date: '2026-05-28',
    evidence: {
      rollback_expectation: {
        strategy: 'restore_before_snapshot',
        target_table: 'website_blog_posts',
        target_id: publicationJobId,
      },
    },
  } as const;

  it('accepts a ColombiaTours organic publication policy', () => {
    const valid = GrowthAutonomyPolicyInsertSchema.safeParse({
      ...tenantScope,
      lane: 'content_creator',
      action_class: 'content_publish',
      enabled: true,
      dry_run_only: false,
      max_risk_level: 'medium',
      max_risk_score: 60,
      daily_cap: 2,
      weekly_cap: 8,
      required_checks: [
        'before_snapshot',
        'rollback_payload',
        'smoke_check',
        'baseline',
        'success_metric',
        'evaluation_date',
      ],
    });

    expect(valid.success).toBe(true);
  });

  it('rejects inconsistent policy caps', () => {
    const invalid = GrowthAutonomyPolicyInsertSchema.safeParse({
      ...tenantScope,
      lane: 'technical_remediation',
      action_class: 'safe_apply',
      daily_cap: 4,
      weekly_cap: 2,
    });

    expect(invalid.success).toBe(false);
  });

  it('accepts a complete organic publication job contract', () => {
    const valid = GrowthPublicationJobInsertSchema.safeParse(validPublicationJob);

    expect(valid.success).toBe(true);
  });

  it('rejects paid mutation publication jobs at the contract boundary', () => {
    const invalid = GrowthPublicationJobInsertSchema.safeParse({
      ...validPublicationJob,
      action_class: 'paid_mutation',
    });

    expect(invalid.success).toBe(false);
  });

  it('rejects publication jobs without rollback or baseline evidence', () => {
    const invalid = GrowthPublicationJobInsertSchema.safeParse({
      ...validPublicationJob,
      rollback_payload: {},
      baseline: {},
    });

    expect(invalid.success).toBe(false);
  });

  it('rejects publication jobs without an action-specific payload contract', () => {
    const invalid = GrowthPublicationJobInsertSchema.safeParse({
      ...validPublicationJob,
      after_payload: { title: 'Cartagena travel guide' },
    });

    expect(invalid.success).toBe(false);
  });

  it('requires technical safe_apply jobs to use the technical lane', () => {
    const invalid = GrowthPublicationJobInsertSchema.safeParse({
      ...validPublicationJob,
      lane: 'content_creator',
      action_class: 'safe_apply',
      target_table: 'product_seo_overrides',
    });

    expect(invalid.success).toBe(false);
  });

  it('accepts valid SEO outcome measurement windows', () => {
    const valid = GrowthWorkItemOutcomeInsertSchema.safeParse({
      ...tenantScope,
      work_item_id: workItemId,
      publication_job_id: publicationJobId,
      change_set_id: changeSetId,
      outcome_type: 'seo_content',
      status: 'measuring',
      success_metric: 'organic_clicks_21d',
      baseline: { organic_clicks_28d: 12 },
      evaluation_window: 'day_21',
      evaluation_date: '2026-05-28',
    });

    expect(valid.success).toBe(true);
  });

  it('rejects mismatched outcome measurement windows', () => {
    const invalid = GrowthWorkItemOutcomeInsertSchema.safeParse({
      ...tenantScope,
      work_item_id: workItemId,
      publication_job_id: publicationJobId,
      change_set_id: changeSetId,
      outcome_type: 'seo_content',
      success_metric: 'organic_clicks_21d',
      baseline: { organic_clicks_28d: 12 },
      evaluation_window: 'day_7',
      evaluation_date: '2026-05-14',
    });

    expect(invalid.success).toBe(false);
  });
});
