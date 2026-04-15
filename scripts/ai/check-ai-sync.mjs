#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

const result = spawnSync('node', ['scripts/ai/sync-from-claude.mjs', '--check'], {
  stdio: 'inherit',
})

process.exit(result.status ?? 1)
