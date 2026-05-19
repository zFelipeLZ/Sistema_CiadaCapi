// ============================================================
// STORAGE.JS — Camada de dados (localStorage) + Dados fictícios
// Cia da Capivara Turismo
// ============================================================

const DB = {
  KEYS: {
    USERS: 'cct_users',
    CLIENTS: 'cct_clients',
    PACKAGES: 'cct_packages',
    BOOKINGS: 'cct_bookings',
    EMPLOYEES: 'cct_employees',
    TASKS: 'cct_tasks',
    CASHFLOW: 'cct_cashflow',
    DOCUMENTS: 'cct_documents',
    NOTIFICATIONS: 'cct_notifications',
    SEEDED: 'cct_seeded',
  },

  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch { return []; }
  },

  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  getOne(key, id) {
    return this.get(key).find(i => i.id === id) || null;
  },

  save(key, item) {
    const list = this.get(key);
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    this.set(key, list);
    return item;
  },

  remove(key, id) {
    const list = this.get(key).filter(i => i.id !== id);
    this.set(key, list);
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  // ——— SEED DATA ————————————————————————————————————————————
  seed() {
    if (localStorage.getItem(this.KEYS.SEEDED) === 'v2') return;

    // --- USERS (Apenas o admin necessário para login) ---
    const users = [
      {
        id: 'u1', username: 'admin', password: 'admin123', email: 'admin@ciacapivara.com', role: 'admin', name: 'Administrador'
      },
      {
        id: 'u2', username: 'felipe', password: 'felipe8212', email: 'felipexlouzeiro@gmail.com', role: 'admin', name: 'Felipe Louzeiro'
      }
    ];
    this.set(this.KEYS.USERS, users);

    // --- DADOS VAZIOS ---
    this.set(this.KEYS.CLIENTS, []);
    this.set(this.KEYS.PACKAGES, []);
    this.set(this.KEYS.EMPLOYEES, []);
    this.set(this.KEYS.BOOKINGS, []);
    this.set(this.KEYS.TASKS, []);
    this.set(this.KEYS.CASHFLOW, []);
    this.set(this.KEYS.NOTIFICATIONS, []);

    localStorage.setItem(this.KEYS.SEEDED, 'v2');
    console.log('✅ Banco de dados limpo e reiniciado (apenas Admin retido)!');
  },
};

// ——— HELPERS —————————————————————————————————————————————————
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}
function formatDateFull(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}
function today() { return new Date().toISOString().split('T')[0]; }
function generateId() { return DB.generateId(); }

const STATUS_LABELS = {
  arriving: { label: 'Chegando Hoje', cls: 'badge-warning' },
  arrived: { label: 'Em Andamento', cls: 'badge-info' },
  confirmed: { label: 'Confirmado', cls: 'badge-success' },
  finished: { label: 'Finalizado', cls: 'badge-secondary' },
  cancelled: { label: 'Cancelado', cls: 'badge-danger' },
  pending: { label: 'Pendente', cls: 'badge-warning' },
  in_progress: { label: 'Em Andamento', cls: 'badge-info' },
  done: { label: 'Concluído', cls: 'badge-success' },
  active: { label: 'Ativo', cls: 'badge-success' },
  inactive: { label: 'Inativo', cls: 'badge-secondary' },
  sold_out: { label: 'Esgotado', cls: 'badge-danger' },
};
