#!/usr/bin/env tsx

import crypto from 'node:crypto';
import http from 'node:http';
import { execFile } from 'node:child_process';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { buildGoogleAuthUrl, exchangeGoogleCode } from '../../lib/seo/google-client';

dotenv.config({ path: '.env.local' });

type Provider = 'gsc' | 'ga4';

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: redact(String(error instanceof Error ? error.message : error)) }));
  process.exit(1);
});

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const redirectUri = getRequiredEnv('GOOGLE_OAUTH_REDIRECT_URI');
  const callbackUrl = new URL(redirectUri);
  if (!['localhost', '127.0.0.1'].includes(callbackUrl.hostname)) {
    throw new Error('This browser-assisted script only accepts a localhost Google OAuth redirect URI');
  }

  const state = crypto.randomBytes(24).toString('base64url');
  const authUrl = buildGoogleAuthUrl({ provider: args.provider, state });
  const server = http.createServer();

  const resultPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('OAuth callback timed out'));
    }, args.timeoutMs);

    server.on('request', async (request, response) => {
      try {
        const requestUrl = new URL(request.url ?? '/', redirectUri);
        if (requestUrl.pathname !== callbackUrl.pathname) {
          response.writeHead(404).end('Not found');
          return;
        }
        if (requestUrl.searchParams.get('state') !== state) {
          response.writeHead(400).end('Invalid OAuth state');
          return;
        }
        const error = requestUrl.searchParams.get('error');
        const code = requestUrl.searchParams.get('code');
        if (error || !code) {
          response.writeHead(400).end('OAuth failed');
          reject(new Error(`OAuth failed: ${error ?? 'missing_code'}`));
          return;
        }

        const token = await exchangeGoogleCode(code, args.provider);
        await persistIntegration(args, token);
        clearTimeout(timeout);
        response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('OAuth completed. You can close this tab.');
        resolve();
      } catch (callbackError) {
        clearTimeout(timeout);
        response.writeHead(500).end('OAuth callback failed');
        reject(callbackError);
      } finally {
        server.close();
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(Number(callbackUrl.port || 80), callbackUrl.hostname, resolve);
  });

  if (args.openBrowser) {
    execFile('open', ['-a', 'Google Chrome', authUrl]);
  }

  console.log(JSON.stringify({
    ok: true,
    action: args.openBrowser ? 'browser_opened' : 'open_auth_url_manually',
    provider: args.provider,
    callback: `${callbackUrl.origin}${callbackUrl.pathname}`,
    auth_url: args.openBrowser ? undefined : authUrl,
    secrets_redacted: true,
  }, null, 2));

  await resultPromise;
}

async function persistIntegration(args: ReturnType<typeof parseArgs>, token: {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}) {
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();
  const { data: website, error: websiteError } = await supabase
    .from('websites')
    .select('account_id')
    .eq('id', args.websiteId)
    .single();
  if (websiteError || !website?.account_id) throw new Error(`Failed to resolve website account: ${websiteError?.message ?? 'missing_account'}`);

  const { data: current, error: currentError } = await supabase
    .from('seo_integrations')
    .select('refresh_token,site_url,property_id,scopes')
    .eq('website_id', args.websiteId)
    .eq('provider', args.provider)
    .maybeSingle();
  if (currentError) throw new Error(`Failed to read current integration: ${currentError.message}`);

  const refreshToken = token.refresh_token ?? current?.refresh_token ?? null;
  const scopes = token.scope ? token.scope.split(' ') : Array.isArray(current?.scopes) ? current.scopes : [];
  const siteUrl = args.provider === 'gsc' ? args.siteUrl ?? current?.site_url ?? null : current?.site_url ?? null;
  const propertyId = args.provider === 'ga4' ? args.propertyId ?? current?.property_id ?? null : current?.property_id ?? null;
  const secretPayload = {
    provider: args.provider,
    access_token: token.access_token,
    refresh_token: refreshToken,
    access_token_expires_at: expiresAt,
    scopes,
    site_url: siteUrl,
    property_id: propertyId,
    updated_at: new Date().toISOString(),
  };

  const { data: credentialRef, error: vaultError } = await supabase.rpc('store_seo_integration_credential_secret', {
    p_website_id: args.websiteId,
    p_provider: args.provider,
    p_secret: secretPayload,
  });
  if (vaultError || typeof credentialRef !== 'string') {
    throw new Error(`Failed to store credential_ref: ${vaultError?.message ?? 'missing_ref'}`);
  }

  const legacyColumns = args.legacyColumns
    ? {
        access_token: token.access_token,
        refresh_token: refreshToken,
        access_token_expires_at: expiresAt,
      }
    : {
        access_token: null,
        refresh_token: null,
        access_token_expires_at: null,
      };

  const { error: upsertError } = await supabase
    .from('seo_integrations')
    .upsert(
      {
        account_id: website.account_id,
        website_id: args.websiteId,
        provider: args.provider,
        status: 'connected',
        ...legacyColumns,
        site_url: siteUrl,
        property_id: propertyId,
        scopes,
        credential_ref: credentialRef,
        metadata: {
          source: 'browser_assisted_oauth',
          issue: '#600',
          credential_storage: 'supabase_vault',
          legacy_columns: args.legacyColumns ? 'temporary_compatibility' : 'disabled',
        },
        last_error: null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'website_id,provider' }
    );
  if (upsertError) throw new Error(`Failed to update seo_integrations: ${upsertError.message}`);

  console.log(JSON.stringify({
    ok: true,
    provider: args.provider,
    credential_ref_present: true,
    legacy_columns_updated: args.legacyColumns,
    expires_at: args.legacyColumns ? expiresAt : null,
    secrets_redacted: true,
  }, null, 2));
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

  const provider = getString(flags, 'provider') as Provider;
  if (!['gsc', 'ga4'].includes(provider)) throw new Error(`Unsupported --provider ${provider}`);

  return {
    provider,
    websiteId: getString(flags, 'website-id'),
    siteUrl: getOptionalString(flags, 'site-url'),
    propertyId: getOptionalString(flags, 'property-id'),
    legacyColumns: flags.get('legacy-columns') === true,
    openBrowser: flags.get('open') === true,
    timeoutMs: Number(getOptionalString(flags, 'timeout-ms') ?? 10 * 60 * 1000),
  };
}

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function getString(flags: Map<string, string | boolean>, key: string) {
  const value = flags.get(key);
  if (typeof value !== 'string' || !value) throw new Error(`Missing required --${key}`);
  return value;
}

function getOptionalString(flags: Map<string, string | boolean>, key: string) {
  const value = flags.get(key);
  return typeof value === 'string' && value ? value : undefined;
}

function redact(value: string) {
  return value
    .replace(/ya29\\.[A-Za-z0-9._-]+/g, '[REDACTED_GOOGLE_ACCESS_TOKEN]')
    .replace(/1\/{2}[A-Za-z0-9._-]+/g, '[REDACTED_GOOGLE_REFRESH_TOKEN]')
    .replace(/client_secret=[^&\\s]+/g, 'client_secret=[REDACTED]');
}
