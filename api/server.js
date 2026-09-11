const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pool, initializeDatabase, hashPassword } = require('./db');

const PORT = process.env.PORT || 3000;
const webRoot = path.join(__dirname, '..', 'web');
const sessions = new Map();

function json(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' });
  response.end(JSON.stringify(data));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let data = '';
    request.on('data', (chunk) => { data += chunk; });
    request.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('JSON inválido')); } });
  });
}

function currentUser(request) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  return token ? sessions.get(token) : null;
}

function requireUser(request, response) {
  const user = currentUser(request);
  if (!user) { json(response, 401, { error: 'Faça login para realizar esta ação.' }); return null; }
  return user;
}

async function getPosts(query = '') {
  const search = `%${query}%`;
  const result = await pool.query(`
    SELECT p.id, p.content, p.created_at, u.id AS user_id, u.name, u.handle, u.initials, u.color,
      COALESCE(ROUND(AVG(r.score)::numeric, 1), 0) AS average_rating, COUNT(DISTINCT r.id)::int AS rating_count
    FROM posts p JOIN users u ON u.id = p.user_id LEFT JOIN ratings r ON r.post_id = p.id
    WHERE ($1 = '%%' OR p.content ILIKE $1 OR u.name ILIKE $1 OR u.handle ILIKE $1)
    GROUP BY p.id, u.id ORDER BY p.created_at DESC`, [search]);
  const posts = result.rows.map((row) => ({ id: row.id, content: row.content, createdAt: row.created_at, user: { id: row.user_id, name: row.name, handle: row.handle, initials: row.initials, color: row.color }, averageRating: Number(row.average_rating), ratingCount: row.rating_count, ratings: [], comments: [] }));
  if (!posts.length) return posts;
  const comments = await pool.query(`SELECT c.id, c.post_id, c.parent_id, c.content, c.created_at, u.id AS user_id, u.name, u.handle, u.initials, u.color FROM comments c JOIN users u ON u.id = c.user_id WHERE c.post_id = ANY($1::text[]) ORDER BY c.created_at`, [posts.map((post) => post.id)]);
  for (const comment of comments.rows) { const post = posts.find((item) => item.id === comment.post_id); post.comments.push({ id: comment.id, parentId: comment.parent_id, content: comment.content, createdAt: comment.created_at, user: { id: comment.user_id, name: comment.name, handle: comment.handle, initials: comment.initials, color: comment.color } }); }
  return posts;
}

function serveFile(request, response) {
  const requested = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  const filePath = path.normalize(path.join(webRoot, requested));
  if (!filePath.startsWith(webRoot)) return json(response, 403, { error: 'Acesso negado' });
  fs.readFile(filePath, (error, file) => { if (error) return json(response, 404, { error: 'Página não encontrada' }); const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' }; response.writeHead(200, { 'Content-Type': `${types[path.extname(filePath)] || 'application/octet-stream'}; charset=utf-8` }); response.end(file); });
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') { response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }); return response.end(); }
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (!url.pathname.startsWith('/api/')) return serveFile(request, response);
  try {
    if (request.method === 'GET' && url.pathname === '/api/health') return json(response, 200, { status: 'ok', service: 'diatinf-x-api', database: 'postgresql' });
    if (request.method === 'GET' && url.pathname === '/api/posts') return json(response, 200, await getPosts(url.searchParams.get('q') || ''));
    if (request.method === 'POST' && url.pathname === '/api/auth/login') {
      const data = await readBody(request); const result = await pool.query('SELECT id, name, handle, initials, color FROM users WHERE handle = $1 AND password_hash = $2', [data.username, hashPassword(data.password || '')]);
      if (!result.rows[0]) return json(response, 401, { error: 'Usuário ou senha inválidos.' });
      const token = crypto.randomBytes(24).toString('hex'); sessions.set(token, result.rows[0]); return json(response, 200, { token, user: result.rows[0] });
    }
    const user = currentUser(request);
    if (request.method === 'POST' && url.pathname === '/api/posts') {
      if (!requireUser(request, response)) return; const data = await readBody(request); const content = data.content?.trim();
      if (!content || content.length > 280) return json(response, 400, { error: 'A publicação deve ter entre 1 e 280 caracteres.' });
      const id = crypto.randomUUID(); await pool.query('INSERT INTO posts (id, user_id, content) VALUES ($1, $2, $3)', [id, user.id, content]); return json(response, 201, (await getPosts()).find((post) => post.id === id));
    }
    const rating = url.pathname.match(/^\/api\/posts\/([^/]+)\/ratings$/);
    if (request.method === 'POST' && rating) {
      if (!requireUser(request, response)) return; const data = await readBody(request); if (![1, 2, 3].includes(data.score)) return json(response, 400, { error: 'Avaliação inválida.' });
      await pool.query('INSERT INTO ratings (post_id, user_id, score) VALUES ($1, $2, $3) ON CONFLICT (post_id, user_id) DO UPDATE SET score = EXCLUDED.score', [rating[1], user.id, data.score]); return json(response, 201, (await getPosts()).find((post) => post.id === rating[1]));
    }
    const comment = url.pathname.match(/^\/api\/posts\/([^/]+)\/comments$/);
    if (request.method === 'POST' && comment) {
      if (!requireUser(request, response)) return; const data = await readBody(request); const content = data.content?.trim(); if (!content || content.length > 280) return json(response, 400, { error: 'Comentário inválido.' });
      await pool.query('INSERT INTO comments (id, post_id, user_id, parent_id, content) VALUES ($1, $2, $3, $4, $5)', [crypto.randomUUID(), comment[1], user.id, data.parentId || null, content]); return json(response, 201, (await getPosts()).find((post) => post.id === comment[1]));
    }
    return json(response, 404, { error: 'Rota não encontrada' });
  } catch (error) { console.error(error); return json(response, 500, { error: 'Erro interno do servidor.' }); }
});

initializeDatabase().then(() => server.listen(PORT, () => console.log(`DIATINF X disponível em http://localhost:${PORT}`))).catch((error) => { console.error(`Não foi possível iniciar: ${error.message}`); process.exitCode = 1; });
