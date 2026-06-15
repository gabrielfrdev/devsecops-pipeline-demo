# devsecops-pipeline-demo

![security checks](https://github.com/gabrielfrdev/devsecops-pipeline-demo/actions/workflows/security.yml/badge.svg)

Security scanners generate a lot of findings. Those findings usually end up sitting in CI logs, buried in SARIF files, or in a GitHub Security tab that nobody opens. This project is a REST API that gives those findings somewhere to land and be tracked through remediation.

Every push runs 7 security jobs in parallel: Gitleaks for secrets, npm audit for dependency CVEs, Semgrep for SAST, Trivy for the container image, Checkov for IaC, ESLint, and Jest. Semgrep, Trivy, and Checkov upload SARIF to the GitHub Security tab. After a scan, `scripts/ingest-sarif.js` reads the SARIF output and posts each result into the API, where findings move from `open` to `mitigating` to `resolved`. When a finding is resolved, `closedAt` is stamped -- subtract `createdAt` for MTTR.

The API itself is a bit self-referential: `lodash` is pinned to `4.17.4` (prototype pollution via `_.merge`) and there is a hardcoded AWS key in `src/index.js` that Gitleaks catches on every run. The tracker ships with the vulnerabilities it tracks.

## pipeline

| job | tool | output |
|-----|------|--------|
| secrets | Gitleaks | exits 1 on any detected secret |
| audit | npm audit | exits 1 on HIGH or CRITICAL CVEs |
| sast | Semgrep | SARIF uploaded to Security tab |
| container | Trivy | SARIF uploaded to Security tab + CycloneDX SBOM artifact |
| iac | Checkov | SARIF uploaded to Security tab (soft fail) |
| lint | ESLint | exits on any lint error |
| test | Jest | 70% line coverage threshold, coverage artifact uploaded |

All jobs run independently so a failure in one does not block the others.

## setup

Requires Node 18 or later (project uses 22 -- see `.nvmrc`).

```bash
cp .env.example .env
npm install
npm start
```

Set `API_KEY` in `.env` to require authentication on all finding routes (`x-api-key` header). Leave it blank to run unauthenticated.

Docker:

```bash
docker build -t demo-app .
docker run --env-file .env -p 3000:3000 demo-app
```

## pre-commit

```bash
pip install pre-commit
pre-commit install
```

Runs Gitleaks locally on every commit before anything reaches CI.

## ingesting scanner output

After a scan, feed the SARIF file into the API:

```bash
# local scan output
node scripts/ingest-sarif.js trivy.sarif

# against a remote instance with auth
API_KEY=secret node scripts/ingest-sarif.js semgrep.sarif http://your-host:3000

# via make
make ingest SARIF=trivy.sarif API=http://your-host:3000
```

The script maps SARIF severity levels (`error`, `warning`, `note`) to `CRITICAL`, `HIGH`, `MEDIUM` and posts each result as a new finding.

## endpoints

| method | path | description |
|--------|------|-------------|
| GET | /health | liveness |
| GET | /version | package version |
| GET | /findings/summary | counts grouped by severity and status |
| GET | /findings | list -- `?severity=`, `?status=`, `?tool=`, `?limit=`, `?offset=` |
| GET | /findings/:id | single finding |
| POST | /findings | create |
| PATCH | /findings/:id | update status or any field |
| DELETE | /findings/:id | remove |

`GET /findings` returns `X-Total-Count` in the response header.

POST body:

```json
{
  "tool": "trivy",
  "severity": "HIGH",
  "title": "CVE-2019-10744 in lodash 4.17.4",
  "description": "prototype pollution via _.merge()",
  "file": "package.json"
}
```

Summary response:

```json
{
  "total": 4,
  "bySeverity": { "CRITICAL": 1, "HIGH": 2, "MEDIUM": 1 },
  "byStatus": { "open": 3, "mitigating": 1 }
}
```

Severity: `CRITICAL` `HIGH` `MEDIUM` `LOW`

Status: `open` `mitigating` `resolved`

## known issues (intentional)

- `src/index.js` has a hardcoded AWS key -- Gitleaks detects it on every run
- `lodash` is pinned to `4.17.4`. The PATCH route calls `_.merge({}, finding, req.body, ...)` with user-controlled input, which is the prototype pollution gadget from that version. The tracker ships with the CVE it tracks.
- `npm audit --audit-level=high` fails because of the lodash pin
