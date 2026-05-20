// ============================================================
// STORAGE.JS — Camada de dados com Backend SQLite
// Cia da Capivara Turismo e Aventura
// ============================================================

// Safeguard global para evitar travamento em modo offline se o CDN do Lucide não carregar
if (typeof window.lucide === 'undefined') {
  window.lucide = {
    createIcons: () => console.log('ℹ️ Lucide CDN offline. Ícones sofisticados omitidos no modo local offline.')
  };
}

const DB = {
  // Memória local (cache em memória — rápido e síncrono para a UI)
  _cache: {},

  KEYS: {
    USERS:            'cct_users',
    CLIENTS:          'cct_clients',
    PACKAGES:         'cct_packages',
    BOOKINGS:         'cct_bookings',
    PROVIDERS:        'cct_providers',
    CARS:             'cct_cars',
    TASKS:            'cct_tasks',
    CASHFLOW:         'cct_cashflow',
    DOCUMENTS:        'cct_documents',
    NOTIFICATIONS:    'cct_notifications',
    DAYBYDAY:         'cct_daybyday',
    COMPANY_SETTINGS: 'cct_company_settings',
    SEEDED:           'cct_seeded',
  },

  // ——— LEITURA SÍNCRONA (acesso à memória local) ——————————————
  get(key) {
    const val = this._cache[key];
    if (Array.isArray(val)) return val;
    if (val && typeof val === 'object') return val;
    return [];
  },

  getOne(key, id) {
    const list = this.get(key);
    if (!Array.isArray(list)) return null;
    return list.find(i => i.id === id) || null;
  },

  // ——— ESCRITA (atualiza cache + persiste no servidor) ————————
  set(key, value) {
    this._cache[key] = value;
    this._syncSet(key, value);
  },

  save(key, item) {
    const list = Array.isArray(this._cache[key]) ? this._cache[key] : [];
    const idx  = list.findIndex(i => i.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    this._cache[key] = list;
    this._syncSave(key, item);
    return item;
  },

  remove(key, id) {
    const list = Array.isArray(this._cache[key]) ? this._cache[key] : [];
    this._cache[key] = list.filter(i => i.id !== id);
    this._syncDelete(key, id);
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  // ——— SINCRONIZAÇÃO COM BACKEND (background, sem bloquear UI) ——
  async _syncSave(key, item) {
    try {
      await fetch('/api/db/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, item }),
      });
    } catch (e) { console.warn('Erro ao salvar no servidor:', e); }
  },

  async _syncDelete(key, id) {
    try {
      await fetch('/api/db/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, id }),
      });
    } catch (e) { console.warn('Erro ao deletar no servidor:', e); }
  },

  async _syncSet(key, value) {
    try {
      await fetch('/api/db/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
    } catch (e) { console.warn('Erro ao sincronizar no servidor:', e); }
  },

  // ——— BOOT: carrega todos os dados do servidor no startup ————
  async initServerDB() {
    try {
      const res  = await fetch('/api/db/init');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      // Popula o cache local com os dados do SQLite
      for (const [key, value] of Object.entries(json.data)) {
        this._cache[key] = value;
      }
      console.log('✅ Dados carregados do servidor SQLite com sucesso!');
      return true;
    } catch (err) {
      console.error('❌ Falha ao carregar dados do servidor:', err);
      // Fallback: tenta carregar do localStorage (compatibilidade)
      this._loadFromLocalStorage();
      return false;
    }
  },

  // ——— FALLBACK: localStorage para compatibilidade offline ————
  _loadFromLocalStorage() {
    for (const key of Object.values(this.KEYS)) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) this._cache[key] = JSON.parse(raw);
      } catch (e) { /* ignora */ }
    }
    console.warn('⚠️ Modo offline: dados carregados do localStorage.');
  },

  // ——— SEED (mantido apenas como referência, backend faz o seed real) —
  seed() {
    // No modo full-stack, o seed é feito pelo server.js no primeiro boot.
    // Este método existe apenas para não quebrar chamadas legacy.
    console.log('ℹ️ Seed gerenciado pelo servidor.');
  },
};

// ——— HELPERS —————————————————————————————————————————————————
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const cleanDate = dateStr.includes(' ') ? dateStr.split(' ')[0] : dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
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
  arriving:   { label: 'Chegando Hoje', cls: 'badge-warning'  },
  arrived:    { label: 'Em Andamento',  cls: 'badge-info'     },
  confirmed:  { label: 'Confirmado',    cls: 'badge-success'  },
  finished:   { label: 'Finalizado',    cls: 'badge-secondary'},
  cancelled:  { label: 'Cancelado',     cls: 'badge-danger'   },
  pending:    { label: 'Pendente',      cls: 'badge-warning'  },
  in_progress:{ label: 'Em Andamento',  cls: 'badge-info'     },
  done:       { label: 'Concluído',     cls: 'badge-success'  },
  active:     { label: 'Ativo',         cls: 'badge-success'  },
  inactive:   { label: 'Inativo',       cls: 'badge-secondary'},
  sold_out:   { label: 'Esgotado',      cls: 'badge-danger'   },
};
