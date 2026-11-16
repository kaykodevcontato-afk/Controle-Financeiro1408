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
    const note = { id: makeId(), title: '', content: '', pinned: false, createdAt: stamp, updatedAt: stamp };
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
    $('#notesSaveStatus').textContent = saved === false ? 'Falha ao salvar: exporte seu backup' : 'Salvo no navegador';
    $('#notesUpdatedAt').textContent = new Date(updated.find(item => item.id === note.id).updatedAt).toLocaleString('pt-BR');
    $('#notesCharacters').textContent = `${updated.find(item => item.id === note.id).content.length.toLocaleString('pt-BR')} / ${MAX_BODY.toLocaleString('pt-BR')} caracteres`;
    renderNotesList();
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
    $('#notesEditor').addEventListener('input', (event) => {
      if (event.target.id === 'noteTitle') updateNote('title', event.target.value);
      if (event.target.id === 'noteContent') updateNote('content', event.target.value);
    });
  }

  function render(which) {
    if (which === 'calculadora') renderCalculator();
    if (which === 'notas') renderNotes();
  }

  window.KaykoFerramentas = { calculate, normalizeNotes, mount, render };
})();
