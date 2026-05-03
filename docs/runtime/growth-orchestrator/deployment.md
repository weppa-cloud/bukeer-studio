# Deployment

Deployments are immutable releases by git SHA.

VPS:

```bash
ssh -t -i ~/Documents/Proyectos/ssh/id_rsa1 bukeer@87.99.153.174
```

Runtime layout:

```text
/opt/growth-os/
├── releases/<git_sha>
├── current -> releases/<git_sha>
├── artifacts
├── workspaces
├── logs
├── codex
├── secrets/growth-orchestrator.env
└── docker-compose.yml
```

Deploy from local:

```bash
scripts/growth/deploy-runtime-vps.sh <sha>
```

The script validates that `<sha>` is reachable from `origin/dev`, uploads a git
archive, updates `/opt/growth-os/current`, rebuilds Docker and runs smoke checks.

Rollback:

```bash
cd /opt/growth-os
ln -sfn /opt/growth-os/releases/<previous_sha> current
cp current/docker-compose.growth-orchestrator.yml docker-compose.yml
docker compose up -d --build growth-orchestrator
```
