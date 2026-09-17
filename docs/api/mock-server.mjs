import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { deref, validate } from './schema.mjs';

export const spec = JSON.parse(readFileSync(new URL('./openapi.json', import.meta.url), 'utf8'));
const prefix = '/api/v1';
const routes = Object.entries(spec.paths).flatMap(([path, methods]) =>
  Object.entries(methods).map(([method, operation]) => ({
    path, method: method.toUpperCase(), operation,
    parts: (prefix + path).split('/'),
    priority: (path.match(/{/g) ?? []).length
  }))
).sort((a, b) => a.priority - b.priority);

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVwAAAABJRU5ErkJggg==', 'base64');
function demoPdf() {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << >> /Contents 4 0 R >>',
    '<< /Length 0 >>\nstream\n\nendstream'
  ];
  let data = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((value, i) => { offsets.push(Buffer.byteLength(data)); data += (i + 1) + ' 0 obj\n' + value + '\nendobj\n'; });
  const xref = Buffer.byteLength(data);
  data += 'xref\n0 5\n0000000000 65535 f \n' + offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('');
  data += 'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(data);
}

export function createMockServer() {
  return http.createServer(async (req, res) => {
    const requestId = randomUUID();
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Mock-Server', 'tripmate-static-fixtures');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Mock-Status, X-Mock-Example, X-Mock-Delay-Ms');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'X-Request-Id, X-Mock-Server, Retry-After');
    res.setHeader('Cache-Control', 'private, no-store');
    const json = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
    const error = (status, code, message, details = []) => {
      if (status === 401) res.setHeader('WWW-Authenticate', 'Bearer');
      json(status, { requestId, error: { code, message, details, context: {} } });
    };
    try {
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
      const url = new URL(req.url, 'http://localhost');
      let parts;
      try { parts = url.pathname.split('/').map(decodeURIComponent); }
      catch { error(400, 'BAD_REQUEST', 'Malformed path encoding'); return; }
      const candidates = routes.filter(r => r.parts.length === parts.length && r.parts.every((p, i) => p.startsWith('{') || p === parts[i]));
      const best = candidates[0];
      const route = candidates.find(r => r.path === best?.path && r.method === req.method);
      if (!route) { error(404, 'RESOURCE_NOT_FOUND', 'No mock operation for this method/path'); return; }
      const operation = route.operation;
      const chosenStatus = req.headers['x-mock-status'];
      if (chosenStatus && !operation.responses[chosenStatus]) { error(400, 'BAD_REQUEST', 'X-Mock-Status is not declared on this operation'); return; }
      // Explicit error scenario bypasses request validation to let FE build error screens.
      const forcedError = chosenStatus && Number(chosenStatus) >= 400;
      if (!forcedError) {
        if ((operation.security ?? spec.security).length && !/^Bearer \S+$/i.test(req.headers.authorization ?? '')) {
          error(401, 'AUTH_REQUIRED', 'Use Authorization: Bearer mock-access-token'); return;
        }
        const paramErrors = [];
        const declaredQuery = new Set();
        for (const p of operation.parameters ?? []) {
          let value;
          if (p.in === 'path') value = parts[route.parts.indexOf('{' + p.name + '}')];
          if (p.in === 'query') {
            declaredQuery.add(p.name);
            const values = url.searchParams.getAll(p.name);
            if (values.length > 1) paramErrors.push(p.name + ' must appear at most once');
            value = values[0];
          }
          if (value === undefined) { if (p.required) paramErrors.push('Missing ' + p.name); continue; }
          if (['integer', 'number'].includes(p.schema.type)) value = value.trim() === '' ? NaN : Number(value);
          if (p.schema.type === 'boolean') value = value === 'true' ? true : value === 'false' ? false : value;
          paramErrors.push(...validate(spec, p.schema, value, p.name));
        }
        for (const name of url.searchParams.keys()) if (!declaredQuery.has(name)) paramErrors.push('Unknown query ' + name);
        if (url.searchParams.has('beforeSeq') && url.searchParams.has('afterSeq')) paramErrors.push('beforeSeq and afterSeq are mutually exclusive');
        if (paramErrors.length) { error(400, 'BAD_REQUEST', paramErrors.join('; ')); return; }
        if (operation.requestBody) {
          const content = operation.requestBody.content;
          const mime = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
          if (!content[mime]) { error(415, 'UNSUPPORTED_MEDIA_TYPE', 'Expected ' + Object.keys(content).join(' or ')); return; }
          let total = 0; const chunks = [];
          for await (const chunk of req) {
            total += chunk.length;
            if (total > 11000000) { error(413, 'FILE_TOO_LARGE', 'Mock request exceeds 11 MB including multipart overhead'); return; }
            if (mime === 'application/json') chunks.push(chunk);
          }
          if (!total) { error(400, 'BAD_REQUEST', 'Body required'); return; }
          if (mime === 'application/json') {
            let body;
            try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
            catch { error(400, 'BAD_REQUEST', 'Malformed JSON'); return; }
            const errors = validate(spec, content[mime].schema, body);
            if (errors.length) { error(422, 'VALIDATION_ERROR', 'Request does not match contract', errors.map(message => ({ field: '$', code: 'INVALID_VALUE', message }))); return; }
          }
        }
      }
      const status = chosenStatus ?? Object.keys(operation.responses).find(code => /^2\d\d$/.test(code));
      const response = deref(spec, operation.responses[status]);
      const delay = Number(req.headers['x-mock-delay-ms'] ?? 0);
      if (!Number.isFinite(delay) || delay < 0 || delay > 5000) { error(400, 'BAD_REQUEST', 'Delay must be 0..5000'); return; }
      if (delay) await new Promise(r => setTimeout(r, delay));
      for (const [name, header] of Object.entries(response.headers ?? {})) {
        if (name !== 'X-Request-Id' && header.schema?.example !== undefined) res.setHeader(name, header.schema.example);
      }
      if (status === '204') { res.writeHead(204); res.end(); return; }
      const media = response.content?.['application/json'];
      if (media) {
        const name = req.headers['x-mock-example'] ?? (media.examples.success ? 'success' : Object.keys(media.examples)[0]);
        if (!media.examples[name]) { error(400, 'BAD_REQUEST', 'Unknown example; choose: ' + Object.keys(media.examples).join(', ')); return; }
        const body = structuredClone(media.examples[name].value);
        body.requestId = requestId;
        if (['listLocations', 'updateLocation'].includes(operation.operationId) && Number(status) < 300) {
          const now = new Date();
          const stamp = item => Object.assign(item, {
            capturedAt: now.toISOString(), serverReceivedAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + 60000).toISOString()
          });
          if (operation.operationId === 'listLocations') {
            body.data.serverTime = now.toISOString();
            body.data.items.forEach(stamp);
          } else stamp(body.data);
        }
        if (operation.operationId === 'listMessages' && body.data?.items.length === 0) {
          body.data.pageInfo.nextAfterSeq = url.searchParams.get('afterSeq') ?? '0';
        }
        json(Number(status), body);
      } else {
        const pdf = req.headers.accept?.includes('application/pdf') && response.content?.['application/pdf'];
        const body = pdf ? demoPdf() : png;
        res.writeHead(Number(status), { 'Content-Type': pdf ? 'application/pdf' : 'image/png', 'Content-Disposition': 'inline; filename="mock.' + (pdf ? 'pdf' : 'png') + '"', 'Content-Length': body.length });
        res.end(body);
      }
    } catch (e) {
      if (!res.headersSent) error(500, 'INTERNAL_ERROR', 'Mock could not process request');
      else res.destroy();
    } finally {
      // Drain ignored bodies so the next request on a keep-alive socket still works.
      req.resume();
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.MOCK_PORT ?? 4010);
  const host = process.env.MOCK_HOST ?? '127.0.0.1';
  const server = createMockServer();
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, host, () => console.log('TripMate STATIC mock: http://' + host + ':' + port + prefix));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
}
