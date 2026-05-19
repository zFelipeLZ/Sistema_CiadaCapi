// ============================================================
// CLIENTES.JS — Cadastro e gestão de clientes
// ============================================================

const Clientes = {
  editingId: null,

  render() {
    this.renderList();
  },

  renderList(filter = '') {
    let list = DB.get(DB.KEYS.CLIENTS);
    if (filter) {
      const f = filter.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(f) ||
        c.cpf?.includes(f) ||
        c.email?.toLowerCase().includes(f) ||
        c.phone?.includes(f)
      );
    }
    const tbody = document.getElementById('clients-tbody');
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="icon">👥</div><p>Nenhum cliente encontrado</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(c => {
      const bookings = DB.get(DB.KEYS.BOOKINGS).filter(b => b.clientId === c.id);
      return `<tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.cpf || '—'}</td>
        <td>${c.phone || '—'}</td>
        <td>${c.email || '—'}</td>
        <td><span class="badge badge-info">${bookings.length} viagem(ns)</span></td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-secondary" onclick="Clientes.view('${c.id}')">👁 Ver</button>
            <button class="btn btn-sm btn-secondary" onclick="Clientes.openForm('${c.id}')">✏️</button>
            <button class="btn btn-sm btn-danger"    onclick="Clientes.delete('${c.id}')">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  },

  openForm(id = null) {
    this.editingId = id;
    const c = id ? DB.getOne(DB.KEYS.CLIENTS, id) : null;
    document.getElementById('client-modal-title').textContent = id ? 'Editar Cliente' : 'Novo Cliente';
    const f = document.getElementById('client-form');
    f.querySelector('[name=name]').value      = c?.name || '';
    f.querySelector('[name=cpf]').value       = c?.cpf || '';
    f.querySelector('[name=phone]').value     = c?.phone || '';
    f.querySelector('[name=email]').value     = c?.email || '';
    f.querySelector('[name=address]').value   = c?.address || '';
    f.querySelector('[name=birthdate]').value = c?.birthdate || '';
    f.querySelector('[name=notes]').value     = c?.notes || '';
    openModal('client-modal');
  },

  save() {
    const f   = document.getElementById('client-form');
    const name = f.querySelector('[name=name]').value.trim();
    if (!name) { showToast('Nome é obrigatório', 'error'); return; }
    const client = {
      id:        this.editingId || generateId(),
      name,
      cpf:       f.querySelector('[name=cpf]').value.trim(),
      phone:     f.querySelector('[name=phone]').value.trim(),
      email:     f.querySelector('[name=email]').value.trim(),
      address:   f.querySelector('[name=address]').value.trim(),
      birthdate: f.querySelector('[name=birthdate]').value,
      notes:     f.querySelector('[name=notes]').value.trim(),
      createdAt: this.editingId ? DB.getOne(DB.KEYS.CLIENTS, this.editingId)?.createdAt : today(),
    };
    DB.save(DB.KEYS.CLIENTS, client);
    closeModal('client-modal');
    this.renderList();
    showToast(this.editingId ? '✅ Cliente atualizado!' : '✅ Cliente cadastrado!', 'success');
  },

  delete(id) {
    if (!confirm('Excluir este cliente?')) return;
    DB.remove(DB.KEYS.CLIENTS, id);
    this.renderList();
    showToast('🗑 Cliente removido', 'info');
  },

  view(id) {
    const c = DB.getOne(DB.KEYS.CLIENTS, id);
    if (!c) return;
    const bookings = DB.get(DB.KEYS.BOOKINGS).filter(b => b.clientId === id);
    const total    = bookings.reduce((s, b) => s + (b.totalValue || 0), 0);

    let bHtml = bookings.length ? bookings.map(b => {
      const pkg = DB.getOne(DB.KEYS.PACKAGES, b.packageId);
      const s   = STATUS_LABELS[b.status] || {};
      return `<div class="timeline-item">
        <div class="timeline-dot ${b.status==='finished'?'muted':'amber'}"></div>
        <div>
          <div style="font-weight:600">${pkg?.name || '—'}</div>
          <div style="font-size:12px;color:var(--text-secondary)">${formatDate(b.checkIn)} → ${formatDate(b.checkOut)} · ${b.people} pessoa(s)</div>
        </div>
        <span class="badge ${s.cls}" style="margin-left:auto">${s.label}</span>
      </div>`;
    }).join('') : '<p style="color:var(--text-muted)">Sem viagens registradas.</p>';

    document.getElementById('client-view-body').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        ${[['👤 Nome', c.name],['🪪 CPF', c.cpf||'—'],['📱 Telefone', c.phone||'—'],['📧 Email', c.email||'—'],
           ['🏠 Endereço', c.address||'—'],['🎂 Nascimento', formatDate(c.birthdate)],
           ['📅 Cadastrado em', formatDate(c.createdAt)],['💰 Total Gasto', formatCurrency(total)]]
          .map(([l,v]) => `<div class="card" style="margin:0;padding:14px"><div style="font-size:11px;color:var(--text-secondary)">${l}</div><div style="font-weight:600;margin-top:4px">${v}</div></div>`).join('')}
      </div>
      ${c.notes ? `<div class="card" style="margin:0 0 16px;padding:14px"><div style="font-size:11px;color:var(--text-secondary)">📝 Observações</div><div style="margin-top:4px">${c.notes}</div></div>` : ''}
      <div style="font-size:13px;font-weight:700;margin-bottom:10px">Histórico de Viagens (${bookings.length})</div>
      <div class="timeline">${bHtml}</div>`;
    openModal('client-view-modal');
  },
};
