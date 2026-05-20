// ============================================================
// PACOTES.JS — Cadastro e gestão de pacotes turísticos
// ============================================================

const Pacotes = {
  editingId: null,

  render() { this.renderList(); },

  renderList(filterStatus = '', filterSearch = '') {
    let list = DB.get(DB.KEYS.PACKAGES);
    if (filterStatus) list = list.filter(p => p.status === filterStatus);
    if (filterSearch) {
      const f = filterSearch.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(f) || p.destination.toLowerCase().includes(f));
    }

    const grid = document.getElementById('pacotes-grid');
    if (!list.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="icon"><i data-lucide="package" style="width:48px; height:48px; stroke-width:1.5"></i></div><p>Nenhum pacote encontrado</p></div>`;
      lucide.createIcons();
      return;
    }

    grid.innerHTML = list.map(p => {
      const s = STATUS_LABELS[p.status] || {};
      const bookings = DB.get(DB.KEYS.BOOKINGS).filter(b => b.packageId === p.id);
      return `
        <div class="card" style="margin:0;transition:transform 0.2s" onmouseenter="this.style.transform='translateY(-3px)'" onmouseleave="this.style.transform=''">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
            <div>
              <div style="font-size:15px;font-weight:700">${p.name}</div>
              <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;display:inline-flex;align-items:center;gap:4px"><i data-lucide="map-pin" style="width:12px;height:12px"></i> ${p.destination}</div>
            </div>
            <span class="badge ${s.cls}">${s.label}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
            <div style="background:var(--bg-card2);border-radius:8px;padding:10px;text-align:center">
              <div style="font-size:18px;font-weight:800;color:var(--accent)">${p.duration}</div>
              <div style="font-size:10px;color:var(--text-muted)">DIAS</div>
            </div>
            <div style="background:var(--bg-card2);border-radius:8px;padding:10px;text-align:center">
              <div style="font-size:18px;font-weight:800;color:var(--green)">${p.capacity}</div>
              <div style="font-size:10px;color:var(--text-muted)">VAGAS</div>
            </div>
            <div style="background:var(--bg-card2);border-radius:8px;padding:10px;text-align:center">
              <div style="font-size:18px;font-weight:800;color:var(--blue)">${bookings.length}</div>
              <div style="font-size:10px;color:var(--text-muted)">VENDAS</div>
            </div>
          </div>
          <div style="font-size:24px;font-weight:800;color:var(--accent);margin-bottom:10px">${formatCurrency(p.price)}</div>
          <p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;line-height:1.5">${p.description?.substring(0,100)}${p.description?.length>100?'…':''}</p>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm btn-secondary" style="flex:1; display:inline-flex; align-items:center; justify-content:center; gap:4px" onclick="Pacotes.view('${p.id}')"><i data-lucide="eye" style="width:14px; height:14px"></i> Detalhes</button>
            <button class="btn btn-sm btn-secondary" style="display:inline-flex; align-items:center; justify-content:center" onclick="Pacotes.openForm('${p.id}')" title="Editar"><i data-lucide="pencil" style="width:14px; height:14px"></i></button>
            <button class="btn btn-sm btn-danger" style="display:inline-flex; align-items:center; justify-content:center" onclick="Pacotes.delete('${p.id}')" title="Excluir"><i data-lucide="trash-2" style="width:14px; height:14px"></i></button>
          </div>
        </div>`;
    }).join('');

    lucide.createIcons();
  },

  openForm(id = null) {
    this.editingId = id;
    const p = id ? DB.getOne(DB.KEYS.PACKAGES, id) : null;
    document.getElementById('pacote-modal-title').textContent = id ? 'Editar Pacote' : 'Novo Pacote';
    const f = document.getElementById('pacote-form');
    f.querySelector('[name=name]').value        = p?.name        || '';
    f.querySelector('[name=destination]').value = p?.destination || '';
    f.querySelector('[name=duration]').value    = p?.duration    || 1;
    f.querySelector('[name=price]').value       = p?.price       || '';
    f.querySelector('[name=capacity]').value    = p?.capacity    || 10;
    f.querySelector('[name=status]').value      = p?.status      || 'active';
    f.querySelector('[name=description]').value = p?.description || '';
    f.querySelector('[name=itinerary]').value   = p?.itinerary   || '';
    openModal('pacote-modal');
  },

  save() {
    const f    = document.getElementById('pacote-form');
    const name = f.querySelector('[name=name]').value.trim();
    const dest = f.querySelector('[name=destination]').value.trim();
    if (!name || !dest) { showToast('Nome e destino são obrigatórios', 'error'); return; }
    const pkg = {
      id:          this.editingId || generateId(),
      name,
      destination: dest,
      duration:    parseInt(f.querySelector('[name=duration]').value) || 1,
      price:       parseFloat(f.querySelector('[name=price]').value) || 0,
      capacity:    parseInt(f.querySelector('[name=capacity]').value) || 10,
      status:      f.querySelector('[name=status]').value,
      description: f.querySelector('[name=description]').value.trim(),
      itinerary:   f.querySelector('[name=itinerary]').value.trim(),
      createdAt:   this.editingId ? DB.getOne(DB.KEYS.PACKAGES, this.editingId)?.createdAt : today(),
    };
    DB.save(DB.KEYS.PACKAGES, pkg);
    closeModal('pacote-modal');
    this.renderList();
    showToast(this.editingId ? '✅ Pacote atualizado!' : '✅ Pacote cadastrado!', 'success');
  },

  view(id) {
    const p = DB.getOne(DB.KEYS.PACKAGES, id);
    if (!p) return;
    const bookings = DB.get(DB.KEYS.BOOKINGS).filter(b => b.packageId === id);
    const revenue  = bookings.reduce((s, b) => s + (b.paid || 0), 0);
    const s = STATUS_LABELS[p.status] || {};
    document.getElementById('pacote-view-body').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div>
          <h3 style="font-size:20px;font-weight:800">${p.name}</h3>
          <p style="color:var(--text-secondary);display:inline-flex;align-items:center;gap:4px"><i data-lucide="map-pin" style="width:14px;height:14px"></i> ${p.destination}</p>
        </div>
        <span class="badge ${s.cls} " style="font-size:13px;padding:6px 14px">${s.label}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
        ${[[ 'dollar-sign', 'Preço', formatCurrency(p.price) ], [ 'calendar', 'Duração', p.duration + ' dias' ], [ 'users', 'Capacidade', p.capacity + ' pessoas' ], [ 'shopping-bag', 'Reservas', bookings.length ]]
          .map(([icon,l,v])=>`<div class="card" style="margin:0;padding:14px;text-align:center;display:flex;flex-direction:column;align-items:center"><div style="font-size:11px;color:var(--text-secondary);display:inline-flex;align-items:center;gap:4px"><i data-lucide="${icon}" style="width:12px;height:12px"></i> ${l}</div><div style="font-size:18px;font-weight:800;margin-top:4px">${v}</div></div>`).join('')}
      </div>
      <div class="card" style="margin:0 0 16px;padding:14px">
        <div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;display:inline-flex;align-items:center;gap:4px"><i data-lucide="file-text" style="width:12px;height:12px"></i> Descrição</div>
        <p>${p.description || '—'}</p>
      </div>
      ${p.itinerary ? `<div class="card" style="margin:0 0 16px;padding:14px">
        <div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;display:inline-flex;align-items:center;gap:4px"><i data-lucide="route" style="width:12px;height:12px"></i> Roteiro</div>
        <pre style="font-family:inherit;white-space:pre-wrap;color:var(--text-primary)">${p.itinerary}</pre>
      </div>` : ''}
      <div style="font-size:13px;font-weight:700;margin-bottom:10px">Reservas (${bookings.length}) — Receita: ${formatCurrency(revenue)}</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Cliente</th><th>Check-in</th><th>Check-out</th><th>Status</th><th>Pago</th></tr></thead>
        <tbody>${bookings.map(b => {
          const c = DB.getOne(DB.KEYS.CLIENTS, b.clientId);
          const st = STATUS_LABELS[b.status]||{};
          return `<tr><td>${c?.name||'—'}</td><td>${formatDate(b.checkIn)}</td><td>${formatDate(b.checkOut)}</td><td><span class="badge ${st.cls}">${st.label}</span></td><td>${formatCurrency(b.paid)}</td></tr>`;
        }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Sem reservas</td></tr>'}</tbody>
      </table></div>`;
    openModal('pacote-view-modal');
    lucide.createIcons();
  },

  delete(id) {
    const bookings = DB.get(DB.KEYS.BOOKINGS).filter(b => b.packageId === id);
    if (bookings.length && !confirm(`Este pacote tem ${bookings.length} reserva(s). Deseja mesmo excluir?`)) return;
    if (!bookings.length && !confirm('Excluir este pacote?')) return;
    DB.remove(DB.KEYS.PACKAGES, id);
    this.renderList();
    showToast('🗑 Pacote removido', 'info');
  },
};
