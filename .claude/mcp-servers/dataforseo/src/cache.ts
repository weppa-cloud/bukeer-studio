import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// dist/ sits at the server root → cache/ is a sibling
const CACHE_DIR = path.resolve(__dirname, "..", "cache");

interface CacheEntry<T> {
  fetchedAt: string; // ISO
  ttlDays: number;
  data: T;
}

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

async function ensureCacheDir(): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

function cachePath(hash: string): string {
  return path.join(CACHE_DIR, `${hash}.json`);
}

function isExpired(entry: CacheEntry<unknown>): boolean {
  const fetched = new Date(entry.fetchedAt).getTime();
  if (Number.isNaN(fetched)) return true;
  const ageMs = Date.now() - fetched;
  const ttlMs = entry.ttlDays * 24 * 60 * 60 * 1000;
  return ageMs > ttlMs;
}

/**
 * Read-only cache probe. Returns null on miss, expired, or read error.
 */
export async function readCache<T>(key: string): Promise<T | null> {
  const file = cachePath(hashKey(key));
  try {
    const raw = await fs.readFile(file, "utf8");
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (isExpired(entry)) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export async function writeCache<T>(
  key: string,
  ttlDays: number,
  data: T,
): Promise<void> {
  await ensureCacheDir();
  const entry: CacheEntry<T> = {
    fetchedAt: new Date().toISOString(),
    ttlDays,
    data,
  };
  const file = cachePath(hashKey(key));
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(entry), "utf8");
  await fs.rename(tmp, file);
}

export interface CacheResult<T> {
  data: T;
  cached: boolean;
}

/**
 * Get from cache or invoke the fetcher and persist.
 * - forceRefresh=true skips the read but still writes.
 * - Expired entries are treated as cache miss (files are not deleted — cleanup
 *   script is backlog).
 */
export async function getOrFetch<T>(
  key: string,
  ttlDays: number,
  fetcher: () => Promise<T>,
  forceRefresh = false,
): Promise<CacheResult<T>> {
  if (!forceRefresh) {
    const hit = await readCache<T>(key);
    if (hit !== null) return { data: hit, cached: true };
  }
  const data = await fetcher();
  await writeCache(key, ttlDays, data);
  return { data, cached: false };
}

export { CACHE_DIR };
