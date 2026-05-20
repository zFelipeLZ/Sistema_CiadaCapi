// ============================================================
// CARROS.JS — Módulo de gestão de frota (Carros)
// ============================================================

const Carros = {
  editingCarId: null,

  render() {
    this.renderCars();
  },

  renderCars(search = '') {
    let list = DB.get(DB.KEYS.CARS);
    if (search) {
      const f = search.toLowerCase();
      list = list.filter(c => 
        (c.model || '').toLowerCase().includes(f) || 
        (c.plate || '').toLowerCase().includes(f) || 
        (c.description || '').toLowerCase().includes(f)
      );
    }

    const grid = document.getElementById('cars-grid');
    const providers = DB.get(DB.KEYS.PROVIDERS);

    grid.innerHTML = list.map(c => {
      // Find driver associated with this car
      const driver = providers.find(p => p.role === 'motorista' && p.carId === c.id);
      
      const badgeCls = c.type === 'local' ? 'badge-success' : 'badge-warning';
      const badgeText = c.type === 'local' ? 'Local / Próprio' : 'Alugado';

      const status = c.status || 'disponivel';
      let statusBadge = '';
      if (status === 'disponivel') {
        statusBadge = `<span class="badge" style="font-size:10px; background:rgba(16,185,129,0.1); color:#10b981; border:1px solid rgba(16,185,129,0.2); display:inline-flex; align-items:center; gap:4px"><i data-lucide="check-circle" style="width:12px; height:12px"></i> Disponível</span>`;
      } else if (status === 'em_uso') {
        statusBadge = `<span class="badge" style="font-size:10px; background:rgba(59,130,246,0.1); color:#3b82f6; border:1px solid rgba(59,130,246,0.2); display:inline-flex; align-items:center; gap:4px"><i data-lucide="navigation" style="width:12px; height:12px"></i> Em Uso</span>`;
      } else if (status === 'manutencao') {
        statusBadge = `<span class="badge" style="font-size:10px; background:rgba(245,158,11,0.1); color:#f59e0b; border:1px solid rgba(245,158,11,0.2); display:inline-flex; align-items:center; gap:4px"><i data-lucide="alert-triangle" style="width:12px; height:12px"></i> Manutenção</span>`;
      }

      return `
        <div class="card" style="margin:0; display:flex; flex-direction:column; justify-content:space-between">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px">
              <div>
                <div style="display:flex; gap:6px; margin-bottom:6px; flex-wrap:wrap">
                  <span class="badge ${badgeCls}" style="font-size:10px">${badgeText}</span>
                  ${statusBadge}
                </div>
                <h4 style="font-size:18px; font-weight:700; margin:0; color:var(--text-main)">${c.model}</h4>
                <code style="font-size:12px; color:var(--text-muted); background:var(--bg-card2); padding:2px 6px; border-radius:4px; margin-top:4px; display:inline-block; letter-spacing:1px">${c.plate}</code>
              </div>
              <div style="color:var(--accent); display:flex; align-items:center"><i data-lucide="car" style="width:24px; height:24px"></i></div>
            </div>
            
            <p style="font-size:12px; color:var(--text-secondary); margin-bottom:16px; line-height:1.4">${c.description || '<i>Sem descrição cadastrada.</i>'}</p>
          </div>

          <div style="border-top: 1px solid var(--border); padding-top:12px; margin-top:12px">
            <div style="font-size:12px; margin-bottom:12px">
              <span style="color:var(--text-muted)">Vínculo:</span> 
              <strong>${driver ? `<span style="display:inline-flex; align-items:center; gap:4px"><i data-lucide="user" style="width:12px; height:12px"></i> ${driver.name} (Motorista)</span>` : `<span style="color:#10b981; display:inline-flex; align-items:center; gap:4px"><i data-lucide="check-circle" style="width:12px; height:12px"></i> Disponível</span>`}</strong>
            </div>
            
            <div style="display:flex; gap:8px">
              <button class="btn btn-sm btn-secondary" style="flex:1; display:inline-flex; align-items:center; justify-content:center; gap:4px" onclick="Carros.openCarForm('${c.id}')"><i data-lucide="pencil" style="width:14px; height:14px"></i> Editar</button>
              <button class="btn btn-sm btn-danger" style="display:inline-flex; align-items:center; justify-content:center; gap:4px" onclick="Carros.deleteCar('${c.id}')"><i data-lucide="trash-2" style="width:14px; height:14px"></i> Excluir</button>
            </div>
          </div>
        </div>`;
    }).join('') || `<div class="empty-state" style="grid-column:1/-1"><div class="icon"><i data-lucide="car" style="width:48px; height:48px; stroke-width:1.5"></i></div><p>Nenhum carro cadastrado</p></div>`;

    lucide.createIcons();
  },

  openCarForm(id = null) {
    this.editingCarId = id;
    const c = id ? DB.getOne(DB.KEYS.CARS, id) : null;
    document.getElementById('car-modal-title').textContent = id ? 'Editar Carro' : 'Novo Carro';
    
    const f = document.getElementById('car-form');
    f.querySelector('[name=model]').value  = c?.model  || '';
    f.querySelector('[name=plate]').value  = c?.plate  || '';
    f.querySelector('[name=type]').value   = c?.type   || 'local';
    f.querySelector('[name=status]').value = c?.status || 'disponivel';
    f.querySelector('[name=description]').value = c?.description || '';
    
    openModal('car-modal');
  },

  saveCar() {
    const f     = document.getElementById('car-form');
    const model = f.querySelector('[name=model]').value.trim();
    const plate = f.querySelector('[name=plate]').value.trim().toUpperCase();
    const type  = f.querySelector('[name=type]').value;
    
    if (!model || !plate) {
      showToast('Modelo e Placa são obrigatórios', 'error');
      return;
    }

    const car = {
      id: this.editingCarId || generateId(),
      model,
      plate,
      type,
      status: f.querySelector('[name=status]').value,
      description: f.querySelector('[name=description]').value.trim(),
      createdAt: this.editingCarId ? DB.getOne(DB.KEYS.CARS, this.editingCarId)?.createdAt : today(),
    };

    DB.save(DB.KEYS.CARS, car);
    closeModal('car-modal');
    this.renderCars();
    showToast(this.editingCarId ? '✅ Veículo atualizado!' : '✅ Veículo cadastrado com sucesso!', 'success');
  },

  deleteCar(id) {
    // Check if a driver is currently assigned to this car
    const providers = DB.get(DB.KEYS.PROVIDERS);
    const assignedDriver = providers.find(p => p.role === 'motorista' && p.carId === id);
    if (assignedDriver) {
      showToast(`⚠️ Este carro não pode ser excluído pois está associado ao motorista ${assignedDriver.name}!`, 'error');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este veículo da frota?')) return;
    
    DB.remove(DB.KEYS.CARS, id);
    this.renderCars();
    showToast('🗑 Veículo removido da frota', 'info');
  }
};
