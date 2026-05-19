// ============================================================
// CAIXA.JS — Fluxo de Caixa
// ============================================================

const Caixa = {
  editingId: null,
  chart: null,

  render() {
    this.renderSummary();
    this.renderList();
    this.renderChart();
  },

  getFilters() {
    return {
      type:     document.getElementById('caixa-type')?.value || '',
      category: document.getElementById('caixa-cat')?.value  || '',
      from:     document.getElementById('caixa-from')?.value || '',
      to:       document.getElementById('caixa-to')?.value   || '',
    };
  },

  renderSummary() {
    const all      = DB.get(DB.KEYS.CASHFLOW);
    const income   = all.filter(c=>c.type==='income').reduce((s,c)=>s+c.amount,0);
    const expense  = all.filter(c=>c.type==='expense').reduce((s,c)=>s+c.amount,0);
    const balance  = income - expense;

    // This month
    const ym = today().substring(0,7);
    const mInc = all.filter(c=>c.type==='income'  && c.date?.startsWith(ym)).reduce((s,c)=>s+c.amount,0);
    const mExp = all.filter(c=>c.type==='expense' && c.date?.startsWith(ym)).reduce((s,c)=>s+c.amount,0);

    const el = id => document.getElementById(id);
    el('cx-total-income').textContent  = formatCurrency(income);
    el('cx-total-expense').textContent = formatCurrency(expense);
    el('cx-balance').textContent       = formatCurrency(balance);
    el('cx-month-income').textContent  = formatCurrency(mInc);
    el('cx-month-expense').textContent = formatCurrency(mExp);
    el('cx-balance').style.color       = balance >= 0 ? 'var(--green)' : 'var(--red)';
  },

  renderList() {
    let list = DB.get(DB.KEYS.CASHFLOW);
    const f  = this.getFilters();
    if (f.type)     list = list.filter(c => c.type === f.type);
    if (f.category) list = list.filter(c => c.category === f.category);
    if (f.from)     list = list.filter(c => c.date >= f.from);
    if (f.to)       list = list.filter(c => c.date <= f.to);
    list = [...list].sort((a,b) => b.date.localeCompare(a.date));

    const tbody = document.getElementById('caixa-tbody');
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="icon">💰</div><p>Nenhum lançamento encontrado</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(c => `<tr>
      <td>${formatDate(c.date)}</td>
      <td>${c.description}</td>
      <td><span class="badge badge-secondary">${c.category}</span></td>
      <td><span class="badge ${c.type==='income'?'badge-success':'badge-danger'}">${c.type==='income'?'Entrada':'Saída'}</span></td>
      <td class="${c.type==='income'?'cf-income':'cf-expense'}" style="font-size:15px">
        ${c.type==='income'?'+':'-'} ${formatCurrency(c.amount)}
      </td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-secondary" onclick="Caixa.openForm('${c.id}')">✏️</button>
          <button class="btn btn-sm btn-danger"    onclick="Caixa.delete('${c.id}')">🗑</button>
        </div>
      </td>
    </tr>`).join('');
  },

  renderChart() {
    const canvas = document.getElementById('caixa-chart');
    if (!canvas) return;
    const all = DB.get(DB.KEYS.CASHFLOW);
    const categories = {};
    all.filter(c=>c.type==='expense').forEach(c => {
      categories[c.category] = (categories[c.category] || 0) + c.amount;
    });
    const labels = Object.keys(categories);
    const data   = Object.values(categories);
    const colors = ['#f59e0b','#3b82f6','#10b981','#8b5cf6','#ef4444','#06b6d4','#f97316'];

    if (this.chart) this.chart.destroy();
    this.chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#94a3b8', font: { family:'Inter', size:11 }, padding: 14 } },
        },
        cutout: '65%',
      },
    });
  },

  openForm(id = null) {
    this.editingId = id;
    const c = id ? DB.getOne(DB.KEYS.CASHFLOW, id) : null;
    document.getElementById('caixa-modal-title').textContent = id ? 'Editar Lançamento' : 'Novo Lançamento';
    const f = document.getElementById('caixa-form');
    f.querySelector('[name=type]').value        = c?.type        || 'income';
    f.querySelector('[name=amount]').value      = c?.amount      || '';
    f.querySelector('[name=category]').value    = c?.category    || '';
    f.querySelector('[name=description]').value = c?.description || '';
    f.querySelector('[name=date]').value        = c?.date        || today();
    openModal('caixa-modal');
  },

  save() {
    const f    = document.getElementById('caixa-form');
    const amt  = parseFloat(f.querySelector('[name=amount]').value);
    const desc = f.querySelector('[name=description]').value.trim();
    if (!amt || amt <= 0 || !desc) { showToast('Valor e descrição são obrigatórios', 'error'); return; }
    const item = {
      id:          this.editingId || generateId(),
      type:        f.querySelector('[name=type]').value,
      amount:      amt,
      category:    f.querySelector('[name=category]').value.trim() || 'Outros',
      description: desc,
      date:        f.querySelector('[name=date]').value || today(),
    };
    DB.save(DB.KEYS.CASHFLOW, item);
    closeModal('caixa-modal');
    this.renderSummary();
    this.renderList();
    this.renderChart();
    showToast(this.editingId ? '✅ Lançamento atualizado!' : '✅ Lançamento registrado!', 'success');
  },

  delete(id) {
    if (!confirm('Excluir este lançamento?')) return;
    DB.remove(DB.KEYS.CASHFLOW, id);
    this.renderSummary();
    this.renderList();
    this.renderChart();
    showToast('🗑 Lançamento removido', 'info');
  },
};


