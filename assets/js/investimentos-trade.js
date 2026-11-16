/** Carteira educativa manual: não executa ordens e não altera lançamentos. */
(() => {
  'use strict';
  const ASSETS = [
    ['PETR4', 'Petrobras PN', 'b3', 'BRL', false], ['VALE3', 'Vale ON', 'b3', 'BRL', false],
    ['ITUB4', 'Itaú Unibanco PN', 'b3', 'BRL', false], ['MGLU3', 'Magazine Luiza ON', 'b3', 'BRL', false],
    ['BOVA11', 'ETF Ibovespa', 'etf', 'BRL', false], ['IVVB11', 'ETF S&P 500 no Brasil', 'etf', 'BRL', false],
    ['AAPL', 'Apple', 'eua', 'USD', true], ['MSFT', 'Microsoft', 'eua', 'USD', true],
    ['USO', 'United States Oil Fund (ETF)', 'petroleo', 'USD', true],
    ['BTC', 'Bitcoin', 'cripto', 'USD', true], ['ETH', 'Ethereum', 'cripto', 'USD', true]
  ].map(([symbol, name, group, currency, fractional]) => ({ symbol, name, group, currency, fractional }));
  const bySymbol = Object.fromEntries(ASSETS.map(a => [a.symbol, a]));
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n, currency) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
  const number = (n) => Number.isFinite(Number(n)) ? Math.max(0, Math.min(1e12, Number(n))) : 0;
  let api = null;
  let edited = null;
  const quoteCache = {};
  function normalizeRecords(list) {
    return (Array.isArray(list) ? list : []).slice(0, 2000).map(x => ({
      id: String(x.id || `${Date.now()}-${Math.random()}`),
      symbol: bySymbol[x.symbol] ? x.symbol : 'BTC',
      quantity: number(x.quantity), buyPrice: number(x.buyPrice), currentPrice: number(x.currentPrice),
      date: /^\d{4}-\d{2}-\d{2}$/.test(x.date) ? x.date : '',
      notes: String(x.notes ?? '').slice(0, 120)
    })).filter(x => x.quantity > 0 && x.buyPrice > 0);
  }
  function normalizeSettings(settings = {}) {
    settings = settings && typeof settings === 'object' ? settings : {};
    return { usdBrl: number(settings.usdBrl) };
  }
  function records() { return api.getRecords(); }
  function save(rows) { api.saveRecords(normalizeRecords(rows)); render(); }
  function sourcePrice(position) {
    const price = quoteCache[position.symbol];
    return number(price) || number(position.currentPrice) || null;
  }
  function renderCatalog() {
    const filter = $('invAssetFilter').value;
    $('invMarketCards').innerHTML = ASSETS.filter(a => filter === 'all' || a.group === filter).map(a => {
      const current = quoteCache[a.symbol];
      return `<article class="invest-market-card"><div><strong>${escapeHtml(a.symbol)}</strong><span>${escapeHtml(a.name)}</span></div><p>${current ? fmt(current, a.currency) + ' · consulta API' : 'Sem cotação atual consultada'}</p><small>${a.currency} · ${escapeHtml(a.group.toUpperCase())}</small></article>`;
    }).join('');
  }
  function scenario() {
    const asset = bySymbol[$('invScenarioAsset').value]; if (!asset) return;
    $('invScenarioCurrency').textContent = asset.currency;
    const input = $('invScenarioPrice');
    if (document.activeElement !== input && !input.value && quoteCache[asset.symbol]) input.value = quoteCache[asset.symbol];
    $('invScenarioPriceLabel').textContent = quoteCache[asset.symbol] ? `Último preço consultado: ${fmt(quoteCache[asset.symbol], asset.currency)}` : 'Informe um preço manualmente para simular.';
    const capital = Number($('invScenarioAmount').value), price = Number(input.value), change = Number($('invScenarioChange').value);
    if (!(capital >= 0 && capital <= 1e12 && price > 0 && price <= 1e12 && change >= -100 && change <= 5000)) {
      $('invScenarioResult').textContent = 'Informe valores válidos para simular.'; return;
    }
    const count = asset.fractional ? capital / price : Math.floor(capital / price);
    const spent = count * price;
    const remainder = capital - spent;
    const end = count * price * (1 + change / 100) + remainder;
    const profit = end - capital;
    $('invScenarioResult').innerHTML = `<div class="mini-stats"><div class="info-card"><small>Unidades simuladas</small><strong>${count.toLocaleString('pt-BR', { maximumFractionDigits: 8 })}</strong></div><div class="info-card"><small>Saldo restante</small><strong>${fmt(remainder, asset.currency)}</strong></div><div class="info-card"><small>Capital final hipotético</small><strong>${fmt(end, asset.currency)}</strong></div><div class="info-card"><small>Ganho / perda hipotética</small><strong>${fmt(profit, asset.currency)}</strong></div></div>`;
  }
  function renderHoldings() {
    const all = records();
    let invested = 0, valued = 0, known = 0;
    $('invHoldingsRows').innerHTML = all.length ? all.map(r => {
      const asset = bySymbol[r.symbol];
      const current = sourcePrice(r);
      const buy = r.buyPrice * r.quantity;
      const value = current !== null ? current * r.quantity : null;
      invested += buy;
      if (value !== null) { valued += value; known++; }
      return `<tr><td><strong>${escapeHtml(r.symbol)}</strong><small class="secondary-line">${escapeHtml(r.notes)}</small></td><td>${r.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 8 })}</td><td>${fmt(r.buyPrice, asset.currency)}</td><td>${fmt(buy, asset.currency)}</td><td>${value === null ? 'Cotação indisponível' : fmt(value, asset.currency)}</td><td>${value === null ? '—' : fmt(value - buy, asset.currency)}</td><td><div class="actions"><button type="button" data-inv-edit="${escapeHtml(r.id)}" class="action-small">Editar</button><button type="button" data-inv-delete="${escapeHtml(r.id)}" class="action-small danger">Excluir</button></div></td></tr>`;
    }).join('') : '<tr><td colspan="7" class="empty-row">Nenhuma posição cadastrada.</td></tr>';
    // Multi-moeda: não somar dólares e reais diretamente.
    const byCurrency = ['BRL', 'USD'].map(currency => {
      const subset = all.filter(x => bySymbol[x.symbol]?.currency === currency);
      const total = subset.reduce((s, x) => s + x.quantity * x.buyPrice, 0);
      const part = subset.reduce((s, x) => s + (sourcePrice(x) !== null ? x.quantity * sourcePrice(x) : 0), 0);
      const calculated = subset.filter(x => sourcePrice(x) !== null).length;
      return `<div class="info-card"><small>Investido (${currency})</small><strong>${fmt(total, currency)}</strong><small>Valor indicativo: ${calculated ? fmt(part, currency) : '—'} · ${calculated}/${subset.length} posição(ões) com cotação</small></div>`;
    });
    $('invPortfolioSummary').innerHTML = byCurrency.join('');
  }
  function render() {
    if (!api) return;
    renderCatalog(); renderHoldings(); scenario();
    $('invUsdBrl').value = api.getSettings().usdBrl || '';
  }
  async function fetchQuotes() {
    $('invRefreshQuotes').disabled = true;
    $('invQuoteStatus').textContent = 'Consultando fontes públicas…';
    const result = [];
    for (const symbol of ['BTC', 'ETH']) {
      try {
        const id = symbol === 'BTC' ? 'bitcoin' : 'ethereum';
        const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json(); const price = Number(data?.[id]?.usd);
        if (price > 0) { quoteCache[symbol] = price; result.push(symbol); }
      } catch { }
    }
    // Acesso experimental ao endpoint público brapi.dev: pode exigir token/cota.
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch('https://brapi.dev/api/quote/PETR4,VALE3,ITUB4,MGLU3', { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          for (const asset of Array.isArray(data.results) ? data.results : []) {
            const symbol = String(asset.symbol || '').toUpperCase();
            const value = Number(asset.regularMarketPrice);
            if (['PETR4', 'VALE3', 'ITUB4', 'MGLU3'].includes(symbol) && value > 0) {
              quoteCache[symbol] = value;
              result.push(symbol);
            }
          }
        }
      } finally { clearTimeout(timeout); }
    } catch { /* Serviços sem acesso anônimo são tratados como indisponíveis. */ }
    // Nunca reutilizar fechamentos de 06/11/2026 como cotações atuais.
    $('invQuoteStatus').textContent = result.length ? `Consulta: ${result.join(', ')}. Outros ativos exigem cotação manual. Confira os horários das fontes.` : 'Nenhuma cotação atual disponível no navegador. Use preços manuais ou links externos.';
    $('invRefreshQuotes').disabled = false; render();
  }
  function resetForm() {
    edited = null; $('invPositionForm').reset();
    $('invPositionDate').value = new Date().toLocaleDateString('en-CA');
    $('invCancelEdit').hidden = true;
    $('invPositionSubmit').textContent = 'Adicionar à carteira';
    updateInputCurrency();
  }
  function updateInputCurrency() {
    $('invPositionCurrency').textContent = bySymbol[$('invPositionAsset').value]?.currency || 'BRL';
  }
  function mount(callbacks) {
    api = callbacks;
    const options = ASSETS.map(a => `<option value="${a.symbol}">${a.symbol} · ${a.name}</option>`).join('');
    $('invScenarioAsset').innerHTML = options;
    $('invPositionAsset').innerHTML = options;
    $('invPositionDate').value = new Date().toLocaleDateString('en-CA');
    ['invScenarioAsset', 'invScenarioAmount', 'invScenarioPrice', 'invScenarioChange'].forEach(id => $(id).addEventListener('input', () => { if (id === 'invScenarioAsset') $('invScenarioPrice').value = ''; scenario(); }));
    $('invAssetFilter').addEventListener('change', renderCatalog);
    $('invRefreshQuotes').addEventListener('click', () => void fetchQuotes());
    $('invPositionAsset').addEventListener('change', updateInputCurrency);
    $('invPositionForm').addEventListener('submit', e => {
      e.preventDefault(); const form = new FormData(e.currentTarget);
      const symbol = String(form.get('symbol'));
      const quantity = Number(form.get('quantity')), buyPrice = Number(form.get('buyPrice')), currentPrice = Number(form.get('currentPrice')) || 0;
      if (!bySymbol[symbol] || ![quantity, buyPrice, currentPrice].every(n => Number.isFinite(n) && n >= 0 && n <= 1e12) || quantity <= 0 || buyPrice <= 0) { api.notify('Confira a quantidade e os preços.', true); return; }
      const obj = { id: edited || `${Date.now()}-${Math.random().toString(36).slice(2)}`, symbol, quantity, buyPrice, currentPrice, date: String(form.get('date') || ''), notes: String(form.get('notes') || '').slice(0, 120) };
      save(edited ? records().map(x => x.id === edited ? obj : x) : [...records(), obj]); resetForm(); api.notify('Posição salva.');
    });
    $('invCancelEdit').addEventListener('click', resetForm);
    $('invHoldingsRows').addEventListener('click', e => {
      const edit = e.target.closest('[data-inv-edit]'), del = e.target.closest('[data-inv-delete]');
      if (edit) {        
const x = records().find(r => r.id === edit.dataset.invEdit); if (!x) return;
        edited = x.id; for (const field of ['symbol', 'quantity', 'buyPrice', 'currentPrice', 'date', 'notes']) {
          const el = $('invPositionForm').elements.namedItem(field); if (el) el.value = x[field];
        }
        updateInputCurrency(); $('invCancelEdit').hidden = false; $('invPositionSubmit').textContent = 'Salvar alteração'; $('invPositionForm').scrollIntoView({ block: 'nearest' });
      } else if (del) { const x = records().find(r => r.id === del.dataset.invDelete); if (x && confirm(`Excluir a posição ${x.symbol}?`)) { save(records().filter(y => y.id !== x.id)); api.notify('Posição excluída.'); } }
    });
    $('invUsdBrl').addEventListener('change', e => { api.saveSettings({ usdBrl: Math.max(0, Number(e.target.value) || 0) }); api.notify('Cotação de referência salva.'); });
    $('invGetFx').addEventListener('click', async () => {
      $('invFxStatus').textContent = 'Consultando câmbio…';
      try {
        const res = await fetch('https://api.frankfurter.dev/v2/rate/usd/brl'); if (!res.ok) throw new Error();
        const data = await res.json(); const rate = Number(data.rate); if (!(rate > 0)) throw new Error();
        api.saveSettings({ usdBrl: rate }); $('invUsdBrl').value = rate;
        $('invFxStatus').textContent = `USD/BRL: ${rate.toFixed(4)} · Frankfurter, ${data.date || 'data não informada'}. Não é câmbio da sua corretora.`;
      } catch { $('invFxStatus').textContent = 'Consulta indisponível. Informe uma taxa manualmente.'; }
    });
    render();
  }
  window.KaykoInvestimentos = { mount, render, normalizeRecords, normalizeSettings };
})();
