const request = require('supertest');
const app = require('../index');

describe('GET /health', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('GET /version', () => {
  it('returns version string', async () => {
    const res = await request(app).get('/version');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('version');
  });
});

describe('POST /findings', () => {
  it('creates a finding', async () => {
    const res = await request(app).post('/findings').send({
      tool: 'trivy',
      severity: 'HIGH',
      title: 'CVE-2019-10744 in lodash 4.17.4',
    });
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({ tool: 'trivy', status: 'open' });
    expect(res.body).toHaveProperty('id');
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/findings').send({ tool: 'gitleaks' });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid severity', async () => {
    const res = await request(app)
      .post('/findings')
      .send({ tool: 'semgrep', severity: 'EXTREME', title: 'something' });
    expect(res.statusCode).toBe(400);
  });

  it('normalizes severity to uppercase', async () => {
    const res = await request(app)
      .post('/findings')
      .send({ tool: 'npm-audit', severity: 'critical', title: 'test finding' });
    expect(res.statusCode).toBe(201);
    expect(res.body.severity).toBe('CRITICAL');
  });
});

describe('GET /findings', () => {
  it('returns all findings', async () => {
    const res = await request(app).get('/findings');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('filters by severity', async () => {
    const res = await request(app).get('/findings?severity=HIGH');
    expect(res.statusCode).toBe(200);
    res.body.forEach((f) => expect(f.severity).toBe('HIGH'));
  });

  it('filters by status', async () => {
    const res = await request(app).get('/findings?status=open');
    expect(res.statusCode).toBe(200);
    res.body.forEach((f) => expect(f.status).toBe('open'));
  });

  it('filters by tool', async () => {
    await request(app)
      .post('/findings')
      .send({ tool: 'unique-tool-xyz', severity: 'LOW', title: 'filter by tool test' });
    const res = await request(app).get('/findings?tool=unique-tool-xyz');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((f) => expect(f.tool).toBe('unique-tool-xyz'));
  });
});

describe('GET /findings pagination', () => {
  it('returns x-total-count header', async () => {
    const res = await request(app).get('/findings');
    expect(res.headers['x-total-count']).toBeDefined();
    expect(parseInt(res.headers['x-total-count'], 10)).toBeGreaterThan(0);
  });

  it('limit restricts results', async () => {
    const res = await request(app).get('/findings?limit=1');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(1);
  });

  it('offset advances the window', async () => {
    const base = await request(app).get('/findings?limit=500');
    const shifted = await request(app).get('/findings?offset=1&limit=500');
    expect(shifted.body.length).toBe(Math.max(0, base.body.length - 1));
  });
});

describe('GET /findings/summary', () => {
  it('returns total count and breakdowns', async () => {
    const res = await request(app).get('/findings/summary');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('bySeverity');
    expect(res.body).toHaveProperty('byStatus');
    expect(typeof res.body.total).toBe('number');
  });

  it('counts reflect current findings', async () => {
    await request(app).post('/findings').send({ tool: 'trivy', severity: 'CRITICAL', title: 'test' });
    const res = await request(app).get('/findings/summary');
    expect(res.body.bySeverity.CRITICAL).toBeGreaterThan(0);
  });
});

describe('GET /findings/:id', () => {
  it('returns a single finding', async () => {
    const created = await request(app)
      .post('/findings')
      .send({ tool: 'checkov', severity: 'MEDIUM', title: 'missing resource limits' });
    const res = await request(app).get(`/findings/${created.body.id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(created.body.id);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/findings/99999');
    expect(res.statusCode).toBe(404);
  });
});

describe('PATCH /findings/:id', () => {
  it('updates finding status', async () => {
    const created = await request(app)
      .post('/findings')
      .send({ tool: 'gitleaks', severity: 'CRITICAL', title: 'hardcoded aws key' });
    const id = created.body.id;
    const res = await request(app).patch(`/findings/${id}`).send({ status: 'mitigating' });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('mitigating');
    expect(res.body).toHaveProperty('updatedAt');
  });

  it('returns 400 for invalid status', async () => {
    const created = await request(app)
      .post('/findings')
      .send({ tool: 'trivy', severity: 'LOW', title: 'outdated base image' });
    const res = await request(app).patch(`/findings/${created.body.id}`).send({ status: 'ignored' });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).patch('/findings/99999').send({ status: 'resolved' });
    expect(res.statusCode).toBe(404);
  });

  it('sets closedAt when resolved', async () => {
    const created = await request(app)
      .post('/findings')
      .send({ tool: 'trivy', severity: 'MEDIUM', title: 'to be closed' });
    const res = await request(app)
      .patch(`/findings/${created.body.id}`)
      .send({ status: 'resolved' });
    expect(res.body.status).toBe('resolved');
    expect(res.body).toHaveProperty('closedAt');
  });

  it('does not set closedAt for mitigating', async () => {
    const created = await request(app)
      .post('/findings')
      .send({ tool: 'semgrep', severity: 'LOW', title: 'in progress' });
    const res = await request(app)
      .patch(`/findings/${created.body.id}`)
      .send({ status: 'mitigating' });
    expect(res.body.closedAt).toBeUndefined();
  });
});

describe('DELETE /findings/:id', () => {
  it('removes the finding', async () => {
    const created = await request(app)
      .post('/findings')
      .send({ tool: 'semgrep', severity: 'HIGH', title: 'sql injection risk' });
    const id = created.body.id;
    const del = await request(app).delete(`/findings/${id}`);
    expect(del.statusCode).toBe(204);
    const get = await request(app).get(`/findings/${id}`);
    expect(get.statusCode).toBe(404);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/findings/99999');
    expect(res.statusCode).toBe(404);
  });
});

describe('auth middleware', () => {
  beforeAll(() => {
    process.env.API_KEY = 'test-secret';
  });
  afterAll(() => {
    delete process.env.API_KEY;
  });

  it('returns 401 on /findings without key', async () => {
    const res = await request(app).get('/findings');
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 with wrong key', async () => {
    const res = await request(app).get('/findings').set('x-api-key', 'bad');
    expect(res.statusCode).toBe(401);
  });

  it('passes with correct key', async () => {
    const res = await request(app).get('/findings').set('x-api-key', 'test-secret');
    expect(res.statusCode).toBe(200);
  });

  it('health and version skip auth', async () => {
    const h = await request(app).get('/health');
    const v = await request(app).get('/version');
    expect(h.statusCode).toBe(200);
    expect(v.statusCode).toBe(200);
  });
});
