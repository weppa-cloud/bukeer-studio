export function classifyRuntimeFailure(metrics) {
  if (!metrics) return null;
  if (metrics.timed_out) return "codex_exec_timeout";
  if (metrics.parse_error) return "artifact_parse_error";
  if (metrics.exit_code && metrics.exit_code !== 0) return "codex_exec_failed";
  return null;
}

export function artifactCompleteness(output) {
  return Boolean(
    output?.decision &&
    output?.allowed_action &&
    Array.isArray(output?.source_refs) &&
    typeof output?.evidence_summary === "string" &&
    Array.isArray(output?.risks) &&
    typeof output?.next_action === "string",
  );
}
