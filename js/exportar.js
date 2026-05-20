// ============================================================
// EXPORTAR.JS — Módulo do Painel de Segurança e Backups
// Cia da Capivara Turismo e Aventura
// ============================================================

const BackupPanel = {
  _pendingRestoreFilename: null,
  _pendingUploadData: null,
  isOnline: false,

  async render() {
    this.setupDropzone();
    await this.loadStats();
  },

  // ——— CARREGAMENTO DE DADOS E HISTÓRICO —————————————————————
  async loadStats() {
    try {
      // Se estiver rodando pelo protocolo file://, já sabemos que está offline do servidor local
      if (window.location.protocol === 'file:') {
        throw new Error('Protocolo local file:// detectado.');
      }

      const res = await fetch('/api/backup/list');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      const active = json.activeDatabase;
      const backups = json.backups;

      this.isOnline = true;

      // 1. Atualizar contadores do Dashboard de Saúde
      document.getElementById('db-health-size').textContent = active.size || '0 KB';
      
      // Obter contadores do cache local ou do retorno do servidor
      const clientsCount = active.tablesInfo.clients || 0;
      const bookingsCount = active.tablesInfo.bookings || 0;
      
      document.getElementById('db-health-clients').textContent = clientsCount;
      document.getElementById('db-health-bookings').textContent = bookingsCount;
      document.getElementById('db-health-backups-count').textContent = `${backups.length} / 7`;

      // 2. Renderizar lista de backups na tabela
      const tbody = document.getElementById('backups-tbody');
      if (!backups.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center; padding:32px; color:var(--text-muted);">
              <i data-lucide="info" style="width:16px; height:16px; vertical-align:middle; margin-right:4px;"></i>
              Nenhuma cópia de segurança armazenada localmente.
            </td>
          </tr>`;
        lucide.createIcons();
        return;
      }

      tbody.innerHTML = backups.map(b => {
        const d = new Date(b.createdAt);
        const formattedDate = d.toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        const typeBadge = b.type === 'Manual' 
          ? '<span class="badge badge-success" style="background:rgba(46,204,113,0.15); color:var(--green);">Manual</span>'
          : b.type === 'Inicialização'
          ? '<span class="badge badge-info" style="background:rgba(52,152,219,0.15); color:var(--blue);">Inicialização</span>'
          : '<span class="badge badge-warning" style="background:rgba(255,215,0,0.15); color:var(--accent);">Automático</span>';

        return `
          <tr>
            <td style="font-weight: 500; font-family: monospace; font-size:12px; color:var(--text-primary);"><i data-lucide="database" class="table-icon" style="color:var(--text-secondary); width:14px; height:14px; margin-right:6px; vertical-align:middle;"></i>${b.name}</td>
            <td style="color:var(--text-secondary);">${b.size}</td>
            <td style="color:var(--text-secondary);">${formattedDate}</td>
            <td>${typeBadge}</td>
            <td style="text-align:right;">
              <button class="btn btn-sm btn-secondary" style="border-color:var(--border2); color:var(--accent); font-size:11px; padding:4px 10px;" onclick="BackupPanel.promptRestore('${b.name}')">
                <i data-lucide="rotate-ccw" style="width:12px; height:12px; margin-right:4px; vertical-align:middle;"></i> Restaurar
              </button>
            </td>
          </tr>`;
      }).join('');

      lucide.createIcons();
    } catch (err) {
      console.warn('⚠️ Central de segurança em modo offline ou sem servidor:', err.message);
      this.isOnline = false;

      // Fallback rico e limpo para o Dashboard de Saúde
      document.getElementById('db-health-size').innerHTML = `
        <span style="font-size: 11px; color: var(--text-muted); font-weight: normal; display: flex; align-items: center; gap: 4px;">
          <i data-lucide="wifi-off" style="width:12px; height:12px; color: var(--accent);"></i> Local (Navegador)
        </span>`;
      
      const clientsLocalCount = DB.get(DB.KEYS.CLIENTS).length || 0;
      const bookingsLocalCount = DB.get(DB.KEYS.BOOKINGS).length || 0;
      
      document.getElementById('db-health-clients').textContent = clientsLocalCount;
      document.getElementById('db-health-bookings').textContent = bookingsLocalCount;
      document.getElementById('db-health-backups-count').innerHTML = `
        <span style="font-size: 11px; color: var(--text-muted); font-weight: normal;">Indisponível</span>`;

      // Renderizar o card explicativo rico em estética dentro da tabela
      const tbody = document.getElementById('backups-tbody');
      
      let instructionsHtml = '';
      if (window.location.protocol === 'file:') {
        instructionsHtml = `
          O sistema foi aberto diretamente a partir dos arquivos locais (protocolo <code>file://</code>). 
          Para gerenciar backups físicos do SQLite, você deve acessar o painel pelo endereço oficial 
          <a href="http://localhost:3000" target="_blank" style="color: var(--accent); font-weight: 600; text-decoration: underline;">http://localhost:3000</a>.
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 14px; width: 100%; margin-top: 12px; text-align: left;">
            <span style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Como Inicializar:</span>
            <span style="font-size: 11px; color: var(--text-secondary); display: flex; align-items: center; gap: 6px; font-family: monospace;">
              <i data-lucide="play" style="width: 10px; height: 10px; color: var(--accent);"></i> Dê duplo clique em "Iniciar_Sistema.bat" na raiz do projeto.
            </span>
          </div>`;
      } else {
        instructionsHtml = `
          O servidor local corporativo não está respondendo. O histórico de cópias locais físicas e restaurações do SQLite requer o servidor ativo.
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 14px; width: 100%; margin-top: 12px; text-align: left;">
            <span style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Como reativar:</span>
            <span style="font-size: 11px; color: var(--text-secondary); display: flex; align-items: center; gap: 6px; font-family: monospace;">
              <i data-lucide="play" style="width: 10px; height: 10px; color: var(--accent);"></i> Certifique-se de que o console do "Iniciar_Sistema.bat" está aberto.
            </span>
          </div>`;
      }

      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="padding: 40px 24px; text-align: center;">
            <div style="max-width: 440px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 12px;">
              <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(255, 215, 0, 0.08); display: flex; align-items: center; justify-content: center; color: var(--accent); margin-bottom: 4px;">
                <i data-lucide="shield-alert" style="width: 24px; height: 24px;"></i>
              </div>
              <h3 style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0;">Servidor Corporativo Desconectado</h3>
              <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin: 0;">
                ${instructionsHtml}
              </p>
            </div>
          </td>
        </tr>`;
      lucide.createIcons();
    }
  },

  // ——— GERAÇÃO DE BACKUP MANUAL ——————————————————————————————
  async createBackup() {
    if (!this.isOnline) {
      showToast('Ação indisponível no Modo Local. Por favor, inicialize o sistema corporativo via "Iniciar_Sistema.bat".', 'warning');
      return;
    }
    showLoadingOverlay('Criando cópia de segurança no servidor...');
    try {
      const res = await fetch('/api/backup/create', { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      showToast('Cópia de segurança manual criada com sucesso!', 'success');
      await this.loadStats();
    } catch (e) {
      showToast('Falha ao gerar backup: ' + e.message, 'error');
    } finally {
      hideLoadingOverlay();
    }
  },

  // ——— DOWNLOAD DO BANCO FÍSICO ——————————————————————————————
  downloadBackup() {
    if (!this.isOnline) {
      showToast('Ação indisponível no Modo Local. Por favor, inicialize o sistema corporativo via "Iniciar_Sistema.bat".', 'warning');
      return;
    }
    showToast('Iniciando download do banco de dados físico da empresa...', 'success');
    const link = document.createElement('a');
    link.href = '/api/backup/download';
    link.download = 'ciadacapivara_backup.db';
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  // ——— RESTAURAÇÃO DE BACKUP LOCAL ———————————————————————————
  promptRestore(filename) {
    if (!this.isOnline) {
      showToast('Ação indisponível no Modo Local. Por favor, inicialize o sistema corporativo via "Iniciar_Sistema.bat".', 'warning');
      return;
    }
    this._pendingRestoreFilename = filename;
    document.getElementById('restore-target-name').textContent = filename;
    
    // Configura ação do botão de confirmação do modal
    const actBtn = document.getElementById('btn-confirm-restore-act');
    actBtn.className = 'btn btn-danger';
    actBtn.innerHTML = '<i data-lucide="refresh-cw" style="width:14px; height:14px; margin-right:6px; vertical-align:middle;"></i> Confirmar e Restaurar';
    actBtn.onclick = () => this.executeRestore();
    
    openModal('modal-confirm-restore');
    lucide.createIcons();
  },

  async executeRestore() {
    closeModal('modal-confirm-restore');
    showLoadingOverlay('Iniciando restauração de dados...');
    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: this._pendingRestoreFilename })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      // Sincronizar cache client-side imediatamente
      showLoadingOverlay('Atualizando painel administrativo local...');
      await DB.initServerDB();

      showToast('Banco de dados restaurado e sincronizado com sucesso!', 'success');
      
      // Redireciona para o dashboard principal para renderizar tudo atualizado
      Router.navigate('dashboard');
    } catch (err) {
      showToast('Erro ao restaurar banco de dados: ' + err.message, 'error');
    } finally {
      hideLoadingOverlay();
    }
  },

  // ——— RESTAURAÇÃO VIA UPLOAD DE ARQUIVO EXTERNO ——————————————
  handleFileUpload(event) {
    if (!this.isOnline) {
      showToast('Ação indisponível no Modo Local. Por favor, inicialize o sistema corporativo via "Iniciar_Sistema.bat".', 'warning');
      event.target.value = '';
      return;
    }
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.db')) {
      showToast('Formato de arquivo inválido. Por favor, envie uma base de dados SQLite (.db).', 'error');
      event.target.value = '';
      return;
    }

    showLoadingOverlay('Analisando arquivo enviado...');
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const dataUrl = e.target.result;
        const base64Data = dataUrl.split(',')[1];
        
        hideLoadingOverlay();
        this.promptUploadRestore(base64Data, file.name);
      } catch (err) {
        showToast('Erro ao ler o arquivo enviado.', 'error');
        hideLoadingOverlay();
      }
    };
    reader.readAsDataURL(file);
    event.target.value = ''; // Limpar input
  },

  promptUploadRestore(base64Data, filename) {
    this._pendingUploadData = base64Data;
    document.getElementById('restore-target-name').innerHTML = `Upload Externo: <span style="font-family:monospace; color:var(--red); font-size:12px;">${filename}</span>`;
    
    // Configura ação do botão de confirmação do modal
    const actBtn = document.getElementById('btn-confirm-restore-act');
    actBtn.className = 'btn btn-danger';
    actBtn.innerHTML = '<i data-lucide="upload" style="width:14px; height:14px; margin-right:6px; vertical-align:middle;"></i> Confirmar Upload e Sobrescrever';
    actBtn.onclick = () => this.executeUploadRestore();
    
    openModal('modal-confirm-restore');
    lucide.createIcons();
  },

  async executeUploadRestore() {
    closeModal('modal-confirm-restore');
    showLoadingOverlay('Fazendo upload e substituindo banco de dados ativo...');
    try {
      const res = await fetch('/api/backup/upload-restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData: this._pendingUploadData })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      // Sincronizar cache client-side imediatamente
      showLoadingOverlay('Sincronizando painel local com a nova base...');
      await DB.initServerDB();

      showToast('Base de dados externa carregada e sincronizada com sucesso!', 'success');
      Router.navigate('dashboard');
    } catch (err) {
      showToast('Erro ao carregar base de dados: ' + err.message, 'error');
    } finally {
      hideLoadingOverlay();
      this._pendingUploadData = null;
    }
  },

  // ——— CONFIGURAÇÃO DE ARRASTE E SOLTE (DRAG & DROP) ——————————
  setupDropzone() {
    const dropzone = document.getElementById('db-upload-dropzone');
    if (!dropzone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.style.borderColor = 'var(--accent)';
        dropzone.style.background = 'rgba(255, 215, 0, 0.04)';
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.style.borderColor = 'var(--border2)';
        dropzone.style.background = 'var(--bg-card2)';
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length) {
        const file = files[0];
        if (file.name.endsWith('.db')) {
          const fakeEvent = { target: { files: [file] } };
          this.handleFileUpload(fakeEvent);
        } else {
          showToast('Formato inválido. Por favor, arraste um arquivo de banco SQLite (.db).', 'error');
        }
      }
    }, false);
  }
};
