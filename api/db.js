const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não configurada. Informe a URL de conexão do PostgreSQL.');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
const hashPassword = (password) => crypto.createHash('sha256').update(password).digest('hex');

async function initializeDatabase() {
  await pool.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM users');
  if (rows[0].count > 0) return;
  const seedUsers = [
    ['u1', 'Maria Silva', 'mariasilva', 'MS', '#ce701b'],
    ['u2', 'Pedro Lima', 'pedrolima', 'PL', '#327f8f'],
    ['u3', 'Ana Costa', 'anacosta', 'AC', '#d45d4c'],
    ['u4', 'Luis Pereira', 'luispereira', 'LP', '#5d7791']
  ];
  for (const user of seedUsers) await pool.query('INSERT INTO users (id, name, handle, initials, color, password_hash) VALUES ($1, $2, $3, $4, $5, $6)', [...user, hashPassword('demo')]);
  await pool.query(`INSERT INTO posts (id, user_id, content, created_at) VALUES
    ('p1', 'u1', 'Acordando com uma ideia incrível para um novo projeto de design.\n\n#criatividade', '2026-09-11T11:20:00Z'),
    ('p2', 'u3', 'Quando a comunidade compartilha conhecimento, todo mundo cresce junto. Que tal começar uma conversa?', '2026-09-11T10:45:00Z'),
    ('p3', 'u2', 'Pequenas entregas consistentes constroem grandes projetos. Bom dia, DIATINF!', '2026-09-11T09:15:00Z')`);
  await pool.query("INSERT INTO ratings (post_id, user_id, score) VALUES ('p1', 'u1', 3), ('p1', 'u2', 3), ('p1', 'u3', 2), ('p1', 'u4', 3), ('p2', 'u1', 3), ('p2', 'u2', 2), ('p2', 'u4', 2), ('p3', 'u1', 2), ('p3', 'u2', 2), ('p3', 'u3', 3), ('p3', 'u4', 3)");
  await pool.query("INSERT INTO comments (id, post_id, user_id, content, created_at) VALUES ('c1', 'p1', 'u2', 'Sensacional, Maria! Quero ver.', '2026-09-11T11:23:00Z'), ('c2', 'p2', 'u4', 'Essa é a energia que a gente precisa por aqui.', '2026-09-11T10:50:00Z')");
}

module.exports = { pool, initializeDatabase, hashPassword };