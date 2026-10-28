import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/server.js';

async function start(options) {
  const server = createApp(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api`;
  return { server, request: (path, data, headers = {}, method = data === undefined ? 'GET' : 'POST') => fetch(url + path, data === undefined ? { headers, method } : { method, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(data) }) };
}
const close = server => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));

test('validates input, supports pagination and RSVP, persists after restart', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'wedding-api-'));
  const options = { databasePath: join(dir, 'test.sqlite') };
  let app = await start(options);
  try {
    assert.equal((await app.request('/wishes', { name: ' ', message: 'hi' })).status, 400);
    assert.equal((await app.request('/wishes', { name: 'Guest', message: 'x'.repeat(2001) })).status, 400);
    assert.equal((await app.request('/rsvp', { name: 'Guest', status: 'invalid' })).status, 400);
    assert.equal((await app.request('/wishes', null)).status, 400);
    assert.equal((await app.request('/wishes', undefined, { Origin: 'https://unknown.example' })).status, 403);
    const response = await app.request('/wishes', { name: '  Bạn thân  ', message: '  Chúc mừng hạnh phúc! 💚  ' });
    assert.equal(response.status, 201);
    const wish = await response.json();
    assert.equal(wish.name, 'Bạn thân');
    assert.equal(wish.message, 'Chúc mừng hạnh phúc! 💚');
    assert.ok(!isNaN(Date.parse(wish.createdAt)));
    await app.request('/wishes', { name: 'Guest 2', message: 'Happy wedding' });
    const page = await (await app.request('/wishes?limit=1&offset=1')).json();
    assert.equal(page.total, 2);
    assert.equal(page.items[0].id, wish.id);
    assert.equal((await app.request('/rsvp', { name: 'Guest', status: 'attending' })).status, 201);
    assert.equal((await (await app.request('/rsvp')).json()).items[0].status, 'attending');
    await close(app.server);
    app = await start(options);
    assert.equal((await (await app.request('/wishes')).json()).total, 2);
  } finally { await close(app.server); rmSync(dir, { recursive: true }); }
});

test('limits repeated submissions', async () => {
  const app = await start({ databasePath: ':memory:' });
  try {
    for (let i = 0; i < 10; i++) assert.equal((await app.request('/wishes', { name: 'Guest', message: 'Congratulations' })).status, 201);
    const response = await app.request('/wishes', { name: 'Guest', message: 'Again' });
    assert.equal(response.status, 429);
    assert.ok(response.headers.get('Retry-After'));
  } finally { await close(app.server); }
});


test('admin can edit and delete wishes; public visitors cannot', async () => {
  const app = await start({ databasePath: ':memory:', adminToken: 'test-private-key' });
  const auth = { Authorization: 'Bearer test-private-key' };
  try {
    const wish = await (await app.request('/wishes', { name: 'Guest', message: 'Original' })).json();
    const path = `/wishes/${wish.id}`;
    assert.equal((await app.request('/wishes', { name: 'Guest', message: 'Hello' }, auth, 'PATCH')).status, 405);
    assert.equal((await app.request('/admin/wishes')).status, 401);
    assert.equal((await app.request('/admin/wishes', undefined, { Authorization: 'Bearer wrong' })).status, 401);
    assert.equal((await app.request('/admin/wishes', undefined, auth)).status, 200);
    assert.equal((await app.request(path, { name: 'Someone', message: 'Changed' }, {}, 'PATCH')).status, 401);
    assert.equal((await app.request(path, undefined, {}, 'DELETE')).status, 401);
    assert.equal((await app.request(path, { name: ' ', message: 'Invalid' }, auth, 'PATCH')).status, 400);
    const update = await app.request(path, { name: '  Edited Guest ', message: ' New message ' }, auth, 'PATCH');
    assert.equal(update.status, 200);
    const edited = await update.json();
    assert.equal(edited.name, 'Edited Guest');
    assert.equal(edited.message, 'New message');
    assert.equal(edited.createdAt, wish.createdAt);
    assert.equal((await (await app.request(path)).json()).message, 'New message');
    assert.equal((await app.request('/wishes/99999', { name: 'Guest', message: 'Hello' }, auth, 'PATCH')).status, 404);
    assert.equal((await app.request('/wishes/999999999999999999999', undefined, auth, 'DELETE')).status, 400);
    assert.equal((await app.request(path, undefined, auth, 'DELETE')).status, 200);
    assert.equal((await app.request(path)).status, 404);
    assert.equal((await app.request(path, undefined, auth, 'DELETE')).status, 404);
    assert.equal((await (await app.request('/wishes')).json()).total, 0);
    const cors = await app.request(path, undefined, { Origin: 'http://localhost:5173' }, 'OPTIONS');
    assert.ok(cors.headers.get('Access-Control-Allow-Methods').includes('PATCH'));
    assert.ok(cors.headers.get('Access-Control-Allow-Headers').includes('Authorization'));
  } finally { await close(app.server); }
});

test('admin mutations are disabled until a server key is configured', async () => {
  const app = await start({ databasePath: ':memory:', adminToken: '' });
  try {
    const wish = await (await app.request('/wishes', { name: 'Guest', message: 'Original' })).json();
    assert.equal((await app.request(`/wishes/${wish.id}`, undefined, {}, 'DELETE')).status, 503);
    assert.equal((await app.request('/admin/wishes')).status, 503);
  } finally { await close(app.server); }
});
