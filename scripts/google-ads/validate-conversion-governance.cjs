#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');
const repoRoot = path.resolve(__dirname, '../..');

const REQUIRED_ENV = [
  'GOOGLE_ADS_DEVELOPER_TOKEN',
  'GOOGLE_ADS_LOGIN_CUSTOMER_ID',
  'GOOGLE_ADS_CUSTOMER_ID',
  'GOOGLE_ADS_CLIENT_ID',
  'GOOGLE_ADS_CLIENT_SECRET',
  'GOOGLE_ADS_REFRESH_TOKEN',
];

const SECRET_KEY_PATTERN = /(token|secret|authorization|password|credential|refresh)/i;

function stripCustomerId(value) {
  return String(value || '').replace(/\D/g, '');
}

function loadDotEnvFile(filePath, target = process.env) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (target[key]) continue;

    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    target[key] = value;
  }
}

function assertRequiredEnv(env = process.env) {
  const missing = REQUIRED_ENV.filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(`Missing required Google Ads env vars: ${missing.join(', ')}`);
  }
}

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SECRET_KEY_PATTERN.test(key) ? '[redacted]' : redact(entry),
    ]),
  );
}

function summarizeConversionAction(row) {
  const action = row.conversionAction || {};
  return {
    id: action.id,
    name: action.name,
    status: action.status,
    type: action.type,
    category: action.category,
    primaryForGoal: action.primaryForGoal,
    includeInConversionsMetric: action.includeInConversionsMetric,
    defaultValue: action.valueSettings?.defaultValue,
    alwaysUseDefaultValue: action.valueSettings?.alwaysUseDefaultValue,
    ownerCustomer: action.ownerCustomer,
  };
}

function classifyGoogleAdsGovernance(conversionActions = []) {
  const canonicalUpload = conversionActions.filter((action) =>
    action.type === 'UPLOAD_CLICKS' ||
    ['QUALIFIED_LEAD', 'CONVERTED_LEAD', 'PURCHASE'].includes(action.category),
  );
  const legacyBidding = conversionActions.filter((action) => {
    const name = String(action.name || '').toLowerCase();
    const isLegacy = action.type?.includes('GOOGLE_ANALYTICS') ||
      action.type?.includes('UNIVERSAL_ANALYTICS') ||
      name.includes('ga4') ||
      name.includes('form_submit') ||
      name.includes('lead_calificado_form');
    return isLegacy && (action.primaryForGoal || action.includeInConversionsMetric);
  });
  const webpageLeadBidding = conversionActions.filter((action) =>
    action.type === 'WEBPAGE' &&
    ['SUBMIT_LEAD_FORM', 'CONTACT'].includes(action.category) &&
    (action.primaryForGoal || action.includeInConversionsMetric),
  );

  return {
    canonicalUploadActionCount: canonicalUpload.length,
    legacyBiddingActionCount: legacyBidding.length,
    webpageLeadBiddingActionCount: webpageLeadBidding.length,
    blockers: [
      ...(legacyBidding.length
        ? ['legacy_imported_actions_still_in_bidding_or_conversions_metric']
        : []),
      ...(canonicalUpload.length
        ? []
        : ['no_upload_clicks_or_lower_funnel_conversion_action_found']),
    ],
  };
}

async function getAccessToken(env) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_ADS_CLIENT_ID,
      client_secret: env.GOOGLE_ADS_CLIENT_SECRET,
      refresh_token: env.GOOGLE_ADS_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`OAuth refresh failed: ${JSON.stringify(redact(body))}`);
  }
  return body.access_token;
}

async function googleAdsRequest({ env, apiVersion, accessToken, path: requestPath, body }) {
  const customerId = stripCustomerId(env.GOOGLE_ADS_CUSTOMER_ID);
  const response = await fetch(
    `https://googleads.googleapis.com/${apiVersion}/customers/${customerId}/${requestPath}`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN,
        'login-customer-id': stripCustomerId(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID),
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!response.ok) {
    throw new Error(
      `${requestPath} failed ${response.status}: ${JSON.stringify(redact(parsed))}`,
    );
  }
  return parsed;
}

async function search({ env, apiVersion, accessToken, query }) {
  const chunks = await googleAdsRequest({
    env,
    apiVersion,
    accessToken,
    path: 'googleAds:searchStream',
    body: { query },
  });
  return (chunks || []).flatMap((chunk) => chunk.results || []);
}

