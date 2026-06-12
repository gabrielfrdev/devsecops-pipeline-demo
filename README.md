# devsecops-pipeline-demo

![security checks](https://github.com/gabrielfrdev/devsecops-pipeline-demo/actions/workflows/security.yml/badge.svg)

REST API that stores and manages vulnerability findings from CI security scans. Every tool in the pipeline (Gitleaks, npm audit, Semgrep, Trivy, Checkov) can POST its findings to the tracker and update status as issues get worked through.

## what it does

- CRUD for security findings with tool, severity, title, description, and file fields
- Status lifecycle: `open` → `mitigating` → `resolved`
- Filter by severity, status, or source tool
- Rate limited to 60 req/min, security headers via helmet

## what runs on every push

| job | what it checks |
|-----|---------------|
| gitleaks | secrets and credentials in git history |
| npm audit | CVEs in dependencies (HIGH and above) |
| semgrep | SAST with OWASP, JavaScript, and Node.js rulesets |
| trivy | Docker image vulnerabilities (HIGH and CRITICAL) |
| checkov | Dockerfile and workflow static analysis |
| eslint | code quality against eslint:recommended |
| jest | unit tests with coverage threshold |

Semgrep, Trivy, and Checkov findings are uploaded as SARIF to the GitHub Security tab. Trivy also generates a CycloneDX SBOM saved as a workflow artifact.

## known issues (left in on purpose)

- `src/index.js` has a hardcoded AWS key that Gitleaks will catch
- `lodash` is pinned to `4.17.4` which has a prototype pollution vulnerability. The PATCH route uses `_.merge()` with user-controlled input — the tracker itself has the CVE it tracks
- `npm audit --audit-level=high` will flag the lodash dep

This is intentional for demonstrating how the pipeline surfaces real findings.

## pre-commit

```bash
pip install pre-commit
pre-commit install
```

Gitleaks runs on every commit locally before anything hits CI.

## setup

```bash
cp .env.example .env
npm install
npm start
```

Or with Docker:

```bash
docker build -t demo-app .
docker run -p 3000:3000 demo-app
```

## endpoints

| method | path | description |
|--------|------|-------------|
| GET | /health | liveness check |
| GET | /version | returns package version |
| GET | /findings | list all findings, supports `?severity=`, `?status=`, `?tool=` |
| GET | /findings/:id | get single finding |
| POST | /findings | create finding |
| PATCH | /findings/:id | update finding fields |
| DELETE | /findings/:id | remove finding |

POST body example:

```json
{
  "tool": "trivy",
  "severity": "HIGH",
  "title": "CVE-2019-10744 in lodash 4.17.4",
  "description": "prototype pollution via _.merge()",
  "file": "package.json"
}
```

Severity values: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`

Status values: `open`, `mitigating`, `resolved`
