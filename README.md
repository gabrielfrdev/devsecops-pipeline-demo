# devsecops-pipeline-demo

![security checks](https://github.com/gabrielfrdev/devsecops-pipeline-demo/actions/workflows/security.yml/badge.svg)

Node.js API built to test a GitHub Actions security pipeline. The app has two intentional vulnerabilities so each tool has something real to catch.

## Pipeline

Runs on push and pull requests to `main`. Can also be triggered manually from the Actions tab.

- **Gitleaks** - secret scanning. Blocks all other jobs on failure.
- **npm audit** - dependency vulnerability check, High and Critical CVEs only.
- **Semgrep** - static analysis with OWASP and Node.js rulesets, results uploaded to the Security tab via SARIF.
- **Trivy** - Docker image scan for OS and package vulnerabilities, results uploaded via SARIF.
- **Checkov** - Dockerfile and GitHub Actions misconfiguration scanning.
- **Dependabot** - weekly automated PRs for npm and Actions dependency updates.

## Vulnerabilities

`src/index.js` lines 8-9 - AWS credentials hardcoded in source. Gitleaks catches these by pattern match and fails the build in seconds.

`package.json` - lodash `4.17.4` has a prototype pollution vulnerability (CVE-2019-10744, CVSS 9.1). The `/users` route uses `_.merge()` with user-controlled query params, which is the exact call pattern the CVE describes.

## Pre-commit

Gitleaks also runs locally via pre-commit before anything reaches the remote. Install with:

```bash
pip install pre-commit
pre-commit install
```

## Setup

```bash
cp .env.example .env
npm install
npm start
```

With Docker:

```bash
docker build -t demo-app .
docker run --env-file .env -p 3000:3000 demo-app
```

or just `make run` / `make docker`.

## Endpoints

- `GET /health`
- `GET /users`
