import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const CLI_PATH = path.resolve(process.cwd(), 'scripts/seo/validate-blog-work-items.mjs');
const CSV_HEADER =
  'work_id,post_slug,dimension,component,issue,severity,priority,owner,estimate,depends_on,acceptance_test,status';

const tempDirs: string[] = [];

function createCsv(rows: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-blog-work-items-'));
  tempDirs.push(dir);
  const filePath = path.join(dir, 'work-items.csv');
  fs.writeFileSync(filePath, [CSV_HEADER, ...rows].join('\n'), 'utf8');
  return filePath;
}

function runValidator(args: string[]) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    encoding: 'utf8',
  });
}

afterAll(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('validate-blog-work-items CLI', () => {
  it('returns help output with exit code 0', () => {
    const result = runValidator(['--help']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      'Usage: node scripts/seo/validate-blog-work-items.mjs --file <path-to-csv>'
    );
  });

  it('passes with a valid CSV', () => {
    const filePath = createCsv([
      'TECH-001,slug,technical,meta,fix canonical,P1,high,alice,M,,assert canonical,Done',
      'CONT-001,slug,content,body,improve section,P2,medium,bob,M,TECH-001,assert intent,Done',
    ]);

    const result = runValidator(['--file', filePath]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('PASS: dependency validation succeeded');
  });

  it('fails when content is Done but technical dependency is still open', () => {
    const filePath = createCsv([
      'TECH-001,slug,technical,meta,fix canonical,P1,high,alice,M,,assert canonical,Open',
      'CONT-001,slug,content,body,improve section,P2,medium,bob,M,TECH-001,assert intent,Done',
    ]);

    const result = runValidator(['--file', filePath]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'CONT-001 cannot be Done: dependency TECH-001 is "Open", expected "Done"'
    );
  });

  it('fails when depends_on references a missing work item', () => {
    const filePath = createCsv([
      'TECH-001,slug,technical,meta,fix canonical,P1,high,alice,M,,assert canonical,Done',
      'CONT-001,slug,content,body,improve section,P2,medium,bob,M,TECH-999,assert intent,Done',
    ]);

    const result = runValidator(['--file', filePath]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('CONT-001 depends_on missing work_id: TECH-999');
  });

  it('fails when content depends on a non-technical work item', () => {
    const filePath = createCsv([
      'CONT-DEP,slug,content,body,prior content,P2,medium,bob,M,,assert intent,Done',
      'CONT-001,slug,content,body,improve section,P2,medium,bob,M,CONT-DEP,assert intent,Done',
    ]);

    const result = runValidator(['--file', filePath]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'CONT-001 invalid dependency CONT-DEP: expected technical dimension, got "content"'
    );
  });

  it('fails when status is outside the allowed enum', () => {
    const filePath = createCsv([
      'TECH-001,slug,technical,meta,fix canonical,P1,high,alice,M,,assert canonical,Closed',
    ]);

    const result = runValidator(['--file', filePath]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Invalid status for TECH-001: "Closed". Allowed: Open, In Progress, Blocked, Done'
    );
  });
});
