/** Regras de prioridade para contas recorrentes. Não presume que uma conta foi paga. */
(() => {
  'use strict';
  const dayStart = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nextDueDate = (bill, reference = new Date()) => {
    const today = dayStart(reference);
    let year = today.getFullYear();
    let month = today.getMonth();
    const due = () => new Date(year, month, Math.min(Number(bill.day) || 1, new Date(year, month + 1, 0).getDate()));
    let date = due();
    if (date < today) {
      month++;
      if (month > 11) { month = 0; year++; }
      date = due();
    }
    return date;
  };

  function getPriority(bill, date = new Date()) {
    if (!bill.active) return { tone: 'gray', label: 'Pausada', description: 'Conta pausada', days: 9999, dueText: '—' };
    const due = nextDueDate(bill, date);
    const days = Math.round((due - dayStart(date)) / 86400000);
    const tone = days <= 1 ? 'red' : days <= 6 ? 'yellow' : 'green';
    const label = days === 0 ? 'Vence hoje' : days === 1 ? 'Amanhã' : `${days} dias`;
    return {
      tone, label, days,
      description: `Próximo vencimento em ${days} dia(s), sem confirmação de pagamento`,
      dueText: due.toLocaleDateString('pt-BR')
    };
  }
  const sortBills = (bills, now = new Date()) => [...bills].sort((a, b) =>
    Number(b.active) - Number(a.active) ||
    getPriority(a, now).days - getPriority(b, now).days ||
    a.name.localeCompare(b.name, 'pt-BR')
  );
  window.ControlePrioridadeContas = { getPriority, sortBills, nextDueDate };
})();
