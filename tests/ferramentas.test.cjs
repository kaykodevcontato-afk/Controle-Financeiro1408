'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'assets/js/ferramentas.js'), 'utf8');
const sandbox = { window: {}, console };
vm.runInNewContext(source, sandbox);
const { calculate, normalizeNotes } = sandbox.window.KaykoFerramentas;

test('calculadora realiza operações com vírgula, parênteses e porcentagem contextual', () => {
  assert.equal(calculate('50 + 25'), 75);
  assert.equal(calculate('8 ÷ 2'), 4);
  assert.equal(calculate('5 × (3 + 2)'), 25);
  assert.equal(calculate('3,5 + 0,5'), 4);
  assert.equal(calculate('200 + 10%'), 220);
  assert.equal(calculate('200 - 10%'), 180);
  assert.equal(calculate('200 × 10%'), 20);
  assert.equal(calculate('200 ÷ 10%'), 2000);
});

test('calculadora não executa código e rejeita divisão por zero ou expressão incompleta', () => {
  assert.throws(() => calculate('1/0'), /zero/);
  assert.throws(() => calculate('2+'), /número/);
  assert.throws(() => calculate('Math.random()'), /válida/);
  assert.throws(() => calculate('1+alert(1)'), /válida/);
  assert.throws(() => calculate('1234567890'.repeat(25)), /válida/);
});

test('notas antigas são opcionais; normalização protege tipos e limita textos', () => {
  assert.equal(normalizeNotes(undefined).length, 0);
  const date = '2026-11-16T16:00:00.000Z';
  const result = normalizeNotes([{id:'1',title:'Primeira',content:'Lembrete', pinned:true,createdAt:date,updatedAt:date}, {id:'1',title:'Duplicada'}, null]);
  assert.equal(result.length, 1);
  assert.equal(result[0].pinned, true);
  assert.equal(result[0].content, 'Lembrete');
  const huge = normalizeNotes([{ id:'long', content:'n'.repeat(13000), title:'x'.repeat(200) }]);
  assert.equal(huge[0].content.length, 12000);
  assert.equal(huge[0].title.length, 120);
});
