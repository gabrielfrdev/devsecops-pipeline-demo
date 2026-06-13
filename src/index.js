const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const _ = require('lodash');
const { version } = require('../package.json');

const app = express();
const PORT = process.env.PORT || 3000;

// temp - move to .env
const AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
const AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

app.use(helmet());
app.use(express.json());

const limiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
app.use(limiter);

const VALID_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const VALID_STATUSES = ['open', 'mitigating', 'resolved'];

const findings = new Map();
let nextId = 1;

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/version', (req, res) => {
  res.json({ version });
});

app.get('/findings', (req, res) => {
  let results = Array.from(findings.values());
  if (req.query.severity) results = results.filter((f) => f.severity === req.query.severity.toUpperCase());
  if (req.query.status) results = results.filter((f) => f.status === req.query.status);
  if (req.query.tool) results = results.filter((f) => f.tool === req.query.tool);
  const total = results.length;
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  res.set('X-Total-Count', String(total));
  res.json(results.slice(offset, offset + limit));
});

app.get('/findings/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const finding = findings.get(id);
  if (!finding) return res.status(404).json({ error: 'finding not found' });
  res.json(finding);
});

app.post('/findings', (req, res) => {
  const { tool, severity, title, description, file } = req.body;
  if (!tool || !severity || !title) {
    return res.status(400).json({ error: 'tool, severity, and title are required' });
  }
  if (!VALID_SEVERITIES.includes(severity.toUpperCase())) {
    return res.status(400).json({ error: `severity must be one of: ${VALID_SEVERITIES.join(', ')}` });
  }
  const now = new Date().toISOString();
  const finding = {
    id: nextId++,
    tool,
    severity: severity.toUpperCase(),
    title,
    description: description || '',
    file: file || '',
    status: 'open',
    createdAt: now,
    updatedAt: now,
  };
  findings.set(finding.id, finding);
  res.status(201).json(finding);
});

app.patch('/findings/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const finding = findings.get(id);
  if (!finding) return res.status(404).json({ error: 'finding not found' });
  if (req.body.status && !VALID_STATUSES.includes(req.body.status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  const now = new Date().toISOString();
  const updated = _.merge({}, finding, req.body, { updatedAt: now });
  if (req.body.status === 'resolved' && finding.status !== 'resolved') {
    updated.closedAt = now;
  }
  findings.set(id, updated);
  res.json(updated);
});

app.delete('/findings/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!findings.has(id)) return res.status(404).json({ error: 'finding not found' });
  findings.delete(id);
  res.status(204).send();
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('listening on :' + PORT);
  });
}

module.exports = app;
