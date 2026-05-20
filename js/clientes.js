// ============================================================
// CLIENTES.JS — Subseções: Ficha de Clientes, Day by Day e Vouchers
// ============================================================

const Clientes = {
  editingId: null,
  editingDayId: null,
  activeTab: 'cadastro',
  selectedClientId: null,

  render() {
    this.switchTab(this.activeTab);
  },

  // ——— CONTROLE DE ABAS ————————————————————————————————————————
  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(cont => cont.classList.remove('active'));

    if (tab === 'cadastro') {
      document.getElementById('btn-tab-cadastro').classList.add('active');
      document.getElementById('tab-cadastro').classList.add('active');
      this.renderList();
    } else if (tab === 'daybyday') {
      document.getElementById('btn-tab-daybyday').classList.add('active');
      document.getElementById('tab-daybyday').classList.add('active');
      this.buildDayByDaySelect();
      this.renderDayByDay();
    } else if (tab === 'voucher-config') {
      document.getElementById('btn-tab-voucher-config').classList.add('active');
      document.getElementById('tab-voucher-config').classList.add('active');
      this.loadVoucherSettings();
    }
  },

  goToDayByDay(clientId) {
    this.selectedClientId = clientId;
    this.switchTab('daybyday');
  },

  // ——— SUBSEÇÃO 1: CRUD CLIENTES ————————————————————————————————
  renderList(filter = '') {
    let list = DB.get(DB.KEYS.CLIENTS);
    if (filter) {
      const f = filter.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(f) ||
        c.email?.toLowerCase().includes(f) ||
        c.phone?.includes(f) ||
        c.location?.toLowerCase().includes(f)
      );
    }
    const tbody = document.getElementById('clients-tbody');
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="icon"><i data-lucide="users" class="empty-icon"></i></div><p>Nenhum cliente cadastrado</p></div></td></tr>`;
      lucide.createIcons();
      return;
    }

    tbody.innerHTML = list.map(c => {
      return `<tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.location || '—'}</td>
        <td>
          <div style="display:inline-flex;align-items:center;gap:4px;margin-bottom:2px;"><i data-lucide="phone" style="width:12px;height:12px;color:var(--text-secondary)"></i> ${c.phone || '—'}</div><br>
          <div style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="mail" style="width:12px;height:12px;color:var(--text-secondary)"></i> ${c.email || '—'}</div>
        </td>
        <td><span class="badge badge-info">${c.peopleCount || 1} pessoa(s)</span></td>
        <td>${c.ageGroup || '—'}</td>
        <td>
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            <button class="btn btn-sm btn-secondary" onclick="Clientes.view('${c.id}')" title="Ficha Completa" style="display:inline-flex;align-items:center;gap:4px"><i data-lucide="eye" style="width:12px;height:12px"></i> Ficha</button>
            <button class="btn btn-sm btn-secondary" onclick="Clientes.goToDayByDay('${c.id}')" title="Ver Cronograma" style="display:inline-flex;align-items:center;gap:4px"><i data-lucide="calendar" style="width:12px;height:12px"></i> Roteiro</button>
            <button class="btn btn-sm btn-success"   onclick="Clientes.emitVoucher('${c.id}')" title="Emitir Voucher" style="display:inline-flex;align-items:center;gap:4px"><i data-lucide="file-text" style="width:12px;height:12px"></i> Voucher</button>
            <button class="btn btn-sm btn-secondary" onclick="Clientes.openForm('${c.id}')" style="display:inline-flex;align-items:center;justify-content:center"><i data-lucide="pencil" style="width:12px;height:12px"></i></button>
            <button class="btn btn-sm btn-danger"    onclick="Clientes.delete('${c.id}')" style="display:inline-flex;align-items:center;justify-content:center"><i data-lucide="trash-2" style="width:12px;height:12px"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
    lucide.createIcons();
  },

  openForm(id = null) {
    this.editingId = id;
    const c = id ? DB.getOne(DB.KEYS.CLIENTS, id) : null;
    document.getElementById('client-modal-title').textContent = id ? 'Editar Cliente' : 'Novo Cliente';
    
    const f = document.getElementById('client-form');
    f.querySelector('[name=name]').value        = c?.name || '';
    f.querySelector('[name=phone]').value       = c?.phone || '';
    f.querySelector('[name=email]').value       = c?.email || '';
    f.querySelector('[name=location]').value    = c?.location || '';
    f.querySelector('[name=peopleCount]').value = c?.peopleCount || 1;
    f.querySelector('[name=ageGroup]').value    = c?.ageGroup || '';
    f.querySelector('[name=description]').value = c?.description || '';

    openModal('client-modal');
  },

  save() {
    const f   = document.getElementById('client-form');
    const name = f.querySelector('[name=name]').value.trim();
    const peopleCount = parseInt(f.querySelector('[name=peopleCount]').value) || 1;

    if (!name) { 
      showToast('Nome é obrigatório', 'error'); 
      return; 
    }

    const client = {
      id:        this.editingId || generateId(),
      name,
      phone:     f.querySelector('[name=phone]').value.trim(),
      email:     f.querySelector('[name=email]').value.trim(),
      location:  f.querySelector('[name=location]').value.trim(),
      peopleCount,
      ageGroup:    f.querySelector('[name=ageGroup]').value.trim(),
      description: f.querySelector('[name=description]').value.trim(),
      createdAt: this.editingId ? DB.getOne(DB.KEYS.CLIENTS, this.editingId)?.createdAt : today(),
    };

    DB.save(DB.KEYS.CLIENTS, client);
    closeModal('client-modal');
    this.renderList();
    showToast(this.editingId ? '✅ Ficha cadastral atualizada!' : '✅ Cliente cadastrado com sucesso!', 'success');
  },

  delete(id) {
    if (!confirm('Excluir este cliente? Todas as programações de Day by Day vinculadas a ele serão apagadas!')) return;
    
    // Remover cliente
    DB.remove(DB.KEYS.CLIENTS, id);
    
    // Remover itinerários day by day vinculados
    let dbd = DB.get(DB.KEYS.DAYBYDAY);
    dbd = dbd.filter(d => d.clientId !== id);
    DB.set(DB.KEYS.DAYBYDAY, dbd);

    if (this.selectedClientId === id) {
      this.selectedClientId = null;
    }

    this.renderList();
    showToast('🗑 Ficha do cliente removida do sistema', 'info');
  },

  view(id) {
    const c = DB.getOne(DB.KEYS.CLIENTS, id);
    if (!c) return;

    // Buscar itinerário Day by Day
    const daybyday = DB.get(DB.KEYS.DAYBYDAY)
      .filter(d => d.clientId === id)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Buscar reservas vinculadas
    const bookings = DB.get(DB.KEYS.BOOKINGS).filter(b => b.clientId === id);
    const totalSpent = bookings.reduce((s, b) => s + (b.totalValue || 0), 0);

    const timelineHtml = daybyday.length ? daybyday.map(d => {
      const guide = d.guideId ? DB.getOne(DB.KEYS.PROVIDERS, d.guideId) : null;
      const driver = d.driverId ? DB.getOne(DB.KEYS.PROVIDERS, d.driverId) : null;
      const car = d.carId ? DB.getOne(DB.KEYS.CARS, d.carId) : null;
      const s = STATUS_LABELS[d.status] || {};
      
      let details = [];
      if (guide) details.push(`<span style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="compass" style="width:12px;height:12px;"></i> Guia: <strong>${guide.name}</strong></span>`);
      if (driver) details.push(`<span style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="user-check" style="width:12px;height:12px;"></i> Motorista: <strong>${driver.name}</strong></span>`);
      if (car) details.push(`<span style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="car" style="width:12px;height:12px;"></i> Veículo: <strong>${car.model} (${car.plate})</strong></span>`);
      const detailsStr = details.join(' · ');

      return `
        <div class="timeline-item">
          <div class="timeline-dot ${d.status === 'done' ? 'green' : 'amber'}"></div>
          <div style="flex:1">
            <div style="font-weight:700">${formatDate(d.date)} <span class="badge ${s.cls}" style="font-size:9px;margin-left:8px">${s.label}</span></div>
            <p style="margin:6px 0; font-size:13px">${d.description}</p>
            ${detailsStr ? `<div style="font-size:11px; color:var(--text-muted); margin-top:4px; display:flex; flex-wrap:wrap; gap:8px;">${detailsStr}</div>` : ''}
            ${d.notes ? `<div style="font-size:11px; color:var(--text-secondary); background:var(--bg-card2); padding:6px; border-radius:4px; margin-top:6px; display:inline-flex; align-items:center; gap:4px;"><i data-lucide="file-text" style="width:12px;height:12px;"></i> Obs: ${d.notes}</div>` : ''}
          </div>
        </div>`;
    }).join('') : '<p style="color:var(--text-muted); font-size:13px; text-align:center">Nenhum cronograma Day by Day planejado ainda.</p>';

    document.getElementById('client-view-body').innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:20px">
        <div class="card" style="margin:0; padding:12px"><small style="color:var(--text-secondary); display:flex; align-items:center; gap:4px;"><i data-lucide="user" style="width:12px;height:12px;"></i> Nome</small><div style="font-weight:700; margin-top:4px">${c.name}</div></div>
        <div class="card" style="margin:0; padding:12px"><small style="color:var(--text-secondary); display:flex; align-items:center; gap:4px;"><i data-lucide="phone" style="width:12px;height:12px;"></i> Telefone</small><div style="font-weight:700; margin-top:4px">${c.phone || '—'}</div></div>
        <div class="card" style="margin:0; padding:12px"><small style="color:var(--text-secondary); display:flex; align-items:center; gap:4px;"><i data-lucide="mail" style="width:12px;height:12px;"></i> E-mail</small><div style="font-weight:700; margin-top:4px">${c.email || '—'}</div></div>
        <div class="card" style="margin:0; padding:12px"><small style="color:var(--text-secondary); display:flex; align-items:center; gap:4px;"><i data-lucide="map-pin" style="width:12px;height:12px;"></i> Localidade</small><div style="font-weight:700; margin-top:4px">${c.location || '—'}</div></div>
        <div class="card" style="margin:0; padding:12px"><small style="color:var(--text-secondary); display:flex; align-items:center; gap:4px;"><i data-lucide="users" style="width:12px;height:12px;"></i> Nº Passageiros</small><div style="font-weight:700; margin-top:4px">${c.peopleCount || 1} pessoas</div></div>
        <div class="card" style="margin:0; padding:12px"><small style="color:var(--text-secondary); display:flex; align-items:center; gap:4px;"><i data-lucide="calendar" style="width:12px;height:12px;"></i> Faixa Etária</small><div style="font-weight:700; margin-top:4px">${c.ageGroup || '—'}</div></div>
        <div class="card" style="margin:0; padding:12px"><small style="color:var(--text-secondary); display:flex; align-items:center; gap:4px;"><i data-lucide="dollar-sign" style="width:12px;height:12px;"></i> Total em Reservas</small><div style="font-weight:700; margin-top:4px; color:var(--green)">${formatCurrency(totalSpent)}</div></div>
      </div>
      
      ${c.description ? `
        <div class="card" style="margin:0 0 20px; padding:16px; background:rgba(var(--accent-rgb),0.02); border-left:4px solid var(--accent)">
          <small style="color:var(--text-secondary); display:flex; align-items:center; gap:4px;"><i data-lucide="file-text" style="width:12px;height:12px;"></i> Perfil do Cliente / Descrição Geral</small>
          <p style="margin-top:6px; font-size:13px; line-height:1.5">${c.description}</p>
        </div>` : ''}

      <div style="font-size:15px; font-weight:700; border-bottom:1px solid var(--border); padding-bottom:8px; margin-bottom:14px; display:flex; align-items:center; gap:6px;">
        <i data-lucide="activity" style="width:16px;height:16px;color:var(--accent)"></i> Linha do Tempo — Cronograma de Viagem
      </div>
      <div class="timeline" style="max-height:400px; overflow-y:auto; padding-right:8px">${timelineHtml}</div>
    `;

    openModal('client-view-modal');
    lucide.createIcons();
  },

  // ——— SUBSEÇÃO 2: DAY BY DAY ——————————————————————————————————
  buildDayByDaySelect() {
    const select = document.getElementById('daybyday-client-select');
    if (!select) return;
    const list = DB.get(DB.KEYS.CLIENTS);
    select.innerHTML = '<option value="">— Selecione um Cliente —</option>' +
      list.map(c => `<option value="${c.id}" ${c.id === this.selectedClientId ? 'selected' : ''}>${c.name} (${c.location || 'Sem Localidade'})</option>`).join('');
  },

  onDayByDayClientChange() {
    const select = document.getElementById('daybyday-client-select');
    this.selectedClientId = select.value || null;
    this.renderDayByDay();
  },

  renderDayByDay() {
    const btnAdd = document.getElementById('btn-add-daybyday');
    const container = document.getElementById('daybyday-timeline-content');
    
    if (!this.selectedClientId) {
      btnAdd.style.display = 'none';
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon"><i data-lucide="calendar" class="empty-icon"></i></div>
          <p>Selecione um cliente acima para visualizar ou planejar o itinerário dia a dia.</p>
        </div>`;
      lucide.createIcons();
      return;
    }

    btnAdd.style.display = 'block';
    const client = DB.getOne(DB.KEYS.CLIENTS, this.selectedClientId);
    const daybyday = DB.get(DB.KEYS.DAYBYDAY)
      .filter(d => d.clientId === this.selectedClientId)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (!daybyday.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon"><i data-lucide="file-text" class="empty-icon"></i></div>
          <h4 style="font-weight:700; margin-bottom:8px">${client.name}</h4>
          <p>Este cliente não possui atividades programadas no cronograma. Adicione o primeiro dia!</p>
          <button class="btn btn-primary" style="margin-top:12px; display:inline-flex; align-items:center; gap:6px" onclick="Clientes.openDayByDayForm()"><i data-lucide="plus" style="width:14px;height:14px"></i> Adicionar Dia</button>
        </div>`;
      lucide.createIcons();
      return;
    }

    const itemsHtml = daybyday.map(d => {
      const guide = d.guideId ? DB.getOne(DB.KEYS.PROVIDERS, d.guideId) : null;
      const driver = d.driverId ? DB.getOne(DB.KEYS.PROVIDERS, d.driverId) : null;
      const car = d.carId ? DB.getOne(DB.KEYS.CARS, d.carId) : null;
      const s = STATUS_LABELS[d.status] || {};
      
      return `
        <div class="day-card">
          <div class="day-card-header">
            <div>
              <strong style="font-size:15px; color:var(--text-main); display:inline-flex; align-items:center; gap:4px;"><i data-lucide="calendar" style="width:14px;height:14px;color:var(--accent)"></i> ${formatDate(d.date)}</strong>
              <span class="day-badge ${s.cls}" style="margin-left:10px">${s.label}</span>
            </div>
            <div style="display:flex; gap:6px">
              <button class="btn btn-sm btn-secondary" onclick="Clientes.openDayByDayForm('${d.id}')" style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="pencil" style="width:12px;height:12px;"></i> Editar</button>
              <button class="btn btn-sm btn-danger" onclick="Clientes.deleteDayByDay('${d.id}')" style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i> Excluir</button>
            </div>
          </div>
          <div style="font-size:14px; color:var(--text-main); margin-bottom:12px; white-space:pre-wrap; line-height:1.5">${d.description}</div>
          
          <div style="display:flex; gap:12px; flex-wrap:wrap">
            ${guide ? `
              <div style="font-size:12px; background:var(--bg-card2); border:1px solid var(--border); border-radius:6px; padding:6px 12px; display:flex; align-items:center; gap:6px">
                <i data-lucide="compass" style="width:14px;height:14px;color:var(--accent)"></i> <span>Guia: <strong>${guide.name}</strong> ${guide.phone ? `(${guide.phone})` : ''}</span>
              </div>` : ''}
            
            ${driver ? `
              <div style="font-size:12px; background:var(--bg-card2); border:1px solid var(--border); border-radius:6px; padding:6px 12px; display:flex; align-items:center; gap:6px">
                <i data-lucide="user-check" style="width:14px;height:14px;color:var(--accent)"></i> <span>Motorista: <strong>${driver.name}</strong> ${driver.phone ? `(${driver.phone})` : ''}</span>
              </div>` : ''}
            
            ${car ? `
              <div style="font-size:12px; background:var(--bg-card2); border:1px solid var(--border); border-radius:6px; padding:6px 12px; display:flex; align-items:center; gap:6px">
                <i data-lucide="car" style="width:14px;height:14px;color:var(--accent)"></i> <span>Veículo: <strong>${car.model}</strong> (${car.plate})</span>
              </div>` : ''}
          </div>

          ${d.notes ? `
            <div style="margin-top:10px; font-size:12px; color:var(--text-secondary); background:rgba(255,215,0,0.03); border: 1px dashed rgba(255,215,0,0.2); padding:8px 12px; border-radius:6px; display:flex; align-items:flex-start; gap:6px">
              <i data-lucide="alert-circle" style="width:14px;height:14px;color:var(--accent);margin-top:2px;flex-shrink:0;"></i>
              <div><strong>Observação importante:</strong><br>${d.notes}</div>
            </div>` : ''}
        </div>`;
    }).join('');

    container.innerHTML = `
      <div style="margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:12px; display:flex; justify-content:space-between; align-items:center">
        <div>
          <h4 style="font-size:16px; font-weight:800; margin:0; color:var(--text-main)">Cronograma para ${client.name}</h4>
          <span style="font-size:12px; color:var(--text-secondary)">Total de ${daybyday.length} dia(s) planejados</span>
        </div>
        <button class="btn btn-sm btn-success" onclick="Clientes.emitVoucher('${client.id}')" style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="file-text" style="width:14px;height:14px"></i> Emitir Voucher</button>
      </div>
      <div>${itemsHtml}</div>
    `;
    lucide.createIcons();
  },

  openDayByDayForm(dayId = null) {
    this.editingDayId = dayId;
    const d = dayId ? DB.getOne(DB.KEYS.DAYBYDAY, dayId) : null;
    document.getElementById('daybyday-modal-title').textContent = dayId ? 'Editar Dia do Itinerário' : 'Novo Dia no Itinerário';
    
    // Carregar Guias, Motoristas e Veículos
    const guides = DB.get(DB.KEYS.PROVIDERS).filter(p => p.role === 'guia');
    const drivers = DB.get(DB.KEYS.PROVIDERS).filter(p => p.role === 'motorista');
    const cars = DB.get(DB.KEYS.CARS);

    const guideSel = document.getElementById('dbd-sel-guide');
    guideSel.innerHTML = '<option value="">— Sem Guia —</option>' +
      guides.map(g => `<option value="${g.id}">${g.name}</option>`).join('');

    const driverSel = document.getElementById('dbd-sel-driver');
    driverSel.innerHTML = '<option value="">— Sem Motorista —</option>' +
      drivers.map(dr => {
        const car = dr.carId ? DB.getOne(DB.KEYS.CARS, dr.carId) : null;
        const carInfo = car ? ` (Carro: ${car.model})` : ' (Sem Carro)';
        return `<option value="${dr.id}">${dr.name}${carInfo}</option>`;
      }).join('');

    const carSel = document.getElementById('dbd-sel-car');
    const statusMeta = {
      'disponivel': { label: 'Disponível', icon: '[Disponível]' },
      'em_uso': { label: 'Em Uso', icon: '[Em Uso]' },
      'manutencao': { label: 'Manutenção', icon: '[Manutenção]' }
    };
    carSel.innerHTML = '<option value="">— Sem Veículo —</option>' +
      cars.map(c => {
        const status = c.status || 'disponivel';
        const meta = statusMeta[status] || statusMeta['disponivel'];
        return `<option value="${c.id}">${c.model} (${c.plate}) ${meta.icon}</option>`;
      }).join('');

    const f = document.getElementById('daybyday-form');
    f.querySelector('[name=date]').value        = d?.date || today();
    f.querySelector('[name=status]').value      = d?.status || 'pending';
    f.querySelector('[name=guideId]').value     = d?.guideId || '';
    f.querySelector('[name=driverId]').value    = d?.driverId || '';
    f.querySelector('[name=carId]').value       = d?.carId || '';
    f.querySelector('[name=description]').value = d?.description || '';
    f.querySelector('[name=notes]').value       = d?.notes || '';

    openModal('daybyday-modal');
  },

  saveDayByDay() {
    const f           = document.getElementById('daybyday-form');
    const date        = f.querySelector('[name=date]').value;
    const status      = f.querySelector('[name=status]').value;
    const description = f.querySelector('[name=description]').value.trim();
    
    if (!date || !description) {
      showToast('Data e Descrição das Atividades são obrigatórios', 'error');
      return;
    }

    const item = {
      id:          this.editingDayId || generateId(),
      clientId:    this.selectedClientId,
      date,
      status,
      guideId:     f.querySelector('[name=guideId]').value || '',
      driverId:    f.querySelector('[name=driverId]').value || '',
      carId:       f.querySelector('[name=carId]').value || '',
      description,
      notes:       f.querySelector('[name=notes]').value.trim(),
      createdAt:   this.editingDayId ? DB.getOne(DB.KEYS.DAYBYDAY, this.editingDayId)?.createdAt : today(),
    };

    DB.save(DB.KEYS.DAYBYDAY, item);
    closeModal('daybyday-modal');
    this.renderDayByDay();
    showToast(this.editingDayId ? '✅ Dia do roteiro atualizado!' : '✅ Dia adicionado ao roteiro com sucesso!', 'success');
  },

  deleteDayByDay(dayId) {
    if (!confirm('Deseja excluir este dia do cronograma?')) return;
    DB.remove(DB.KEYS.DAYBYDAY, dayId);
    this.renderDayByDay();
    showToast('🗑 Dia do cronograma removido', 'info');
  },

  // ——— SUBSEÇÃO 3: CONFIGURAÇÃO DE VOUCHERS ———————————————————
  loadVoucherSettings() {
    const settings = DB.get(DB.KEYS.COMPANY_SETTINGS) || {};
    const f = document.getElementById('voucher-config-form');
    
    f.querySelector('[name=logoName]').value  = settings.logoName || 'Cia da Capivara Turismo';
    f.querySelector('[name=logoEmoji]').value = settings.logoEmoji || '🦔';
    f.querySelector('[name=cadastur]').value  = settings.cadastur || '';
    f.querySelector('[name=instagram]').value = settings.instagram || '';
    f.querySelector('[name=website]').value   = settings.website || '';
  },

  saveVoucherSettings() {
    const f = document.getElementById('voucher-config-form');
    const settings = {
      logoName:  f.querySelector('[name=logoName]').value.trim(),
      logoEmoji: f.querySelector('[name=logoEmoji]').value.trim(),
      cadastur:  f.querySelector('[name=cadastur]').value.trim(),
      instagram: f.querySelector('[name=instagram]').value.trim(),
      website:   f.querySelector('[name=website]').value.trim()
    };

    DB.set(DB.KEYS.COMPANY_SETTINGS, settings);
    showToast('✅ Configurações de voucher salvas!', 'success');
  },

  // ——— EMISSÃO E IMPRESSÃO DE VOUCHER ——————————————————————————
  emitVoucher(clientId) {
    const client = DB.getOne(DB.KEYS.CLIENTS, clientId);
    if (!client) {
      showToast('Cliente não encontrado!', 'error');
      return;
    }

    // Buscar configurações
    const settings = DB.get(DB.KEYS.COMPANY_SETTINGS) || {
      logoName: 'Cia da Capivara Turismo',
      logoEmoji: '🦔',
      cadastur: '12.345.678/0001-90',
      instagram: '@ciadacapivara',
      website: 'www.ciadacapivara.com'
    };

    // Buscar itinerário Day by Day
    const daybyday = DB.get(DB.KEYS.DAYBYDAY)
      .filter(d => d.clientId === clientId)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Montar o HTML itinerário para o Voucher
    let itinerarioHtml = '';
    if (daybyday.length) {
      itinerarioHtml = daybyday.map((d, index) => {
        const guide = d.guideId ? DB.getOne(DB.KEYS.PROVIDERS, d.guideId) : null;
        const driver = d.driverId ? DB.getOne(DB.KEYS.PROVIDERS, d.driverId) : null;
        const car = d.carId ? DB.getOne(DB.KEYS.CARS, d.carId) : null;
        
        let detailsHtml = '';
        if (guide || driver || car) {
          detailsHtml = `
            <div style="display:flex; flex-wrap:wrap; gap:12px; margin-top:10px; font-size:11px; color:#000000; background:#e2e8f0; border:1px solid #cbd5e0; padding:6px 10px; border-radius:4px; align-items:center">
              ${guide ? `<span style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="compass" style="width:12px;height:12px;color:#1a202c"></i> Guia: <strong style="color:#000000">${guide.name}</strong></span>` : ''}
              ${driver ? `<span style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="user-check" style="width:12px;height:12px;color:#1a202c"></i> Motorista: <strong style="color:#000000">${driver.name}</strong></span>` : ''}
              ${car ? `<span style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="car" style="width:12px;height:12px;color:#1a202c"></i> Veículo: <strong style="color:#000000">${car.model}</strong> (${car.plate})</span>` : ''}
            </div>`;
        }
        
        return `
          <div style="margin-bottom: 20px; padding: 14px; border: 1px solid #cbd5e0; border-radius: 8px; background: #fafafa; page-break-inside: avoid">
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid #cbd5e0; padding-bottom:8px; margin-bottom:8px">
              <strong style="color:#000000; font-size:14px">DIA ${index + 1} · ${formatDate(d.date)}</strong>
              <span style="font-size:11px; text-transform:uppercase; font-weight:800; color:#1a202c">Roteiro Diário</span>
            </div>
            
            <p style="font-size:13px; color:#1a202c; margin:8px 0; line-height:1.5; white-space:pre-wrap">${d.description}</p>
            
            ${detailsHtml}

            ${d.notes ? `
              <div style="margin-top:8px; font-size:11px; color:#7b341e; background:#fff5f5; border: 1px dashed #feb2b2; padding:6px 10px; border-radius:4px; display:inline-flex; align-items:center; gap:4px">
                <i data-lucide="alert-triangle" style="width:12px;height:12px;color:#7b341e"></i> <strong>Avisos/Observações:</strong> ${d.notes}
              </div>` : ''}
          </div>`;
      }).join('');
    } else {
      itinerarioHtml = `
        <div style="text-align:center; padding:24px; color:#4a5568; border: 1px dashed #cbd5e0; border-radius:8px">
          Sem itinerários programados para este cliente. Adicione dias na aba Day by Day.
        </div>`;
    }

    // Gerar corpo completo do Voucher
    const bodyContainer = document.getElementById('voucher-modal-body');
    bodyContainer.innerHTML = `
      <div id="voucher-print-area" style="background:#ffffff; border:1px solid #a0aec0; border-radius:12px; padding:32px; max-width:800px; margin:0 auto; color:#1a202c; font-family:'Inter', sans-serif">
        
        <!-- CABEÇALHO BRANDING -->
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 3px double #1a202c; padding-bottom:16px; margin-bottom:24px">
          <div>
            <div style="font-size:28px; font-weight:900; color:#000000; display:flex; align-items:center; gap:8px">
              <img src="logo.png" style="height:48px; max-width:150px; object-fit:contain" onerror="this.style.display='none'; document.getElementById('voucher-fallback-logo').style.display='inline'">
              <span id="voucher-fallback-logo" style="display:none; font-size:24px">${settings.logoEmoji || '🦔'}</span>
              <span>${settings.logoName || 'Cia da Capivara'}</span>
            </div>
            <div style="font-size:12px; color:#2d3748; font-weight:700; margin-top:4px">Registro CADASTUR: <strong style="color:#000000">${settings.cadastur || '—'}</strong></div>
          </div>
          <div style="text-align:right">
            <span style="font-size:12px; font-weight:800; text-transform:uppercase; background:#1a202c; color:#ffffff; padding:6px 12px; border-radius:4px; letter-spacing:1px">VOUCHER DE VIAGEM</span>
            <div style="font-size:11px; color:#2d3748; font-weight:600; margin-top:6px">Emitido em: ${formatDate(today())}</div>
          </div>
        </div>

        <!-- DADOS DO CLIENTE / VIAGEM -->
        <div style="margin-bottom:24px; border: 1px solid #a0aec0; border-radius:8px; padding:18px; background:#f7fafc">
          <h4 style="font-size:14px; font-weight:800; text-transform:uppercase; color:#000000; border-bottom:1px solid #cbd5e0; padding-bottom:6px; margin:0 0 12px">Informações do Cliente / Grupo</h4>
          
          <table style="width:100%; font-size:13px; border-collapse:collapse; color:#1a202c">
            <tr>
              <td style="padding:5px 0; width:150px; color:#2d3748; font-weight:700">Nome do Titular:</td>
              <td style="padding:5px 0; font-weight:700; color:#000000">${client.name}</td>
            </tr>
            <tr>
              <td style="padding:5px 0; color:#2d3748; font-weight:700">Localidade Origem:</td>
              <td style="padding:5px 0; font-weight:700; color:#000000">${client.location || 'Não cadastrada'}</td>
            </tr>
            <tr>
              <td style="padding:5px 0; color:#2d3748; font-weight:700">Contatos:</td>
              <td style="padding:5px 0; font-weight:700; color:#000000; display:inline-flex; align-items:center; gap:8px">
                <span style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="phone" style="width:12px;height:12px;color:#1a202c"></i> ${client.phone || '—'}</span>
                <span>·</span>
                <span style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="mail" style="width:12px;height:12px;color:#1a202c"></i> ${client.email || '—'}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:5px 0; color:#2d3748; font-weight:700">Nº de Passageiros:</td>
              <td style="padding:5px 0; font-weight:700; color:#2b6cb0">${client.peopleCount || 1} pessoa(s)</td>
            </tr>
            <tr>
              <td style="padding:5px 0; color:#2d3748; font-weight:700">Faixa Etária:</td>
              <td style="padding:5px 0; font-weight:700; color:#000000">${client.ageGroup || 'Geral'}</td>
            </tr>
            ${client.description ? `
              <tr>
                <td style="padding:7px 0 4px; color:#2d3748; font-weight:700; vertical-align:top">Observações Gerais:</td>
                <td style="padding:7px 0 4px; color:#000000; line-height:1.4">${client.description}</td>
              </tr>` : ''}
          </table>
        </div>

        <!-- ITINERÁRIO DIÁRIO (DAY BY DAY) -->
        <div>
          <h4 style="font-size:14px; font-weight:800; text-transform:uppercase; color:#000000; border-bottom:1px solid #cbd5e0; padding-bottom:6px; margin:0 0 16px">Cronograma Diário da Viagem</h4>
          ${itinerarioHtml}
        </div>

        <!-- TERMOS E ASSINATURA -->
        <div style="margin-top:32px; padding-top:16px; border-top:1px solid #cbd5e0; page-break-inside: avoid">
          <div style="font-size:10px; color:#2d3748; line-height:1.5; margin-bottom:24px; text-align:justify">
            <strong>Termos e Condições:</strong> Este voucher constitui o documento de prestação de serviços turísticos oficial da empresa. Eventuais alterações no itinerário decorrentes de factors climáticos ou de força maior serão resolvidas em comum acordo com o cliente. O uso de veículos de apoio e a presença do guia credenciado estão garantidos para as datas escaladas acima.
          </div>
          
          <div style="display:flex; justify-content:space-between; align-items:flex-end; font-size:12px; color:#1a202c">
            <div style="display:flex; flex-direction:column; gap:4px">
              <strong>Contatos de Apoio:</strong>
              <span style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="instagram" style="width:12px;height:12px;color:#1a202c"></i> Instagram: <strong style="color:#000000">${settings.instagram || '@ciadacapivara'}</strong></span>
              ${settings.website ? `<span style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="globe" style="width:12px;height:12px;color:#1a202c"></i> Site: <strong style="color:#000000">${settings.website}</strong></span>` : ''}
            </div>
            <div style="text-align:center; width:220px; border-top:2px solid #1a202c; padding-top:8px; color:#000000">
              <strong>${settings.logoName || 'Cia da Capivara Turismo'}</strong><br>
              <span style="font-size:10px; color:#2d3748">Assinatura do Responsável</span>
            </div>
          </div>
        </div>

      </div>
    `;

    openModal('voucher-modal');
    lucide.createIcons();
  },

  downloadPDF() {
    const element = document.getElementById('voucher-print-area');
    if (!element) {
      showToast('Nenhum voucher disponível para exportar!', 'error');
      return;
    }

    // Buscar nome do cliente para usar no arquivo
    let clientName = 'Cliente';
    const clientTitleCell = element.querySelector('table td[style*="font-weight:700"]');
    if (clientTitleCell) {
      clientName = clientTitleCell.textContent.trim().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    }

    showToast('⏳ Gerando PDF do Voucher... Por favor, aguarde.', 'info');

    // Opções de configuração para o PDF
    const opt = {
      margin:       [12, 12, 12, 12],
      filename:     `Voucher_${clientName}_${today()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        backgroundColor: '#ffffff'
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Executar html2pdf
    html2pdf().set(opt).from(element).save().then(() => {
      showToast('✅ PDF do Voucher baixado com sucesso!', 'success');
    }).catch(err => {
      console.error('Erro ao gerar PDF:', err);
      showToast('❌ Erro ao exportar para PDF. Tente a opção "Imprimir" do navegador.', 'error');
    });
  }
};
