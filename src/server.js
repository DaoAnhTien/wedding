import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function createApp({ databasePath = process.env.DATABASE_PATH || resolve(dirname(fileURLToPath(import.meta.url)), '../data/wedding.sqlite'), adminToken = process.env.ADMIN_TOKEN || '', origins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',') } = {}) {
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS wishes (id INTEGER PRIMARY KEY, name TEXT NOT NULL, message TEXT NOT NULL, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS rsvp (id INTEGER PRIMARY KEY, name TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('attending','not-attending','maybe')), createdAt TEXT NOT NULL);`);
  const limits = new Map();
  const cleanup = setInterval(() => {
    for (const [key, value] of limits) if (value.expires < Date.now()) limits.delete(key);
  }, 60_000).unref();
  const server = createServer(async (req, res) => {
    const send = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)); };
    const origin = req.headers.origin;
    if (origin && !origins.includes(origin)) return send(403, { message: 'Nguồn truy cập không được phép.' });
    if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/health' && req.method === 'GET') return send(200, { status: 'ok' });
    const wishMatch = url.pathname.match(/^\/api\/wishes\/([1-9]\d*)$/);
    const wishId = wishMatch ? Number(wishMatch[1]) : null;
    if (wishId !== null && !Number.isSafeInteger(wishId)) return send(400, { message: 'Mã lời chúc không hợp lệ.' });
    const adminRoute = url.pathname === '/api/admin/wishes';
    const resource = wishMatch || adminRoute ? 'wishes' : { '/api/wishes': 'wishes', '/api/rsvp': 'rsvp' }[url.pathname];
    if (!resource) return send(404, { message: 'Không tìm thấy API.' });
    const needsAdmin = adminRoute || (wishMatch && ['PATCH', 'DELETE'].includes(req.method));
    if (needsAdmin) {
      if (!adminToken) return send(503, { message: 'Chưa cấu hình khóa quản trị trên máy chủ.' });
      const provided = Buffer.from((req.headers.authorization || '').replace(/^Bearer /, ''));
      const expected = Buffer.from(adminToken);
      if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return send(401, { message: 'Khóa quản trị không đúng hoặc đã hết hiệu lực.' });
    }
    if (!wishMatch && !adminRoute && !['GET', 'POST'].includes(req.method)) return send(405, { message: 'Phương thức không được hỗ trợ.' });
    if (adminRoute && req.method !== 'GET') return send(405, { message: 'Phương thức không được hỗ trợ.' });
    if (wishMatch && !['GET'
      , 'PATCH', 'DELETE'].includes(req.method)) return send(405, { message: 'Phương thức không được hỗ trợ.' });
    try {
      if (wishId !== null) {
        const wish = db.prepare('SELECT * FROM wishes WHERE id = ?').get(wishId);
        if (!wish) return send(404, { message: 'Lời chúc không còn tồn tại.' });
        if (req.method === 'GET') return send(200, wish);
        if (req.method === 'DELETE') {
          db.prepare('DELETE FROM wishes WHERE id = ?').run(wishId);
          return send(200, { id: wishId, deleted: true });
        }
      }
      if (req.method === 'GET') {
        const requestedLimit = Number(url.searchParams.get('limit'));
        const requestedOffset = Number(url.searchParams.get('offset'));
        const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(100, Math.max(1, Math.floor(requestedLimit))) : 30;
        const offset = Number.isFinite(requestedOffset) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(requestedOffset))) : 0;
        const items = db.prepare(`SELECT * FROM ${resource} ORDER BY id DESC LIMIT ? OFFSET ?`).all(limit, offset);
        const { total } = db.prepare(`SELECT COUNT(*) AS total FROM ${resource}`).get();
        return send(200, { items, total });
      }
      if (!['POST', 'PATCH'].includes(req.method)) return send(405, { message: 'Phương thức không được hỗ trợ.' });
      if (!req.headers['content-type']?.includes('application/json')) return send(415, { message: 'Vui lòng gửi dữ liệu JSON.' });
      const key = req.socket.remoteAddress;
      const now = Date.now();
      const rate = limits.get(key);
      if (rate && rate.expires > now && rate.count >= 10) { res.setHeader('Retry-After', Math.ceil((rate.expires - now) / 1000)); return send(429, { message: 'Bạn gửi hơi nhanh. Vui lòng thử lại sau một phút.' }); }
      limits.set(key, rate && rate.expires > now ? { ...rate, count: rate.count + 1 } : { count: 1, expires: now + 60_000 });
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 8192) return send(413, { message: 'Nội dung quá dài.' });
      }
      let data;
      try { data = JSON.parse(body); } catch { return send(400, { message: 'Dữ liệu không hợp lệ.' }); }
      if (!data || typeof data !== 'object' || Array.isArray(data)) return send(400, { message: 'Dữ liệu không hợp lệ.' });
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      const message = typeof data.message === 'string' ? data.message.trim() : '';
      if (!name || name.length > 100 || message.length > 2000 || (resource === 'wishes' && !message)) return send(400, { message: 'Vui lòng nhập tên (tối đa 100 ký tự) và lời nhắn hợp lệ (tối đa 2.000 ký tự).' });
      if (req.method === 'PATCH') {
        db.prepare('UPDATE wishes SET name = ?, message = ? WHERE id = ?').run(name, message, wishId);
        return send(200, db.prepare('SELECT * FROM wishes WHERE id = ?').get(wishId));
      }
      const createdAt = new Date().toISOString();
      let result;
      if (resource === 'rsvp') {
        if (!['attending', 'not-attending', 'maybe'].includes(data.status)) return send(400, { message: 'Vui lòng chọn trạng thái tham dự hợp lệ.' });
        result = db.prepare('INSERT INTO rsvp (name, message, status, createdAt) VALUES (?, ?, ?, ?)').run(name, message, data.status, createdAt);
      } else result = db.prepare('INSERT INTO wishes (name, message, createdAt) VALUES (?, ?, ?)').run(name, message, createdAt);
      return send(201, db.prepare(`SELECT * FROM ${resource} WHERE id = ?`).get(Number(result.lastInsertRowid)));
    } catch (error) { console.error(error); if (!res.headersSent) send(500, { message: 'Chưa thể xử lý yêu cầu. Vui lòng thử lại.' }); }
  });
  server.on('close', () => { clearInterval(cleanup); db.close(); });
  return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createApp();
  server.listen(Number(process.env.PORT) || 3001, process.env.HOST || '127.0.0.1', () => console.log('Wedding API listening on port ' + (process.env.PORT || 3001)));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
}
