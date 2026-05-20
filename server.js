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
  const existing = await dbGet('SELECT COUNT(*) as cnt FROM users');
  if (existing && existing.cnt > 0) {
    console.log('ℹ️  Banco já populado — seed ignorado.');
    return;
  }

  console.log('🌱 Populando banco de dados com dados iniciais (v6)...');
  const tod = todayStr();

  // Users
  const users = [
    ['u1', 'admin',       'admin123', 'admin@ciacapivara.com',  'admin',   'Administrador'],
    ['u2', 'felipe.admin','felipe321', 'felipe@gmail.com',      'admin',   'Felipe Louzeiro'],
  ];
  for (const u of users)
    await dbRun('INSERT OR IGNORE INTO users (id,username,password,email,role,name) VALUES (?,?,?,?,?,?)', u);

  // Cars
  const cars = [
    ['car_1','Chevrolet Spin 1.8 (7 Lugares)','CAP-4E26','local','em_uso',   'Veículo próprio da agência, ideal para passeios urbanos e traslados com grupos de até 6 passageiros.',tod],
    ['car_2','Toyota Hilux SRX 4x4',          'CIA-9B99','local','em_uso',   'Caminhonete própria equipada para trilhas off-road, passeios em fazendas pantaneiras.',tod],
    ['car_3','Renault Master Minivan (15 Lug.)','TUR-1F20','rented','disponivel','Veículo terceirizado alugado sob demanda de alta temporada para grupos maiores.',tod],
  ];
  for (const c of cars)
    await dbRun('INSERT OR IGNORE INTO cars (id,model,plate,type,status,description,createdAt) VALUES (?,?,?,?,?,?,?)', c);

  // Providers
  const providers = [
    ['prov_1','Carlos Alberto Guia',     'guia',     '(67) 98888-1111','carlos.guia@ciacapivara.com',    'Guia credenciado CADASTUR. Especialista em ecoturismo e flutuação. Bilíngue.',       '','',          tod],
    ['prov_2','Mariana Souza Condutora', 'guia',     '(67) 99999-2222','mariana.cond@ciacapivara.com',   'Condutora de aventura local com especialidade em trilhas arqueológicas.',              '','',          tod],
    ['prov_3','João da Silva (Motorista)','motorista','(67) 97777-3333','joao.silva@ciacapivara.com',     'Motorista Categoria D. Experiente em estradas de terra.',                             'car_1','',    tod],
    ['prov_4','Pedro Antunes (Hilux)',    'motorista','(67) 96666-4444','pedro.antunes@ciacapivara.com',  'Motorista habilitado para trilhas e veículos 4x4.',                                   'car_2','',    tod],
    ['prov_5','Hotel Paraíso das Águas', 'hotel',    '(67) 3255-1234', 'reservas@paraisodasaguashotel.com','Hotel de categoria superior com piscina de água natural.','','Av. Coronel Pilad Rebuá, 1800 - Bonito/MS',tod],
    ['prov_6','Recanto das Capivaras',   'hotel',    '(67) 3255-5678', 'contato@recantocapivara.com',    'Pousada ecológica com chalés privativos.','','Rodovia MS-178, Km 4 - Bonito/MS',   tod],
  ];
  for (const p of providers)
    await dbRun('INSERT OR IGNORE INTO providers (id,name,role,phone,email,notes,carId,hotelLocation,createdAt) VALUES (?,?,?,?,?,?,?,?,?)', p);

  // Clients
  const clients = [
    ['cli_1','Família Oliveira (Grupo RJ)',    '(21) 97777-8888','ricardo.oliveira@email.com','Rio de Janeiro - RJ',4,'3 Adultos e 1 Criança (10 anos)','Grupo familiar de férias. Foco em flutuação e trilhas fáceis.',tod],
    ['cli_2','Dr. Marcos & Sandra (Bodas)',    '(11) 99111-2222','marcos.adv@email.com',      'São Paulo - SP',    2,'Casal de Melhor Idade',             'Casal em bodas de prata. Preferem passeios calmos e históricos.',tod],
  ];
  for (const c of clients)
    await dbRun('INSERT OR IGNORE INTO clients (id,name,phone,email,location,peopleCount,ageGroup,description,createdAt) VALUES (?,?,?,?,?,?,?,?,?)', c);

  // DayByDay
  const dbd = [
    ['dbd_1','cli_1',tod,              'in_progress','prov_1','prov_3','car_1','Recepção no Aeroporto às 10h40. Traslado até Recanto das Capivaras para check-in.', 'Protetor solar e calçados confortáveis.',tod],
    ['dbd_2','cli_1',daysFromNow(1),   'pending',    'prov_1','prov_3','car_1','Saída às 08h00 para Flutuação no Rio Sucuri. Almoço regional incluso.','Proibido protetor solar no rio.',tod],
    ['dbd_3','cli_1',daysFromNow(2),   'pending',    'prov_2','prov_4','car_2','Safári Pantaneiro na Fazenda San Francisco. Chalana e pesca recreativa.','Repelente potente e agasalho.',tod],
    ['dbd_4','cli_2',tod,              'done',       'prov_1','prov_3','car_1','Chegada e traslado ao Hotel Paraíso das Águas. Tarde reservada para descanso.','Check-in antecipado autorizado.',tod],
    ['dbd_5','cli_2',daysFromNow(1),   'pending',    'prov_1','prov_3','car_1','Visita à Gruta do Lago Azul às 09h00. Descida com 300 degraus.','Calçado antiderrapante obrigatório.',tod],
  ];
  for (const d of dbd)
    await dbRun('INSERT OR IGNORE INTO daybyday (id,clientId,date,status,guideId,driverId,carId,description,notes,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)', d);

  // Packages
  const pkgs = [
    ['pack_1','Aventura Ecológica Bonito Cristalino','Bonito - MS',5,2450.00,12,'active','Roteiro completo focado em flutuações fluviais, grutas e trilhas ecológicas.',tod],
    ['pack_2','Expedição Safári Pantanal Selvagem',  'Pantanal - MS',4,3800.00,8,'active','Safári fotográfico, travessias 4x4 e observação da fauna do Pantanal Sul.',tod],
  ];
  for (const p of pkgs)
    await dbRun('INSERT OR IGNORE INTO packages (id,name,destination,duration,price,capacity,status,description,createdAt) VALUES (?,?,?,?,?,?,?,?,?)', p);

  // Bookings
  const bookings = [
    ['book_1','cli_1','pack_1',tod,daysFromNow(4),4,'confirmed','prov_1','prov_3',9800.00,9800.00,'Reserva totalmente quitada. Voucher emitido.',tod],
    ['book_2','cli_2','pack_2',tod,daysFromNow(3),2,'confirmed','prov_1','prov_3',7600.00,3800.00,'Sinal 50% pago. Restante no check-out.',tod],
  ];
  for (const b of bookings)
    await dbRun('INSERT OR IGNORE INTO bookings (id,clientId,packageId,checkIn,checkOut,people,status,guideId,driverId,totalValue,paid,notes,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', b);

  // Cashflow
  const cf = [
    ['cash_1',tod,'income', 'Reserva', 9800.00,'Pagamento integral reserva Família Oliveira',tod],
    ['cash_2',tod,'income', 'Reserva', 3800.00,'Sinal 50% reserva Dr. Marcos Bodas',tod],
    ['cash_3',tod,'expense','Combustível',250.00,'Abastecimento Hilux (CIA-9B99) - Pantanal',tod],
    ['cash_4',tod,'expense','Comissão', 400.00,'Comissão guia Carlos Alberto - Sucuri',tod],
  ];
  for (const c of cf)
    await dbRun('INSERT OR IGNORE INTO cashflow (id,date,type,category,amount,description,createdAt) VALUES (?,?,?,?,?,?,?)', c);

  // Tasks
  const tasks = [
    ['task_1','Recepção Transfer Aeroporto','prov_3','Aeroporto BYO',    'Pousada Recanto',tod,       '10:40','done',   'Buscar Família Oliveira na Spin.',tod],
    ['task_2','Caminhada Ecológica',        'prov_1','Pousada Recanto',  'Trilhas Internas',tod,       '14:30','done',   'Guiamento leve na pousada.',tod],
    ['task_3','Flutuação Rio Sucuri',       'prov_1','Pousada Recanto',  'Rio Sucuri',      daysFromNow(1),'08:00','pending','Guiamento e flutuação.',tod],
    ['task_4','Safári Pantanal',            'prov_4','Pousada Recanto',  'Fazenda San Francisco',daysFromNow(2),'07:30','pending','Direção Hilux 4x4.',tod],
  ];
  for (const t of tasks)
    await dbRun('INSERT OR IGNORE INTO tasks (id,title,employeeId,departure,destination,date,time,status,description,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)', t);

  // Company Settings
  const settings = {
    logoName:  'Cia da Capivara Turismo',
    logoEmoji: '🦔',
    cadastur:  '12.345.678/0001-90',
    instagram: '@ciadacapivara',
    website:   'www.ciadacapivara.com',
  };
  for (const [k, v] of Object.entries(settings))
    await dbRun('INSERT OR IGNORE INTO company_settings (key,value) VALUES (?,?)', [k, v]);

  console.log('✅ Banco de dados populado com sucesso (v6)!');
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
