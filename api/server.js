const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = process.env.PORT || 3000;
const webRoot = path.join(__dirname, '..', 'web');

const users = [
  { id: 'u1', name: 'Maria Silva', handle: 'mariasilva', initials: 'MS', color: '#ce701b' },
  { id: 'u2', name: 'Pedro Lima', handle: 'pedrolima', initials: 'PL', color: '#327f8f' },
  { id: 'u3', name: 'Ana Costa', handle: 'anacosta', initials: 'AC', color: '#d45d4c' },
  { id: 'u4', name: 'Luis Pereira', handle: 'luispereira', initials: 'LP', color: '#5d7791' }
];

const posts = [
  { id: 'p1', userId: 'u1', content: 'Acordando com uma ideia incrível para um novo projeto de design.\n\n#criatividade', createdAt: '2026-09-11T11:20:00.000Z', ratings: [3, 3, 2, 3], comments: [{ id: 'c1', userId: 'u2', content: 'Sensacional, Maria! Quero ver.', createdAt: '2026-09-11T11:23:00.000Z' }] },
  { id: 'p2', userId: 'u3', content: 'Quando a comunidade compartilha conhecimento, todo mundo cresce junto. Que tal começar uma conversa?', createdAt: '2026-09-11T10:45:00.000Z', ratings: [3, 2, 2], comments: [{ id: 'c2', userId: 'u4', content: 'Essa é a energia que a gente precisa por aqui.', createdAt: '2026-09-11T10:50:00.000Z' }] },
  { id: 'p3', userId: 'u2', content: 'Pequenas entregas consistentes constroem grandes projetos. Bom dia, DIATINF!', createdAt: '2026-09-11T09:15:00.000Z', ratings: [2, 2, 3, 3, 3], comments: [] }
];

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(body));
}

function publicPost(post) {
  const user = users.find((item) => item.id === post.userId);
  return { ...post, user, averageRating: post.ratings.length ? Number((post.ratings.reduce((sum, score) => sum + score, 0) / post.ratings.length).toFixed(1)) : 0, ratingCount: post.ratings.length, comments: post.comments.map((comment) => ({ ...comment, user: users.find((item) => item.id === comment.userId) })) };
}

function body(request) {
  return new Promise((resolve, reject) => {
    let data = '';
    request.on('data', (chunk) => { data += chunk; });
    request.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('JSON inválido')); }
    });
  });
}

function serveFile(request, response) {
  const requested = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  const filePath = path.normalize(path.join(webRoot, requested));
  if (!filePath.startsWith(webRoot)) return json(response, 403, { error: 'Acesso negado' });
  fs.readFile(filePath, (error, file) => {
    if (error) return json(response, 404, { error: 'Página não encontrada' });
    const extension = path.extname(filePath);
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
    response.writeHead(200, { 'Content-Type': `${types[extension] || 'application/octet-stream'}; charset=utf-8` });
    response.end(file);
  });
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') { response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }); return response.end(); }
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (!url.pathname.startsWith('/api/')) return serveFile(request, response);
  try {
    if (request.method === 'GET' && url.pathname === '/api/health') return json(response, 200, { status: 'ok', service: 'diatinf-x-api' });
    if (request.method === 'GET' && url.pathname === '/api/posts') {
      const query = (url.searchParams.get('q') || '').toLowerCase();
      const result = posts.filter((post) => !query || post.content.toLowerCase().includes(query) || users.find((user) => user.id === post.userId).name.toLowerCase().includes(query)).map(publicPost);
      return json(response, 200, result);
    }
    if (request.method === 'POST' && url.pathname === '/api/posts') {
      const data = await body(request);
      if (!data.content || data.content.trim().length < 1 || data.content.length > 280) return json(response, 400, { error: 'A publicação deve ter entre 1 e 280 caracteres.' });
      const post = { id: crypto.randomUUID(), userId: 'u2', content: data.content.trim(), createdAt: new Date().toISOString(), ratings: [], comments: [] };
      posts.unshift(post);
      return json(response, 201, publicPost(post));
    }
    const ratingMatch = url.pathname.match(/^\/api\/posts\/([^/]+)\/ratings$/);
    if (request.method === 'POST' && ratingMatch) {
      const data = await body(request);
      const post = posts.find((item) => item.id === ratingMatch[1]);
      if (!post || ![1, 2, 3].includes(data.score)) return json(response, 400, { error: 'Avaliação inválida.' });
      post.ratings.push(data.score);
      return json(response, 201, publicPost(post));
    }
    const commentMatch = url.pathname.match(/^\/api\/posts\/([^/]+)\/comments$/);
    if (request.method === 'POST' && commentMatch) {
      const data = await body(request);
      const post = posts.find((item) => item.id === commentMatch[1]);
      if (!post || !data.content || data.content.trim().length > 280) return json(response, 400, { error: 'Comentário inválido.' });
      post.comments.push({ id: crypto.randomUUID(), userId: 'u2', content: data.content.trim(), createdAt: new Date().toISOString() });
      return json(response, 201, publicPost(post));
    }
    if (request.method === 'POST' && url.pathname === '/api/auth/login') {
      const data = await body(request);
      const user = users.find((item) => item.handle === data.username);
      if (!user || !data.password) return json(response, 401, { error: 'Usuário ou senha inválidos.' });
      return json(response, 200, { token: 'demo-token', user });
    }
    return json(response, 404, { error: 'Rota não encontrada' });
  } catch (error) { return json(response, 400, { error: error.message }); }
});

server.listen(PORT, () => console.log(`DIATINF X disponível em http://localhost:${PORT}`));