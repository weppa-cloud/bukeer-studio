#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const WEBSITE_ID = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
const CURRENT_RUN = "04291924-1574-0216-0000-e2085593ce67";
const OUT_DIR = "artifacts/seo/2026-04-29-en-blog-findings-audit";
const DEFAULT_SSH_TARGET = "root@5.161.186.100";
const DEFAULT_SSH_KEY = "/Users/yeisongomez/Documents/Proyectos/ssh/id_rsa";
const WP_ES_PATH = "/home/colombiatours.travel/public_html";
const WP_EN_PATH = "/home/en.colombiatours.travel/public_html";

const args = parseArgs(process.argv.slice(2));
const currentRun = args.current ?? CURRENT_RUN;
const outDir = args.outDir ?? OUT_DIR;
const includeWordPress = args.wp !== "false";
const sshTarget = args.sshTarget ?? DEFAULT_SSH_TARGET;
const sshKey = args.sshKey ?? DEFAULT_SSH_KEY;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  const [findings, studioPosts, wpEsPosts, wpEnPosts] = await Promise.all([
    fetchFindings(currentRun),
    fetchStudioPosts(),
    includeWordPress ? fetchWordPressPosts(WP_ES_PATH) : Promise.resolve([]),
    includeWordPress ? fetchWordPressPosts(WP_EN_PATH) : Promise.resolve([]),
  ]);

  const studioBySlug = indexPosts(studioPosts);
  const wpEsBySlug = indexPosts(wpEsPosts);
  const wpEnBySlug = indexPosts(wpEnPosts);
  const blogGroups = groupBlogFindings(findings);
  const rows = blogGroups.map((group) =>
    classifyBlogUrl(group, studioBySlug, wpEsBySlug, wpEnBySlug),
  );

  const report = {
    generated_at: new Date().toISOString(),
    website_id: WEBSITE_ID,
    current_run: currentRun,
    counts: {
      findings: findings.length,
      blog_urls: rows.length,
      en_blog_urls: rows.filter((row) => row.locale_path === "en").length,
      studio_posts: studioPosts.length,
      wordpress_es_posts: wpEsPosts.length,
      wordpress_en_posts: wpEnPosts.length,
    },
    action_counts: countBy(rows, (row) => row.action),
    issue_owner_counts: countBy(rows, (row) => row.issue_owner),
    severity_counts: countBy(rows, (row) => row.operational_severity),
    rows,
  };

  await fs.writeFile(
    path.join(outDir, "en-blog-findings-audit.json"),
    JSON.stringify(report, null, 2),
  );
  await fs.writeFile(
    path.join(outDir, "en-blog-findings-audit.md"),
    toMarkdown(report),
  );

  console.log(
    JSON.stringify(
      {
        counts: report.counts,
        action_counts: report.action_counts,
        issue_owner_counts: report.issue_owner_counts,
        artifact: path.join(outDir, "en-blog-findings-audit.md"),
      },
      null,
      2,
    ),
  );
}

