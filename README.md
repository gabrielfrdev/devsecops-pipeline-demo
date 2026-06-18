# devsecops-pipeline-demo

![security checks](https://github.com/gabrielfrdev/devsecops-pipeline-demo/actions/workflows/security.yml/badge.svg)

Security scanners generate a lot of findings. Those findings usually end up sitting in CI logs, buried in SARIF files, or in a GitHub Security tab that nobody opens. This project is a REST API that gives those findings somewhere to land and be tracked through remediation.

Every push triggers 8 parallel jobs: Gitleaks, npm audit, Semgrep, Trivy, Checkov, ZAP, ESLint, and Jest. Semgrep/Trivy/Checkov push SARIF to the GitHub Security tab. Trivy also generates a CycloneDX SBOM. After a scan, `scripts/ingest-sarif.js` feeds findings into the API, where they move from `open` to `mitigating` to `resolved`. `closedAt` stamps on resolution so you can calculate MTTR.

The app has a hardcoded AWS key and lodash 4.17.4 with a known prototype pollution gadget in the PATCH route. Both are intentional -- real findings, not a green board.

## running it

```bash
cp .env.example .env
npm install && npm start
```

Set `API_KEY` in `.env` to lock down all finding routes. Leave it blank to skip auth.

```bash
docker compose up   # app on :3000 + prometheus on :9090
```

pre-commit (gitleaks runs locally before hitting CI):

```bash
pip install pre-commit && pre-commit install
```

## api

`POST /findings` to create, `PATCH /findings/:id` to update status, `GET /findings/summary` for the current posture. Full list at `GET /findings` with filters `?severity=`, `?status=`, `?tool=`, and pagination via `?limit=`/`?offset=`. Single finding at `GET /findings/:id`, delete at `DELETE /findings/:id`. `X-Total-Count` header on list responses.

Severities: `CRITICAL` `HIGH` `MEDIUM` `LOW`

Statuses: `open` `mitigating` `resolved`

```bash
# ingest a sarif file
node scripts/ingest-sarif.js trivy.sarif

# remote instance with auth
API_KEY=secret node scripts/ingest-sarif.js semgrep.sarif http://your-host:3000
```

Prometheus metrics at `GET /metrics`. Example query: `findings_total{severity="CRITICAL",status="open"}`.

## kubernetes

```bash
kubectl apply -f k8s/namespace.yaml
# edit the api-key value in k8s/secret.example.yaml first
kubectl apply -f k8s/
kubectl rollout status deployment/findings-tracker -n findings-tracker
```

2 replicas, HPA to 5 at 70% CPU, NetworkPolicy with egress restricted to DNS, non-root with read-only filesystem and all capabilities dropped.

## known issues (intentional)

- hardcoded AWS key in `src/index.js` -- Gitleaks catches it every run
- lodash pinned to `4.17.4`. `PATCH /findings/:id` uses `_.merge()` with user input -- prototype pollution gadget from that CVE. the tracker ships with the vulnerability it tracks
- npm audit fails on HIGH because of the lodash pin
