// ============================================================
// DOCUMENTOS.JS — Anexo e gestão de documentos/PDFs
// ============================================================

const Documentos = {
  render() { this.renderList(); },

  renderList(search = '') {
    let list = DB.get(DB.KEYS.DOCUMENTS);
    if (search) {
      const f = search.toLowerCase();
      list = list.filter(d => d.name.toLowerCase().includes(f) || d.relatedName?.toLowerCase().includes(f));
    }
    list = [...list].reverse();

    const grid = document.getElementById('docs-grid');
    if (!list.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="icon">📎</div><p>Nenhum documento anexado</p></div>`;
      return;
    }

    const icons = { 'application/pdf': '📄', 'image/jpeg': '🖼️', 'image/png': '🖼️', 'application/msword': '📝', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝' };

    grid.innerHTML = list.map(d => {
      const icon = icons[d.mimeType] || '📎';
      const sizeKb = Math.round((d.data?.length || 0) * 0.75 / 1024);
      return `
        <div class="card" style="margin:0">
          <div style="font-size:40px;text-align:center;margin-bottom:12px">${icon}</div>
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;word-break:break-all">${d.name}</div>
          <div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px">
            🔗 ${d.relatedName || 'Geral'}<br>
            📅 ${formatDate(d.uploadedAt)}<br>
            💾 ${sizeKb > 0 ? sizeKb + ' KB' : '< 1 KB'}
          </div>
          <div style="display:flex;gap:6px">
            ${d.mimeType === 'application/pdf' || d.mimeType?.startsWith('image/')
              ? `<button class="btn btn-sm btn-secondary" style="flex:1" onclick="Documentos.preview('${d.id}')">👁 Ver</button>`
              : ''}
            <button class="btn btn-sm btn-secondary" style="flex:1" onclick="Documentos.download('${d.id}')">⬇ Baixar</button>
            <button class="btn btn-sm btn-danger" onclick="Documentos.delete('${d.id}')">🗑</button>
          </div>
        </div>`;
    }).join('');
  },

  openUpload() {
    const clients  = DB.get(DB.KEYS.CLIENTS);
    const bookings = DB.get(DB.KEYS.BOOKINGS);

    const relSel = document.getElementById('doc-rel-sel');
    relSel.innerHTML = `<option value="geral|Geral">📁 Geral</option>` +
      `<optgroup label="Clientes">` +
        clients.map(c => `<option value="client|${c.id}|${c.name}">${c.name}</option>`).join('') +
      `</optgroup>` +
      `<optgroup label="Reservas">` +
        bookings.map(b => {
          const c = DB.getOne(DB.KEYS.CLIENTS, b.clientId);
          const p = DB.getOne(DB.KEYS.PACKAGES, b.packageId);
          return `<option value="booking|${b.id}|${c?.name} – ${p?.name}">${c?.name} – ${p?.name}</option>`;
        }).join('') +
      `</optgroup>`;

    document.getElementById('doc-file-input').value = '';
    document.getElementById('doc-upload-preview').innerHTML = '';
    openModal('doc-modal');
  },

  handleFile(input) {
    const files = Array.from(input.files);
    const preview = document.getElementById('doc-upload-preview');
    preview.innerHTML = files.map(f => `<div style="font-size:12px;padding:6px 10px;background:var(--bg-card2);border-radius:6px;margin-top:6px">📎 ${f.name} (${Math.round(f.size/1024)} KB)</div>`).join('');
  },

  save() {
    const input   = document.getElementById('doc-file-input');
    const relRaw  = document.getElementById('doc-rel-sel').value;
    const files   = Array.from(input.files);
    if (!files.length) { showToast('Selecione ao menos um arquivo', 'error'); return; }

    const relParts = relRaw.split('|');
    const relType  = relParts[0];
    const relId    = relParts[1];
    const relName  = relParts[2] || 'Geral';

    let count = 0;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const doc = {
          id:          generateId(),
          name:        file.name,
          mimeType:    file.type,
          relatedType: relType,
          relatedId:   relId,
          relatedName: relName,
          data:        e.target.result,
          uploadedAt:  today(),
        };
        DB.save(DB.KEYS.DOCUMENTS, doc);
        count++;
        if (count === files.length) {
          closeModal('doc-modal');
          this.renderList();
          showToast(`✅ ${count} arquivo(s) anexado(s)!`, 'success');
        }
      };
      reader.readAsDataURL(file);
    });
  },

  preview(id) {
    const d = DB.getOne(DB.KEYS.DOCUMENTS, id);
    if (!d) return;
    const w = window.open('', '_blank');
    if (d.mimeType === 'application/pdf') {
      w.document.write(`<html><body style="margin:0"><embed src="${d.data}" width="100%" height="100%" type="application/pdf"></body></html>`);
    } else {
      w.document.write(`<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh"><img src="${d.data}" style="max-width:100%;max-height:100%"></body></html>`);
    }
  },

  download(id) {
    const d = DB.getOne(DB.KEYS.DOCUMENTS, id);
    if (!d) return;
    const a = document.createElement('a');
    a.href     = d.data;
    a.download = d.name;
    a.click();
  },

  delete(id) {
    if (!confirm('Excluir este documento?')) return;
    DB.remove(DB.KEYS.DOCUMENTS, id);
    this.renderList();
    showToast('🗑 Documento removido', 'info');
  },
};
