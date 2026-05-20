// ============================================================
// SERVER.JS — Servidor Express + SQLite
// Cia da Capivara Turismo e Aventura
// ============================================================

const express  = require('express');
const sqlite3  = require('sqlite3').verbose();
const path     = require('path');
const cors     = require('cors');

const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.db');

// ——— MIDDLEWARES ——————————————————————————————————————————————
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ——— BANCO DE DADOS ——————————————————————————————————————————
let db = new sqlite3.Database(DB_PATH, (err) => {
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
    
    // Trigger backup em background pós-save
    createAutomaticBackup('auto').catch(e => console.error('Erro no backup pós-save:', e.message));
    
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
    
    // Trigger backup em background pós-delete
    createAutomaticBackup('auto').catch(e => console.error('Erro no backup pós-delete:', e.message));
    
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
    
    // Trigger backup em background pós-set
    createAutomaticBackup('auto').catch(e => console.error('Erro no backup pós-set:', e.message));
    
    res.json({ success: true });
  } catch (err) {
    console.error(`Erro em POST /api/db/set (${key}):`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ——— SISTEMA DE BACKUPS AUTOMÁTICOS & ROTACIONAIS —————————————————————————
const BACKUPS_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

async function createAutomaticBackup(type = 'auto') {
  try {
    if (!fs.existsSync(DB_PATH)) return null;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${type}_${timestamp}.db`;
    const destPath = path.join(BACKUPS_DIR, filename);
    
    await fs.promises.copyFile(DB_PATH, destPath);
    console.log(`💾 Backup salvo com sucesso: ${filename}`);

    // Rotatividade: manter os 7 backups mais recentes
    const files = await fs.promises.readdir(BACKUPS_DIR);
    const backupFiles = [];
    for (const f of files) {
      if (f.startsWith('backup_') && f.endsWith('.db')) {
        const filePath = path.join(BACKUPS_DIR, f);
        try {
          const stats = await fs.promises.stat(filePath);
          backupFiles.push({
            name: f,
            filePath: filePath,
            time: stats.mtime.getTime()
          });
        } catch (e) {
          // Arquivo deletado concorrentemente ou não acessível, apenas ignora
        }
      }
    }
    backupFiles.sort((a, b) => a.time - b.time); // mais antigos primeiro

    if (backupFiles.length > 7) {
      const toDelete = backupFiles.slice(0, backupFiles.length - 7);
      for (const f of toDelete) {
        try {
          await fs.promises.unlink(f.filePath);
          console.log(`🧹 Rotatividade de backup: removido backup antigo (${f.name})`);
        } catch (e) {
          // Arquivo já deletado concorrentemente ou travado, apenas ignora
        }
      }
    }
    return filename;
  } catch (err) {
    console.error('⚠️ Falha ao criar backup:', err.message);
    return null;
  }
}

// ——— API: GERENCIAMENTO DE BACKUP & SAÚDE DO SISTEMA —————————————————————
// 1. Listar backups locais + informações gerais do banco ativo
app.get('/api/backup/list', async (req, res) => {
  try {
    let files = [];
    if (fs.existsSync(BACKUPS_DIR)) {
      const rawFiles = await fs.promises.readdir(BACKUPS_DIR);
      files = rawFiles
        .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
        .map(f => {
          const filePath = path.join(BACKUPS_DIR, f);
          const stats = fs.statSync(filePath);
          return {
            name: f,
            size: Math.round(stats.size / 1024) + ' KB',
            createdAt: stats.mtime.toISOString(),
            type: f.includes('_manual_') ? 'Manual' : f.includes('_boot_') ? 'Inicialização' : 'Automático'
          };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // mais novos primeiro
    }

    let dbSize = '0 KB';
    if (fs.existsSync(DB_PATH)) {
      const activeStats = fs.statSync(DB_PATH);
      dbSize = Math.round(activeStats.size / 1024) + ' KB';
    }

    const tables = ['users', 'cars', 'providers', 'clients', 'daybyday', 'packages', 'bookings', 'cashflow', 'tasks', 'documents', 'notifications'];
    const tablesInfo = {};
    for (const table of tables) {
      try {
        const countRow = await dbGet(`SELECT COUNT(*) as count FROM ${table}`);
        tablesInfo[table] = countRow ? countRow.count : 0;
      } catch (e) {
        tablesInfo[table] = 0;
      }
    }

    res.json({
      success: true,
      activeDatabase: {
        size: dbSize,
        tablesInfo
      },
      backups: files
    });
  } catch (err) {
    console.error('Erro ao listar backups:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Criar backup manual
app.post('/api/backup/create', async (req, res) => {
  try {
    const filename = await createAutomaticBackup('manual');
    if (filename) {
      res.json({ success: true, message: 'Backup manual criado com sucesso!', filename });
    } else {
      res.status(500).json({ success: false, error: 'Não foi possível salvar o arquivo de backup.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Download do banco de dados físico ativo
app.get('/api/backup/download', (req, res) => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return res.status(404).json({ success: false, error: 'Banco de dados ativo não encontrado.' });
    }
    // Define header para download de arquivo binário SQLite
    res.setHeader('Content-Type', 'application/vnd.sqlite3');
    res.download(DB_PATH, 'ciadacapivara_backup.db');
  } catch (err) {
    console.error('Erro no download do banco:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Restaurar a partir de backup local interno
app.post('/api/backup/restore', async (req, res) => {
  const { filename } = req.body;
  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ success: false, error: 'Nome do arquivo de backup inválido.' });
  }

  const safeName = path.basename(filename);
  const backupFilePath = path.join(BACKUPS_DIR, safeName);

  if (!fs.existsSync(backupFilePath)) {
    return res.status(404).json({ success: false, error: 'Arquivo de backup selecionado não existe.' });
  }

  try {
    console.log(`🔄 Iniciando restauração do banco a partir de backup local: ${safeName}`);
    
    // Fechar conexão com o banco ativo
    if (db) {
      await new Promise((resolve, reject) => {
        db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Copiar o backup sobre o banco atual
    await fs.promises.copyFile(backupFilePath, DB_PATH);

    // Reabrir o banco
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Erro ao reabrir o banco após restauração:', err.message);
      } else {
        console.log('✅ Banco de dados reaberto e sincronizado com sucesso!');
      }
    });

    res.json({ success: true, message: 'Banco de dados restaurado com sucesso!' });
  } catch (err) {
    console.error('Erro ao restaurar banco:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Enviar arquivo externo e restaurar (Upload Backup)
app.post('/api/backup/upload-restore', async (req, res) => {
  const { fileData } = req.body;
  if (!fileData) {
    return res.status(400).json({ success: false, error: 'Dados do arquivo ausentes.' });
  }

  try {
    console.log(`📥 Recebendo upload para restauração de banco de dados...`);
    const buffer = Buffer.from(fileData, 'base64');

    // Validação mínima para ver se é SQLite válido
    const headerStr = buffer.toString('utf8', 0, 15);
    if (headerStr !== 'SQLite format 3') {
      return res.status(400).json({ success: false, error: 'Arquivo inválido. O arquivo enviado não é um banco de dados SQLite válido.' });
    }

    // Fechar conexão
    if (db) {
      await new Promise((resolve, reject) => {
        db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Backup de segurança pré-sobrescrever
    if (fs.existsSync(DB_PATH)) {
      const emergencyPath = path.join(BACKUPS_DIR, `backup_emergencia_${Date.now()}.db`);
      await fs.promises.copyFile(DB_PATH, emergencyPath);
      console.log(`⚠️ Backup de emergência salvo antes da sobrescrita: ${path.basename(emergencyPath)}`);
    }

    // Gravar o arquivo enviado sobre o banco atual
    await fs.promises.writeFile(DB_PATH, buffer);

    // Reabrir conexão
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Erro ao reabrir banco após upload:', err.message);
      } else {
        console.log('✅ Banco de dados SQLite reaberto e sincronizado após upload.');
      }
    });

    res.json({ success: true, message: 'Banco de dados enviado e restaurado com sucesso!' });
  } catch (err) {
    console.error('Erro no upload de restauração:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ——— ROTAS DE PÁGINAS ————————————————————————————————————————
// Serve as páginas HTML sem a extensão .html na URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/index', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ——— API: POST /api/debug/log ————————————————————————————————
// Permite que o frontend envie logs de erros do console para o servidor
app.post('/api/debug/log', (req, res) => {
  console.log('\n❌ [BROWSER ERROR] ---------------------------------------');
  console.log('Mensagem:', req.body.error);
  if (req.body.stack) {
    console.log('Stack Trace:\n', req.body.stack);
  }
  console.log('----------------------------------------------------------\n');
  res.json({ success: true });
});

// Catch-all: qualquer rota não reconhecida redireciona para login
app.get('*', (req, res) => {
  if (path.extname(req.path)) {
    return res.status(404).send('Arquivo não encontrado');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// ——— BOOT ————————————————————————————————————————————————————
async function startServer() {
  await createTables();
  await seedDatabase();
  
  // Realiza um backup automático preventivo na inicialização
  await createAutomaticBackup('boot');
  
  app.listen(PORT, () => {
    console.log(`\n🚀 Cia da Capivara Turismo — Servidor iniciado!`);
    console.log(`   Acesse: http://localhost:${PORT}\n`);
  });
}

startServer().catch(err => {
  console.error('Erro fatal ao iniciar servidor:', err);
  process.exit(1);
});
