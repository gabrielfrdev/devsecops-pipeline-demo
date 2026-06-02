# devsecops-pipeline-demo

Node.js API with intentional vulnerabilities used to test a GitHub Actions security pipeline.

## Pipeline

- **Gitleaks** - secret scanning. Blocks all other jobs on failure.
- **npm audit** - dependency vulnerability check, High and Critical CVEs only.

## Setup

```bash
npm install
npm start
```
