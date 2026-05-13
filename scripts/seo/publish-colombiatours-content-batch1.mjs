import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const WEBSITE_ID = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
const ORIGIN = "https://colombiatours.travel";
const DRAFT_DIR =
  "artifacts/seo/2026-05-11-colombiatours-content-drafts-batch-1";
const OUT_DIR =
  "artifacts/seo/2026-05-11-colombiatours-content-publication-batch-1";

const POSTS = [
  {
    file: "cartagena-colombia-travel.md",
    slug: "cartagena-colombia-travel",
    locale: "en-US",
    publicUrl: `${ORIGIN}/en/blog/cartagena-colombia-travel`,
  },
  {
    file: "coffee-region-colombia.md",
    slug: "coffee-region-colombia",
    locale: "en-US",
    publicUrl: `${ORIGIN}/en/blog/coffee-region-colombia`,
  },
  {
    file: "is-colombia-safe-to-travel.md",
    slug: "is-colombia-safe-to-travel",
    locale: "en-US",
    publicUrl: `${ORIGIN}/en/blog/is-colombia-safe-to-travel`,
  },
  {
    file: "best-time-to-visit-colombia.md",
    slug: "best-time-to-visit-colombia",
    locale: "en-US",
    publicUrl: `${ORIGIN}/en/blog/best-time-to-visit-colombia`,
  },
  {
    file: "colombia-itinerary.md",
    slug: "colombia-itinerary",
    locale: "en-US",
    publicUrl: `${ORIGIN}/en/blog/colombia-itinerary`,
  },
  {
    file: "requisitos-para-viajar-a-colombia-desde-mexico.md",
    slug: "requisitos-para-viajar-a-colombia-desde-mexico",
    // Site default locale is `es`; `es-MX` is not currently in supported_locales.
    locale: "es",
    publicUrl: `${ORIGIN}/blog/requisitos-para-viajar-a-colombia-desde-mexico`,
  },
];

const LIVE_HUBS = [
  `${ORIGIN}/paquetes`,
  `${ORIGIN}/actividades`,
  `${ORIGIN}/en/packages`,
  `${ORIGIN}/en/planners`,
];

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { attrs: {}, body: markdown };
  const attrs = {};
  for (const line of match[1].split(/\n/)) {
    const item = line.match(/^([A-Za-z0-9_]+):\s*"?([^"]*)"?$/);
    if (item) attrs[item[1]] = item[2];
  }
  return { attrs, body: match[2] };
}

function extractSection(markdown, heading) {
  const lines = markdown.split(/\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return "";
  const collected = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("## ")) break;
    collected.push(line);
  }
  return collected.join("\n").trim();
}

function extractSeo(markdown, key) {
  const seo = extractSection(markdown, "SEO");
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("- " + escaped + ": `([^`]+)`");
  const match = seo.match(re);
  return match ? match[1].trim() : "";
}

function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "ColombiaTours";
}

function buildContent(markdown) {
  const sections = [
    "Draft",
    "How Many Days In Cartagena?",
    "Where To Stay",
    "What To Do",
  ];
  const draft = extractSection(markdown, "Draft");
  const cta = extractSection(markdown, "CTA");
  const faq = extractSection(markdown, "FAQ");
  const sourceNotes = extractSection(markdown, "Source Notes");
  const internalLinks = extractSection(markdown, "Internal Links");
  let content = draft;
  if (cta) content += `\n\n## Next Step\n\n${cta}`;
  if (faq) content += `\n\n## FAQ\n\n${faq}`;
  if (sourceNotes) content += `\n\n## Source Notes\n\n${sourceNotes}`;
  if (internalLinks) content += `\n\n## Related ColombiaTours Links\n\n${internalLinks}`;
  return content
    .replace(/Primary CTA:\s*`?([^`\n]+)`?/g, (_, href) => `[Plan with ColombiaTours](${href.trim()})`)
    .replace(/CTA principal:\s*`?([^`\n]+)`?/g, (_, href) => `[Cotizar con ColombiaTours](${href.trim()})`)
    .trim();
}

function excerptFrom(content) {
  return content
    .replace(/[#*_`\[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function wordCount(content) {
  return content.split(/\s+/).filter(Boolean).length;
}

function deriveFaqItems(markdown) {
  const faq = extractSection(markdown, "FAQ");
  const items = [];
  const re = /^###\s+(.+)\n\n([\s\S]*?)(?=\n### |$)/gm;
  let match;
  while ((match = re.exec(faq))) {
    items.push({
      question: match[1].trim(),
      answer: match[2].trim().replace(/\s+/g, " "),
    });
  }
  return items;
}

async function validateUrl(url) {
  const res = await fetch(url, { redirect: "follow" });
  const html = await res.text();
  const title = html.match(/<title>(.*?)<\/title>/i)?.[1] ?? "";
  const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1] ?? "";
  const robots = html.match(/<meta[^>]+name="robots"[^>]+content="([^"]+)"/i)?.[1] ?? "";
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
  const hasJsonLd = /application\/ld\+json/i.test(html);
  return {
    url,
    status: res.status,
    finalUrl: res.url,
    title,
    canonical,
    robots,
    h1,
    hasJsonLd,
    htmlBytes: html.length,
  };
}

