// ============================================================
// SERVER.JS — Servidor Express + SQLite
// Cia da Capivara Turismo e Aventura
// ============================================================

const express  = require('express');
const sqlite3  = require('sqlite3').verbose();
const path     = require('path');
const cors     = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.db');

// ——— MIDDLEWARES ——————————————————————————————————————————————
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// ——— BANCO DE DADOS ——————————————————————————————————————————
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) { console.error('Erro ao abrir banco de dados:', err.message); process.exit(1); }
  console.log('✅ Conectado ao banco SQLite:', DB_PATH);
});

// Promisify helpers
const dbRun  = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function(err) { if (err) reject(err); else resolve(this); }));
const dbAll  = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); }));
const dbGet  = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); }));

// ——— MAPA DE CHAVES → TABELAS ————————————————————————————————
const TABLE_MAP = {
  cct_users:            'users',
  cct_cars:             'cars',
  cct_providers:        'providers',
  cct_clients:          'clients',
  cct_daybyday:         'daybyday',
  cct_packages:         'packages',
  cct_bookings:         'bookings',
  cct_cashflow:         'cashflow',
  cct_tasks:            'tasks',
  cct_documents:        'documents',
  cct_notifications:    'notifications',
  cct_company_settings: 'company_settings',
};

// ——— CRIAÇÃO DE TABELAS ——————————————————————————————————————
async function createTables() {
  await db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
      email TEXT, role TEXT, name TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS cars (
      id TEXT PRIMARY KEY, model TEXT NOT NULL, plate TEXT NOT NULL,
      type TEXT, status TEXT DEFAULT 'disponivel', description TEXT, createdAt TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT, phone TEXT,
      email TEXT, notes TEXT, carId TEXT, hotelLocation TEXT, createdAt TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, email TEXT,
      location TEXT, peopleCount INTEGER, ageGroup TEXT, description TEXT, createdAt TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS daybyday (
      id TEXT PRIMARY KEY, clientId TEXT, date TEXT, status TEXT,
      guideId TEXT, driverId TEXT, carId TEXT, description TEXT, notes TEXT, createdAt TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS packages (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, destination TEXT, duration INTEGER,
      price REAL, capacity INTEGER, status TEXT, description TEXT, createdAt TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY, clientId TEXT, packageId TEXT, checkIn TEXT, checkOut TEXT,
      people INTEGER, status TEXT, guideId TEXT, driverId TEXT,
      totalValue REAL, paid REAL, notes TEXT, createdAt TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS cashflow (
      id TEXT PRIMARY KEY, date TEXT, type TEXT, category TEXT,
      amount REAL, description TEXT, createdAt TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, title TEXT, employeeId TEXT, departure TEXT,
      destination TEXT, date TEXT, time TEXT, status TEXT, description TEXT, createdAt TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY, name TEXT, type TEXT, size INTEGER,
      data TEXT, clientId TEXT, createdAt TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY, type TEXT, message TEXT, date TEXT,
      read INTEGER DEFAULT 0, bookingId TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS company_settings (
      key TEXT PRIMARY KEY, value TEXT
    )`);
  });
}

// ——— SEED (dados iniciais v6) ————————————————————————————————
function todayStr() { return new Date().toISOString().split('T')[0]; }
function daysFromNow(n) { return new Date(Date.now() + n * 86400000).toISOString().split('T')[0]; }

async function seedDatabase() {
  // 1. Limpeza automática de dados de teste estáticos antigos da migração v6 se detectados
  try {
    const hasTestData = await dbGet("SELECT id FROM clients WHERE id = 'cli_1'");
    if (hasTestData) {
      console.log('🧹 Detectados dados estáticos de teste antigos (v6). Limpando tabelas operacionais para o ambiente real...');
      await dbRun('DELETE FROM cars');
      await dbRun('DELETE FROM providers');
      await dbRun('DELETE FROM clients');
      await dbRun('DELETE FROM daybyday');
      await dbRun('DELETE FROM packages');
      await dbRun('DELETE FROM bookings');
      await dbRun('DELETE FROM cashflow');
      await dbRun('DELETE FROM tasks');
      await dbRun('DELETE FROM documents');
      await dbRun('DELETE FROM notifications');
      console.log('✅ Tabelas limpas com sucesso!');
    }
  } catch (err) {
    console.warn('⚠️ Alerta na verificação/limpeza de dados antigos:', err.message);
  }

  // 2. Garante que os usuários de acesso administrativo existam
  const existing = await dbGet('SELECT COUNT(*) as cnt FROM users');
  if (!existing || existing.cnt === 0) {
    console.log('🌱 Criando usuários administrativos iniciais...');
    const users = [
      ['u1', 'admin',       'admin123', 'admin@ciacapivara.com',  'admin',   'Administrador'],
      ['u2', 'felipe.admin','felipe321', 'felipe@gmail.com',      'admin',   'Felipe Louzeiro'],
    ];
    for (const u of users) {
      await dbRun('INSERT OR IGNORE INTO users (id,username,password,email,role,name) VALUES (?,?,?,?,?,?)', u);
    }
  }

  // 3. Garante que as configurações padrão da empresa existam
  const existingSettings = await dbGet('SELECT COUNT(*) as cnt FROM company_settings');
  if (!existingSettings || existingSettings.cnt === 0) {
    console.log('🌱 Criando configurações padrão da empresa...');
    const settings = {
      logoName:  'Cia da Capivara Turismo',
      logoEmoji: '🦔',
      cadastur:  '12.345.678/0001-90',
      instagram: '@ciadacapivara',
      website:   'www.ciadacapivara.com',
    };
    for (const [k, v] of Object.entries(settings)) {
      await dbRun('INSERT OR IGNORE INTO company_settings (key,value) VALUES (?,?)', [k, v]);
    }
  }

  console.log('✅ Inicialização do banco concluída!');
}

// ——— API: GET /api/db/init ————————————————————————————————————
// Retorna todos os dados das tabelas como JSON consolidado para o frontend.
app.get('/api/db/init', async (req, res) => {
  try {
    const result = {};

    for (const [key, table] of Object.entries(TABLE_MAP)) {
      if (table === 'company_settings') {
        // Converte rows (key/value) → objeto { key: value }
        const rows = await dbAll('SELECT key, value FROM company_settings');
        const obj = {};
        rows.forEach(r => { obj[r.key] = r.value; });
        result[key] = obj;
      } else {
        result[key] = await dbAll(`SELECT * FROM ${table}`);
        // Converter campo 'read' integer → boolean para notifications
        if (table === 'notifications') {
          result[key] = result[key].map(n => ({ ...n, read: n.read === 1 }));
        }
      }
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Erro em GET /api/db/init:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ——— API: POST /api/db/save ——————————————————————————————————
// Insere ou atualiza um único item em uma tabela.
app.post('/api/db/save', async (req, res) => {
  const { key, item } = req.body;
  const table = TABLE_MAP[key];
  if (!table || !item) return res.status(400).json({ success: false, error: 'Chave ou item inválido.' });

  try {
    if (table === 'company_settings') {
      // company_settings é key-value
      for (const [k, v] of Object.entries(item)) {
        await dbRun('INSERT OR REPLACE INTO company_settings (key,value) VALUES (?,?)', [k, String(v)]);
      }
    } else {
      const cols = Object.keys(item);
      const vals = Object.values(item);
      const placeholders = cols.map(() => '?').join(', ');
      const setClauses   = cols.map(c => `${c} = ?`).join(', ');
      // Upsert: tenta update primeiro, depois insert
      const existing = await dbGet(`SELECT id FROM ${table} WHERE id = ?`, [item.id]);
      if (existing) {
        await dbRun(`UPDATE ${table} SET ${setClauses} WHERE id = ?`, [...vals, item.id]);
      } else {
        await dbRun(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`, vals);
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error(`Erro em POST /api/db/save (${key}):`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ——— API: POST /api/db/delete ————————————————————————————————
// Remove um item pelo id de uma tabela.
app.post('/api/db/delete', async (req, res) => {
  const { key, id } = req.body;
  const table = TABLE_MAP[key];
  if (!table || !id) return res.status(400).json({ success: false, error: 'Chave ou id inválido.' });

  try {
    await dbRun(`DELETE FROM ${table} WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(`Erro em POST /api/db/delete (${key}):`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ——— API: POST /api/db/set ————————————————————————————————————
// Substitui todos os registros de uma tabela (usado para arrays completos).
app.post('/api/db/set', async (req, res) => {
  const { key, value } = req.body;
  const table = TABLE_MAP[key];
  if (!table) return res.status(400).json({ success: false, error: 'Chave inválida.' });

  try {
    if (table === 'company_settings') {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        await dbRun('DELETE FROM company_settings');
        for (const [k, v] of Object.entries(value))
          await dbRun('INSERT INTO company_settings (key,value) VALUES (?,?)', [k, String(v)]);
      }
    } else if (Array.isArray(value)) {
      await dbRun(`DELETE FROM ${table}`);
      for (const item of value) {
        const cols = Object.keys(item);
        const vals = Object.values(item);
        const placeholders = cols.map(() => '?').join(', ');
        await dbRun(`INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`, vals);
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error(`Erro em POST /api/db/set (${key}):`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ——— ROTAS DE PÁGINAS ————————————————————————————————————————
// Serve as páginas HTML sem a extensão .html na URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/index', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Catch-all: qualquer rota não reconhecida redireciona para login
app.get('*', (req, res) => {
  // Se for uma requisição de arquivo (tem extensão), retorna 404 normal
  if (path.extname(req.path)) {
    return res.status(404).send('Arquivo não encontrado');
  }
  // Senão, serve a index principal (SPA fallback)
  res.sendFile(path.join(__dirname, 'index.html'));
});


// ——— BOOT ————————————————————————————————————————————————————
async function startServer() {
  await createTables();
  await seedDatabase();
  app.listen(PORT, () => {
    console.log(`\n🚀 Cia da Capivara Turismo — Servidor iniciado!`);
    console.log(`   Acesse: http://localhost:${PORT}\n`);
  });
}

startServer().catch(err => {
  console.error('Erro fatal ao iniciar servidor:', err);
  process.exit(1);
});
