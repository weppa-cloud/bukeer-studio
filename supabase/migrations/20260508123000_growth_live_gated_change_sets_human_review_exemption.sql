alter table public.growth_agent_change_sets
  drop constraint if exists growth_agent_change_sets_human_review_chk;

alter table public.growth_agent_change_sets
  add constraint growth_agent_change_sets_human_review_chk
  check (
    requires_human_review = true
    or change_type not in (
      'blog_draft_create',
      'content_update_draft',
      'content_brief_create',
      'faq_schema_draft',
      'landing_section_copy_draft',
      'transcreation_draft_create',
      'transcreation_update_draft',
      'translation_quality_fix_draft',
      'transcreation_merge_readiness',
      'publish_packet_prepare',
      'experiment_candidate_prepare'
    )
    or (
      change_type in ('publish_packet_prepare', 'transcreation_merge_readiness')
      and evidence->>'live_gated' = 'true'
      and evidence->>'autonomy_action_class' in ('content_publish', 'transcreation_merge')
      and coalesce(evidence->>'paid_blocked', 'true') = 'true'
    )
  );

comment on constraint growth_agent_change_sets_human_review_chk
  on public.growth_agent_change_sets is
  'Draft/content/transcreation changes require human review unless they are explicitly live-gated organic content/transcreation executions with paid blocked.';
