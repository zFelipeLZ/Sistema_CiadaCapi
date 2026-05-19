// ============================================================
// FUNCIONARIOS.JS — Fluxo de funcionários e tarefas
// ============================================================

const Funcionarios = {
  editingEmpId: null,
  editingTaskId: null,

  render() {
    this.renderEmployees();
    this.renderTasks();
  },

  renderEmployees(search = '') {
    let list = DB.get(DB.KEYS.EMPLOYEES);
    if (search) {
      const f = search.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(f) || e.role.toLowerCase().includes(f));
    }
    const grid = document.getElementById('emp-grid');
    grid.innerHTML = list.map(e => {
      const tasks = DB.get(DB.KEYS.TASKS).filter(t => t.employeeId === e.id);
      const active = tasks.filter(t => t.status !== 'done').length;
      const roleColor = {
        'Guia': 'amber', 'Motorista': 'blue', 'Recepcionista': 'green', 'Arqueó': 'purple'
      };
      let color = 'amber';
      for (const [k, v] of Object.entries(roleColor)) {
        if (e.role.includes(k)) { color = v; break; }
      }
      return `
        <div class="card" style="margin:0">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
            <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--${color}),var(--${color}-dark,var(--${color})));display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;flex-shrink:0">
              ${e.name.charAt(0)}
            </div>
            <div>
              <div style="font-weight:700">${e.name}</div>
              <div style="font-size:12px;color:var(--text-secondary)">${e.role}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-bottom:12px">
            <div style="flex:1;background:var(--bg-card2);border-radius:8px;padding:10px;text-align:center">
              <div style="font-size:20px;font-weight:800;color:var(--accent)">${tasks.length}</div>
              <div style="font-size:10px;color:var(--text-muted)">TOTAL</div>
            </div>
            <div style="flex:1;background:var(--bg-card2);border-radius:8px;padding:10px;text-align:center">
              <div style="font-size:20px;font-weight:800;color:var(--${active>0?'blue':'green'})">${active}</div>
              <div style="font-size:10px;color:var(--text-muted)">ATIVAS</div>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">
            📱 ${e.phone || '—'}<br>📧 ${e.email || '—'}
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm btn-secondary" style="flex:1" onclick="Funcionarios.openTaskForm(null,'${e.id}')">+ Tarefa</button>
            <button class="btn btn-sm btn-secondary" onclick="Funcionarios.openEmpForm('${e.id}')">✏️</button>
            <button class="btn btn-sm btn-danger"    onclick="Funcionarios.deleteEmp('${e.id}')">🗑</button>
          </div>
        </div>`;
    }).join('') || `<div class="empty-state" style="grid-column:1/-1"><div class="icon">👷</div><p>Nenhum funcionário cadastrado</p></div>`;
  },

  renderTasks(filterEmp = '', filterStatus = '', filterDate = '') {
    let list = DB.get(DB.KEYS.TASKS);
    if (filterEmp)    list = list.filter(t => t.employeeId === filterEmp);
    if (filterStatus) list = list.filter(t => t.status === filterStatus);
    if (filterDate)   list = list.filter(t => t.date === filterDate);
    list = [...list].sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));

    const tbody = document.getElementById('tasks-tbody');
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="icon">📋</div><p>Nenhuma tarefa encontrada</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(t => {
      const emp = DB.getOne(DB.KEYS.EMPLOYEES, t.employeeId);
      const s   = STATUS_LABELS[t.status] || {};
      const isToday = t.date === today();
      return `<tr ${isToday ? 'style="background:rgba(245,158,11,0.04)"' : ''}>
        <td>
          <strong>${t.title}</strong>
          <div style="font-size:12px;color:var(--text-secondary)">${t.description}</div>
        </td>
        <td>${emp?.name || '—'}<br><small style="color:var(--text-muted)">${emp?.role||''}</small></td>
        <td>
          ${t.departure ? `<div style="font-size:12px;color:var(--text-secondary)">🛫 ${t.departure}</div>` : ''}
          <div>📍 ${t.destination || '—'}</div>
        </td>
        <td>${formatDate(t.date)}${isToday ? ' <span class="badge badge-warning" style="font-size:10px">HOJE</span>' : ''}</td>
        <td>${t.time || '—'}</td>
        <td><span class="badge ${s.cls}">${s.label}</span></td>
        <td>
          <div style="display:flex;gap:6px">
            ${t.status !== 'done' ? `<button class="btn btn-sm btn-success" onclick="Funcionarios.advanceTask('${t.id}')">↑</button>` : ''}
            <button class="btn btn-sm btn-secondary" onclick="Funcionarios.openTaskForm('${t.id}')">✏️</button>
            <button class="btn btn-sm btn-danger"    onclick="Funcionarios.deleteTask('${t.id}')">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  },

  openEmpForm(id = null) {
    this.editingEmpId = id;
    const e = id ? DB.getOne(DB.KEYS.EMPLOYEES, id) : null;
    document.getElementById('emp-modal-title').textContent = id ? 'Editar Funcionário' : 'Novo Funcionário';
    const f = document.getElementById('emp-form');
    f.querySelector('[name=name]').value  = e?.name  || '';
    f.querySelector('[name=role]').value  = e?.role  || '';
    f.querySelector('[name=phone]').value = e?.phone || '';
    f.querySelector('[name=email]').value = e?.email || '';
    f.querySelector('[name=notes]').value = e?.notes || '';
    openModal('emp-modal');
  },

  saveEmp() {
    const f    = document.getElementById('emp-form');
    const name = f.querySelector('[name=name]').value.trim();
    const role = f.querySelector('[name=role]').value.trim();
    if (!name || !role) { showToast('Nome e função são obrigatórios', 'error'); return; }
    const emp = {
      id:        this.editingEmpId || generateId(),
      name,
      role,
      phone:     f.querySelector('[name=phone]').value.trim(),
      email:     f.querySelector('[name=email]').value.trim(),
      notes:     f.querySelector('[name=notes]').value.trim(),
      createdAt: this.editingEmpId ? DB.getOne(DB.KEYS.EMPLOYEES, this.editingEmpId)?.createdAt : today(),
    };
    DB.save(DB.KEYS.EMPLOYEES, emp);
    closeModal('emp-modal');
    this.renderEmployees();
    showToast(this.editingEmpId ? '✅ Funcionário atualizado!' : '✅ Funcionário cadastrado!', 'success');
  },

  deleteEmp(id) {
    if (!confirm('Excluir este funcionário?')) return;
    DB.remove(DB.KEYS.EMPLOYEES, id);
    this.renderEmployees();
    this.renderTasks();
    showToast('🗑 Funcionário removido', 'info');
  },

  openTaskForm(taskId = null, preEmpId = null) {
    this.editingTaskId = taskId;
    const t   = taskId ? DB.getOne(DB.KEYS.TASKS, taskId) : null;
    const emps = DB.get(DB.KEYS.EMPLOYEES);
    document.getElementById('task-modal-title').textContent = taskId ? 'Editar Tarefa' : 'Nova Tarefa';

    const empSel = document.getElementById('task-sel-emp');
    empSel.innerHTML = `<option value="">— Selecione —</option>` +
      emps.map(e => `<option value="${e.id}">${e.name} (${e.role})</option>`).join('');

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
    if (!empId || !title) { showToast('Funcionário e título são obrigatórios', 'error'); return; }
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
      const emp = DB.getOne(DB.KEYS.EMPLOYEES, empId);
      if (emp) EmailNotifier.notifyEmployee(emp, task);
    }
    closeModal('task-modal');
    this.renderEmployees();
    this.renderTasks();
    showToast(isNew ? '✅ Tarefa criada!' : '✅ Tarefa atualizada!', 'success');
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
    if (!confirm('Excluir esta tarefa?')) return;
    DB.remove(DB.KEYS.TASKS, id);
    this.renderTasks();
    this.renderEmployees();
    showToast('🗑 Tarefa removida', 'info');
  },
};
