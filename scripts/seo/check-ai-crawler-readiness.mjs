#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_AI_AGENTS = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'Claude-SearchBot',
  'Claude-User',
  'ClaudeBot',
  'PerplexityBot',
  'Google-Extended',
];

function parseArgs(argv) {
  const args = {
    baseUrl: 'https://colombiatours.travel',
    outDir: null,
    agents: DEFAULT_AI_AGENTS,
    subdomainHeader: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--baseUrl') args.baseUrl = argv[++i];
    else if (arg === '--outDir') args.outDir = argv[++i];
    else if (arg === '--agents') args.agents = argv[++i].split(',').map((v) => v.trim()).filter(Boolean);
    else if (arg === '--subdomainHeader') args.subdomainHeader = argv[++i];
  }

  args.baseUrl = args.baseUrl.replace(/\/+$/, '');
  return args;
}

async function fetchText(url, args) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'BukeerGrowthOS/1.0 (+https://bukeer.com)',
      ...(args.subdomainHeader ? { 'x-subdomain': args.subdomainHeader } : {}),
    },
  });
  const text = await response.text();
  return {
    url,
    ok: response.ok,
    status: response.status,
    contentType: response.headers.get('content-type'),
    text,
  };
}

function includesAll(text, values) {
  return values.map((value) => ({
    value,
    present: text.includes(`User-agent: ${value}`) || text.includes(`user-agent: ${value}`),
  }));
}

function checkRobots(robots, agents) {
  const agentCoverage = includesAll(robots.text, agents);
  const hasSitemap = /Sitemap:\s*https?:\/\/\S+\/sitemap\.xml/i.test(robots.text);
  const blocksNext = /Disallow:\s*\/_next\/?/i.test(robots.text);
  const blocksApi = /Disallow:\s*\/api\/?/i.test(robots.text);
  const blocksEditor = /Disallow:\s*\/editor\/?/i.test(robots.text);

  return {
    status: robots.ok && hasSitemap && !blocksNext && agentCoverage.every((item) => item.present)
      ? 'PASS'
      : 'FAIL',
    http_status: robots.status,
    has_sitemap: hasSitemap,
    blocks_next_assets: blocksNext,
    blocks_api: blocksApi,
    blocks_editor: blocksEditor,
    agent_coverage: agentCoverage,
  };
}

function checkLlms(llms) {
  const requiredSections = [
    '## About',
    '## Value Proposition',
    '## Key Entities',
    '## Destinations',
    '## Priority Packages',
    '## Travel Guides',
    '## Canonical URL Policy',
  ];

  const sectionCoverage = requiredSections.map((section) => ({
    section,
    present: llms.text.includes(section),
  }));

  return {
    status: llms.ok && sectionCoverage.every((item) => item.present) ? 'PASS' : 'WATCH',
    http_status: llms.status,
    content_length: llms.text.length,
    section_coverage: sectionCoverage,
  };
}

function checkSitemap(sitemap) {
  return {
    status: sitemap.ok && sitemap.text.includes('<urlset') ? 'PASS' : 'FAIL',
    http_status: sitemap.status,
    content_type: sitemap.contentType,
    url_count: (sitemap.text.match(/<url>/g) || []).length,
  };
}

function toMarkdown(report) {
  const lines = [
    `# AI Crawler Readiness Report`,
    '',
    `Base URL: ${report.base_url}`,
    `Generated at: ${report.generated_at}`,
    '',
    `| Check | Status | Detail |`,
    `|---|---|---|`,
    `| robots.txt | ${report.robots.status} | agents ${report.robots.agent_coverage.filter((item) => item.present).length}/${report.robots.agent_coverage.length}, sitemap ${report.robots.has_sitemap ? 'yes' : 'no'}, blocks /_next ${report.robots.blocks_next_assets ? 'yes' : 'no'} |`,
    `| llms.txt | ${report.llms.status} | sections ${report.llms.section_coverage.filter((item) => item.present).length}/${report.llms.section_coverage.length}, bytes ${report.llms.content_length} |`,
    `| sitemap.xml | ${report.sitemap.status} | urls ${report.sitemap.url_count}, HTTP ${report.sitemap.http_status} |`,
    '',
    `## Missing robots agents`,
    '',
    ...report.robots.agent_coverage.filter((item) => !item.present).map((item) => `- ${item.value}`),
    '',
    `## Missing llms.txt sections`,
    '',
    ...report.llms.section_coverage.filter((item) => !item.present).map((item) => `- ${item.section}`),
    '',
  ];

  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [robots, llms, sitemap] = await Promise.all([
    fetchText(`${args.baseUrl}/robots.txt`, args),
    fetchText(`${args.baseUrl}/llms.txt`, args),
    fetchText(`${args.baseUrl}/sitemap.xml`, args),
  ]);

  const report = {
    base_url: args.baseUrl,
    generated_at: new Date().toISOString(),
    status: 'PASS',
    robots: checkRobots(robots, args.agents),
    llms: checkLlms(llms),
    sitemap: checkSitemap(sitemap),
  };
  report.status = [report.robots.status, report.llms.status, report.sitemap.status].includes('FAIL')
    ? 'FAIL'
    : [report.robots.status, report.llms.status, report.sitemap.status].includes('WATCH')
      ? 'WATCH'
      : 'PASS';

  if (args.outDir) {
    await fs.mkdir(args.outDir, { recursive: true });
    await fs.writeFile(path.join(args.outDir, 'ai-crawler-readiness.json'), `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(path.join(args.outDir, 'ai-crawler-readiness.md'), toMarkdown(report));
  }

  console.log(JSON.stringify(report, null, 2));
  if (report.status === 'FAIL') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
