'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function moduleAt(file) {
  const context = {window: {}, Date, console, Math, Number, Set, Object, String};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', file), 'utf8'), context);
  return context.window;
}

test('simulador: capital zero tem resultado zero; rendimento bruto é positivo', () => {
  const engine = moduleAt('rendimentos-simulador.js').KaykoRendimentos;
  assert.equal(engine.compare(engine.normalize(null), 0).cdi.grossYield, 0);
  const result = engine.compare(engine.normalize({cdiAnnual: 10, selicAnnual: 10, periodCount: 12}), 1000);
  assert.ok(result.cdi.grossTotal > 1000);
  assert.ok(result.treasury.grossYield > 0);
});

test('prioridades não assumem pagamentos e respeitam fim do mês', () => {
  const p = moduleAt('contas-prioridades.js').ControlePrioridadeContas;
  const due = p.nextDueDate({name:'Teste',day:31,active:true},new Date(2026, 1, 1));
  assert.equal(due.getDate(), 28);
  assert.equal(p.getPriority({name:'Conta',day:10,active:false},new Date()).tone, 'gray');
});

test('cotações: fonte inválida volta para automático e não inventa preço', async () => {
  const c = moduleAt('cotacoes-fontes.js').KaykoCotacoes;
  assert.equal(c.validProvider('não existe'), 'auto');
  await assert.rejects(() => c.priceUSD('INEXISTENTE','coinpaprika',async () => ({}), ['Nome', '', '']));
});
