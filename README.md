# devsecops-pipeline-demo

![security checks](https://github.com/gabrielfrdev/devsecops-pipeline-demo/actions/workflows/security.yml/badge.svg)

REST API for tracking vulnerability findings from CI security scans. Scanners post their findings here and you track remediation status as issues get worked through.

## what it does

- CRUD for security findings with tool, severity, title, description, and file fields
- Status lifecycle: `open` -> `mitigating` -> `resolved`
- Filter by severity, status, or source tool
- Summary endpoint for current security posture at a glance
- Optional API key auth via `x-api-key` header
- Rate limited to 60 req/min, security headers via helmet

## what runs on every push

| job | what it checks |
|-----|----------------|
| gitleaks | secrets and credentials in git history |
| npm audit | CVEs in dependencies (HIGH and above) |
| semgrep | SAST with OWASP, JavaScript, and Node.js rulesets |
| trivy | Docker image vulnerabilities (HIGH and CRITICAL) |
| checkov | Dockerfile and workflow static analysis |
| eslint | code quality against eslint:recommended |
| jest | unit tests with coverage threshold |

Semgrep, Trivy, and Checkov upload findings as SARIF to the GitHub Security tab. Trivy also generates a CycloneDX SBOM saved as a workflow artifact.

## known issues (left in on purpose)

- `src/index.js` has a hardcoded AWS key that Gitleaks catches
- `lodash` is pinned to `4.17.4` which has a prototype pollution vulnerability. The PATCH route uses `_.merge()` with user input -- the tracker itself has the CVE it tracks
- `npm audit --audit-level=high` will flag the lodash dep

These are intentional so the pipeline has real findings to surface.

## setup

```bash
cp .env.example .env
npm install
npm start
```

Set `API_KEY` in `.env` to require authentication on all findings routes.

With Docker:

```bash
docker build -t demo-app .
docker run --env-file .env -p 3000:3000 demo-app
```

## pre-commit

```bash
pip install pre-commit
pre-commit install
```

Gitleaks runs locally on every commit before anything hits CI.

## ingesting scanner output

After running any scanner that produces SARIF, feed the results into the API:

```bash
# ingest trivy output
node scripts/ingest-sarif.js trivy.sarif

# ingest against a remote instance
API_KEY=secret node scripts/ingest-sarif.js semgrep.sarif http://your-host:3000
# or via make
make ingest SARIF=trivy.sarif API=http://your-host:3000
```

The script maps SARIF severity levels to the API's CRITICAL/HIGH/MEDIUM/LOW scale and posts each result as a new finding.

## endpoints

| method | path | description |
|--------|------|-------------|
| GET | /health | liveness check |
| GET | /version | returns package version |
| GET | /findings/summary | counts by severity and status |
| GET | /findings | list all findings -- `?severity=`, `?status=`, `?tool=` |
| GET | /findings/:id | get single finding |
| POST | /findings | create finding |
| PATCH | /findings/:id | update finding fields |
| DELETE | /findings/:id | remove finding |

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
