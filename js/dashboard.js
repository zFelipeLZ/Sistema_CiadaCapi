// ============================================================
// DASHBOARD.JS — Módulo Dashboard
// ============================================================

const Dashboard = {
  charts: {},

  render() {
    const bookings   = DB.get(DB.KEYS.BOOKINGS);
    const clients    = DB.get(DB.KEYS.CLIENTS);
    const cashflow   = DB.get(DB.KEYS.CASHFLOW);
    const providers  = DB.get(DB.KEYS.PROVIDERS);
    const tasks      = DB.get(DB.KEYS.TASKS);
    const packages   = DB.get(DB.KEYS.PACKAGES);
    const tod        = today();

    // — KPIs —
    const todayArrivals  = bookings.filter(b => b.checkIn  === tod).length;
    const todayDepartures= bookings.filter(b => b.checkOut === tod).length;
    const activeTrips    = bookings.filter(b => b.status === 'arrived' || b.status === 'arriving').length;
    const totalIncome    = cashflow.filter(c => c.type === 'income').reduce((s,c) => s + c.amount, 0);
    const totalExpense   = cashflow.filter(c => c.type === 'expense').reduce((s,c) => s + c.amount, 0);
    const pendingTasks   = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;

    const el = id => document.getElementById(id);

    el('dash-clients').textContent      = clients.length;
    el('dash-arrivals').textContent     = todayArrivals;
    el('dash-departures').textContent   = todayDepartures;
    el('dash-active').textContent       = activeTrips;
    el('dash-income').textContent       = formatCurrency(totalIncome);
    el('dash-balance').textContent      = formatCurrency(totalIncome - totalExpense);
    el('dash-providers').textContent    = providers.length;
    el('dash-tasks').textContent        = pendingTasks;

    this.renderTodayActivity(bookings, tasks);
    this.renderRecentBookings(bookings);
    this.renderCashChart(cashflow);
  },

  renderTodayActivity(bookings, tasks) {
    const tod = today();
    const list = document.getElementById('dash-today-list');
    const todayB = bookings.filter(b => b.checkIn === tod || b.checkOut === tod);
    const todayT = tasks.filter(t => t.date === tod);
    let html = '';

    todayB.forEach(b => {
      const client = DB.getOne(DB.KEYS.CLIENTS, b.clientId);
      const pkg    = DB.getOne(DB.KEYS.PACKAGES, b.packageId);
      const type   = b.checkIn === tod ? 'Chegada' : 'Saída';
      const color  = b.checkIn === tod ? 'amber' : 'blue';
      html += `
        <div class="timeline-item">
          <div class="timeline-dot ${color}"></div>
          <div>
            <div style="font-weight:600;font-size:13px">${type}: ${client?.name || '—'}</div>
            <div style="font-size:12px;color:var(--text-secondary)">${pkg?.name || '—'}</div>
          </div>
          <span class="badge ${b.checkIn === tod ? 'badge-warning':'badge-info'}" style="margin-left:auto">${type}</span>
        </div>`;
    });

    todayT.forEach(t => {
      const emp = DB.getOne(DB.KEYS.PROVIDERS, t.employeeId);
      const color = t.status === 'in_progress' ? 'green' : 'muted';
      html += `
        <div class="timeline-item">
          <div class="timeline-dot ${color}"></div>
          <div>
            <div style="font-weight:600;font-size:13px">${t.title}</div>
            <div style="font-size:12px;color:var(--text-secondary)">${emp?.name || '—'} — ${t.time}</div>
          </div>
          <span class="badge badge-secondary" style="margin-left:auto">${(t.destination || '').split('—')[0]}</span>
        </div>`;
    });

    list.innerHTML = html || '<div class="empty-state"><div class="icon"><i data-lucide="sun" style="width:48px;height:48px;color:var(--text-muted)"></i></div><p>Nenhuma atividade hoje</p></div>';
  },

  renderRecentBookings(bookings) {
    const tbody = document.getElementById('dash-recent-tbody');
    const recent = [...bookings].reverse().slice(0, 6);
    tbody.innerHTML = recent.map(b => {
      const client = DB.getOne(DB.KEYS.CLIENTS, b.clientId);
      const pkg    = DB.getOne(DB.KEYS.PACKAGES, b.packageId);
      const s      = STATUS_LABELS[b.status] || STATUS_LABELS.confirmed;
      return `<tr>
        <td><strong>${client?.name || '—'}</strong></td>
        <td>${pkg?.name || '—'}</td>
        <td>${formatDate(b.checkIn)}</td>
        <td>${formatDate(b.checkOut)}</td>
        <td><span class="badge ${s.cls}">${s.label}</span></td>
        <td class="cf-income">${formatCurrency(b.totalValue)}</td>
      </tr>`;
    }).join('');
  },

  renderCashChart(cashflow) {
    const canvas = document.getElementById('dash-cash-chart');
    if (!canvas) return;

    if (typeof Chart === 'undefined') {
      const container = canvas.parentElement;
      container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; min-height:200px; color:var(--text-secondary); gap:8px;">
          <i data-lucide="bar-chart-2" style="width:32px; height:32px; color:var(--text-muted);"></i>
          <span style="font-size:12px; font-weight:500;">Gráfico indisponível no modo local (sem internet).</span>
        </div>`;
      lucide.createIcons();
      return;
    }

    // Aggregate last 6 months
    const months = [];
    const incomes  = [];
    const expenses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short' });
      months.push(label);
      incomes.push(cashflow.filter(c => c.type==='income'  && c.date?.startsWith(key)).reduce((s,c)=>s+c.amount,0));
      expenses.push(cashflow.filter(c => c.type==='expense' && c.date?.startsWith(key)).reduce((s,c)=>s+c.amount,0));
    }

    if (this.charts.cash) this.charts.cash.destroy();
    this.charts.cash = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          { label: 'Receitas', data: incomes,  backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6, borderSkipped: false },
          { label: 'Despesas', data: expenses, backgroundColor: 'rgba(239,68,68,0.5)',  borderRadius: 6, borderSkipped: false },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', callback: v => 'R$' + (v/1000).toFixed(0) + 'k' } },
        },
      },
    });
  },
};