async function main() {
  loadEnv(".env.local");
  loadEnv(".env.mcp");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase URL or service role key.");
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const startedAt = new Date().toISOString();
  const snapshots = [];
  const mutations = [];

  for (const spec of POSTS) {
    const draftPath = path.join(DRAFT_DIR, spec.file);
    const raw = fs.readFileSync(draftPath, "utf8");
    const { attrs, body } = parseFrontmatter(raw);
    const title = extractTitle(body);
    const content = buildContent(body);
    const seoTitle = extractSeo(body, "title") || title;
    const seoDescription = extractSeo(body, "meta_description") || excerptFrom(content);
    const faqItems = deriveFaqItems(body);
    const now = new Date().toISOString();

    const { data: existing, error: existingError } = await supabase
      .from("website_blog_posts")
      .select("*")
      .eq("website_id", WEBSITE_ID)
      .eq("slug", spec.slug)
      .eq("locale", spec.locale)
      .maybeSingle();
    if (existingError) throw existingError;

    snapshots.push({
      table: "website_blog_posts",
      slug: spec.slug,
      locale: spec.locale,
      existed: Boolean(existing),
      before: existing ?? null,
    });

    const basePayload = {
      website_id: WEBSITE_ID,
      title,
      slug: spec.slug,
      locale: spec.locale,
      content,
      excerpt: excerptFrom(content),
      status: "published",
      seo_title: seoTitle,
      seo_description: seoDescription,
      // Keep these null for the current production renderer. The deployed
      // blog schema path is tolerant of nulls; FAQ text remains in content.
      seo_keywords: null,
      faq_items: null,
      internal_links: {
        source: "colombiatours-seo-content-operator",
        issue: attrs.issue ?? null,
        public_url: spec.publicUrl,
      },
      robots_noindex: false,
      ai_generated: true,
      ai_model: "codex-gpt-5",
      human_edited: false,
      word_count: wordCount(content),
      published_at: existing?.published_at ?? now,
      updated_at: now,
      translation_group_id: existing?.translation_group_id ?? crypto.randomUUID(),
    };

    if (existing) {
      const { data, error } = await supabase
        .from("website_blog_posts")
        .update(basePayload)
        .eq("id", existing.id)
        .select("id,slug,locale,status,published_at,seo_title")
        .single();
      if (error) throw error;
      mutations.push({ action: "update", publicUrl: spec.publicUrl, row: data });
    } else {
      const { data, error } = await supabase
        .from("website_blog_posts")
        .insert(basePayload)
        .select("id,slug,locale,status,published_at,seo_title")
        .single();
      if (error) throw error;
      mutations.push({ action: "insert", publicUrl: spec.publicUrl, row: data });
    }
  }

  fs.writeFileSync(
    path.join(OUT_DIR, "rollback-snapshot.json"),
    JSON.stringify({ startedAt, websiteId: WEBSITE_ID, snapshots }, null, 2) + "\n",
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "mutation-log.json"),
    JSON.stringify({ startedAt, websiteId: WEBSITE_ID, mutations }, null, 2) + "\n",
  );

  const validations = [];
  for (const url of [...POSTS.map((p) => p.publicUrl), ...LIVE_HUBS]) {
    validations.push(await validateUrl(url));
  }
  fs.writeFileSync(
    path.join(OUT_DIR, "public-url-validation.json"),
    JSON.stringify({ validatedAt: new Date().toISOString(), validations }, null, 2) + "\n",
  );

  const markdownRows = validations.map((v) =>
    `| ${v.url} | ${v.status} | ${v.canonical || "missing"} | ${v.robots || "missing"} | ${v.hasJsonLd ? "yes" : "no"} | ${v.title.replace(/\|/g, "/")} |`
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "public-url-validation.md"),
    [
      "# ColombiaTours Batch 1 Public URL Validation",
      "",
      `Validated: ${new Date().toISOString()}`,
      "",
      "| URL | HTTP | Canonical | Robots | JSON-LD | Title |",
      "|---|---:|---|---|---|---|",
      ...markdownRows,
      "",
      "## Notes",
      "",
      "- Blog posts were published through `website_blog_posts`.",
      "- `/paquetes`, `/actividades`, `/en/packages`, and `/en/planners` are live dedicated renderer routes; their visible page body is controlled by route/components, not by these markdown drafts.",
      "- Rollback snapshot is stored in `rollback-snapshot.json`.",
      "",
    ].join("\n"),
  );

  console.log(JSON.stringify({ publishedPosts: mutations.length, validatedUrls: validations.length, outDir: OUT_DIR }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
