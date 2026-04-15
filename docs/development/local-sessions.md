# Local Sessions Without Interference

This project supports isolated local sessions so two terminals/agents can run in parallel without stepping on each other.

## Why conflicts happen

Most local instability comes from sharing:

- the same port (`3000`, `3001`, etc.)
- the same Next build cache directory (`.next`)
- the same test output folders (`test-results`, `playwright-report`)

## Single source of truth (scripts)

- Dev runner: `scripts/start-dev-node.sh`
- Prod clean runner: `scripts/start-prod-clean.sh`
- E2E session runner: `scripts/run-e2e-session.sh`

## Run two dev sessions in parallel

Terminal A:

```bash
PORT=3001 NEXT_DIST_DIR=.next-s1 npm run dev:session
```

Terminal B:

```bash
PORT=3002 NEXT_DIST_DIR=.next-s2 npm run dev:session
```

Each session uses a different port and cache dir.

## Run two Playwright sessions in parallel

Session A:

```bash
SESSION_NAME=s1 PORT=3001 npm run test:e2e:session
```

Session B:

```bash
SESSION_NAME=s2 PORT=3002 npm run test:e2e:session
```

Outputs are isolated automatically:

- `playwright-report/s1` and `playwright-report/s2`
- `test-results/s1` and `test-results/s2`

## Clean production-like run

```bash
PORT=3000 npm run start:prod:clean
```

Notes:

- Uses Node 22 from `/opt/homebrew/opt/node@22/bin`.
- By default closes active Next processes before build/start (`KILL_ALL_NEXT=1`).
- If you need to keep other Next instances alive:

```bash
KILL_ALL_NEXT=0 PORT=3000 npm run start:prod:clean
```
