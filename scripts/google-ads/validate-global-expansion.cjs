#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');
const {
  loadDotEnvFile,
  stripCustomerId,
  assertRequiredEnv,
  redact,
} = require('./validate-conversion-governance.cjs');

const repoRoot = path.resolve(__dirname, '../..');
const ITERATION_DIR = path.join(
  repoRoot,
  'ops/google-ads/colombiatours/2026-05-global-expansion',
);

const GEO_TARGETS = {
  Brazil: '2076',
  France: '2250',
  Germany: '2276',
  Argentina: '2032',
};

const COLOMBIA_GEO_ID = '2170';

function printUsage() {
  console.log(`Usage:
  node scripts/google-ads/validate-global-expansion.cjs [--apply-paused]

Default mode validates the local campaign plan with Google Ads validateOnly.
--apply-paused creates the planned campaigns paused after duplicate-name checks.
`);
}

const AD_COPY = {
  BR_Search_Colombia_Packages_2026_05: {
    path1: 'pacotes',
    path2: 'colombia',
    headlines: [
      'Pacotes para Colombia',
      'Roteiro Sob Medida',
      'Planner Local Colombia',
      'Cotacao por WhatsApp',
      'Cartagena e Medellin',
      'Eixo Cafeeiro e Caribe',
      'Viagem Privada',
      'Apoio Local',
    ],
    descriptions: [
      'Planeje Colombia com roteiro privado, traslados e experiencias com equipe local.',
      'Conte suas datas e estilo de viagem. Receba uma proposta clara por WhatsApp.',
      'Cartagena, Medellin, Eixo Cafeeiro, San Andres e Caribe colombiano em uma rota viavel.',
      'Nao vendemos apenas hotel ou voo. Montamos uma viagem completa pela Colombia.',
    ],
  },
  FR_Search_Colombie_Sur_Mesure_2026_05: {
    path1: 'voyage',
    path2: 'colombie',
    headlines: [
      'Voyage Colombie Prive',
      'Circuit Sur Mesure',
      'Planner Local Colombie',
      'Devis Par WhatsApp',
      'Carthagene Medellin',
      'Voyage Organise',
      'Route 10 A 15 Jours',
      'Equipe Locale',
    ],
    descriptions: [
      'Construisez un circuit prive en Colombie avec Carthagene, Medellin, cafe et Caraibes.',
      'Recevez un devis clair avec hotels, transferts et experiences adaptes a votre rythme.',
      'Une equipe locale coordonne votre itineraire avant et pendant le voyage.',
      'Voyage sur mesure en Colombie, pas une simple liste de villes a cocher.',
    ],
  },
  DE_Search_Kolumbien_Rundreise_2026_05: {
    path1: 'rundreise',
    path2: 'kolumbien',
    headlines: [
      'Kolumbien Rundreise',
      'Private Route Planen',
      'Lokale Kolumbien Planer',
      'Anfrage Per WhatsApp',
      'Cartagena Medellin',
      'Kaffee Und Karibik',
      '10 Bis 15 Tage',
      'Individuelle Reise',
    ],
    descriptions: [
      'Planen Sie eine private Kolumbien Rundreise mit Cartagena, Medellin, Kaffee und Karibik.',
      'Lokale Planner koordinieren Route, Transfers, Hotels und Erlebnisse in Kolumbien.',
      'Senden Sie Reisedaten und Stil. Wir antworten mit einem konkreten Routenvorschlag.',
      'Keine lokale Tagestour. Eine komplette Kolumbien Reise mit sinnvoller Reihenfolge.',
    ],
  },
  AR_Search_Colombia_Packages_2026_05: {
    path1: 'viajes',
    path2: 'colombia',
    headlines: [
      'Viajes A Colombia',
      'Paquetes A Medida',
      'Desde Argentina',
      'Cotiza Por WhatsApp',
      'Cartagena Medellin',
      'Eje Cafetero Caribe',
      'Planner Local',
      'Ruta Personalizada',
    ],
    descriptions: [
      'Arma tu viaje a Colombia desde Argentina con ruta privada, hoteles y traslados claros.',
      'Cotiza por WhatsApp con un planner local. Cartagena, Medellin, Eje Cafetero y Caribe.',
      'Paquetes completos a Colombia, no vuelos u hoteles sueltos.',
      'Contanos fechas, viajeros y estilo. Te respondemos con una propuesta concreta.',
    ],
  },
};

