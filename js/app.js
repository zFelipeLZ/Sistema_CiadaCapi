// ============================================================
// APP.JS — Roteamento, inicialização, helpers globais
// ============================================================

// ——— GLOBAL HELPERS ——————————————————————————————————————————
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// ——— ROUTER ——————————————————————————————————————————————————
const Router = {
  current: 'dashboard',

  pages: {
    dashboard:    { title: 'Dashboard',         render: () => Dashboard.render() },
    clientes:     { title: 'Clientes',           render: () => Clientes.render() },
    fluxo:        { title: 'Chegada & Saída',    render: () => Fluxo.render() },
    pacotes:      { title: 'Pacotes',            render: () => Pacotes.render() },
    funcionarios: { title: 'Funcionários',       render: () => Funcionarios.render() },
    caixa:        { title: 'Fluxo de Caixa',     render: () => Caixa.render() },
    documentos:   { title: 'Documentos',         render: () => Documentos.render() },
    exportar:     { title: 'Exportar',           render: () => {} },
  },

  async navigate(page) {
    if (!this.pages[page]) return;
    this.current = page;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.page === page);
    });

    // Update topbar title
    document.getElementById('topbar-title').textContent = this.pages[page].title;

    // Fetch and render HTML template
    const container = document.getElementById('page-content');
    try {
      const response = await fetch(`pages/${page}.html`);
      if (response.ok) {
        container.innerHTML = await response.text();
        this.pages[page].render();
      } else {
        container.innerHTML = `<div class="empty-state">Erro ao carregar a página ${page}</div>`;
      }
    } catch (err) {
      console.error('Erro de roteamento:', err);
      container.innerHTML = `<div class="empty-state">Erro ao carregar a página ${page}. (Execute via Live Server ou HTTP)</div>`;
    }
  },
};

// ——— NOTIFICATIONS ———————————————————————————————————————————
const Notifications = {
  toggle() {
    document.getElementById('notif-panel').classList.toggle('open');
  },

  render() {
    const list  = DB.get(DB.KEYS.NOTIFICATIONS);
    const unread = list.filter(n => !n.read).length;
    const dot   = document.getElementById('notif-dot');
    const panel = document.getElementById('notif-panel');
    dot.style.display = unread > 0 ? 'block' : 'none';

    const today = new Date().toISOString().split('T')[0];
    // Auto-generate booking-based notifications
    const bookings = DB.get(DB.KEYS.BOOKINGS);
    bookings.forEach(b => {
      if (b.checkIn === today && b.status === 'confirmed') {
        const c = DB.getOne(DB.KEYS.CLIENTS, b.clientId);
        const existing = list.find(n => n.bookingId === b.id && n.type === 'arriving');
        if (!existing) {
          const n = { id: generateId(), type: 'arriving', message: `${c?.name} chega HOJE — ${DB.getOne(DB.KEYS.PACKAGES, b.packageId)?.name}`, date: today, read: false, bookingId: b.id };
          DB.save(DB.KEYS.NOTIFICATIONS, n);
          list.push(n);
        }
      }
    });

    panel.innerHTML = `
      <div style="padding:12px 16px;font-size:13px;font-weight:700;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        Notificações <button class="btn btn-sm btn-secondary" onclick="Notifications.markAllRead()" style="font-size:11px">Marcar lidas</button>
      </div>` +
      (list.length ? [...list].reverse().map(n => `
        <div class="notif-item ${n.read?'':'unread'}" onclick="Notifications.markRead('${n.id}')">
          <div>${n.message}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${formatDate(n.date)}</div>
        </div>`).join('') :
        `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">Nenhuma notificação</div>`);
  },

  markRead(id) {
    const list = DB.get(DB.KEYS.NOTIFICATIONS);
    const n    = list.find(n => n.id === id);
    if (n) { n.read = true; DB.set(DB.KEYS.NOTIFICATIONS, list); }
    this.render();
  },

  markAllRead() {
    const list = DB.get(DB.KEYS.NOTIFICATIONS).map(n => ({ ...n, read: true }));
    DB.set(DB.KEYS.NOTIFICATIONS, list);
    this.render();
  },
};

// ——— USER UI —————————————————————————————————————————————————
function updateUserUI() {
  const u = Auth.currentUser;
  if (!u) return;
  const init = u.name?.charAt(0) || 'U';
  document.getElementById('user-avatar').textContent = init;
  document.getElementById('user-name').textContent   = u.name;
  document.getElementById('user-role').textContent   = u.role === 'admin' ? 'Administrador' : u.role === 'manager' ? 'Gerente' : 'Recepcionista';
}

// ——— LOGIN ————————————————————————————————————————————————————
function initLogin() {
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const err      = document.getElementById('login-error');
    if (Auth.login(username, password)) {
      document.getElementById('login-page').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      startApp();
    } else {
      err.style.display = 'block';
      err.textContent   = '❌ Usuário ou senha incorretos';
      document.getElementById('login-password').value = '';
    }
  });
}

// ——— MAIN INIT ———————————————————————————————————————————————
function startApp() {
  updateUserUI();
  EmailNotifier.init();
  Notifications.render();

  // Nav clicks
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => Router.navigate(item.dataset.page));
  });

  // Click outside notification panel
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('notif-panel');
    const btn   = document.getElementById('notif-btn');
    if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      panel.classList.remove('open');
    }
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // Navigate to dashboard
  Router.navigate('dashboard');
}

// ——— BOOT ————————————————————————————————————————————————————
document.addEventListener('DOMContentLoaded', () => {
  DB.seed();

  // Se tem sessão, inicializa a aplicação
  if (Auth.init()) {
    if (document.getElementById('app')) {
      startApp();
    }
  } else {
    // Se não tem sessão, redireciona para login (caso não esteja nele)
    if (!document.getElementById('login-form')) {
      window.location.href = 'login.html';
    }
  }
});
