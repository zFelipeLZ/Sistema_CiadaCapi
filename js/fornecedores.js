// ============================================================
// FORNECEDORES.JS — Fluxo de fornecedores, escalas e missões
// ============================================================

const Fornecedores = {
  editingEmpId: null,
  editingTaskId: null,

  render() {
    this.renderEmployees();
    this.renderTasks();
  },

  handleRoleChange() {
    const roleSelect = document.getElementById('emp-form-role');
    if (!roleSelect) return;
    const role = roleSelect.value;
    const groupCar = document.getElementById('group-car');
    const groupLocation = document.getElementById('group-location');

    if (role === 'motorista') {
      groupCar.style.display = 'block';
      groupLocation.style.display = 'none';

      // Popular select de carros
      const cars = DB.get(DB.KEYS.CARS);
      const selCar = document.getElementById('emp-sel-car');
      
      const statusMeta = {
        'disponivel': { label: 'Disponível', icon: '[Disponível]' },
        'em_uso': { label: 'Em Uso', icon: '[Em Uso]' },
        'manutencao': { label: 'Manutenção', icon: '[Manutenção]' }
      };

      selCar.innerHTML = '<option value="">— Sem Veículo Vinculado —</option>' +
        cars.map(c => {
          const status = c.status || 'disponivel';
          const meta = statusMeta[status] || statusMeta['disponivel'];
          return `<option value="${c.id}">${c.model} (${c.plate}) ${meta.icon}</option>`;
        }).join('');
    } else if (role === 'hotel') {
      groupCar.style.display = 'none';
      groupLocation.style.display = 'block';
    } else {
      groupCar.style.display = 'none';
      groupLocation.style.display = 'none';
    }
  },

  renderEmployees(search = '') {
    let list = DB.get(DB.KEYS.PROVIDERS);
    if (search) {
      const f = search.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(f) || e.role.toLowerCase().includes(f));
    }
    const grid = document.getElementById('emp-grid');

    const roleMeta = {
      'guia': { label: 'Guia / Condutor', color: 'amber', icon: 'compass' },
      'motorista': { label: 'Motorista', color: 'blue', icon: 'car' },
      'hotel': { label: 'Hotel', color: 'green', icon: 'hotel' },
      'outros': { label: 'Outros', color: 'purple', icon: 'handshake' }
    };

    grid.innerHTML = list.map(e => {
      const tasks = DB.get(DB.KEYS.TASKS).filter(t => t.employeeId === e.id);
      const active = tasks.filter(t => t.status !== 'done').length;
      
      const meta = roleMeta[e.role] || roleMeta['outros'];
      const color = meta.color;
      const icon = meta.icon;
      const roleLabel = meta.label;

      let extraHTML = '';
      if (e.role === 'motorista') {
        if (e.carId) {
          const car = DB.getOne(DB.KEYS.CARS, e.carId);
          if (car) {
            extraHTML = `
              <div style="margin-top:8px; padding:6px 10px; background:var(--bg-card2); border-radius:6px; font-size:12px; display:flex; align-items:center; gap:6px">
                <i data-lucide="car" style="width:14px; height:14px"></i> Veículo: <strong>${car.model}</strong> (<code style="font-size:10px">${car.plate}</code>)
              </div>`;
          } else {
            extraHTML = `
              <div style="margin-top:8px; padding:6px 10px; background:var(--bg-card2); border-radius:6px; font-size:12px; color:var(--red); display:flex; align-items:center; gap:6px">
                <i data-lucide="alert-triangle" style="width:14px; height:14px"></i> Carro associado não encontrado!
              </div>`;
          }
        } else {
          extraHTML = `
            <div style="margin-top:8px; padding:6px 10px; background:var(--bg-card2); border-radius:6px; font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:6px">
              <i data-lucide="car" style="width:14px; height:14px"></i> Sem veículo vinculado
            </div>`;
        }
      } else if (e.role === 'hotel' && e.hotelLocation) {
        extraHTML = `
          <div style="margin-top:8px; padding:6px 10px; background:var(--bg-card2); border-radius:6px; font-size:12px; word-break:break-word; display:flex; align-items:flex-start; gap:6px">
            <i data-lucide="map-pin" style="width:14px; height:14px; flex-shrink:0; margin-top:2px"></i> <span>Localização: <strong>${e.hotelLocation}</strong></span>
          </div>`;
      }

      return `
        <div class="card" style="margin:0">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
            <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--${color}),var(--${color}-dark,var(--${color})));display:flex;align-items:center;justify-content:center;color:white;flex-shrink:0">
              <i data-lucide="${icon}" style="width:24px; height:24px"></i>
            </div>
            <div>
              <div style="font-weight:700">${e.name}</div>
              <div style="font-size:12px;color:var(--text-secondary)">${roleLabel}</div>
            </div>
          </div>
          
          ${extraHTML}

          <div style="display:flex;gap:8px;margin:12px 0">
            <div style="flex:1;background:var(--bg-card2);border-radius:8px;padding:8px;text-align:center">
              <div style="font-size:18px;font-weight:800;color:var(--accent)">${tasks.length}</div>
              <div style="font-size:9px;color:var(--text-muted)">TOTAL</div>
            </div>
            <div style="flex:1;background:var(--bg-card2);border-radius:8px;padding:8px;text-align:center">
              <div style="font-size:18px;font-weight:800;color:var(--${active>0?'blue':'green'})">${active}</div>
              <div style="font-size:9px;color:var(--text-muted)">ATIVAS</div>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;display:flex;flex-direction:column;gap:4px">
            <span style="display:inline-flex;align-items:center;gap:6px"><i data-lucide="phone" style="width:12px; height:12px"></i> ${e.phone || '—'}</span>
            <span style="display:inline-flex;align-items:center;gap:6px"><i data-lucide="mail" style="width:12px; height:12px"></i> ${e.email || '—'}</span>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm btn-secondary" style="flex:1; display:inline-flex; align-items:center; justify-content:center; gap:4px" onclick="Fornecedores.openTaskForm(null,'${e.id}')"><i data-lucide="calendar" style="width:12px; height:12px"></i> Escala</button>
            <button class="btn btn-sm btn-secondary" style="display:inline-flex; align-items:center; justify-content:center" onclick="Fornecedores.openEmpForm('${e.id}')" title="Editar"><i data-lucide="pencil" style="width:12px; height:12px"></i></button>
            <button class="btn btn-sm btn-danger" style="display:inline-flex; align-items:center; justify-content:center" onclick="Fornecedores.deleteEmp('${e.id}')" title="Excluir"><i data-lucide="trash-2" style="width:12px; height:12px"></i></button>
          </div>
        </div>`;
    }).join('') || `<div class="empty-state" style="grid-column:1/-1"><div class="icon"><i data-lucide="handshake" style="width:48px; height:48px; stroke-width:1.5"></i></div><p>Nenhum fornecedor cadastrado</p></div>`;

    lucide.createIcons();
  },

  renderTasks(filterEmp = '', filterStatus = '', filterDate = '') {
    let list = DB.get(DB.KEYS.TASKS);
    if (filterEmp)    list = list.filter(t => t.employeeId === filterEmp);
    if (filterStatus) list = list.filter(t => t.status === filterStatus);
    if (filterDate)   list = list.filter(t => t.date === filterDate);
    list = [...list].sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));

    const tbody = document.getElementById('tasks-tbody');
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="icon"><i data-lucide="clipboard" style="width:48px; height:48px; stroke-width:1.5"></i></div><p>Nenhuma tarefa ou escala encontrada</p></div></td></tr>`;
      lucide.createIcons();
      return;
    }

    const roleMeta = {
      'guia': { label: 'Guia' },
      'motorista': { label: 'Motorista' },
      'hotel': { label: 'Hotel' },
      'outros': { label: 'Outros' }
    };

    tbody.innerHTML = list.map(t => {
      const emp = DB.getOne(DB.KEYS.PROVIDERS, t.employeeId);
      const s   = STATUS_LABELS[t.status] || {};
      const isToday = t.date === today();
      const roleLabel = emp ? (roleMeta[emp.role]?.label || 'Outros') : '';

      return `<tr ${isToday ? 'style="background:rgba(245,158,11,0.04)"' : ''}>
        <td>
          <strong>${t.title}</strong>
          <div style="font-size:12px;color:var(--text-secondary)">${t.description}</div>
        </td>
        <td>
          <strong>${emp?.name || '—'}</strong><br>
          <small style="color:var(--text-muted)">${roleLabel}</small>
        </td>
        <td>
          ${t.departure ? `<div style="font-size:12px;color:var(--text-secondary);display:inline-flex;align-items:center;gap:4px"><i data-lucide="plane-takeoff" style="width:12px;height:12px"></i> ${t.departure}</div><br>` : ''}
          <div style="display:inline-flex;align-items:center;gap:4px"><i data-lucide="map-pin" style="width:12px;height:12px"></i> ${t.destination || '—'}</div>
        </td>
        <td>
          ${formatDate(t.date)}${isToday ? ' <span class="badge badge-warning" style="font-size:10px">HOJE</span>' : ''}<br>
          <small style="color:var(--text-muted);display:inline-flex;align-items:center;gap:4px"><i data-lucide="clock" style="width:12px;height:12px"></i> ${t.time || '—'}</small>
        </td>
        <td><span class="badge ${s.cls}">${s.label}</span></td>
        <td>
          <div style="display:flex;gap:6px">
            ${t.status !== 'done' ? `<button class="btn btn-sm btn-success" style="display:inline-flex;align-items:center;justify-content:center" title="Avançar status" onclick="Fornecedores.advanceTask('${t.id}')"><i data-lucide="chevron-right" style="width:12px;height:12px"></i></button>` : ''}
            <button class="btn btn-sm btn-secondary" style="display:inline-flex; align-items:center; justify-content:center" onclick="Fornecedores.openTaskForm('${t.id}')" title="Editar"><i data-lucide="pencil" style="width:12px;height:12px"></i></button>
            <button class="btn btn-sm btn-danger" style="display:inline-flex; align-items:center; justify-content:center" onclick="Fornecedores.deleteTask('${t.id}')" title="Excluir"><i data-lucide="trash-2" style="width:12px;height:12px"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');

    lucide.createIcons();
  },

  openEmpForm(id = null) {
    this.editingEmpId = id;
    const e = id ? DB.getOne(DB.KEYS.PROVIDERS, id) : null;
    document.getElementById('emp-modal-title').textContent = id ? 'Editar Fornecedor' : 'Novo Fornecedor';
    
    const f = document.getElementById('emp-form');
    f.querySelector('[name=name]').value  = e?.name  || '';
    f.querySelector('[name=role]').value  = e?.role  || 'guia';
    f.querySelector('[name=phone]').value = e?.phone || '';
    f.querySelector('[name=email]').value = e?.email || '';
    f.querySelector('[name=notes]').value = e?.notes || '';

    // Tratar exibição dos campos adicionais
    this.handleRoleChange();

    if (e?.role === 'motorista') {
      f.querySelector('[name=carId]').value = e?.carId || '';
    } else if (e?.role === 'hotel') {
      f.querySelector('[name=hotelLocation]').value = e?.hotelLocation || '';
    }

    openModal('emp-modal');
  },

  saveEmp() {
    const f    = document.getElementById('emp-form');
    const name = f.querySelector('[name=name]').value.trim();
    const role = f.querySelector('[name=role]').value;
    
    if (!name || !role) { 
      showToast('Nome e Função são obrigatórios', 'error'); 
      return; 
    }

    const emp = {
      id:        this.editingEmpId || generateId(),
      name,
      role,
      phone:     f.querySelector('[name=phone]').value.trim(),
      email:     f.querySelector('[name=email]').value.trim(),
      notes:     f.querySelector('[name=notes]').value.trim(),
      carId:     role === 'motorista' ? f.querySelector('[name=carId]').value : '',
      hotelLocation: role === 'hotel' ? f.querySelector('[name=hotelLocation]').value.trim() : '',
      createdAt: this.editingEmpId ? DB.getOne(DB.KEYS.PROVIDERS, this.editingEmpId)?.createdAt : today(),
    };

    // O vínculo de carro para o motorista passou a ser opcional, portanto não barramos caso esteja em branco.
    if (role === 'hotel' && !emp.hotelLocation) {
      showToast('⚠️ Insira o local/endereço do hotel!', 'error');
      return;
    }

    DB.save(DB.KEYS.PROVIDERS, emp);
    closeModal('emp-modal');
    this.renderEmployees();
    this.renderTasks(); // Re-render to update driver/vehicle details if visible
    showToast(this.editingEmpId ? '✅ Fornecedor atualizado!' : '✅ Fornecedor cadastrado!', 'success');
  },

  deleteEmp(id) {
    if (!confirm('Tem certeza que deseja excluir este fornecedor? As tarefas vinculadas a ele ficarão sem fornecedor.')) return;
    DB.remove(DB.KEYS.PROVIDERS, id);
    this.renderEmployees();
    this.renderTasks();
    showToast('🗑 Fornecedor removido', 'info');
  },

  openTaskForm(taskId = null, preEmpId = null) {
    this.editingTaskId = taskId;
    const t   = taskId ? DB.getOne(DB.KEYS.TASKS, taskId) : null;
    const providers = DB.get(DB.KEYS.PROVIDERS);
    document.getElementById('task-modal-title').textContent = taskId ? 'Editar Escala' : 'Nova Escala';

    const roleMeta = {
      'guia': 'Guia',
      'motorista': 'Motorista',
      'hotel': 'Hotel',
      'outros': 'Outro'
    };

    const empSel = document.getElementById('task-sel-emp');
    empSel.innerHTML = `<option value="">— Selecione o Fornecedor —</option>` +
      providers.map(e => `<option value="${e.id}">${e.name} (${roleMeta[e.role] || 'Outro'})</option>`).join('');

    const f = document.getElementById('task-form');
    f.querySelector('[name=employeeId]').value  = t?.employeeId  || preEmpId || '';
    f.querySelector('[name=title]').value       = t?.title       || '';
    f.querySelector('[name=description]').value = t?.description || '';
    f.querySelector('[name=departure]').value   = t?.departure   || '';
    f.querySelector('[name=destination]').value = t?.destination || '';
    f.querySelector('[name=date]').value        = t?.date        || today();
    f.querySelector('[name=time]').value        = t?.time        || '08:00';
    f.querySelector('[name=status]').value      = t?.status      || 'pending';
    openModal('task-modal');
  },

  saveTask() {
    const f   = document.getElementById('task-form');
    const empId = f.querySelector('[name=employeeId]').value;
    const title = f.querySelector('[name=title]').value.trim();
    
    if (!empId || !title) { 
      showToast('Fornecedor e Título são obrigatórios', 'error'); 
      return; 
    }
    
    const isNew = !this.editingTaskId;
    const task = {
      id:          this.editingTaskId || generateId(),
      employeeId:  empId,
      title,
      description: f.querySelector('[name=description]').value.trim(),
      departure:   f.querySelector('[name=departure]').value.trim(),
      destination: f.querySelector('[name=destination]').value.trim(),
      date:        f.querySelector('[name=date]').value,
      time:        f.querySelector('[name=time]').value,
      status:      f.querySelector('[name=status]').value,
    };
    DB.save(DB.KEYS.TASKS, task);
    
    if (isNew) {
      const emp = DB.getOne(DB.KEYS.PROVIDERS, empId);
      if (emp) EmailNotifier.notifyEmployee(emp, task);
    }
    
    closeModal('task-modal');
    this.renderEmployees();
    this.renderTasks();
    showToast(isNew ? '✅ Escala criada com sucesso!' : '✅ Escala atualizada!', 'success');
  },

  advanceTask(id) {
    const t = DB.getOne(DB.KEYS.TASKS, id);
    if (!t) return;
    const flow = ['pending', 'in_progress', 'done'];
    const idx  = flow.indexOf(t.status);
    if (idx >= flow.length - 1) return;
    t.status = flow[idx + 1];
    DB.save(DB.KEYS.TASKS, t);
    this.renderTasks();
    this.renderEmployees();
    showToast(`Status: ${STATUS_LABELS[t.status]?.label}`, 'success');
  },

  deleteTask(id) {
    if (!confirm('Deseja excluir esta escala do painel?')) return;
    DB.remove(DB.KEYS.TASKS, id);
    this.renderTasks();
    this.renderEmployees();
    showToast('🗑 Escala removida', 'info');
  },
};
