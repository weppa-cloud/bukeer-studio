import { test as base, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import path from 'node:path';

export const COLOMBIATOURS = {
  websiteId: process.env.E2E_WEBSITE_ID ?? '894545b7-73ca-4dae-b76a-da5b6a3f8441',
  domain: 'colombiatours.travel',
  tenantName: 'ColombiaTours.Travel',
  primaryLocale: 'es-CO',
  primaryCountry: 'Colombia',
  primaryLanguage: 'es',
};

export type GrowthTab =
  | 'paginas'
  | 'contenido'
  | 'diseno'
  | 'analytics'
  | 'settings'
  | 'seo'
  | 'blog';

export function createSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase service role credentials for growth-real-data suite');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function gotoTab(page: Page, tab: GrowthTab, sub?: string): Promise<void> {
  const suffix = sub ? `/${sub}` : '';
  const target = `/dashboard/${COLOMBIATOURS.websiteId}/${tab}${suffix}`;
  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await expect(page).toHaveURL(new RegExp(`/dashboard/${COLOMBIATOURS.websiteId}/${tab}`));
}

export async function gotoAnalyticsSubTab(
  page: Page,
  sub:
    | 'Overview'
    | 'Content Intelligence'
    | 'Keywords'
    | 'Clusters'
    | 'Competitors'
    | 'Health'
    | 'AI Visibility'
    | 'Backlinks'
    | 'Config'
): Promise<void> {
  await gotoTab(page, 'analytics');
  await page.getByRole('button', { name: sub, exact: true }).first().click();
  await page.waitForLoadState('domcontentloaded');
}

export async function assertGscConnected(page: Page): Promise<void> {
  await gotoTab(page, 'analytics');
  await expect(page.getByText('GSC: Connected')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('GA4: Connected')).toBeVisible({ timeout: 15000 });
}

export async function screenshot(page: Page, name: string): Promise<string> {
  const file = path.join(
    process.cwd(),
    'docs/evidence/growth-readiness/screenshots',
    `${name}.png`
  );
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

type MeasuredStep = {
  name: string;
  startedAt: string;
  durationMs: number;
  consoleErrors: number;
  screenshot?: string;
};

export class JourneyRecorder {
  steps: MeasuredStep[] = [];
  private consoleErrors = 0;

  constructor(public page: Page, public journeyName: string) {
    page.on('console', (msg) => {
      if (msg.type() === 'error') this.consoleErrors += 1;
    });
  }

  async step<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startedAt = new Date().toISOString();
    const errorsBefore = this.consoleErrors;
    const t0 = Date.now();
    const result = await fn();
    const durationMs = Date.now() - t0;
    const shot = await screenshot(this.page, `${this.journeyName}-${this.steps.length + 1}-${slug(name)}`);
    this.steps.push({
      name,
      startedAt,
      durationMs,
      consoleErrors: this.consoleErrors - errorsBefore,
      screenshot: shot,
    });
    return result;
  }

  toJSON() {
    return {
      journey: this.journeyName,
      websiteId: COLOMBIATOURS.websiteId,
      steps: this.steps,
      totals: {
        durationMs: this.steps.reduce((a, s) => a + s.durationMs, 0),
        consoleErrors: this.steps.reduce((a, s) => a + s.consoleErrors, 0),
      },
    };
  }
}

function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export const test = base.extend<{ supabase: SupabaseClient }>({
  supabase: async ({}, use) => {
    const client = createSupabaseAdmin();
    await use(client);
  },
});

export { expect };
