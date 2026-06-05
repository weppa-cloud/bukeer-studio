#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { probeProviderCredential, type CredentialProbeProvider } from '../../lib/growth/provider-credentials/probes';
import { resolveGoogleProviderCredentialSecret } from '../../lib/growth/provider-credentials/vault';

dotenv.config({ path: '.env.local' });

const PROVIDERS: CredentialProbeProvider[] = ['gsc', 'ga4', 'dataforseo'];

main().catch((error) => {
  console.error(JSON.stringify({ error: redact(String(error instanceof Error ? error.message : error)) }, null, 2));
  process.exit(1);
});

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const providers = args.provider ? [args.provider] : PROVIDERS;
  const supabase = createSupabase();
  const integrations = await readIntegrations(supabase, args.websiteId);
  const results = [];
  for (const provider of providers) {
    const integration = integrations.find((row) => row.provider === provider) ?? null;
    results.push(await probeProviderCredential({
      provider,
      integration,
      resolveSecret: provider === 'gsc' || provider === 'ga4'
        ? async ({ provider: googleProvider, integration: googleIntegration }) => {
            if (!googleIntegration.credential_ref) return null;
            return resolveGoogleProviderCredentialSecret({
              supabase,
              websiteId: args.websiteId,
              provider: googleProvider,
              credentialRef: googleIntegration.credential_ref,
            });
          }
        : undefined,
    }));
  }
  console.log(JSON.stringify({ website_id: args.websiteId, checked_at: new Date().toISOString(), results }, null, 2));
}

function createSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function readIntegrations(supabase: ReturnType<typeof createSupabase>, websiteId: string) {
  const query = () => supabase
    .from('seo_integrations')
    .select('provider,status,site_url,property_id,access_token,refresh_token,access_token_expires_at,credential_ref,last_error')
    .eq('website_id', websiteId)
    .in('provider', PROVIDERS);

  let { data, error } = await query();
  if (error && error.message.includes('credential_ref')) {
    const retry = await supabase
      .from('seo_integrations')
      .select('provider,status,site_url,property_id,access_token,refresh_token,access_token_expires_at,last_error')
      .eq('website_id', websiteId)
      .in('provider', PROVIDERS);
    data = retry.data;
    error = retry.error;
  }

  if (error) throw new Error(`Failed to read seo_integrations: ${error.message}`);
  return Array.isArray(data) ? data : [];
}

function parseArgs(argv: string[]) {
  const flags = new Map<string, string | boolean>();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const [key, inlineValue] = arg.slice(2).split('=', 2);
    if (inlineValue !== undefined) flags.set(key, inlineValue);
    else if (argv[index + 1] && !argv[index + 1].startsWith('--')) flags.set(key, argv[++index]);
    else flags.set(key, true);
  }
  const websiteId = getString(flags, 'website-id');
  const provider = flags.get('provider');
  if (provider && !PROVIDERS.includes(provider as CredentialProbeProvider)) {
    throw new Error(`Unsupported --provider ${provider}`);
  }
  return { websiteId, provider: provider as CredentialProbeProvider | undefined };
}

function getString(flags: Map<string, string | boolean>, key: string) {
  const value = flags.get(key);
  if (typeof value !== 'string' || !value) throw new Error(`Missing required --${key}`);
  return value;
}

function redact(value: string) {
  return value.replace(/(token|key|secret|password|authorization|bearer)=?[^\s,]*/gi, '$1=[REDACTED]');
}
