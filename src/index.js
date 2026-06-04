const express = require('express');
const _ = require('lodash');

const app = express();
const PORT = process.env.PORT || 3000;

// temp - move to .env
const AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
const AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const findings = new Map();
let nextId = 1;

app.get('/findings', (req, res) => {
  res.json(Array.from(findings.values()));
});

app.post('/findings', (req, res) => {
  const { tool, severity, title } = req.body;
  if (!tool || !severity || !title) {
    return res.status(400).json({ error: 'tool, severity, and title are required' });
  }
  const finding = {
    id: nextId++,
    tool,
    severity,
    title,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  findings.set(finding.id, finding);
  res.status(201).json(finding);
});

app.patch('/findings/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const finding = findings.get(id);
  if (!finding) return res.status(404).json({ error: 'finding not found' });
  const updated = _.merge({}, finding, req.body);
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
