// ============================================================
// FLUXO.JS — Chegada e Saída de Clientes (Reservas)
// ============================================================

const Fluxo = {
  editingId: null,

  exportar() {
    const type = document.getElementById('export-type').value;
    const month = document.getElementById('export-month').value;
    
    if (type === 'month' && !month) {
      showToast('Selecione um mês para exportar.', 'error');
      return;
    }
    
    Exportar.run('bookings', { month: type === 'month' ? month : null });
  },

  render() {
    this.renderList();
  },

  getFilters() {
    return {
      search: document.getElementById('fluxo-search')?.value.toLowerCase() || '',
      status: document.getElementById('fluxo-status')?.value || '',
      dateFrom: document.getElementById('fluxo-from')?.value || '',
      dateTo:   document.getElementById('fluxo-to')?.value || '',
    };
  },

  renderList() {
    let list = DB.get(DB.KEYS.BOOKINGS);
    const f  = this.getFilters();

    if (f.search) {
      list = list.filter(b => {
        const c = DB.getOne(DB.KEYS.CLIENTS, b.clientId);
        const p = DB.getOne(DB.KEYS.PACKAGES, b.packageId);
        return (c?.name || '').toLowerCase().includes(f.search) ||
               (p?.name || '').toLowerCase().includes(f.search);
      });
    }
    if (f.status)   list = list.filter(b => b.status === f.status);
    if (f.dateFrom) list = list.filter(b => b.checkIn >= f.dateFrom);
    if (f.dateTo)   list = list.filter(b => b.checkIn <= f.dateTo);

    list = [...list].reverse();
    const tbody = document.getElementById('fluxo-tbody');

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="icon"><i data-lucide="plane" style="width:48px; height:48px; stroke-width:1.5"></i></div><p>Nenhuma reserva encontrada</p></div></td></tr>`;
      lucide.createIcons();
      return;
    }

    tbody.innerHTML = list.map(b => {
      const client = DB.getOne(DB.KEYS.CLIENTS, b.clientId);
      const pkg    = DB.getOne(DB.KEYS.PACKAGES, b.packageId);
      const guide  = DB.getOne(DB.KEYS.PROVIDERS, b.guideId);
      const driver = DB.getOne(DB.KEYS.PROVIDERS, b.driverId);
      const s      = STATUS_LABELS[b.status] || STATUS_LABELS.confirmed;
      const pending = b.totalValue - (b.paid || 0);
      return `<tr>
        <td><strong>${client?.name || '—'}</strong><br><small style="color:var(--text-muted)">${b.people} pessoa(s)</small></td>
        <td>
          <div>${pkg?.name || '—'}</div>
          ${b.departure || b.destination ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;display:inline-flex;align-items:center;gap:4px;flex-wrap:wrap"><i data-lucide="plane-takeoff" style="width:12px;height:12px"></i> ${b.departure || '?'} <i data-lucide="arrow-right" style="width:12px;height:12px"></i> <i data-lucide="map-pin" style="width:12px;height:12px"></i> ${b.destination || '?'}</div>` : ''}
        </td>
        <td>${formatDate(b.checkIn)}</td>
        <td>${formatDate(b.checkOut)}</td>
        <td>
          <small style="color:var(--text-secondary)">Guia: ${guide?.name || '—'}</small><br>
          <small style="color:var(--text-secondary)">Motorista: ${driver?.name || '—'}</small>
        </td>
        <td>
          <div style="font-weight:600">${formatCurrency(b.totalValue)}</div>
          ${pending > 0 ? `<small class="cf-expense">− ${formatCurrency(pending)} pend.</small>` : '<small class="cf-income">✓ Quitado</small>'}
        </td>
        <td><span class="badge ${s.cls}">${s.label}</span></td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-sm btn-secondary" style="display:inline-flex; align-items:center; justify-content:center" onclick="Fluxo.openForm('${b.id}')" title="Editar"><i data-lucide="pencil" style="width:12px; height:12px"></i></button>
            <button class="btn btn-sm btn-success" style="display:inline-flex; align-items:center; justify-content:center; gap:4px" onclick="Fluxo.updateStatus('${b.id}')"><i data-lucide="trending-up" style="width:12px; height:12px"></i> Status</button>
            <button class="btn btn-sm btn-danger" style="display:inline-flex; align-items:center; justify-content:center" onclick="Fluxo.delete('${b.id}')" title="Excluir"><i data-lucide="trash-2" style="width:12px; height:12px"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');

    lucide.createIcons();
  },

  buildFormSelects() {
    const clients   = DB.get(DB.KEYS.CLIENTS);
    const packages  = DB.get(DB.KEYS.PACKAGES);
    const providers = DB.get(DB.KEYS.PROVIDERS);
    const guides    = providers.filter(e => e.role === 'guia');
    const drivers   = providers.filter(e => e.role === 'motorista');

    const toOpts = (arr, placeholder) =>
      `<option value="">${placeholder}</option>` +
      arr.map(i => `<option value="${i.id}">${i.name}</option>`).join('');

    document.getElementById('fluxo-sel-client').innerHTML  = toOpts(clients, '— Selecione cliente —');
    document.getElementById('fluxo-sel-package').innerHTML = toOpts(packages.filter(p=>p.status==='active'), '— Selecione pacote —');
    
    document.getElementById('fluxo-sel-guide').innerHTML   = `<option value="">— Sem guia —</option>` + 
      guides.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
      
    document.getElementById('fluxo-sel-driver').innerHTML  = `<option value="">— Sem motorista —</option>` + 
      drivers.map(e => {
        const car = e.carId ? DB.getOne(DB.KEYS.CARS, e.carId) : null;
        const carInfo = car ? ` [${car.model} - ${car.plate}]` : ' [Sem Carro]';
        return `<option value="${e.id}">${e.name}${carInfo}</option>`;
      }).join('');
  },

  openForm(id = null) {
    this.editingId = id;
    const b = id ? DB.getOne(DB.KEYS.BOOKINGS, id) : null;
    document.getElementById('fluxo-modal-title').textContent = id ? 'Editar Reserva' : 'Nova Reserva';
    this.buildFormSelects();
    const f = document.getElementById('fluxo-form');
    f.querySelector('[name=clientId]').value  = b?.clientId  || '';
    f.querySelector('[name=packageId]').value = b?.packageId || '';
    f.querySelector('[name=checkIn]').value   = b?.checkIn   || '';
    f.querySelector('[name=checkOut]').value  = b?.checkOut  || '';
    f.querySelector('[name=departure]').value = b?.departure || '';
    f.querySelector('[name=destination]').value= b?.destination|| '';
    f.querySelector('[name=people]').value    = b?.people    || 1;
    f.querySelector('[name=guideId]').value   = b?.guideId   || '';
    f.querySelector('[name=driverId]').value  = b?.driverId  || '';
    f.querySelector('[name=totalValue]').value= b?.totalValue|| '';
    f.querySelector('[name=paid]').value      = b?.paid      || '';
    f.querySelector('[name=status]').value    = b?.status    || 'confirmed';
    f.querySelector('[name=notes]').value     = b?.notes     || '';
    openModal('fluxo-modal');
  },

  save() {
    const f = document.getElementById('fluxo-form');
    const clientId  = f.querySelector('[name=clientId]').value;
    const packageId = f.querySelector('[name=packageId]').value;
    const checkIn   = f.querySelector('[name=checkIn]').value;
    const checkOut  = f.querySelector('[name=checkOut]').value;
    const departure = f.querySelector('[name=departure]').value.trim();
    const destination= f.querySelector('[name=destination]').value.trim();
    if (!clientId || !packageId || !checkIn || !checkOut) {
      showToast('Preencha os campos obrigatórios', 'error'); return;
    }
    const isNew = !this.editingId;
    const booking = {
      id:         this.editingId || generateId(),
      clientId,
      packageId,
      checkIn,
      checkOut,
      departure,
      destination,
      people:     parseInt(f.querySelector('[name=people]').value) || 1,
      guideId:    f.querySelector('[name=guideId]').value,
      driverId:   f.querySelector('[name=driverId]').value,
      totalValue: parseFloat(f.querySelector('[name=totalValue]').value) || 0,
      paid:       parseFloat(f.querySelector('[name=paid]').value) || 0,
      status:     f.querySelector('[name=status]').value,
      notes:      f.querySelector('[name=notes]').value.trim(),
      createdAt:  this.editingId ? DB.getOne(DB.KEYS.BOOKINGS, this.editingId)?.createdAt : today(),
    };
    DB.save(DB.KEYS.BOOKINGS, booking);
    if (isNew) EmailNotifier.notifyNewBooking(booking);
    closeModal('fluxo-modal');
    this.renderList();
    showToast(isNew ? '✅ Reserva criada!' : '✅ Reserva atualizada!', 'success');
  },

  updateStatus(id) {
    const b = DB.getOne(DB.KEYS.BOOKINGS, id);
    if (!b) return;
    const flow = ['confirmed', 'arriving', 'arrived', 'finished'];
    const idx  = flow.indexOf(b.status);
    if (idx < 0 || idx >= flow.length - 1) { showToast('Status já é final', 'info'); return; }
    b.status = flow[idx + 1];
    DB.save(DB.KEYS.BOOKINGS, b);
    if (b.status === 'finished') EmailNotifier.notifyCheckOut(b);
    this.renderList();
    const s = STATUS_LABELS[b.status];
    showToast(`Status: ${s?.label}`, 'success');
  },

  delete(id) {
    if (!confirm('Excluir esta reserva?')) return;
    DB.remove(DB.KEYS.BOOKINGS, id);
    this.renderList();
    showToast('🗑 Reserva removida', 'info');
  },
};