function parseCsv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').trim();
  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(',');
  return lines.map((line) => {
    const cells = line.split(',');
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
  });
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

async function googleAdsMutate({ env, accessToken, body }) {
  const apiVersion = env.GOOGLE_ADS_API_VERSION || 'v24';
  const customerId = stripCustomerId(env.GOOGLE_ADS_CUSTOMER_ID);
  const response = await fetch(
    `https://googleads.googleapis.com/${apiVersion}/customers/${customerId}/googleAds:mutate`,
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
    throw new Error(`googleAds:mutate failed ${response.status}: ${JSON.stringify(redact(parsed))}`);
  }
  return parsed;
}

async function googleAdsSearch({ env, accessToken, query }) {
  const apiVersion = env.GOOGLE_ADS_API_VERSION || 'v24';
  const customerId = stripCustomerId(env.GOOGLE_ADS_CUSTOMER_ID);
  const response = await fetch(
    `https://googleads.googleapis.com/${apiVersion}/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN,
        'login-customer-id': stripCustomerId(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query }),
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
    throw new Error(`googleAds:searchStream failed ${response.status}: ${JSON.stringify(redact(parsed))}`);
  }
  return (parsed || []).flatMap((chunk) => chunk.results || []);
}

function validateInputs(campaigns, keywords) {
  const broad = keywords.filter((row) => String(row.match_type).toLowerCase() === 'broad');
  if (broad.length) {
    throw new Error(`Broad match is forbidden in this phase: ${broad.map((row) => row.keyword).join(', ')}`);
  }
  const missingGeo = campaigns.filter((row) => !GEO_TARGETS[row.geo_target]);
  if (missingGeo.length) {
    throw new Error(`Missing geo IDs for: ${missingGeo.map((row) => row.geo_target).join(', ')}`);
  }
  const missingCopy = campaigns.filter((row) => !AD_COPY[row.campaign]);
  if (missingCopy.length) {
    throw new Error(`Missing ad copy for: ${missingCopy.map((row) => row.campaign).join(', ')}`);
  }
}

function microsFromCop(value) {
  const first = String(value).split('-')[0].replace(/\D/g, '');
  return Number(first || '0') * 1_000_000;
}

function keywordMatchType(value) {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'EXACT') return 'EXACT';
  if (normalized === 'PHRASE') return 'PHRASE';
  throw new Error(`Unsupported match type: ${value}`);
}

function buildOperations(customerId, campaigns, keywords) {
  const operations = [];
  const ids = new Map();
  let temp = -1;

  for (const campaign of campaigns) {
    const campaignId = temp--;
    const budgetId = temp--;
    const campaignResource = `customers/${customerId}/campaigns/${campaignId}`;
    const budgetResource = `customers/${customerId}/campaignBudgets/${budgetId}`;
    ids.set(campaign.campaign, { campaignResource, adGroups: new Map() });

    operations.push({
      campaignBudgetOperation: {
        create: {
          resourceName: budgetResource,
          name: `${campaign.campaign}_budget_validate_${Date.now()}`,
          amountMicros: microsFromCop(campaign.budget_cop_day),
          deliveryMethod: 'STANDARD',
          explicitlyShared: false,
        },
      },
    });
    operations.push({
      campaignOperation: {
        create: {
          resourceName: campaignResource,
          name: campaign.campaign,
          status: 'PAUSED',
          advertisingChannelType: 'SEARCH',
          campaignBudget: budgetResource,
          manualCpc: {},
          containsEuPoliticalAdvertising: 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING',
          networkSettings: {
            targetGoogleSearch: true,
            targetSearchNetwork: false,
            targetContentNetwork: false,
            targetPartnerSearchNetwork: false,
          },
          finalUrlSuffix:
            'utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={creative}&utm_term={keyword}&gclid={gclid}',
        },
      },
    });
    operations.push({
      campaignCriterionOperation: {
        create: {
          campaign: campaignResource,
          location: {
            geoTargetConstant: `geoTargetConstants/${GEO_TARGETS[campaign.geo_target]}`,
          },
        },
      },
    });
    operations.push({
      campaignCriterionOperation: {
        create: {
          campaign: campaignResource,
          negative: true,
          location: {
            geoTargetConstant: `geoTargetConstants/${COLOMBIA_GEO_ID}`,
          },
        },
      },
    });
  }

  const groupedKeywords = new Map();
  for (const row of keywords) {
    const key = `${row.campaign}::${row.ad_group}`;
    if (!groupedKeywords.has(key)) groupedKeywords.set(key, []);
    groupedKeywords.get(key).push(row);
  }

  for (const [key, rows] of groupedKeywords.entries()) {
    const [campaignName, adGroupName] = key.split('::');
    const campaignIds = ids.get(campaignName);
    if (!campaignIds) throw new Error(`Keyword references unknown campaign: ${campaignName}`);
    const adGroupId = temp--;
    const adGroupResource = `customers/${customerId}/adGroups/${adGroupId}`;
    campaignIds.adGroups.set(adGroupName, adGroupResource);
    operations.push({
      adGroupOperation: {
        create: {
          resourceName: adGroupResource,
          campaign: campaignIds.campaignResource,
          name: adGroupName,
          status: 'PAUSED',
          cpcBidMicros: 4_000_000_000,
        },
      },
    });

    for (const row of rows) {
      operations.push({
        adGroupCriterionOperation: {
          create: {
            adGroup: adGroupResource,
            status: 'PAUSED',
            keyword: {
              text: row.keyword,
              matchType: keywordMatchType(row.match_type),
            },
            finalUrls: [row.landing_url],
          },
        },
      });
    }

    const copy = AD_COPY[campaignName];
    operations.push({
      adGroupAdOperation: {
        create: {
          adGroup: adGroupResource,
          status: 'PAUSED',
          ad: {
            finalUrls: [rows[0].landing_url],
            responsiveSearchAd: {
              path1: copy.path1,
              path2: copy.path2,
              headlines: copy.headlines.map((text) => ({ text })),
              descriptions: copy.descriptions.map((text) => ({ text })),
            },
          },
        },
      },
    });
  }

  return operations;
}

async function run() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    return;
  }

  process.chdir(repoRoot);
  loadDotEnvFile(path.join(repoRoot, '.env.local'));
  loadDotEnvFile(path.join(repoRoot, '.env.mcp'));
  assertRequiredEnv();

  const campaigns = parseCsv(path.join(ITERATION_DIR, '01_campaigns.csv'));
  const keywords = parseCsv(path.join(ITERATION_DIR, '02_keywords.csv'));
  validateInputs(campaigns, keywords);

  const accessToken = await getAccessToken(process.env);
  const customerId = stripCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID);
  const applyPaused = process.argv.includes('--apply-paused');

  const names = campaigns.map((row) => row.campaign.replace(/'/g, "\\'"));
  const existing = await googleAdsSearch({
    env: process.env,
    accessToken,
    query: `
      SELECT campaign.id, campaign.name, campaign.status
      FROM campaign
      WHERE campaign.name IN (${names.map((name) => `'${name}'`).join(',')})
        AND campaign.status != 'REMOVED'
    `,
  });
  if (existing.length > 0) {
    throw new Error(
      `Refusing duplicate campaign plan before mutate: ${existing
        .map((row) => `${row.campaign?.name} (${row.campaign?.id})`)
        .join(', ')}`,
    );
  }

  const mutateOperations = buildOperations(customerId, campaigns, keywords);
  const response = await googleAdsMutate({
    env: process.env,
    accessToken,
    body: {
      validateOnly: !applyPaused,
      partialFailure: false,
      mutateOperations,
    },
  });

  const output = {
    ok: true,
    mode: applyPaused ? 'applyPaused' : 'validateOnly',
    customerId,
    operationCount: mutateOperations.length,
    campaignCount: campaigns.length,
    adGroupCount: new Set(keywords.map((row) => `${row.campaign}::${row.ad_group}`)).size,
    keywordCount: keywords.length,
    broadMatchCount: 0,
    validatedCampaigns: campaigns.map((row) => ({
      campaign: row.campaign,
      geo: row.geo_target,
      geoId: GEO_TARGETS[row.geo_target],
      budget: row.budget_cop_day,
      landing: row.landing_url,
    })),
    response: redact(response),
  };
  console.log(JSON.stringify(output, null, 2));
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
