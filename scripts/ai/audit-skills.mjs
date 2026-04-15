#!/usr/bin/env node

/**
 * audit-skills.mjs — Validate skill docs match codebase reality.
 * Run: npm run ai:audit
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = resolve(import.meta.dirname, '../..');
const SKILLS_DIR = join(ROOT, '.agents/skills');
const CLAUDE_MD = join(ROOT, 'CLAUDE.md');

let warnings = 0;
let errors = 0;

function warn(msg) {
  console.warn(`⚠️  WARN: ${msg}`);
  warnings++;
}

function error(msg) {
  console.error(`❌ ERROR: ${msg}`);
  errors++;
}

function info(msg) {
  console.log(`ℹ️  ${msg}`);
}

// 1. Check all skills in .agents/skills/ are registered in CLAUDE.md
async function checkSkillRegistration() {
  info('Checking skill registration in CLAUDE.md...');
  const claudeMd = await readFile(CLAUDE_MD, 'utf-8');
  const skillDirs = (await readdir(SKILLS_DIR, { withFileTypes: true }))
    .filter(d => d.isDirectory() && !d.name.startsWith('_'))
    .map(d => d.name);

  for (const skill of skillDirs) {
    if (!claudeMd.includes(skill)) {
      error(`Skill "${skill}" exists in .agents/skills/ but NOT registered in CLAUDE.md`);
    }
  }
  info(`  ${skillDirs.length} skills found, checked against CLAUDE.md`);
}

// 2. Check each skill has required SKILL.md
async function checkSkillStructure() {
  info('Checking skill structure...');
  const skillDirs = (await readdir(SKILLS_DIR, { withFileTypes: true }))
    .filter(d => d.isDirectory() && !d.name.startsWith('_'))
    .map(d => d.name);

  for (const skill of skillDirs) {
    const skillMd = join(SKILLS_DIR, skill, 'SKILL.md');
    if (!existsSync(skillMd)) {
      error(`Skill "${skill}" missing required SKILL.md`);
      continue;
    }

    const content = await readFile(skillMd, 'utf-8');

    // Check required sections
    if (!content.includes('You Handle') && !content.includes('you handle')) {
      warn(`Skill "${skill}" SKILL.md missing "You Handle" section`);
    }
    if (!content.includes('Delegate') && !content.includes('delegate')) {
      warn(`Skill "${skill}" SKILL.md missing "Delegate To" section`);
    }
    if (!content.includes('<example>')) {
      warn(`Skill "${skill}" SKILL.md missing examples`);
    }
  }
}

// 3. Count section types and check for hardcoded counts
async function checkSectionTypeCounts() {
  info('Checking section type counts...');

  const sectionsPath = join(ROOT, 'packages/website-contract/src/schemas/sections.ts');
  if (!existsSync(sectionsPath)) {
    warn('Cannot find website-contract sections schema');
    return;
  }

  const sectionsContent = await readFile(sectionsPath, 'utf-8');
  // Count enum values (lines with quoted strings in z.enum)
  const enumMatch = sectionsContent.match(/z\.enum\(\[([\s\S]*?)\]\)/);
  let actualCount = 0;
  if (enumMatch) {
    actualCount = (enumMatch[1].match(/'/g) || []).length / 2; // pairs of quotes
  }

  info(`  Actual section types: ${actualCount}`);

  // Check skill docs for hardcoded counts
  const skillDirs = (await readdir(SKILLS_DIR, { withFileTypes: true }))
    .filter(d => d.isDirectory() && !d.name.startsWith('_'))
    .map(d => d.name);

  for (const skill of skillDirs) {
    const skillDir = join(SKILLS_DIR, skill);
    const files = await readdir(skillDir);

    for (const file of files.filter(f => f.endsWith('.md'))) {
      const content = await readFile(join(skillDir, file), 'utf-8');
      // Look for hardcoded section type counts
      const countMatches = content.match(/(\d+)\s*(section\s*types?|secciones?|tipos?\s*de\s*secci)/gi);
      if (countMatches) {
        for (const match of countMatches) {
          const num = parseInt(match);
          if (num > 0 && num !== actualCount) {
            warn(`Skill "${skill}/${file}" has hardcoded count "${match}" — actual: ${actualCount}`);
          }
        }
      }
    }
  }
}

// 4. Count UI components
async function checkComponentCounts() {
  info('Checking UI component counts...');
  const uiDir = join(ROOT, 'components/ui');
  if (!existsSync(uiDir)) {
    warn('Cannot find components/ui directory');
    return;
  }

  const files = await readdir(uiDir);
  const components = files.filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
  info(`  UI components: ${components.length}`);
}

// 5. Count API routes
async function checkApiRouteCounts() {
  info('Checking API route counts...');

  async function findRouteFiles(dir) {
    let routes = [];
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        routes = routes.concat(await findRouteFiles(fullPath));
      } else if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
        routes.push(fullPath);
      }
    }
    return routes;
  }

  const apiDir = join(ROOT, 'app/api');
  if (!existsSync(apiDir)) {
    warn('Cannot find app/api directory');
    return;
  }

  const routes = await findRouteFiles(apiDir);
  info(`  API routes: ${routes.length}`);

  // Check Zod validation coverage
  let withZod = 0;
  for (const route of routes) {
    const content = await readFile(route, 'utf-8');
    if (content.includes('z.object') || content.includes('.parse(') || content.includes('.safeParse(')) {
      withZod++;
    }
  }
  info(`  Routes with Zod validation: ${withZod}/${routes.length} (${Math.round(withZod/routes.length*100)}%)`);
}

// 6. Check for deprecated references
async function checkDeprecatedReferences() {
  info('Checking for deprecated references...');
  const DEPRECATED_TERMS = ['Puck', 'puck editor', '@measured/puck'];

  const skillDirs = (await readdir(SKILLS_DIR, { withFileTypes: true }))
    .filter(d => d.isDirectory() && !d.name.startsWith('_'))
    .map(d => d.name);

  for (const skill of skillDirs) {
    const skillDir = join(SKILLS_DIR, skill);
    const files = await readdir(skillDir);

    for (const file of files.filter(f => f.endsWith('.md'))) {
      const content = await readFile(join(skillDir, file), 'utf-8');
      for (const term of DEPRECATED_TERMS) {
        if (content.toLowerCase().includes(term.toLowerCase())) {
          warn(`Skill "${skill}/${file}" references deprecated "${term}"`);
        }
      }
    }
  }
}

// Run all checks
console.log('\n🔍 Bukeer Studio — Skill Audit\n');
console.log('='.repeat(50));

await checkSkillRegistration();
console.log();
await checkSkillStructure();
console.log();
await checkSectionTypeCounts();
console.log();
await checkComponentCounts();
console.log();
await checkApiRouteCounts();
console.log();
await checkDeprecatedReferences();

console.log('\n' + '='.repeat(50));
console.log(`\n📊 Results: ${errors} errors, ${warnings} warnings\n`);

if (errors > 0) {
  console.log('❌ Audit FAILED — fix errors above');
  process.exit(1);
} else if (warnings > 0) {
  console.log('⚠️  Audit PASSED with warnings');
  process.exit(0);
} else {
  console.log('✅ Audit PASSED — all checks green');
  process.exit(0);
}
