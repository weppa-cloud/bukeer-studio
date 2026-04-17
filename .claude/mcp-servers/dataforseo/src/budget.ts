import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUDGET_PATH = path.resolve(__dirname, "..", "budget.json");

export interface OpBreakdown {
  count: number;
  cost: number;
}

export interface BudgetFile {
  billing_period: string; // YYYY-MM
  spent_usd: number;
  cap_usd: number;
  by_operation: Record<string, OpBreakdown>;
}

export class BudgetExceededError extends Error {
  code = "DFS_BUDGET_EXCEEDED";
  spent: number;
  cap: number;
  constructor(spent: number, cap: number) {
    super(
      `DataForSEO monthly budget cap reached: $${spent.toFixed(
        2,
      )} / $${cap.toFixed(2)}. Raise DATAFORSEO_MONTHLY_CAP_USD or wait for rollover.`,
    );
    this.spent = spent;
    this.cap = cap;
  }
}

function currentPeriod(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function cap(): number {
  const raw = process.env.DATAFORSEO_MONTHLY_CAP_USD;
  const n = raw ? Number(raw) : 50;
  return Number.isFinite(n) && n > 0 ? n : 50;
}

function emptyBudget(): BudgetFile {
  return {
    billing_period: currentPeriod(),
    spent_usd: 0,
    cap_usd: cap(),
    by_operation: {},
  };
}

async function readRaw(): Promise<BudgetFile | null> {
  try {
    const raw = await fs.readFile(BUDGET_PATH, "utf8");
    return JSON.parse(raw) as BudgetFile;
  } catch {
    return null;
  }
}

async function writeRaw(b: BudgetFile): Promise<void> {
  const tmp = `${BUDGET_PATH}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(b, null, 2), "utf8");
  await fs.rename(tmp, BUDGET_PATH);
}

/**
 * Handles monthly rollover. If the file period differs from current, the old
 * file is archived to `budget.json.<period>.bak` and a fresh budget is created.
 */
async function rolloverIfNeeded(b: BudgetFile): Promise<BudgetFile> {
  const now = currentPeriod();
  if (b.billing_period === now) return b;
  // Archive old
  const archive = path.resolve(
    path.dirname(BUDGET_PATH),
    `budget.json.${b.billing_period}.bak`,
  );
  try {
    await fs.writeFile(archive, JSON.stringify(b, null, 2), "utf8");
  } catch {
    // non-fatal
  }
  const fresh = emptyBudget();
  await writeRaw(fresh);
  return fresh;
}

/**
 * Read current budget (with rollover applied). Creates an empty budget file if
 * none exists.
 */
export async function readBudget(): Promise<BudgetFile> {
  const existing = await readRaw();
  if (!existing) {
    const fresh = emptyBudget();
    await writeRaw(fresh);
    return fresh;
  }
  const rolled = await rolloverIfNeeded(existing);
  // Always sync the cap with the current env, in case the user bumped it.
  if (rolled.cap_usd !== cap()) {
    rolled.cap_usd = cap();
    await writeRaw(rolled);
  }
  return rolled;
}

/**
 * Pre-call gate. Throws BudgetExceededError if the estimated call would push
 * spent_usd past cap_usd. Does NOT mutate state.
 */
export async function assertBudgetAvailable(
  estimatedCost: number,
): Promise<BudgetFile> {
  const b = await readBudget();
  if (b.spent_usd + estimatedCost > b.cap_usd) {
    throw new BudgetExceededError(b.spent_usd, b.cap_usd);
  }
  return b;
}

/**
 * Record actual cost after a successful network call. Atomic read-modify-write.
 */
export async function recordSpend(op: string, cost: number): Promise<BudgetFile> {
  const b = await readBudget();
  b.spent_usd = Number((b.spent_usd + cost).toFixed(6));
  const prior = b.by_operation[op] ?? { count: 0, cost: 0 };
  b.by_operation[op] = {
    count: prior.count + 1,
    cost: Number((prior.cost + cost).toFixed(6)),
  };
  await writeRaw(b);
  return b;
}

/**
 * Returns the warning string when spend is at/above 80% of the cap, else null.
 */
export function warningIfNearCap(b: BudgetFile): string | null {
  if (b.cap_usd <= 0) return null;
  const pct = b.spent_usd / b.cap_usd;
  if (pct >= 0.8) {
    return `Approaching monthly cap ($${b.spent_usd.toFixed(2)} of $${b.cap_usd.toFixed(2)} used)`;
  }
  return null;
}

export interface BudgetStatus {
  billing_period: string;
  spent_usd: number;
  cap_usd: number;
  remaining_usd: number;
  pct_used: number;
  by_operation: Record<string, OpBreakdown>;
  warning: boolean;
  blocked: boolean;
}

export async function budgetStatus(): Promise<BudgetStatus> {
  const b = await readBudget();
  const remaining = Math.max(0, b.cap_usd - b.spent_usd);
  const pct = b.cap_usd > 0 ? b.spent_usd / b.cap_usd : 0;
  return {
    billing_period: b.billing_period,
    spent_usd: Number(b.spent_usd.toFixed(6)),
    cap_usd: b.cap_usd,
    remaining_usd: Number(remaining.toFixed(6)),
    pct_used: Number(pct.toFixed(4)),
    by_operation: b.by_operation,
    warning: pct >= 0.8,
    blocked: pct >= 1,
  };
}

export { BUDGET_PATH };
