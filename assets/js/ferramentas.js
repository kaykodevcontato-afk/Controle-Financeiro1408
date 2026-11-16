/* Calculadora e bloco de notas | Meu Controle Financeiro — Dev Kayko
 * Funciona localmente, sem bibliotecas externas e sem execução dinâmica de código.
 * O bloco de notas usa o mesmo armazenamento/backup do aplicativo principal.
 */
(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  const MAX_NOTES = 200;
  const MAX_BODY = 12000;
  // Arquivos incorporados ao JSON/localStorage; limitar para preservar a quota do navegador.
  const MAX_FILE_BYTES = 900 * 1024;
  const MAX_TOTAL_BYTES = 2 * 1024 * 1024;
  const MAX_FILES_PER_NOTE = 8;
  const EXTENSIONS = /\.(?:png|jpg|jpeg|gif|webp|bmp|pdf|txt|csv|md|doc|docx|xls|xlsx|ppt|pptx|zip|mp3|wav|ogg|m4a|aac|webm|mp4)$/i;
  const allowedMime = type => /^(image\/(?:png|jpeg|gif|webp|bmp)|audio\/[\w.+-]+|video\/mp4|application\/(?:pdf|zip|msword|vnd\.[\w.+-]+|octet-stream)|text\/(?:plain|csv|markdown))$/.test(type);
  const attachmentBytes = item => Math.floor(String(item.data || '').split(',')[1]?.length * .75 || 0);
  function normalizeAttachments(candidate) {
    if (!Array.isArray(candidate)) return [];
    return candidate.slice(0, MAX_FILES_PER_NOTE).flatMap(item => {
      if (!item || typeof item !== 'object') return [];
      const mime = String(item.mime || '').slice(0, 110).toLowerCase();
      const name = String(item.name || '').replace(/[\\/\x00-\x1f]/g, '').slice(0, 140);
      const data = String(item.data || '');
      if (!EXTENSIONS.test(name) || !allowedMime(mime) || !data.startsWith(`data:${mime};base64,`) || !/^data:[^,]+;base64,[A-Za-z0-9+/]*={0,2}$/.test(data) || attachmentBytes({data}) > MAX_FILE_BYTES) return [];
      return [{ id: String(item.id || makeId()).slice(0,100), name, mime, data }];
    });
  }
  function totalAttachmentBytes(notes) { return notes.reduce((sum,n) => sum + (n.attachments||[]).reduce((a,x)=>a+attachmentBytes(x),0),0); }
  const now = () => new Date().toISOString();
  const makeId = () => typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  function normalizeNotes(candidate) {
    if (!Array.isArray(candidate)) return [];
    const seen = new Set();
    const notes = [];
    for (const item of candidate.slice(0, MAX_NOTES)) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const id = String(item.id || makeId()).slice(0, 100);
      if (seen.has(id)) continue;
      seen.add(id);
      const validDate = (value) => typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value)
        && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : now();
      notes.push({
        id,
        title: String(item.title ?? 'Sem título').slice(0, 120),
        content: String(item.content ?? '').slice(0, MAX_BODY),
        pinned: item.pinned === true,
        attachments: normalizeAttachments(item.attachments),
        createdAt: validDate(item.createdAt),
        updatedAt: validDate(item.updatedAt)
      });
    }
    return notes;
  }

  // Parser aritmético limitado aos operadores explícitos: não utiliza eval/Function.
  // Para + ou -, "200 + 10%" significa "200 + 10% de 200".
  // Para × ou ÷, a porcentagem é a fração usual ("200 × 10%" = 20).
  function calculate(expression) {
    const input = String(expression ?? '').trim()
      .replaceAll('×', '*').replaceAll('÷', '/')
      .replaceAll('−', '-').replaceAll(',', '.');
    if (!input || input.length > 160 || !/^[\d\s.+\-*/()%]+$/.test(input)) {
      throw new Error('Digite uma expressão numérica válida.');
    }
    let index = 0;
    const skip = () => { while (/\s/.test(input[index] || '')) index++; };
    const consume = (symbol) => { skip(); if (input[index] === symbol) { index++; return true; } return false; };
    const checked = (num) => {
      if (!Number.isFinite(num) || Math.abs(num) > 1e15) throw new Error('O resultado está fora do limite da calculadora.');
      return num;
    };

    function primary() {
      skip();
      if (consume('+')) return primary();
      if (consume('-')) { const operand = primary(); return { value: checked(-operand.value), percent: operand.percent }; }
      let value;
      if (consume('(')) {
        value = sum().value;
        if (!consume(')')) throw new Error('Feche o parêntese da expressão.');
      } else {
        skip();
        const match = /^(?:\d+(?:\.\d*)?|\.\d+)/.exec(input.slice(index));
        if (!match) throw new Error('Falta um número na expressão.');
        index += match[0].length;
        value = Number(match[0]);
      }
      let percent = false;
      if (consume('%')) { value /= 100; percent = true; }
      return { value: checked(value), percent };
    }
    function product() {
      let left = primary();
      for (;;) {
        if (consume('*')) left = { value: checked(left.value * primary().value), percent: false };
        else if (consume('/')) {
          const right = primary().value;
          if (right === 0) throw new Error('Não é possível dividir por zero.');
          left = { value: checked(left.value / right), percent: false };
        } else break;
      }
      return left;
    }
    function sum() {
      let left = product();
      for (;;) {
        if (consume('+')) {
          const right = product();
          left = { value: checked(left.value + (right.percent ? left.value * right.value : right.value)), percent: false };
        } else if (consume('-')) {
          const right = product();
          left = { value: checked(left.value - (right.percent ? left.value * right.value : right.value)), percent: false };
        } else break;
      }
      return left;
    }
    const result = sum().value;
    skip();
    if (index !== input.length) throw new Error('Há um operador ou caractere na posição incorreta.');
    return Object.is(result, -0) ? 0 : checked(Number(result.toPrecision(12)));
  }

  const numberText = (value) => String(Number(value.toPrecision(12))).replace('.', ',');
  const localeNumber = (value) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 10 }).format(value);
  let getNotes = () => [];
  let setNotes = () => {};
  let notify = () => {};
  let selectedId = null;
  let calculation = '';
  let calculatedValue = null;
  let justCalculated = false;
  let history = [];
  let mounted = false;

  function setCalculatorText(text) {
    calculation = String(text).slice(0, 160);
    const input = $('#calculatorInput');
    if (input) input.value = calculation;
    const status = $('#calculatorResult');
    if (!status) return;
    try {
      const result = calculate(calculation);
      calculatedValue = result;
      status.textContent = `= ${localeNumber(result)}`;
      status.classList.remove('calculator-error');
    } catch (_) {
      calculatedValue = null;
      status.textContent = calculation ? 'Digite uma conta completa' : 'Resultado';
      status.classList.remove('calculator-error');
    }
  }

  function calculatorAction(value) {
    if (value === 'clear') { justCalculated = false; setCalculatorText(''); return; }
    if (value === 'backspace') { justCalculated = false; setCalculatorText(calculation.slice(0, -1)); return; }
    if (value === 'equals') {
      try {
        const result = calculate(calculation);
        history.unshift({ expression: calculation, result });
        history = history.slice(0, 10);
        renderCalculatorHistory();
        setCalculatorText(numberText(result));
        $('#calculatorResult').textContent = `= ${localeNumber(result)}`;
        justCalculated = true;
      } catch (error) {
        $('#calculatorResult').textContent = error.message;
        $('#calculatorResult').classList.add('calculator-error');
      }
      return;
    }
    if (value === 'copy') {
      if (calculatedValue === null) { notify('Primeiro calcule um resultado válido.', true); return; }
      const output = numberText(calculatedValue);
      if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(output)
          .then(() => notify('Resultado copiado.'), () => notify('Cópia bloqueada pelo navegador.', true));
      } else notify('Cópia indisponível neste navegador.', true);
      return;
    }
    const isDigit = /^[0-9,(]$/.test(value);
    if (justCalculated && isDigit) calculation = '';
    justCalculated = false;
    if (value === ',' && /(?:^|[+\-×÷(])\d*[,.]\d*$/.test(calculation)) return;
    if ('+−×÷'.includes(value) && !calculation && value !== '−') return;
    if ('+−×÷'.includes(value) && /[+−×÷]$/.test(calculation)) calculation = calculation.slice(0, -1);
    if (calculation.length < 160) setCalculatorText(calculation + value);
  }

  function renderCalculatorHistory() {
    const list = $('#calculatorHistory');
    if (!list) return;
    list.innerHTML = history.length ? history.map((item, index) =>
      `<button type="button" class="calculator-history-item" data-calc-history="${index}"><span>${esc(item.expression)}</span><strong>${esc(localeNumber(item.result))}</strong></button>`
    ).join('') : '<p class="tools-empty">Nenhuma operação nesta sessão.</p>';
  }

  function renderCalculator() {
    setCalculatorText(calculation);
    renderCalculatorHistory();
  }

  const sortedNotes = (notes) => [...notes].sort((a, b) =>
    Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));

  function renderNotesList() {
    const search = ($('#notesSearch')?.value || '').trim().toLocaleLowerCase('pt-BR');
    const notes = sortedNotes(getNotes());
    const filtered = notes.filter(note => `${note.title} ${note.content}`.toLocaleLowerCase('pt-BR').includes(search));
    $('#notesCount').textContent = `${notes.length} ${notes.length === 1 ? 'nota cadastrada' : 'notas cadastradas'}`;
    $('#notesList').innerHTML = filtered.length ? filtered.map(note => {
      const preview = note.content.replace(/\s+/g, ' ').trim().slice(0, 90) || 'Sem conteúdo';
      const date = new Date(note.updatedAt).toLocaleDateString('pt-BR');
      return `<button type="button" class="note-list-item ${selectedId === note.id ? 'is-selected' : ''}" data-select-note="${esc(note.id)}" aria-pressed="${selectedId === note.id}">
        <span class="note-list-title">${note.pinned ? '<span aria-label="Nota fixada">📌</span> ' : ''}${esc(note.title || 'Sem título')}</span>
        <span class="note-list-preview">${esc(preview)}</span>
        <span class="note-list-date">${esc(date)}</span>
      </button>`;
    }).join('') : `<p class="tools-empty">${search ? 'Nenhuma nota corresponde à pesquisa.' : 'Crie sua primeira anotação.'}</p>`;
  }

  function renderNotesEditor() {
    const note = getNotes().find(item => item.id === selectedId);
    const editor = $('#notesEditor');
    if (!note) {
      editor.innerHTML = '<div class="notes-empty-editor"><span aria-hidden="true">✎</span><h3>Seu espaço para anotações</h3><p>Crie ou selecione uma nota. As alterações são salvas automaticamente neste navegador e entram no backup JSON.</p><button type="button" class="button button-primary" id="notesNewInline">+ Criar nota</button></div>';
      return;
    }
    editor.innerHTML = `<div class="notes-editor-toolbar"><small id="notesSaveStatus" role="status">Salvo no navegador</small>
      <div class="notes-editor-actions"><button type="button" class="button button-outline button-small" data-pin-note="${esc(note.id)}">${note.pinned ? '📌 Desafixar' : '📌 Fixar'}</button>
      <button type="button" class="button button-outline button-small notes-delete" data-delete-note="${esc(note.id)}">Excluir</button></div></div>
      <label class="notes-field-label" for="noteTitle">Título da nota</label>
      <input id="noteTitle" class="notes-title-input" type="text" maxlength="120" autocomplete="off" placeholder="Título da anotação" value="${esc(note.title)}">
      <label class="notes-field-label" for="noteContent">Anotação</label>
      <textarea id="noteContent" class="notes-body-input" maxlength="${MAX_BODY}" placeholder="Escreva suas ideias, lembretes, compromissos, observações...">${esc(note.content)}</textarea>
      <div class="notes-attachments"><div class="notes-attachment-top"><strong>Anexos (${note.attachments.length})</strong><label class="button button-outline button-small notes-upload-button" for="notesFileUpload">+ Adicionar arquivo</label><input id="notesFileUpload" type="file" multiple accept="image/png,image/jpeg,image/gif,image/webp,image/bmp,application/pdf,audio/*,.txt,.csv,.md,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.mp3,.m4a,.wav,.ogg,.aac,.webm,.mp4" aria-label="Selecionar fotos, PDF, documentos ou áudios"></div>
      <p class="notes-upload-help">Até 900 KB por arquivo, 8 arquivos por nota e 2 MB somados. Os anexos entram no backup JSON; arquivos grandes devem ser guardados fora do navegador.</p>
      <div class="notes-attachment-list">${note.attachments.map(file => `<div class="notes-attachment-item"><span aria-hidden="true">${file.mime.startsWith('image/') ? '🖼️' : file.mime.startsWith('audio/') ? '🎵' : file.mime === 'application/pdf' ? '📄' : '📎'}</span><span class="notes-attachment-name" title="${esc(file.name)}">${esc(file.name)}</span><small>${(attachmentBytes(file)/1024).toFixed(0)} KB</small><button type="button" class="action-small" data-open-attachment="${esc(file.id)}">Abrir</button><button type="button" class="action-small" data-download-attachment="${esc(file.id)}">Baixar</button><button type="button" class="action-small danger" data-remove-attachment="${esc(file.id)}">Excluir</button></div>`).join('') || '<p class="tools-empty">Nenhum arquivo anexado.</p>'}</div></div>
      <div class="notes-editor-footer"><small>Atualizada em <span id="notesUpdatedAt">${new Date(note.updatedAt).toLocaleString('pt-BR')}</span></small><small id="notesCharacters">${note.content.length.toLocaleString('pt-BR')} / ${MAX_BODY.toLocaleString('pt-BR')} caracteres</small></div>`;
  }

  function renderNotes() {
    const notes = getNotes();
    if (!notes.some(note => note.id === selectedId)) selectedId = sortedNotes(notes)[0]?.id || null;
    renderNotesList();
    renderNotesEditor();
  }

  function newNote() {
    const notes = getNotes();
    if (notes.length >= MAX_NOTES) { notify(`Limite de ${MAX_NOTES} notas atingido.`, true); return; }
    const stamp = now();
    const note = { id: makeId(), title: '', content: '', pinned: false, attachments: [], createdAt: stamp, updatedAt: stamp };
    setNotes([...notes, note]);
    selectedId = note.id;
    if ($('#notesSearch')) $('#notesSearch').value = '';
    renderNotes();
    $('#noteTitle')?.focus();
  }

  function updateNote(field, value) {
    const notes = getNotes();
    const note = notes.find(item => item.id === selectedId);
    if (!note) return;
    const updated = notes.map(item => item.id === note.id ? {
      ...item, [field]: String(value).slice(0, field === 'title' ? 120 : MAX_BODY), updatedAt: now()
    } : item);
    const saved = setNotes(updated);
    if (saved === false) { notify('Não foi possível salvar a alteração. Confira o armazenamento.', true); }
    $('#notesSaveStatus').textContent = saved === false ? 'Falha ao salvar: exporte seu backup' : 'Salvo no navegador';
    $('#notesUpdatedAt').textContent = new Date(updated.find(item => item.id === note.id).updatedAt).toLocaleString('pt-BR');
    $('#notesCharacters').textContent = `${updated.find(item => item.id === note.id).content.length.toLocaleString('pt-BR')} / ${MAX_BODY.toLocaleString('pt-BR')} caracteres`;
    renderNotesList();
  }

  async function attachFiles(files) {
    if (!selectedId || !files?.length) return;
    const notes = getNotes();
    const note = notes.find(n => n.id === selectedId);
    if (!note) return;
    const attachments = [...(note.attachments || [])];
    let used = totalAttachmentBytes(notes);
    let success = 0;
    for (const file of files) {
      if (attachments.length >= MAX_FILES_PER_NOTE) { notify('Limite de 8 anexos por nota.', true); break; }
      const mime = file.type.toLowerCase() || 'application/octet-stream';
      if (!EXTENSIONS.test(file.name) || !allowedMime(mime)) { notify(`Formato não aceito: ${file.name}`, true); continue; }
      if (!file.size || file.size > MAX_FILE_BYTES || used + file.size > MAX_TOTAL_BYTES) { notify(`Arquivo muito grande ou limite total atingido: ${file.name}`, true); continue; }
      const data = await new Promise((resolve,reject)=>{const reader = new FileReader(); reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Falha na leitura'));reader.readAsDataURL(file);}).catch(()=>null);
      if (!data) { notify('Não foi possível ler o arquivo.', true); continue; }
      const item = normalizeAttachments([{id:makeId(),name:file.name,mime,data}])[0];
      if (!item) { notify(`Arquivo inválido: ${file.name}`, true);continue; }
      const next = [...attachments,item];
      const updated = notes.map(n=>n.id===note.id?{...n, attachments:next,updatedAt:now()}:n);
      if (setNotes(updated) === false) { notify('O navegador não tem espaço suficiente. Remova anexos ou exporte o backup.', true);break; }
      attachments.push(item);used += file.size;success++;
    }
    renderNotes();
    if (success) notify(`${success} anexo(s) salvo(s) e incluído(s) no backup.`);
  }
  function selectedAttachment(id) { return getNotes().find(n=>n.id===selectedId)?.attachments?.find(a=>a.id===id); }
  function attachmentObjectUrl(file) {
    const base64=file.data.split(',')[1];
    const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
    return URL.createObjectURL(new Blob([bytes],{type:file.mime}));
  }
  function accessAttachment(id, download=false) {
    const file=selectedAttachment(id);
    if (!file) return;
    const url=attachmentObjectUrl(file);
    const a=document.createElement('a');a.href=url;
    if (download) a.download=file.name;
    else { a.target='_blank'; a.rel='noopener noreferrer'; }
    a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }

  function mount(args) {
    if (mounted) return;
    mounted = true;
    getNotes = args.getNotes;
    setNotes = args.setNotes;
    notify = args.notify;

    $('#calculatorInput').addEventListener('input', (event) => {
      justCalculated = false;
      setCalculatorText(event.target.value);
    });
    $('#calculatorInput').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); calculatorAction('equals'); }
      if (event.key === 'Escape') { event.preventDefault(); calculatorAction('clear'); }
    });
    $('#calculatorPad').addEventListener('click', (event) => {
      const control = event.target.closest('[data-calc]');
      if (control) calculatorAction(control.dataset.calc);
    });
    $('#calculatorHistory').addEventListener('click', (event) => {
      const control = event.target.closest('[data-calc-history]');
      if (!control) return;
      const item = history[Number(control.dataset.calcHistory)];
      if (item) { setCalculatorText(item.expression); $('#calculatorInput').focus(); }
    });
    $('#calculatorClearHistory').addEventListener('click', () => { history = []; renderCalculatorHistory(); });
    $('#calculatorCopy').addEventListener('click', () => calculatorAction('copy'));
    $('#notesNew').addEventListener('click', newNote);
    $('#notesSearch').addEventListener('input', renderNotesList);
    $('#notesList').addEventListener('click', (event) => {
      const control = event.target.closest('[data-select-note]');
      if (control) { selectedId = control.dataset.selectNote; renderNotes(); }
    });
    $('#notesEditor').addEventListener('click', (event) => {
      if (event.target.closest('#notesNewInline')) { newNote(); return; }
      const open=event.target.closest('[data-open-attachment]');
      if (open) { accessAttachment(open.dataset.openAttachment);return; }
      const download=event.target.closest('[data-download-attachment]');
      if (download) { accessAttachment(download.dataset.downloadAttachment,true);return; }
      const remove=event.target.closest('[data-remove-attachment]');
      if (remove) {
        if (!confirm('Remover este anexo da nota?')) return;
        const notes=getNotes();
        const updated=notes.map(n=>n.id===selectedId?{...n,attachments:n.attachments.filter(a=>a.id!==remove.dataset.removeAttachment),updatedAt:now()}:n);
        if(setNotes(updated)!==false){renderNotes();notify('Anexo removido.');} else notify('Não foi possível salvar.',true);
        return;
      }
      const pin = event.target.closest('[data-pin-note]');
      if (pin) {
        setNotes(getNotes().map(note => note.id === pin.dataset.pinNote ? { ...note, pinned: !note.pinned, updatedAt: now() } : note));
        renderNotes();
        return;
      }
      const del = event.target.closest('[data-delete-note]');
      if (del && confirm('Excluir esta anotação permanentemente?')) {
        setNotes(getNotes().filter(note => note.id !== del.dataset.deleteNote));
        selectedId = null;
        renderNotes();
        notify('Nota excluída.');
      }
    });
    $('#notesEditor').addEventListener('change', event => {
      if(event.target.id==='notesFileUpload'){void attachFiles(Array.from(event.target.files||[]));}
    });
    $('#notesEditor').addEventListener('input', (event) => {
      if (event.target.id === 'noteTitle') updateNote('title', event.target.value);
      if (event.target.id === 'noteContent') updateNote('content', event.target.value);
    });
  }

  function render(which) {
    if (which === 'calculadora') renderCalculator();
    if (which === 'notas') renderNotes();
  }

  window.KaykoFerramentas = { calculate, normalizeNotes, normalizeAttachments, mount, render };
})();
