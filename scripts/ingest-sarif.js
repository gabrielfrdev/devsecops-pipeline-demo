#!/usr/bin/env node
'use strict';

const fs = require('fs');

const [,, sarifFile, base = 'http://localhost:3000'] = process.argv;

if (!sarifFile) {
  console.error('usage: node scripts/ingest-sarif.js <file.sarif> [api-url]');
  process.exit(1);
}

const LEVEL_MAP = {
  error: 'CRITICAL',
  warning: 'HIGH',
  note: 'MEDIUM',
};

async function ingest() {
  let sarif;
  try {
    sarif = JSON.parse(fs.readFileSync(sarifFile, 'utf8'));
  } catch (e) {
    console.error('could not read sarif file:', e.message);
    process.exit(1);
  }

  let ok = 0;
  let skipped = 0;

  for (const run of sarif.runs || []) {
    const tool = (run.tool?.driver?.name || 'unknown').toLowerCase();
    for (const result of run.results || []) {
      const severity = LEVEL_MAP[result.level] || 'LOW';
      const title = (result.message?.text || result.ruleId || 'unknown')
        .split('\n')[0]
        .slice(0, 200);
      const file =
        result.locations?.[0]?.physicalLocation?.artifactLocation?.uri || '';

      const headers = { 'Content-Type': 'application/json' };
      if (process.env.API_KEY) headers['x-api-key'] = process.env.API_KEY;

      try {
        const res = await fetch(`${base}/findings`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ tool, severity, title, file }),
        });
        if (res.ok) {
          ok++;
        } else {
          const body = await res.json().catch(() => ({}));
          console.error(`skip: ${body.error || res.status} -- ${title.slice(0, 60)}`);
          skipped++;
        }
      } catch (e) {
        console.error(`request failed: ${e.message}`);
        skipped++;
      }
    }
  }

  console.log(`done: ${ok} imported, ${skipped} skipped`);
}

ingest();
