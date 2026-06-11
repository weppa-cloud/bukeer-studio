const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { readFileSync, readdirSync, statSync } = require('node:fs');

function runModuleEval(source) {
  return JSON.parse(
    execFileSync(process.execPath, ['--input-type=module', '--eval', source], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  );
}

describe('Admin Next governance scripts', () => {
  it('keeps interactive JSX parsing past arrow function attributes', () => {
    const result = runModuleEval(
      `
        import { findInteractiveOpeningTags } from './scripts/admin-next/validate-evolucion-contract.mjs';
        const tags = findInteractiveOpeningTags('<Button onClick={() => f(x)} data-testid="admin-next-action">Save</Button>');
        console.log(JSON.stringify({ tags }));
      `,
    );

    expect(result.tags).toHaveLength(1);
    expect(result.tags[0].source).toContain('onClick={() => f(x)}');
    expect(result.tags[0].source).toContain('data-testid="admin-next-action"');
  });

  it('upserts smoke worker vars without duplicating existing TOML keys', () => {
    const result = runModuleEval(
      `
        import { upsertEnvVars } from './scripts/admin-next/smoke-evolucion-worker.mjs';
        const marker = '[env.staging.vars]\\n';
        const source = [
          'name = "bukeer-web-public"',
          '',
          marker.trimEnd(),
          'NEXT_PUBLIC_MAIN_DOMAIN = "bukeer.com"',
          'ADMIN_NEXT_PROTOTYPE_ENABLED = "true"',
          'ADMIN_NEXT_DATA_SOURCE_MODE = "readonly"',
          '',
          '[env.dev.vars]',
          'NEXT_PUBLIC_MAIN_DOMAIN = "bukeer.com"',
          '',
        ].join('\\n');
        const toml = upsertEnvVars(source, marker, [
          'ADMIN_NEXT_PROTOTYPE_ENABLED = "true"',
          'ADMIN_NEXT_PROTOTYPE_SMOKE_ENABLED = "true"',
          'ADMIN_NEXT_PROTOTYPE_SMOKE_TOKEN = "token-for-test"',
          'ADMIN_NEXT_DATA_SOURCE_MODE = "fixture"',
        ]);
        const stagingSection = toml.match(/\\[env\\.staging\\.vars\\]\\n([\\s\\S]*?)\\n\\[env\\.dev\\.vars\\]/)[1];
        console.log(JSON.stringify({ stagingSection }));
      `,
    );
    const { stagingSection } = result;

    for (const key of [
      'ADMIN_NEXT_PROTOTYPE_ENABLED',
      'ADMIN_NEXT_PROTOTYPE_SMOKE_ENABLED',
      'ADMIN_NEXT_PROTOTYPE_SMOKE_TOKEN',
      'ADMIN_NEXT_DATA_SOURCE_MODE',
    ]) {
      expect(stagingSection.match(new RegExp(`^${key}\\s*=`, 'gm'))).toHaveLength(1);
    }

    expect(stagingSection).toContain('ADMIN_NEXT_DATA_SOURCE_MODE = "fixture"');
    expect(stagingSection).toContain('ADMIN_NEXT_PROTOTYPE_SMOKE_TOKEN = "token-for-test"');
  });

  it('keeps every Admin Next smoke page behind the smoke access assertion', () => {
    const smokePages = collectFiles(path.join(process.cwd(), 'app/admin'))
      .filter((filePath) => filePath.endsWith('/smoke/page.tsx'))
      .sort();

    expect(smokePages.length).toBeGreaterThan(0);

    for (const filePath of smokePages) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('assertAdminNextSmokeAccess');
      expect(source).toContain('await assertAdminNextSmokeAccess();');
    }
  });
});

function collectFiles(root) {
  const files = [];
  const entries = readdirSync(root, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(absolutePath));
      continue;
    }

    if (entry.isFile() && statSync(absolutePath).isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}
