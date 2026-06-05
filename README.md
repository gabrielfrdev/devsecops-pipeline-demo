# devsecops-pipeline-demo

![security checks](https://github.com/gabrielfrdev/devsecops-pipeline-demo/actions/workflows/security.yml/badge.svg)

REST API for tracking vulnerability findings from security scans. Reports findings by tool, severity, and tracks status through remediation.

## pipeline

- **Gitleaks** - secret scanning. Blocks all other jobs on failure.
- **npm audit** - flags HIGH and CRITICAL CVEs in dependencies.

## setup

```bash
cp .env.example .env
npm install
npm start
```

## endpoints

- GET /health
- GET /findings
- POST /findings
- PATCH /findings/:id
- DELETE /findings/:id
- **Semgrep** - SAST with OWASP, JavaScript, and Node.js rulesets. Findings go to the Security tab.
- **Trivy** - Docker image scan, results uploaded via SARIF.
- **Checkov** - static analysis on the Dockerfile and workflow files.
- **ESLint** - lints against `eslint:recommended`.
- **Jest** - unit tests.
