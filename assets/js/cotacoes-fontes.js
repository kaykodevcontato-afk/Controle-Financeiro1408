/** Cotações públicas indicativas; sem API key embutida e sem simular preços. */
(() => {
  'use strict';
  const PROVIDERS = new Set(['auto', 'coingecko', 'coinmarketcap', 'coinpaprika']);
  const validProvider = (name) => PROVIDERS.has(name) ? name : 'auto';
  const safeId = (value) => /^[a-zA-Z0-9_-]{2,120}$/.test(String(value || '')) ? value : '';
  async function priceUSD(symbol, source = 'auto', getJSON, asset = []) {
    const paprika = safeId(asset[1]);
    const gecko = safeId(asset[2]);
    const sources = source === 'auto' ? ['coingecko', 'coinpaprika'] : [source];
    let lastError = null;
    for (const provider of sources) {
      try {
        if (provider === 'coingecko') {
          if (!gecko) throw new Error('ID CoinGecko não cadastrado para este ativo.');
          const data = await getJSON(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(gecko)}&vs_currencies=usd&include_last_updated_at=true`);
          const item = data?.[gecko];
          const rate = Number(item?.usd);
          if (!(rate > 0)) throw new Error('Cotação CoinGecko indisponível para esta moeda.');
          return { rate, source: 'CoinGecko', date: item.last_updated_at ? new Date(item.last_updated_at * 1000).toISOString() : 'não informada' };
        }
        if (provider === 'coinpaprika') {
          if (!paprika) throw new Error('ID CoinPaprika não cadastrado para este ativo.');
          const data = await getJSON(`https://api.coinpaprika.com/v1/tickers/${encodeURIComponent(paprika)}`);
          const rate = Number(data?.quotes?.USD?.price);
          if (!(rate > 0)) throw new Error('Cotação CoinPaprika indisponível para esta moeda.');
          return { rate, source: 'CoinPaprika', date: data.last_updated || 'não informada' };
        }
        if (provider === 'coinmarketcap') throw new Error('CoinMarketCap não oferece consulta pública sem credencial nesta integração. Selecione Automática, CoinGecko ou CoinPaprika.');
      } catch (error) { lastError = error; }
    }
    throw lastError || new Error(`Nenhuma cotação disponível para ${symbol}.`);
  }
  function referenceLinks(symbol) {
    const links = [
      { name: 'CoinGecko', url: 'https://www.coingecko.com/' },
      { name: 'CoinPaprika', url: 'https://coinpaprika.com/' },
      { name: 'CoinMarketCap', url: 'https://coinmarketcap.com/' },
      { name: 'Investing.com', url: 'https://br.investing.com/' },
      { name: 'Frankfurter (câmbio)', url: 'https://frankfurter.dev/' }
    ];
    return links;
  }
  window.KaykoCotacoes = { validProvider, priceUSD, referenceLinks };
})();
