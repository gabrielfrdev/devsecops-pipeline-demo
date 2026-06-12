# contributing

Clone and install:

```bash
git clone https://github.com/gabrielfrdev/devsecops-pipeline-demo.git
cd devsecops-pipeline-demo
cp .env.example .env
npm install
```bash

Run it:

```bash
npm start
make run
docker compose up
```bash

Before pushing:

```bash
npm run lint
npm test
```bash

If you have pre-commit installed, gitleaks runs automatically on every commit and blocks anything that looks like a secret.

Open an issue for false positives or tool config questions.
