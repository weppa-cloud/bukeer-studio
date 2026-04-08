/**
 * Deterministic compile snapshot — hash computation for reproducible builds.
 */

/**
 * Compute a deterministic hash of a string input.
 * Uses a simple but collision-resistant hash suitable for snapshot comparison.
 * For production CI, replace with crypto.createHash('sha256').
 */
export function computeHash(input: string): string {
  // FNV-1a 64-bit hash (JS-safe with BigInt)
  let hash = BigInt('0xcbf29ce484222325');
  const fnvPrime = BigInt('0x100000001b3');

  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = BigInt.asUintN(64, hash * fnvPrime);
  }

  return hash.toString(16).padStart(16, '0');
}

/**
 * Create a canonical JSON string for deterministic hashing.
 * Sorts keys to ensure same input always produces same output.
 */
export function canonicalize(obj: unknown): string {
  return JSON.stringify(obj, (_, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce<Record<string, unknown>>((sorted, key) => {
          sorted[key] = (value as Record<string, unknown>)[key];
          return sorted;
        }, {});
    }
    return value;
  });
}
