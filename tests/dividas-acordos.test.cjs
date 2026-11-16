'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const sandbox = {window: {}, Date, Number, Math, String, Array};
vm.runInNewContext(readFileSync(join(__dirname, '../assets/js/dividas-acordos.js'), 'utf8'), sandbox);
const debt = sandbox.window.KaykoDividas;

test('acordo antigo é preservado e não perde pagamentos', () => {
  const item = debt.normalizeDebt({id:'old', creditor:'Banco',original:2000, agreed:1400,paid:300,status:'agreed',dueDate:'2026-12-10'});
  assert.equal(item.paymentMode, 'legacy');
  assert.equal(debt.selectedTotal(item), 1400);
  assert.equal(debt.confirmedRemaining(item), 1100);
});

test('compara à vista e parcelado, sem incluir propostas em avaliação nos acordos', () => {
  const item = debt.normalizeDebt({creditor:'Banco',original:1200, offerCash:750,offerInstallment:960,entryAmount:160,installmentCount:4,paymentMode:'review',status:'negotiating'});
  assert.equal(debt.discount(item.original,item.offerCash),450);
  assert.equal(debt.selectedTotal(item),0);
  assert.equal(debt.confirmedRemaining(item),0);
  item.paymentMode='installments'; item.status='agreed'; item.paid=160;
  assert.equal(debt.validateDebt(item),'');
  assert.equal(debt.selectedTotal(item),960);
  assert.equal(debt.remaining(item),800);
  assert.equal(debt.confirmedRemaining(item),800);
});

test('parcela corretamente centavos e datas em fevereiro de ano não bissexto', () => {
  const schedule=debt.installmentSchedule({offerInstallment:100,entryAmount:0,installmentCount:3,dueDate:'2026-01-31'});
  assert.equal(schedule.length,3);
  assert.equal(schedule[0].amount,33.34);
  assert.equal(schedule[1].amount,33.33);
  assert.equal(schedule[2].amount,33.33);
  assert.deepEqual(schedule.map(x=>x.date),['2026-01-31','2026-02-28','2026-03-31']);
  assert.equal(Math.round(schedule.reduce((a,b)=>a+b.amount,0)*100),10000);
});

test('bloqueia ofertas inconsistentes, pagamento superior ou quitado sem pagamento', () => {
  const base={creditor:'Loja', original:1000,paymentMode:'installments',offerCash:500,offerInstallment:800,entryAmount:100,installmentCount:6,agreed:800,paid:50,status:'agreed',dueDate:'2026-11-16'};
  assert.equal(debt.validateDebt(base),'');
  assert.match(debt.validateDebt({...base, entryAmount:900}), /entrada/);
  assert.match(debt.validateDebt({...base, installmentCount:0}), /parcelas/);
  assert.match(debt.validateDebt({...base, paid:900}), /valor pago/);
  assert.match(debt.validateDebt({...base, status:'paid'}), /quitada/);
  assert.match(debt.validateDebt({...base, paymentMode:'review', status:'agreed'}), /modalidade/);
  assert.equal(debt.validateDebt({...base, paymentMode:'cash',paid:500,status:'paid'}),'');
});

test('permite valores diferentes para cada parcela e mantém no backup', () => {
  const input={creditor:'Banco',original:1500,agreed:1000,offerCash:0,offerInstallment:1000,entryAmount:100,
    installmentCount:3,customInstallments:true,installmentAmounts:[150,250,500],
    paymentMode:'installments',paid:100,status:'agreed',dueDate:'2026-11-30'};
  assert.equal(debt.validateDebt(input),'');
  const saved=debt.normalizeDebt(JSON.parse(JSON.stringify(input)));
  assert.equal(saved.customInstallments,true);
  assert.deepEqual(Array.from(debt.installmentSchedule(saved), row=>row.amount),[150,250,500]);
  assert.equal(debt.remaining(saved),900);
  assert.match(debt.validateDebt({...input,installmentAmounts:[150,250,400]}),/soma/);
  assert.match(debt.validateDebt({...input,installmentAmounts:[150,0,750]}),/maior que zero/);
});
