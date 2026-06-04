# devsecops-pipeline-demo

Node.js API with intentional vulnerabilities used to test a GitHub Actions security pipeline.

## Pipeline

Runs on push and pull requests to `main`. Can also be triggered manually from the Actions tab.

- **Gitleaks** - secret scanning. Blocks all other jobs on failure.
- **npm audit** - dependency vulnerability check, High and Critical CVEs only.
- **Semgrep** - static analysis with OWASP and Node.js rulesets, results uploaded to the Security tab via SARIF.

## Setup

```bash
npm install
npm start
```