async function fetchFindings(runId) {
  const out = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("seo_audit_findings")
      .select(
        "public_url,finding_type,severity,status,priority_score,evidence,crawl_task_id,finding_fingerprint",
      )
      .eq("website_id", WEBSITE_ID)
      .eq("source", "dataforseo:on_page")
      .eq("crawl_task_id", runId)
      .range(from, from + pageSize - 1);

    if (error)
      throw new Error(`seo_audit_findings read failed: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

async function fetchStudioPosts() {
  const out = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("website_blog_posts")
      .select(
        "id,slug,locale,title,status,translation_group_id,seo_title,seo_description,content,published_at,updated_at",
      )
      .eq("website_id", WEBSITE_ID)
      .is("deleted_at", null)
      .range(from, from + pageSize - 1);

    if (error)
      throw new Error(`website_blog_posts read failed: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

function fetchWordPressPosts(wpPath) {
  const command = [
    "wp",
    `--path=${shellQuote(wpPath)}`,
    "post",
    "list",
    "--post_type=post",
    "--post_status=publish",
    "--fields=ID,post_name,post_title,post_date",
    "--format=json",
    "--allow-root",
  ].join(" ");
  const result = spawnSync(
    "ssh",
    [
      "-i",
      sshKey,
      "-o",
      "BatchMode=yes",
      "-o",
      "ConnectTimeout=10",
      sshTarget,
      command,
    ],
    { encoding: "utf8", maxBuffer: 1024 * 1024 * 20 },
  );

  if (result.status !== 0) {
    throw new Error(
      `WordPress read failed for ${wpPath}: ${result.stderr || result.stdout}`,
    );
  }

  return JSON.parse(result.stdout || "[]").map((row) => ({
    id: String(row.ID ?? ""),
    slug: String(row.post_name ?? ""),
    title: String(row.post_title ?? ""),
    published_at: String(row.post_date ?? ""),
    status: "published",
  }));
}

function groupBlogFindings(findings) {
  const groups = new Map();
  for (const finding of findings) {
    const parsed = parseBlogUrl(finding.public_url);
    if (!parsed) continue;

    const key = parsed.url;
    const current = groups.get(key) ?? {
      ...parsed,
      findings: [],
      finding_types: new Set(),
      priority_score: 0,
    };
    current.findings.push(finding);
    current.finding_types.add(finding.finding_type);
    current.priority_score += Number(finding.priority_score ?? 0);
    groups.set(key, current);
  }

  return [...groups.values()].map((group) => ({
    ...group,
    finding_types: [...group.finding_types].sort(),
  }));
}

function parseBlogUrl(rawUrl) {
  if (!rawUrl) return null;
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  let localePath = "default";
  let blogIndex = segments.indexOf("blog");
  if (segments[0] === "en") {
    localePath = "en";
    blogIndex = segments.indexOf("blog");
  }
  if (blogIndex === -1 || !segments[blogIndex + 1]) return null;

  return {
    url: url.toString(),
    pathname: url.pathname,
    locale_path: localePath,
    slug: segments[blogIndex + 1],
  };
}

function classifyBlogUrl(group, studioBySlug, wpEsBySlug, wpEnBySlug) {
  const studioMatches = studioBySlug.get(group.slug) ?? [];
  const studioEn = studioMatches.find((post) => isEnLocale(post.locale));
  const studioEs = studioMatches.find((post) => isEsLocale(post.locale));
  const wpEn = wpEnBySlug.get(group.slug)?.[0] ?? null;
  const wpEs = wpEsBySlug.get(group.slug)?.[0] ?? null;
  const hasStatusFinding = group.finding_types.some((type) =>
    ["visual_404_200", "http_4xx", "http_5xx", "broken_fetch"].includes(type),
  );
  const hasMetadataFinding = group.finding_types.some((type) =>
    ["missing_title", "missing_description", "missing_h1"].includes(type),
  );
  const hasCanonicalFinding = group.finding_types.some((type) =>
    [
      "missing_canonical",
      "canonical_to_redirect",
      "canonical_to_broken",
    ].includes(type),
  );

  let action = "watch_manual_validation";
  let issueOwner = "#313";
  let rationale = "Needs manual validation after the next comparable crawl.";

  if (group.locale_path === "en") {
    if (studioEn && isPublished(studioEn)) {
      action =
        hasMetadataFinding || hasCanonicalFinding
          ? "ready_fix_metadata_canonical"
          : "ready";
      issueOwner =
        hasMetadataFinding || hasCanonicalFinding ? "#313" : "#314/#315";
      rationale =
        "Published Studio EN row exists; keep URL and fix technical metadata/canonical if needed.";
    } else if (wpEn) {
      action = "restore_from_wp_en_hide_now";
      issueOwner = "#314/#315";
      rationale =
        "Published legacy WordPress EN post exists but Studio EN is missing; hide from sitemap/hreflang until restored.";
    } else if (studioEs || wpEs) {
      action = "translate_later_hide_now";
      issueOwner = "#314/#315";
      rationale =
        "Only ES source exists; do not expose EN until translation quality gate passes.";
    } else {
      action = "remove_or_404";
      issueOwner = "#313";
      rationale =
        "No Studio/WP source found; remove links and return 404/410 or redirect explicitly.";
    }
  } else if (
    group.locale_path === "default" &&
    !studioEs &&
    (studioEn || wpEn)
  ) {
    action = "en_only_hide_now";
    issueOwner = "#314/#315";
    rationale =
      "Only EN source exists for a default-locale URL; keep out of default sitemap and review EN quality before exposing.";
  } else if (
    hasStatusFinding &&
    !studioMatches.some(isPublished) &&
    !wpEs &&
    !wpEn
  ) {
    action = "remove_or_404";
    issueOwner = "#313";
    rationale = "Default-locale blog URL has no Studio/WP source.";
  } else if (hasStatusFinding && (studioEs || wpEs)) {
    action = "restore_from_studio_or_wp";
    issueOwner = "#313";
    rationale =
      "A source exists; restore route/content or redirect to the valid canonical URL.";
  } else if (hasMetadataFinding || hasCanonicalFinding) {
    action = "technical_fix_now";
    issueOwner = "#313";
    rationale =
      "Published/default URL has technical metadata or canonical findings.";
  }

  return {
    url: group.url,
    pathname: group.pathname,
    slug: group.slug,
    locale_path: group.locale_path,
    operational_severity: operationalSeverity(group.finding_types),
    finding_types: group.finding_types,
    findings: group.findings.length,
    priority_score: group.priority_score,
    studio_locales: studioMatches.map((post) => post.locale).filter(Boolean),
    studio_en: Boolean(studioEn),
    studio_es: Boolean(studioEs),
    wp_en: Boolean(wpEn),
    wp_es: Boolean(wpEs),
    action,
    issue_owner: issueOwner,
    rationale,
    sample_titles: {
      studio: studioMatches[0]?.title ?? null,
      wp_en: wpEn?.title ?? null,
      wp_es: wpEs?.title ?? null,
    },
  };
}

function operationalSeverity(types) {
  if (
    types.some((type) =>
      ["visual_404_200", "http_4xx", "http_5xx", "broken_fetch"].includes(type),
    )
  ) {
    return "P0";
  }
  if (
    types.some((type) =>
      [
        "missing_title",
        "missing_description",
        "missing_h1",
        "missing_canonical",
        "canonical_to_redirect",
        "canonical_to_broken",
        "broken_image",
        "slow_page",
      ].includes(type),
    )
  ) {
    return "P1";
  }
  return "WATCH";
}

function indexPosts(posts) {
  const index = new Map();
  for (const post of posts) {
    if (!post.slug) continue;
    const current = index.get(post.slug) ?? [];
    current.push(post);
    index.set(post.slug, current);
  }
  return index;
}

function isPublished(post) {
  return post?.status === "published";
}

function isEnLocale(locale) {
  return ["en", "en-US"].includes(locale);
}

function isEsLocale(locale) {
  return [null, undefined, "es", "es-CO"].includes(locale);
}

function toMarkdown(report) {
  const actionRows = Object.entries(report.action_counts)
    .map(([key, value]) => `| ${key} | ${value} |`)
    .join("\n");
  const topRows = report.rows
    .slice()
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 80)
    .map(
      (row) =>
        `| ${row.operational_severity} | ${row.action} | ${row.issue_owner} | ${row.findings} | ${row.locale_path} | ${row.slug} | ${row.rationale} |`,
    )
    .join("\n");

  return `# EN Blog Findings Audit

Generated: ${report.generated_at}
Current run: ${report.current_run}

## Counts

| Metric | Value |
|---|---:|
| Findings | ${report.counts.findings} |
| Blog URLs | ${report.counts.blog_urls} |
| EN blog URLs | ${report.counts.en_blog_urls} |
| Studio posts | ${report.counts.studio_posts} |
| WordPress ES posts | ${report.counts.wordpress_es_posts} |
| WordPress EN posts | ${report.counts.wordpress_en_posts} |

## Actions

| Action | URLs |
|---|---:|
${actionRows}

## Top Rows

| Severity | Action | Owner | Findings | Locale path | Slug | Rationale |
|---|---|---|---:|---|---|---|
${topRows}
`;
}

function countBy(items, fn) {
  return items.reduce((acc, item) => {
    const key = fn(item) ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const raw = arg.slice(2);
    if (raw.includes("=")) {
      const [key, ...rest] = raw.split("=");
      parsed[key] = rest.join("=");
      continue;
    }
    const next = argv[index + 1];
    parsed[raw] = next && !next.startsWith("--") ? next : "true";
    if (next && !next.startsWith("--")) index += 1;
  }
  return parsed;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}