// ============================================================
// EXPORTAR.JS — Exportação para Excel via SheetJS
// ============================================================

const Exportar = {
  run(module) {
    const wb = XLSX.utils.book_new();

    const addSheet = (name, data) => {
      if (!data.length) return;
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, name);
    };

    if (module === 'all' || module === 'clients') {
      addSheet('Clientes', DB.get(DB.KEYS.CLIENTS).map(c => ({
        Nome: c.name, CPF: c.cpf, Telefone: c.phone, Email: c.email,
        Endereço: c.address, Nascimento: formatDate(c.birthdate), Cadastro: formatDate(c.createdAt), Obs: c.notes,
      })));
    }
    if (module === 'all' || module === 'bookings') {
      addSheet('Reservas', DB.get(DB.KEYS.BOOKINGS).map(b => {
        const c = DB.getOne(DB.KEYS.CLIENTS, b.clientId);
        const p = DB.getOne(DB.KEYS.PACKAGES, b.packageId);
        const g = DB.getOne(DB.KEYS.EMPLOYEES, b.guideId);
        const d = DB.getOne(DB.KEYS.EMPLOYEES, b.driverId);
        return {
          Cliente: c?.name, Pacote: p?.name, Destino: p?.destination,
          'Check-in': formatDate(b.checkIn), 'Check-out': formatDate(b.checkOut),
          Pessoas: b.people, Status: STATUS_LABELS[b.status]?.label,
          Guia: g?.name, Motorista: d?.name,
          'Valor Total': b.totalValue, Pago: b.paid, Pendente: b.totalValue - (b.paid||0),
          Obs: b.notes,
        };
      }));
    }
    if (module === 'all' || module === 'packages') {
      addSheet('Pacotes', DB.get(DB.KEYS.PACKAGES).map(p => ({
        Nome: p.name, Destino: p.destination, Duração: p.duration+'d',
        Preço: p.price, Capacidade: p.capacity, Status: STATUS_LABELS[p.status]?.label,
        Descrição: p.description,
      })));
    }
    if (module === 'all' || module === 'employees') {
      addSheet('Funcionários', DB.get(DB.KEYS.EMPLOYEES).map(e => ({
        Nome: e.name, Função: e.role, Telefone: e.phone, Email: e.email, Obs: e.notes,
      })));
    }
    if (module === 'all' || module === 'employees' || module === 'tasks') {
      addSheet('Tarefas', DB.get(DB.KEYS.TASKS).map(t => {
        const e = DB.getOne(DB.KEYS.EMPLOYEES, t.employeeId);
        return {
          Título: t.title, Funcionário: e?.name, Função: e?.role,
          Partida: t.departure, Destino: t.destination, Data: formatDate(t.date), Hora: t.time,
          Status: STATUS_LABELS[t.status]?.label, Descrição: t.description,
        };
      }));
    }
    if (module === 'all' || module === 'cashflow') {
      const cf = DB.get(DB.KEYS.CASHFLOW);
      addSheet('Caixa', cf.map(c => ({
        Data: formatDate(c.date), Tipo: c.type==='income'?'Entrada':'Saída',
        Categoria: c.category, Descrição: c.description, Valor: c.amount,
      })));
      const income  = cf.filter(c=>c.type==='income').reduce((s,c)=>s+c.amount,0);
      const expense = cf.filter(c=>c.type==='expense').reduce((s,c)=>s+c.amount,0);
      addSheet('Resumo Caixa', [
        { Item: 'Total de Entradas', Valor: income },
        { Item: 'Total de Saídas',  Valor: expense },
        { Item: 'Saldo Final',      Valor: income - expense },
      ]);
    }

    const filename = `CiaCapivara_${module}_${today()}.xlsx`;
    XLSX.writeFile(wb, filename);
    showToast(`📥 Planilha exportada: ${filename}`, 'success');
  },
};