async function run() {
  loadDotEnvFile(path.join(repoRoot, '.env.local'));
  loadDotEnvFile(path.join(repoRoot, '.env.mcp'));
  assertRequiredEnv();

  const apiVersion = process.env.GOOGLE_ADS_API_VERSION || 'v24';
  const customerId = stripCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID);
  const accessToken = await getAccessToken(process.env);

  const [customerRows, campaignRows, conversionRows, customGoalRows] =
    await Promise.all([
      search({
        env: process.env,
        apiVersion,
        accessToken,
        query: `
          SELECT customer.id, customer.descriptive_name
          FROM customer
          LIMIT 1
        `,
      }),
      search({
        env: process.env,
        apiVersion,
        accessToken,
        query: `
          SELECT campaign.id, campaign.name, campaign.status,
                 campaign.advertising_channel_type, metrics.clicks,
                 metrics.conversions, metrics.all_conversions,
                 metrics.cost_micros
          FROM campaign
          WHERE campaign.status != 'REMOVED'
          ORDER BY campaign.id DESC
          LIMIT 25
        `,
      }),
      search({
        env: process.env,
        apiVersion,
        accessToken,
        query: `
          SELECT conversion_action.id, conversion_action.name,
                 conversion_action.status, conversion_action.type,
                 conversion_action.category, conversion_action.primary_for_goal,
                 conversion_action.include_in_conversions_metric,
                 conversion_action.value_settings.default_value,
                 conversion_action.value_settings.always_use_default_value,
                 conversion_action.owner_customer
          FROM conversion_action
          WHERE conversion_action.status != 'REMOVED'
          ORDER BY conversion_action.id DESC
          LIMIT 100
        `,
      }),
      search({
        env: process.env,
        apiVersion,
        accessToken,
        query: `
          SELECT custom_conversion_goal.id, custom_conversion_goal.name,
                 custom_conversion_goal.status,
                 custom_conversion_goal.conversion_actions
          FROM custom_conversion_goal
          LIMIT 50
        `,
      }).catch((error) => [{ error: error.message }]),
    ]);

  const conversionActions = conversionRows.map(summarizeConversionAction);
  const enabledSearchCampaign = campaignRows.find(
    (row) =>
      row.campaign?.status === 'ENABLED' &&
      row.campaign?.advertisingChannelType === 'SEARCH',
  );

  const validateConversionAction = await googleAdsRequest({
    env: process.env,
    apiVersion,
    accessToken,
    path: 'conversionActions:mutate',
    body: {
      customerId,
      validateOnly: true,
      partialFailure: false,
      operations: [
        {
          create: {
            name: `codex_validate_only_conversion_${Date.now()}`,
            category: 'SUBMIT_LEAD_FORM',
            type: 'UPLOAD_CLICKS',
            status: 'ENABLED',
            primaryForGoal: false,
            valueSettings: {
              defaultValue: 1,
              alwaysUseDefaultValue: false,
            },
          },
        },
      ],
    },
  });

  let validateCampaignGoal = { skipped: 'no_enabled_search_campaign_found' };
  if (enabledSearchCampaign?.campaign?.id) {
    validateCampaignGoal = await googleAdsRequest({
      env: process.env,
      apiVersion,
      accessToken,
      path: 'campaignConversionGoals:mutate',
      body: {
        customerId,
        validateOnly: true,
        operations: [
          {
            update: {
              resourceName:
                `customers/${customerId}/campaignConversionGoals/` +
                `${enabledSearchCampaign.campaign.id}~SUBMIT_LEAD_FORM~WEBSITE`,
              biddable: true,
            },
            updateMask: 'biddable',
          },
        ],
      },
    });
  }

  const output = {
    generatedAt: new Date().toISOString(),
    mode: 'read_only_plus_validate_only',
    apiVersion,
    customer: {
      id: customerRows[0]?.customer?.id,
      descriptiveName: customerRows[0]?.customer?.descriptiveName,
      loginCustomerId: stripCustomerId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID),
    },
    campaignSummary: campaignRows.map((row) => ({
      id: row.campaign?.id,
      name: row.campaign?.name,
      status: row.campaign?.status,
      channel: row.campaign?.advertisingChannelType,
      clicks: row.metrics?.clicks,
      conversions: row.metrics?.conversions,
      allConversions: row.metrics?.allConversions,
      costMicros: row.metrics?.costMicros,
    })),
    conversionActions,
    customConversionGoals: customGoalRows.map((row) =>
      row.error
        ? row
        : {
            id: row.customConversionGoal?.id,
            name: row.customConversionGoal?.name,
            status: row.customConversionGoal?.status,
            conversionActions: row.customConversionGoal?.conversionActions,
          },
    ),
    governance: classifyGoogleAdsGovernance(conversionActions),
    validateOnly: {
      conversionActionsMutate: {
        ok: true,
        response: redact(validateConversionAction),
      },
      campaignConversionGoalsMutate: {
        ok: true,
        response: redact(validateCampaignGoal),
      },
    },
    nextRequiredProductionActions: [
      'approve canonical conversion action governance',
      'apply Google Ads changes outside validateOnly',
      'populate event_destination_mapping.tenant_overrides conversion_action_id values',
      'run controlled gclid offline upload and inspect diagnostics',
    ],
  };

  console.log(JSON.stringify(output, null, 2));
}

module.exports = {
  REQUIRED_ENV,
  stripCustomerId,
  loadDotEnvFile,
  assertRequiredEnv,
  redact,
  summarizeConversionAction,
  classifyGoogleAdsGovernance,
};

if (require.main === module) {
  run().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
