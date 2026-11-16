/* Meu Controle Financeiro | Dev Kayko
 * Regras independentes para comparar acordos à vista e parcelados.
 * Valores são informados manualmente; não geramos cobranças nem pagamentos.
 */
(() => {
  'use strict';
  const roundMoney = value => Math.round((Number(value) || 0) * 100) / 100;
  const safeAmount = value => Number.isFinite(value) && value >= 0 && value <= 1e12 ? roundMoney(value) : 0;
  const validDate = value => /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(String(value || '')) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
  const validMode = ['review', 'cash', 'installments', 'legacy'];
  const validStatus = ['negotiating', 'agreed', 'paid'];

  function selectedTotal(x) {
    if (x.paymentMode === 'cash') return safeAmount(x.offerCash);
    if (x.paymentMode === 'installments') return safeAmount(x.offerInstallment);
    if (x.paymentMode === 'legacy') return safeAmount(x.agreed);
    return 0;
  }

  function normalizeDebt(record = {}) {
    const x = record && typeof record === 'object' ? record : {};
    // Backups antigos não tinham paymentMode: não descartamos o valor acordado.
    const paymentMode = validMode.includes(x.paymentMode) ? x.paymentMode : 'legacy';
    const base = {
      id: String(x.id || '').slice(0, 500),
      creditor: String(x.creditor || '').slice(0, 100),
      original: safeAmount(x.original),
      agreed: safeAmount(x.agreed),
      paid: safeAmount(x.paid),
      status: validStatus.includes(x.status) ? x.status : 'negotiating',
      notes: String(x.notes || '').slice(0, 500),
      paymentMode,
      offerCash: safeAmount(x.offerCash),
      offerInstallment: safeAmount(x.offerInstallment),
      installmentCount: Number.isInteger(x.installmentCount) && x.installmentCount >= 1 && x.installmentCount <= 120 ? x.installmentCount : 0,
      customInstallments: x.customInstallments === true,
      installmentAmounts: (Array.isArray(x.installmentAmounts) ? x.installmentAmounts : []).slice(0, 120).map(safeAmount),
      entryAmount: safeAmount(x.entryAmount),
      dueDate: validDate(x.dueDate) ? x.dueDate : ''
    };
    if (paymentMode !== 'legacy') base.agreed = selectedTotal(base);
    base.paid = Math.min(base.paid, base.agreed || (paymentMode === 'review' ? 0 : base.paid));
    if (base.agreed > 0 && base.paid >= base.agreed) base.status = 'paid';
    return base;
  }

  function remaining(x) {
    return roundMoney(Math.max(0, selectedTotal(x) - safeAmount(x.paid)));
  }

  function confirmedRemaining(x) {
    return x.status === 'agreed' && selectedTotal(x) > 0 ? remaining(x) : 0;
  }

  function discount(original, proposal) {
    const base = safeAmount(original), offer = safeAmount(proposal);
    if (!(base > 0) || !(offer > 0)) return null;
    return roundMoney(base - offer);
  }

  function monthDate(firstDate, monthsLater) {
    if (!validDate(firstDate)) return '';
    const [year, month, day] = firstDate.split('-').map(Number);
    const firstOfMonth = new Date(Date.UTC(year, month - 1 + monthsLater, 1));
    const maxDay = new Date(Date.UTC(firstOfMonth.getUTCFullYear(), firstOfMonth.getUTCMonth() + 1, 0)).getUTCDate();
    const d = new Date(Date.UTC(firstOfMonth.getUTCFullYear(), firstOfMonth.getUTCMonth(), Math.min(day, maxDay)));
    return d.toISOString().slice(0, 10);
  }

  function installmentSchedule(x) {
    const total = safeAmount(x.offerInstallment);
    const count = Number(x.installmentCount);
    const entry = safeAmount(x.entryAmount);
    if (!Number.isInteger(count) || count < 1 || count > 120 || total <= 0 || entry > total) return [];
    if (x.customInstallments === true && Array.isArray(x.installmentAmounts) && x.installmentAmounts.length === count) {
      return x.installmentAmounts.map((value, i) => ({
        number: i + 1, amount: safeAmount(value), date: monthDate(x.dueDate, i)
      }));
    }
    const totalCents = Math.round((total - entry) * 100);
    const base = Math.floor(totalCents / count);
    const extras = totalCents % count;
    return Array.from({ length: count }, (_, i) => ({
      number: i + 1,
      amount: (base + (i < extras ? 1 : 0)) / 100,
      date: monthDate(x.dueDate, i)
    }));
  }

  function validateDebt(x) {
    if (!String(x.creditor || '').trim()) return 'Informe o credor ou instituição.';
    if (!(x.original > 0)) return 'Informe o valor original da dívida, maior que zero.';
    for (const key of ['original','offerCash','offerInstallment','entryAmount','agreed','paid']) {
      if (!Number.isFinite(Number(x[key])) || Number(x[key]) < 0 || Number(x[key]) > 1e12) return 'Os valores devem ser válidos e não negativos.';
    }
    if (x.paymentMode === 'cash' && !(x.offerCash > 0)) return 'Informe o valor da proposta à vista.';
    if (x.paymentMode === 'installments' && (!(x.offerInstallment > 0) || !Number.isInteger(x.installmentCount) || x.installmentCount < 1 || x.installmentCount > 120)) return 'Informe o valor total parcelado e a quantidade de 1 a 120 parcelas.';
    if (x.offerInstallment > 0 && (!Number.isInteger(x.installmentCount) || x.installmentCount < 1 || x.installmentCount > 120)) return 'Preencha a quantidade de parcelas da proposta parcelada.';
    if (x.entryAmount > x.offerInstallment) return 'A entrada não pode superar o valor total parcelado.';
    if (x.customInstallments === true && x.offerInstallment > 0) {
      if (!Array.isArray(x.installmentAmounts) || x.installmentAmounts.length !== x.installmentCount) return 'Preencha os valores de todas as parcelas.';
      if (x.installmentAmounts.some(n => !Number.isFinite(n) || n <= 0 || n > 1e12)) return 'Cada parcela precisa ter um valor válido maior que zero.';
      const cents = x.installmentAmounts.reduce((sum,n) => sum + Math.round(n * 100), Math.round(x.entryAmount * 100));
      if (cents !== Math.round(x.offerInstallment * 100)) return 'A soma da entrada e das parcelas precisa ser igual ao valor total da proposta parcelada.';
    }
    if (x.entryAmount > 0 && x.offerInstallment <= 0) return 'Informe o valor total da proposta parcelada antes de definir a entrada.';
    if (x.paymentMode === 'legacy' && !(x.agreed > 0)) return 'Informe o valor negociado do acordo anterior.';
    if (x.paymentMode === 'review' && x.status !== 'negotiating') return 'Para confirmar ou quitar um acordo, escolha a modalidade de pagamento.';
    const total = selectedTotal(x);
    if (x.paid > total) return 'O valor pago não pode superar o valor da modalidade escolhida.';
    if (x.status === 'paid' && !(total > 0 && x.paid >= total)) return 'Para marcar como quitada, o total pago deve alcançar o valor do acordo.';
    if (x.status === 'agreed' && total <= 0) return 'Selecione uma proposta com valor para confirmar o acordo.';
    if (x.dueDate && !validDate(x.dueDate)) return 'Informe um vencimento válido.';
    return '';
  }

  window.KaykoDividas = { normalizeDebt, selectedTotal, remaining, confirmedRemaining, discount, installmentSchedule, monthDate, validateDebt };
})();
