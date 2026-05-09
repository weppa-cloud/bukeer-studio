import { asRecord, type JsonRecord } from "@/lib/growth/autonomy/runtime-common";

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(the\s+)?(system|developer|previous)/i,
  /reveal\s+(your\s+)?(system|developer)\s+prompt/i,
  /override\s+(safety|policy|instructions)/i,
  /you\s+are\s+now\s+(developer|system|admin)/i,
  /exfiltrate|secret|api[_\s-]?key|service[_\s-]?role/i,
];

export interface GrowthPromptInjectionScanResult {
  blocked: boolean;
  findings: Array<{
    path: string;
    pattern: string;
    excerpt: string;
  }>;
}

function excerpt(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 240);
}

function scanValue(
  value: unknown,
  path: string,
  findings: GrowthPromptInjectionScanResult["findings"],
) {
  if (typeof value === "string") {
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(value)) {
        findings.push({
          path,
          pattern: pattern.source,
          excerpt: excerpt(value),
        });
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanValue(item, `${path}[${index}]`, findings));
    return;
  }
  const record = asRecord(value);
  for (const [key, nested] of Object.entries(record)) {
    scanValue(nested, path ? `${path}.${key}` : key, findings);
  }
}

export function scanGrowthContextForPromptInjection(
  context: JsonRecord,
): GrowthPromptInjectionScanResult {
  const findings: GrowthPromptInjectionScanResult["findings"] = [];
  scanValue(context, "", findings);
  return {
    blocked: findings.length > 0,
    findings,
  };
}
