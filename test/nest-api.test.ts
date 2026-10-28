import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createNestApp, AppOptions } from '../src/app-factory';

async function start(options: AppOptions = {}) {
  const app = await createNestApp({ ...options, logger: false });
  await app.listen(0, '127.0.0.1');
  const server = app.getHttpServer();
  const address = server.address();
  const port = typeof address === 'object' && address !== null ? address.port : 0;
  const url = `http://127.0.0.1:${port}/api`;

  return {
    app,
    server,
    request: (
      path: string,
      data?: any,
      headers: Record<string, string> = {},
      method: string = data === undefined ? 'GET' : 'POST',
    ) =>
      fetch(url + path, {
        method,
        headers: data === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
        body: data === undefined ? undefined : JSON.stringify(data),
      }),
  };
}

test('validates input, supports pagination and RSVP, persists after restart', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'wedding-api-'));
  const options = { databasePath: join(dir, 'test.sqlite') };
  let instance = await start(options);

  try {
    assert.equal((await instance.request('/wishes', { name: ' ', message: 'hi' })).status, 400);
    assert.equal((await instance.request('/wishes', { name: 'Guest', message: 'x'.repeat(2001) })).status, 400);
    assert.equal((await instance.request('/rsvp', { name: 'Guest', status: 'invalid' })).status, 400);
    assert.equal((await instance.request('/wishes', null)).status, 400);
    assert.equal((await instance.request('/wishes', undefined, { Origin: 'https://unknown.example' })).status, 403);

    const response = await instance.request('/wishes', { name: '  Bạn thân  ', message: '  Chúc mừng hạnh phúc! 💚  ' });
    assert.equal(response.status, 201);
    const wish = (await response.json()) as any;
    assert.equal(wish.name, 'Bạn thân');
    assert.equal(wish.message, 'Chúc mừng hạnh phúc! 💚');
    assert.ok(!isNaN(Date.parse(wish.createdAt)));

    await instance.request('/wishes', { name: 'Guest 2', message: 'Happy wedding' });
    const page = (await (await instance.request('/wishes?limit=1&offset=1')).json()) as any;
    assert.equal(page.total, 2);
    assert.equal(page.items[0].id, wish.id);

    assert.equal((await instance.request('/rsvp', { name: 'Guest', status: 'attending' })).status, 201);
    const rsvpPage = (await (await instance.request('/rsvp')).json()) as any;
    assert.equal(rsvpPage.items[0].status, 'attending');

    await instance.app.close();
    instance = await start(options);
    const restartedPage = (await (await instance.request('/wishes')).json()) as any;
    assert.equal(restartedPage.total, 2);
  } finally {
    await instance.app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('limits repeated submissions', async () => {
  const instance = await start({ databasePath: ':memory:' });
  try {
    for (let i = 0; i < 10; i++) {
      assert.equal((await instance.request('/wishes', { name: 'Guest', message: 'Congratulations' })).status, 201);
    }
    const response = await instance.request('/wishes', { name: 'Guest', message: 'Again' });
    assert.equal(response.status, 429);
    assert.ok(response.headers.get('Retry-After'));
  } finally {
    await instance.app.close();
  }
});

test('admin can edit and delete wishes; public visitors cannot', async () => {
  const instance = await start({ databasePath: ':memory:', adminToken: 'test-private-key' });
  const auth = { Authorization: 'Bearer test-private-key' };

  try {
    const wish = (await (await instance.request('/wishes', { name: 'Guest', message: 'Original' })).json()) as any;
    const path = `/wishes/${wish.id}`;

    assert.equal((await instance.request('/wishes', { name: 'Guest', message: 'Hello' }, auth, 'PATCH')).status, 405);
    assert.equal((await instance.request('/admin/wishes')).status, 401);
    assert.equal((await instance.request('/admin/wishes', undefined, { Authorization: 'Bearer wrong' })).status, 401);
    assert.equal((await instance.request('/admin/wishes', undefined, auth)).status, 200);

    assert.equal((await instance.request(path, { name: 'Someone', message: 'Changed' }, {}, 'PATCH')).status, 401);
    assert.equal((await instance.request(path, undefined, {}, 'DELETE')).status, 401);
    assert.equal((await instance.request(path, { name: ' ', message: 'Invalid' }, auth, 'PATCH')).status, 400);

    const update = await instance.request(path, { name: '  Edited Guest ', message: ' New message ' }, auth, 'PATCH');
    assert.equal(update.status, 200);
    const edited = (await update.json()) as any;
    assert.equal(edited.name, 'Edited Guest');
    assert.equal(edited.message, 'New message');
    assert.equal(edited.createdAt, wish.createdAt);

    assert.equal((await (await instance.request(path)).json()).message, 'New message');
    assert.equal((await instance.request('/wishes/99999', { name: 'Guest', message: 'Hello' }, auth, 'PATCH')).status, 404);
    assert.equal((await instance.request('/wishes/999999999999999999999', undefined, auth, 'DELETE')).status, 400);

    assert.equal((await instance.request(path, undefined, auth, 'DELETE')).status, 200);
    assert.equal((await instance.request(path)).status, 404);
    assert.equal((await instance.request(path, undefined, auth, 'DELETE')).status, 404);

    assert.equal((await (await instance.request('/wishes')).json()).total, 0);

    const cors = await instance.request(path, undefined, { Origin: 'http://localhost:5173' }, 'OPTIONS');
    assert.ok(cors.headers.get('Access-Control-Allow-Methods')?.includes('PATCH'));
    assert.ok(cors.headers.get('Access-Control-Allow-Headers')?.includes('Authorization'));
  } finally {
    await instance.app.close();
  }
});

test('admin mutations are disabled until a server key is configured', async () => {
  const instance = await start({ databasePath: ':memory:', adminToken: '' });
  try {
    const wish = (await (await instance.request('/wishes', { name: 'Guest', message: 'Original' })).json()) as any;
    assert.equal((await instance.request(`/wishes/${wish.id}`, undefined, {}, 'DELETE')).status, 503);
    assert.equal((await instance.request('/admin/wishes')).status, 503);
  } finally {
    await instance.app.close();
  }
});
