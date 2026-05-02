#!/usr/bin/env tsx
/**
 * growth-agreement-baseline.ts
 *
 * Produces a placeholder lane-agreement artifact for the ColombiaTours pilot,
 * shaped per `lib/growth/autonomy/lane-agreement.ts` (LaneAgreementBundle).
 *
 * BASELINE PLACEHOLDER — replace with real evaluator output post #404 ships.
 *
 * Until the evaluator (#404 / #406) emits real lane breakdowns, the gate
 * (#408) reads this file so it can deny `auto_apply_safe` cleanly with
 * reason `agreement_below_threshold` (agreement = 0.0). This avoids the
 * "ungrounded percentage" trap called out in SPEC §"Agreement Baseline".
 *
 * Usage:
 *   npm run growth:agreement:baseline
 *
 * Refs:
 *   - SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Lane-Level Autonomy Gate"
 *   - SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Agreement Baseline"
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import {
  LaneAgreementBundleSchema,
  type LaneAgreement,
} from '../lib/growth/autonomy/lane-agreement';
import type { AgentLane } from '@bukeer/website-contract';

const POLICY_VERSION = '2026-05-01';
const COMPUTED_AT = '2026-05-01T00:00:00.000Z';
const WINDOW_START = '2026-04-01T00:00:00.000Z';
const WINDOW_END = '2026-05-01T00:00:00.000Z';

// ColombiaTours pilot scope (per project_epic310_growth_os memory).
const ACCOUNT_ID = 'colombiatours';
const WEBSITE_ID = 'colombiatours-travel';

const LANES: AgentLane[] = [
  'orchestrator',
  'technical_remediation',
  'transcreation',
  'content_creator',
  'content_curator',
];

function buildPlaceholder(lane: AgentLane): LaneAgreement {
  return {
    account_id: ACCOUNT_ID,
    website_id: WEBSITE_ID,
    lane,
    agreement: 0.0,
    policy_version: POLICY_VERSION,
    computed_at: COMPUTED_AT,
    sample_size: 0,
    window_start: WINDOW_START,
    window_end: WINDOW_END,
    ai_human_disagreements: [],
  };
}

function main(): void {
  const bundle = LANES.map(buildPlaceholder);
  // Validate before writing — this is the contract-of-record for the gate.
  const parsed = LaneAgreementBundleSchema.parse(bundle);

  const outPath = resolve(
    __dirname,
    '..',
    'evidence',
    'growth',
    'agreement-lane-2026-05-01.json',
  );
  mkdirSync(dirname(outPath), { recursive: true });

  const payload = {
    _comment:
      'BASELINE PLACEHOLDER — replace with real evaluator output post #404 ships.',
    policy_version: POLICY_VERSION,
    computed_at: COMPUTED_AT,
    lanes: parsed,
  };

  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`[growth-agreement-baseline] wrote ${outPath}`);
}

main();
