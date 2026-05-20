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
    fornecedores: { title: 'Fornecedores',       render: () => Fornecedores.render() },
    carros:       { title: 'Carros',             render: () => Carros.render() },
    caixa:        { title: 'Fluxo de Caixa',     render: () => Caixa.render() },
    documentos:   { title: 'Documentos',         render: () => Documentos.render() },
    exportar:     { title: 'Central de Segurança', render: () => BackupPanel.render() },
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
      const response = await fetch(`pages/${page}.html?v=2.0.0`);
      if (response.ok) {
        container.innerHTML = await response.text();
        this.pages[page].render();
        lucide.createIcons();
      } else {
        container.innerHTML = `<div class="empty-state">Erro ao carregar a página ${page}</div>`;
      }
    } catch (err) {
      console.error('Erro de roteamento:', err);
      container.innerHTML = `<div class="empty-state">Erro ao carregar a página ${page}.</div>`;
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

// ——— INDICADOR DE LOADING ————————————————————————————————————
function showLoadingOverlay(msg = 'Carregando dados...') {
  const existing = document.getElementById('app-loading-overlay');
  if (existing) return;

  const overlay = document.createElement('div');
  overlay.id = 'app-loading-overlay';
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:9999;
    background:var(--bg-base);
    display:flex; flex-direction:column;
    align-items:center; justify-content:center; gap:20px;
  `;
  overlay.innerHTML = `
    <img src="logo.png" alt="Cia da Capivara" style="max-width:200px; max-height:100px; object-fit:contain; filter:drop-shadow(0 4px 16px rgba(0,0,0,0.5));">
    <div style="display:flex; flex-direction:column; align-items:center; gap:12px;">
      <div style="width:48px; height:48px; border:4px solid rgba(255,215,0,0.2); border-top-color:var(--accent); border-radius:50%; animation:spin 0.8s linear infinite;"></div>
      <span style="color:var(--text-secondary); font-size:14px; font-weight:500;">${msg}</span>
    </div>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
  `;
  document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
  const el = document.getElementById('app-loading-overlay');
  if (el) {
    el.style.transition = 'opacity 0.3s ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }
}

// ——— MAIN INIT ———————————————————————————————————————————————
function startApp() {
  updateUserUI();
  EmailNotifier.init();
  Notifications.render();

  // MutationObserver global para renderizar automaticamente ícones Lucide inseridos dinamicamente
  let lucideDebounceTimeout = null;
  const lucideObserver = new MutationObserver((mutations) => {
    let shouldRender = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.hasAttribute('data-lucide') || node.querySelector('[data-lucide]')) {
              shouldRender = true;
              break;
            }
          }
        }
      }
      if (shouldRender) break;
    }

    if (shouldRender && window.lucide && typeof window.lucide.createIcons === 'function') {
      if (lucideDebounceTimeout) clearTimeout(lucideDebounceTimeout);
      lucideDebounceTimeout = setTimeout(() => {
        window.lucide.createIcons();
      }, 50);
    }
  });
  lucideObserver.observe(document.body, { childList: true, subtree: true });

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

// ——— BOOT ASSÍNCRONO ————————————————————————————————————————
document.addEventListener('DOMContentLoaded', async () => {
  showLoadingOverlay('Conectando ao banco de dados...');

  // Carrega dados do servidor SQLite
  await DB.initServerDB();

  hideLoadingOverlay();

  // Se tem sessão, inicializa a aplicação
  if (Auth.init()) {
    if (document.getElementById('app')) {
      startApp();
    }
  } else {
    // Se não tem sessão, redireciona para login
    if (!document.getElementById('login-form')) {
      window.location.href = 'login.html';
    }
  }
});
