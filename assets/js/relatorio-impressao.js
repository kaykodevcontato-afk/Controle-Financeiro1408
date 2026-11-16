/** Relatório privado para impressão/PDF local; chaves Pix são ocultadas por padrão. */
(() => {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = n => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);
  const row = (cols) => `<tr>${cols.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`;
  function table(headers, rows) { return `<table><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(row).join('') : `<tr><td colspan="${headers.length}">Sem registros</td></tr>`}</tbody></table>`; }
  function abrir(db) {
    const pop = window.open('', '_blank'); if (!pop) return false;
    const tx = [...db.transactions].sort((a, b) => b.date.localeCompare(a.date));
    const activeBills = db.bills || [];
    const debts = db.debts || [];
    const monthly = Object.entries(db.budgets || {}).flatMap(([month, obj]) => Object.entries(obj).map(([cat, value]) => [month, cat, money(value)]));
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório Financeiro · Dev Kayko</title><style>
    @page{size:A4;margin:17mm 15mm}*{box-sizing:border-box}body{color:#1e293b;font:11px/1.55 Arial,sans-serif;margin:0}h1{font-size:21px;margin:0}h2{font-size:15px;margin:22px 0 8px;border-bottom:1px solid #d0d9e4;padding-bottom:6px}p{margin:5px 0 10px;color:#526279}table{width:100%;border-collapse:collapse;font-size:10px;table-layout:auto}td,th{border-bottom:1px solid #e8edf3;padding:7px 5px;vertical-align:top;text-align:left;overflow-wrap:anywhere}th{background:#f4f7fb}thead{display:table-header-group}tr{break-inside:avoid}section{break-inside:auto}.notice{padding:10px;background:#f6f8fa;border:1px solid #d9e0e8;border-radius:6px}.top{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:20px}@media screen{body{max-width:940px;margin:35px auto;padding:0 20px}.print{padding:10px 14px;cursor:pointer;margin:20px 0}}@media print{.print{display:none}}
    </style></head><body><button class="print" onclick="print()">Imprimir / salvar em PDF</button><header class="top"><div><h1>Meu Controle Financeiro</h1><p>Relatório geral · Dev Kayko</p></div><p>Emitido em ${new Date().toLocaleDateString('pt-BR')}</p></header>
    <div class="notice">Os dados refletem registros inseridos manualmente, sem integração bancária. Valores de apps e investimentos não são somados automaticamente ao saldo mensal. Chaves Pix completas não são exibidas neste relatório.</div>
    <section><h2>Lançamentos (${tx.length})</h2>${table(['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Observações'], tx.map(x => [x.date, x.type, x.category, x.description, money(x.amount), x.notes || '']))}</section>
    <section><h2>Orçamento por mês</h2>${table(['Mês', 'Categoria', 'Teto previsto'], monthly)}</section>
    <section><h2>Categorias e observações</h2>${table(['Categoria', 'Observações'], (db.categoryCatalog || []).map(c => [c, db.categoryNotes?.[c] || '']))}</section>
    <section><h2>Contas fixas</h2>${table(['Conta', 'Categoria', 'Dia', 'Valor', 'Situação'], activeBills.map(x => [x.name, x.category, x.day, money(x.amount), x.active ? 'Ativa' : 'Pausada']))}</section>
    <section><h2>Dívidas e acordos</h2>${table(['Credor', 'Original', 'À vista', 'Parcelado (total)', 'Parcelas', 'Entrada', 'Modalidade escolhida', 'Pago', 'Pendente', 'Situação', 'Vencimento'], debts.map(x => [x.creditor, money(x.original), x.offerCash ? money(x.offerCash) : '—', x.offerInstallment ? money(x.offerInstallment) : '—', x.installmentCount || '—', money(x.entryAmount || 0), {cash:'À vista',installments:'Parcelado',review:'Comparando',legacy:'Anterior'}[x.paymentMode] || 'Anterior', money(x.paid), money(Math.max(0, (x.paymentMode === 'cash' ? x.offerCash : x.paymentMode === 'installments' ? x.offerInstallment : x.paymentMode === 'review' ? 0 : x.agreed) - x.paid)), x.status, x.dueDate || '']))}</section>
    <section><h2>Chaves Pix (sem exibir o valor da chave)</h2>${table(['Identificação', 'Tipo', 'Banco', 'Titular'], (db.pixKeys || []).map(x => [x.name, x.type, x.bank, x.owner]))}</section>
    <section><h2>Apps, pontos e criptomoedas (valores cadastrados; sem cotação)</h2>${table(['App', 'Tipo', 'Moeda', 'Quantidade', 'Favorito'], (db.wallets || []).map(x => [x.app, x.kind, x.currency, x.balance, x.favorite ? 'Sim' : 'Não']))}</section>
    <section><h2>Investimentos (posições informadas)</h2>${table(['Ativo', 'Quantidade', 'Preço médio', 'Preço atual manual'], (db.investments || []).map(x => [x.symbol, x.quantity, x.buyPrice, x.currentPrice || 'Sem cotação']))}</section>
    <section><h2>Metas e cofrinhos</h2>${table(['Tipo', 'Nome', 'Valor inicial', 'Meta'], [...(db.goals || []).map(x => ['Meta', x.name, money(x.initial), money(x.target)]), ...(db.coffers || []).map(x => ['Cofrinho', x.name, money(x.initial), money(x.target)])])}</section>
    </body></html>`;
    pop.document.open(); pop.document.write(html); pop.document.close(); pop.focus();
    return true;
  }
  window.KaykoRelatorio = { abrir };
})();
