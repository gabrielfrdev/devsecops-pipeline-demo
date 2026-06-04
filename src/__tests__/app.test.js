const request = require('supertest');
const app = require('../index');

describe('GET /health', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('/findings', () => {
  it('GET /findings returns an array', async () => {
    const res = await request(app).get('/findings');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /findings creates a finding', async () => {
    const res = await request(app).post('/findings').send({
      tool: 'trivy',
      severity: 'HIGH',
      title: 'CVE-2019-10744 in lodash 4.17.4',
    });
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({ tool: 'trivy', status: 'open' });
    expect(res.body).toHaveProperty('id');
  });

  it('POST /findings returns 400 when fields are missing', async () => {
    const res = await request(app).post('/findings').send({ tool: 'gitleaks' });
    expect(res.statusCode).toBe(400);
  });

  it('PATCH /findings/:id updates a finding', async () => {
    const created = await request(app).post('/findings').send({
      tool: 'semgrep',
      severity: 'MEDIUM',
      title: 'prototype pollution',
    });
    const id = created.body.id;
    const res = await request(app).patch(`/findings/${id}`).send({ status: 'mitigating' });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('mitigating');
  });

  it('PATCH /findings/:id returns 404 for unknown id', async () => {
    const res = await request(app).patch('/findings/99999').send({ status: 'resolved' });
    expect(res.statusCode).toBe(404);
  });

  it('DELETE /findings/:id removes the finding', async () => {
    const created = await request(app).post('/findings').send({
      tool: 'checkov',
      severity: 'LOW',
      title: 'missing resource limits',
    });
    const id = created.body.id;
    const del = await request(app).delete(`/findings/${id}`);
    expect(del.statusCode).toBe(204);
    const get = await request(app).get(`/findings/${id}`);
    expect(get.statusCode).toBe(404);
  });

  it('DELETE /findings/:id returns 404 for unknown id', async () => {
    const res = await request(app).delete('/findings/99999');
    expect(res.statusCode).toBe(404);
  });
});
