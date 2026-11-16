/** Simulador bruto, educativo: 252 dias úteis/ano; não desconta impostos/taxas. */
(() => {
  'use strict';
  const finite = (v, fallback, min, max) => Number.isFinite(Number(v)) ? Math.max(min, Math.min(max, Number(v))) : fallback;
  function normalize(s = {}) {
    s = s && typeof s === 'object' ? s : {};
    return {
      source: typeof s.source === 'string' ? s.source : 'manual',
      principal: finite(s.principal, 1000, 0, 1e12),
      periodCount: Math.round(finite(s.periodCount, 1, 1, 2520)),
      periodUnit: s.periodUnit === 'days' ? 'days' : 'months',
      cdiAnnual: finite(s.cdiAnnual, 10, 0, 100),
      cdiPercent: finite(s.cdiPercent, 100, 0, 200),
      selicAnnual: finite(s.selicAnnual, 10, 0, 100),
      rateSource: ['manual', 'bcb'].includes(s.rateSource) ? s.rateSource : 'example',
      rateDate: typeof s.rateDate === 'string' ? s.rateDate : ''
    };
  }
  function projection(principal, annualRate, days) {
    const grossTotal = principal * Math.pow(1 + annualRate / 100, days / 252);
    return { grossTotal, grossYield: grossTotal - principal };
  }
  function compare(settings, amount) {
    const s = normalize(settings);
    const principal = finite(amount, 0, 0, 1e12);
    const days = s.periodUnit === 'days' ? s.periodCount : s.periodCount * 21;
    const cdiAnnual = (Math.pow(1 + s.cdiAnnual / 100, s.cdiPercent / 100) - 1) * 100;
    const cdi = projection(principal, cdiAnnual, days);
    const treasury = projection(principal, s.selicAnnual, days);
    return {
      principal, cdi, treasury,
      quick: {
        cdiDay: projection(principal, cdiAnnual, 1).grossYield,
        treasuryDay: projection(principal, s.selicAnnual, 1).grossYield,
        cdiMonth: projection(principal, cdiAnnual, 21).grossYield,
        treasuryMonth: projection(principal, s.selicAnnual, 21).grossYield
      }
    };
  }
  async function fetchRates() {
    const fetchOne = async (series) => {
      const response = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${series}/dados/ultimos/1?formato=json`);
      if (!response.ok) throw new Error(`Banco Central indisponível (${response.status}).`);
      const arr = await response.json();
      const record = arr.at(-1);
      const daily = Number(String(record?.valor ?? '').replace(',', '.'));
      if (!(daily > 0 && daily < 3)) throw new Error('A taxa diária retornada é inválida.');
      return { annual: (Math.pow(1 + daily / 100, 252) - 1) * 100, date: record.data };
    };
    const [cdi, selic] = await Promise.all([fetchOne(12), fetchOne(11)]);
    return { cdiAnnual: cdi.annual, selicAnnual: selic.annual, rateDate: `${cdi.date} (CDI) / ${selic.date} (Selic)` };
  }
  window.KaykoRendimentos = { normalize, compare, fetchRates };
})();
