#!/usr/bin/env node

import { runGrowthHermesSidecar } from "../src/sidecar.mjs";

runGrowthHermesSidecar().catch((error) => {
  const payload = {
    ok: false,
    status: "failed",
    error: error instanceof Error ? error.message : String(error),
  };
  console.error(JSON.stringify(payload));
  process.exitCode = 1;
});
