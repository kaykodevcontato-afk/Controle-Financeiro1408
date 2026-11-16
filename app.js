/* Meu Controle Financeiro | Dev Kayko
   Site estático para GitHub Pages. Dados armazenados localmente no navegador.
   Não envia lançamentos ou saldos a servidores, nem sincroniza entre dispositivos.
   Apenas consulta cotações públicas de ativos em provedores externos. */
(() => {
  'use strict';
  // MAPA DE EDIÇÃO: consulte docs/GUIA_DE_EDICAO.md para localizar cada seção.
  // Prioridades das contas: assets/js/contas-prioridades.js (cores no CSS correspondente).
  // Simulador de rendimento: assets/js/rendimentos-simulador.js (cores no CSS correspondente).
  // Fontes de câmbio e links: assets/js/cotacoes-fontes.js (CSS em assets/css/).
  // Investimentos e trade: assets/js/investimentos-trade.js + assets/css/investimentos-trade.css.
  const STORAGE_KEY = 'kayko-controle-financeiro-v1';
  const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const SHORT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const EXPENSE_CATS = ['Moradia', 'Alimentação', 'Transporte', 'Contas', 'Saúde', 'Educação', 'Lazer', 'Compras', 'Dívidas', 'Outros'];
  const INCOME_CATS = ['Salário', 'Freelance', 'Vendas', 'Renda extra', 'Reembolso', 'Outros'];
  const PAYMENTS = ['Pix', 'Dinheiro', 'Débito', 'Crédito', 'Boleto', 'Transferência', 'Outro'];
  // Woodbox: os valores exibidos em cada casa são valores REAIS de depósito.
  // Modelos distintos do mercado não seguem uma única tabela: não confunda
  // número da casa (etapa) com o dinheiro a depositar.
  const WOODBOX_PLANS = {
    'mil': { name: 'R$ 1.000 · 100 depósitos de R$ 10', count: 100, unit: 10 },
    'tresmil': { name: 'R$ 3.000 · 300 depósitos de R$ 10', count: 300, unit: 10 },
    'cincomil': { name: 'R$ 5.000 · 100 depósitos de R$ 50', count: 100, unit: 50 },
    'dezmil': { name: 'R$ 10.000 · 100 depósitos de R$ 100', count: 100, unit: 100 },
    'trintamil': { name: 'R$ 30.000 · 300 depósitos de R$ 100', count: 300, unit: 100 },
    'crescente100': { name: 'R$ 5.050 · de R$ 1 até R$ 100', count: 100, ascending: true },
    'crescente200': { name: 'R$ 20.100 · de R$ 1 até R$ 200', count: 200, ascending: true },
    'custom': { name: 'Personalizado · parcelas iguais' }
  };
  const FIAT_CURRENCIES = ['BRL', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'CHF', 'ARS', 'MXN', 'AUD'];
  // Catálogo offline. Cada entrada: [nome, ID CoinPaprika, ID CoinGecko].
  // IDs desatualizados não geram preços fictícios: exibimos cotação indisponível.
  const CRYPTO_ASSETS = {
    BTC: ['Bitcoin', 'btc-bitcoin', 'bitcoin'],
    ETH: ['Ethereum', 'eth-ethereum', 'ethereum'],
    SOL: ['Solana', 'sol-solana', 'solana'],
    USDT: ['Tether', 'usdt-tether', 'tether'],
    USDC: ['USD Coin', 'usdc-usd-coin', 'usd-coin'],
    BNB: ['BNB', 'bnb-binance-coin', 'binancecoin'],
    DOGE: ['Dogecoin', 'doge-dogecoin', 'dogecoin'],
    ADA: ['Cardano', 'ada-cardano', 'cardano'],
    XRP: ['XRP', 'xrp-xrp', 'ripple'],
    LTC: ['Litecoin', 'ltc-litecoin', 'litecoin'],
    PI: ['Pi Network', 'pi2-pi-network', 'pi-network'],
    SLC: ['Silencio', 'slc-silencio', 'silencio'],
    TON: ['Toncoin', 'ton-toncoin', 'the-open-network'],
    TRX: ['TRON', 'trx-tron', 'tron'],
    AVAX: ['Avalanche', 'avax-avalanche', 'avalanche-2'],
    DOT: ['Polkadot', 'dot-polkadot', 'polkadot'],
    LINK: ['Chainlink', 'link-chainlink', 'chainlink'],
    BCH: ['Bitcoin Cash', 'bch-bitcoin-cash', 'bitcoin-cash'],
    XLM: ['Stellar', 'xlm-stellar', 'stellar'],
    HBAR: ['Hedera', 'hbar-hedera-hashgraph', 'hedera-hashgraph'],
    SHIB: ['Shiba Inu', 'shib-shiba-inu', 'shiba-inu'],
    XMR: ['Monero', 'xmr-monero', 'monero'],
    DAI: ['Dai', 'dai-dai', 'dai'],
    PEPE: ['Pepe', 'pepe-pepe', 'pepe'],
    UNI: ['Uniswap', 'uni-uniswap', 'uniswap'],
    AAVE: ['Aave', 'aave-new', 'aave'],
    NEAR: ['NEAR Protocol', 'near-near-protocol', 'near'],
    SUI: ['Sui', 'sui-sui', 'sui'],
    APT: ['Aptos', 'apt-aptos', 'aptos'],
    ARB: ['Arbitrum', 'arb-arbitrum', 'arbitrum'],
    OP: ['Optimism', 'op-optimism', 'optimism'],
    INJ: ['Injective', 'inj-injective-protocol', 'injective-protocol'],
    ICP: ['Internet Computer', 'icp-internet-computer', 'internet-computer'],
    ETC: ['Ethereum Classic', 'etc-ethereum-classic', 'ethereum-classic'],
    ALGO: ['Algorand', 'algo-algorand', 'algorand'],
    FIL: ['Filecoin', 'fil-filecoin', 'filecoin'],
    ATOM: ['Cosmos', 'atom-cosmos', 'cosmos'],
    VET: ['VeChain', 'vet-vechain', 'vechain'],
    CRO: ['Cronos', 'cro-crypto-com-chain', 'crypto-com-chain'],
    RENDER: ['Render', 'render-render', 'render-token'],
    FET: ['Artificial Superintelligence Alliance', 'fet-fetch-ai', 'fetch-ai'],
    GRT: ['The Graph', 'grt-the-graph', 'the-graph'],
    ENA: ['Ethena', 'ena-ethena', 'ethena'],
    WLD: ['Worldcoin', 'wld-worldcoin', 'worldcoin-wld'],
    POL: ['POL (Polygon)', 'pol-polygon-ecosystem-token', 'polygon-ecosystem-token'],
    XTZ: ['Tezos', 'xtz-tezos', 'tezos'],
    MKR: ['Maker', 'mkr-maker', 'maker'],
    LDO: ['Lido DAO', 'ldo-lido-dao', 'lido-dao'],
    QNT: ['Quant', 'qnt-quant', 'quant-network'],
    BONK: ['Bonk', 'bonk-bonk', 'bonk'],
    FLOKI: ['Floki', 'floki-floki-inu', 'floki'],
    WIF: ['dogwifhat', 'wif-dogwifcoin', 'dogwifcoin'],
    PAXG: ['PAX Gold', 'paxg-pax-gold', 'pax-gold'],
    RUNE: ['THORChain', 'rune-thorchain', 'thorchain'],
    IMX: ['Immutable', 'imx-immutable-x', 'immutable-x'],
    SEI: ['Sei', 'sei-sei', 'sei-network'],
    JUP: ['Jupiter', 'jup-jupiter', 'jupiter-exchange-solana'],
    KAS: ['Kaspa', 'kas-kaspa', 'kaspa'],
    FDUSD: ['First Digital USD', 'fdusd-first-digital-usd', 'first-digital-usd'],
    TAO: ['Bittensor', 'tao-bittensor', 'bittensor'],
    JASMY: ['JasmyCoin', 'jasmy-jasmycoin', 'jasmycoin'],
    NEO: ['NEO', 'neo-neo', 'neo'],
    CHZ: ['Chiliz', 'chz-chiliz', 'chiliz'],
    SAND: ['The Sandbox', 'sand-the-sandbox', 'the-sandbox'],
    MANA: ['Decentraland', 'mana-decentraland', 'decentraland'],
    GALA: ['Gala', 'gala-gala', 'gala'],
    AXS: ['Axie Infinity', 'axs-axie-infinity', 'axie-infinity'],
    EGLD: ['MultiversX', 'egld-elrond', 'elrond-erd-2'],
    XDC: ['XDC Network', 'xdc-xinfin-network', 'xdce-crowd-sale'],
    THETA: ['Theta Network', 'theta-theta-token', 'theta-token'],
    IOTA: ['IOTA', 'miota-iota', 'iota'],
    STX: ['Stacks', 'stx-stacks', 'blockstack'],
    ZEC: ['Zcash', 'zec-zcash', 'zcash'],
    DASH: ['Dash', 'dash-dash', 'dash'],
    CRV: ['Curve DAO', 'crv-curve-dao-token', 'curve-dao-token'],
  };
  const cryptoCatalog = () => ({ ...CRYPTO_ASSETS, ...Object.fromEntries(db.customCryptos.map(c => [c.symbol, [c.name, c.paprikaId, c.geckoId]])) });
  const orderedCryptos = () => Object.entries(cryptoCatalog()).sort(([a], [b]) => {
    const fa = db.settings.cryptoFavorites.includes(a), fb = db.settings.cryptoFavorites.includes(b);
    return Number(fb) - Number(fa) || a.localeCompare(b, 'pt-BR');
  });
  const rateCache = new Map();
  const expenseCats = () => db.categoryCatalog;
  const precise = n => Math.round((Number(n) || 0) * 1e8) / 1e8;
  const amountLabel = n => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 8 }).format(Number(n) || 0);
  const cashLabel = (n, code) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(Number(n) || 0);
  const CAT_COLORS = ['#38bd9b', '#6f9de8', '#f0ac80', '#9d8bd7', '#e47791', '#44b6c7', '#edc06e', '#87b99d', '#8592b0', '#b3a08b'];
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);
  const dec = (n) => (Math.round((Number(n) || 0) * 100) / 100);
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` };
  const fmtDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d)) ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '—';
  const defaultDB = () => ({ version: 1, transactions: [], bills: [], goals: [], coffers: [], wallets: [], investments: [], customCategories: [], categoryCatalog: [...EXPENSE_CATS], categoryNotes: {}, customCryptos: [], pixKeys: [], debts: [], notes: [], budgets: {}, settings: { month: new Date().getMonth() + 1, year: new Date().getFullYear(), monthlySavingsTarget: 0, themeMode: 'light', themePalette: 'current', cryptoQuoteSource: 'auto', cryptoFavorites: [], investmentSimulator: null, investmentMarket: { usdBrl: 0 } } });
  let db = defaultDB();
  let view = 'painel';
  let editing = null;
  let selectedCofferId = null;
  let toastTimeout;
  let previousFocus = null;
  // ===== 01. ARMAZENAMENTO, BACKUP COMPATÍVEL E VALIDAÇÃO =====
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) db = normalize(JSON.parse(raw));
    } catch (err) { console.warn('Não foi possível ler dados locais:', err); notify('Não foi possível abrir os dados deste navegador.', true); }
  }
  function normalize(candidate) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) || candidate.version !== 1 || !Array.isArray(candidate.transactions) || !Array.isArray(candidate.bills) || !Array.isArray(candidate.goals) || !candidate.budgets || typeof candidate.budgets !== 'object' || Array.isArray(candidate.budgets)) throw new Error('Backup inválido ou incompatível.');
    const amount = n => (typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1e12) ? dec(n) : 0;
    const clean = s => String(s ?? '').slice(0, 500);
    const types = ['Entrada', 'Gasto', 'Reserva', 'Resgate'];
    const transactions = candidate.transactions.slice(0, 30000).map(t => ({ id: clean(t.id || uid()), date: /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : today(), type: types.includes(t.type) ? t.type : 'Gasto', category: clean(t.category), description: clean(t.description), payment: clean(t.payment), amount: amount(t.amount), goalId: clean(t.goalId), cofferId: clean(t.cofferId), boxSlot: Number.isInteger(t.boxSlot) && t.boxSlot >= 0 && t.boxSlot < 500 ? t.boxSlot : null, notes: clean(t.notes) }));
    const customCategories = [...new Set((Array.isArray(candidate.customCategories) ? candidate.customCategories : []).slice(0, 100).map(c => clean(c).trim().slice(0, 60)).filter(c => c && !EXPENSE_CATS.some(d => d.toLowerCase() === c.toLowerCase())))];
    // Catálogo explícito permite editar/excluir inclusive categorias de fábrica.
    const sourceCatalog = Array.isArray(candidate.categoryCatalog) ? candidate.categoryCatalog : [...EXPENSE_CATS, ...customCategories];
    const allowedCategories = [...new Set(sourceCatalog.slice(0, 200).map(c => clean(c).trim().slice(0, 60)).filter(Boolean))];
    const categoryCatalog = allowedCategories.length ? allowedCategories : [];
    const categoryNotes = Object.fromEntries(Object.entries(candidate.categoryNotes && typeof candidate.categoryNotes === 'object' ? candidate.categoryNotes : {}).filter(([key]) => allowedCategories.includes(key)).slice(0, 200).map(([key, val]) => [key, clean(val).slice(0, 500)]));
    const customCryptos = (Array.isArray(candidate.customCryptos) ? candidate.customCryptos : []).slice(0, 200).map(c => ({ symbol: clean(c.symbol).trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15), name: clean(c.name).trim().slice(0, 80), paprikaId: clean(c.paprikaId).trim().slice(0, 100), geckoId: clean(c.geckoId).trim().slice(0, 100) })).filter(c => c.symbol && c.name && !Object.hasOwn(CRYPTO_ASSETS, c.symbol));
    const validCrypto = new Set([...Object.keys(CRYPTO_ASSETS), ...customCryptos.map(c => c.symbol)]);
    const pixKeys = (Array.isArray(candidate.pixKeys) ? candidate.pixKeys : []).slice(0, 200).map(x => {
      // Migração automática: cadastros antigos com uma chave passam a ter uma lista.
      const validTypes = ['cpf', 'cnpj', 'email', 'phone', 'random'];
      const rawKeys = Array.isArray(x.keys) && x.keys.length ? x.keys : [{ type: x.type, key: x.key }];
      const keys = rawKeys.slice(0, 20).map(entry => ({
        type: validTypes.includes(entry.type) ? entry.type : 'random',
        key: clean(entry.key).trim().slice(0, 160)
      })).filter(entry => entry.key);
      return { id: clean(x.id || uid()), name: clean(x.name).slice(0, 90),
        keys, type: keys[0]?.type || 'random', key: keys[0]?.key || '',
        bank: clean(x.bank).slice(0, 100), owner: clean(x.owner).slice(0, 100),
        notes: clean(x.notes).slice(0, 500) };
    });
    const debts = (Array.isArray(candidate.debts) ? candidate.debts : []).slice(0, 1000).map(x => window.KaykoDividas.normalizeDebt({ ...x, id: clean(x.id || uid()) }));
    const notes = window.KaykoFerramentas.normalizeNotes(candidate.notes);
    const bills = candidate.bills.slice(0, 1000).map(b => ({ id: clean(b.id || uid()), name: clean(b.name), category: allowedCategories.includes(b.category) ? b.category : 'Outros', day: clamp(Math.floor(Number(b.day) || 1), 1, 31), amount: amount(b.amount), active: b.active !== false, paidMonths: [...new Set((Array.isArray(b.paidMonths) ? b.paidMonths : []).filter(x => /^\d{4}-(0[1-9]|1[0-2])$/.test(x)))].slice(-120) }));
    const goals = candidate.goals.slice(0, 1000).map(g => ({ id: clean(g.id || uid()), name: clean(g.name), target: amount(g.target), initial: amount(g.initial) }));
    const coffers = (Array.isArray(candidate.coffers) ? candidate.coffers : []).slice(0, 200).map(c => ({
      id: clean(c.id || uid()), name: clean(c.name), mode: c.mode === 'woodbox' ? 'woodbox' : 'free',
      target: amount(c.target), initial: amount(c.initial),
      plan: WOODBOX_PLANS[c.plan] ? c.plan : 'mil',
      count: clamp(Math.floor(Number(c.count) || 100), 1, 500), unit: amount(c.unit)
    }));
    const wallets = (Array.isArray(candidate.wallets) ? candidate.wallets : []).slice(0, 1000).map(w => {
      const kind = ['money', 'points', 'crypto'].includes(w.kind) ? w.kind : 'money';
      const currency = kind === 'crypto' && validCrypto.has(w.currency) ? w.currency : kind === 'money' && FIAT_CURRENCIES.includes(w.currency) ? w.currency : 'BRL';
      const number = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e12 ? precise(v) : 0;
      return { id: clean(w.id || uid()), app: clean(w.app).slice(0, 100), kind, currency, balance: number(w.balance), pointsPerUsd: number(w.pointsPerUsd), pointValueMode: ['legacy', 'BRL', 'USD', 'ratioBRL', 'ratioUSD', 'ratioCrypto'].includes(w.pointValueMode) ? w.pointValueMode : 'legacy', pointUnitValue: number(w.pointUnitValue), pointReferencePoints: number(w.pointReferencePoints), pointReferenceBRL: number(w.pointReferenceBRL), pointReferenceCrypto: validCrypto.has(w.pointReferenceCrypto) ? w.pointReferenceCrypto : 'BTC', manualUsdPrice: number(w.manualUsdPrice), favorite: w.favorite === true };
    });
    const investments = window.KaykoInvestimentos.normalizeRecords(candidate.investments);
    const budgets = {};
    for (const key of Object.keys(candidate.budgets).slice(0, 1000)) {
      if (/^\d{4}-\d{2}$/.test(key) && candidate.budgets[key] && typeof candidate.budgets[key] === 'object') {
        budgets[key] = {};
        for (const cat of allowedCategories) if (Object.hasOwn(candidate.budgets[key], cat)) budgets[key][cat] = amount(candidate.budgets[key][cat]);
      }
    }
    const settings = candidate.settings || {};
    return { version: 1, transactions, bills, goals, coffers, wallets, investments, customCategories, categoryCatalog, categoryNotes, customCryptos, pixKeys, debts, notes, budgets, settings: { month: clamp(Math.floor(Number(settings.month) || 11), 1, 12), year: clamp(Math.floor(Number(settings.year) || 2026), 2000, 2100), monthlySavingsTarget: amount(settings.monthlySavingsTarget), themeMode: settings.themeMode === 'dark' ? 'dark' : 'light', themePalette: ['current', 'blue', 'pink', 'purple'].includes(settings.themePalette) ? settings.themePalette : 'current', cryptoQuoteSource: window.KaykoCotacoes.validProvider(settings.cryptoQuoteSource), cryptoFavorites: (Array.isArray(settings.cryptoFavorites) ? settings.cryptoFavorites : []).filter(x => validCrypto.has(x)).slice(0, 200), investmentSimulator: window.KaykoRendimentos.normalize(settings.investmentSimulator), investmentMarket: window.KaykoInvestimentos.normalizeSettings(settings.investmentMarket) } };
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); return true; }
    catch (err) { console.warn(err); notify('Armazenamento cheio ou bloqueado. Exporte um backup.', true); return false; }
  }
  function notify(message, error = false) {
    const node = $('#toast'); if (!node) return;
    node.textContent = message; node.classList.toggle('is-error', error); node.classList.add('is-visible');
    clearTimeout(toastTimeout); toastTimeout = setTimeout(() => node.classList.remove('is-visible'), 3200);
  }
  const monthKey = (year = db.settings.year, month = db.settings.month) => `${year}-${String(month).padStart(2, '0')}`;
  const txInMonth = (t, month = monthKey()) => t.date.startsWith(month);
  function monthData(month = monthKey()) {
    const tx = db.transactions.filter(t => txInMonth(t, month));
    const byType = type => dec(tx.filter(t => t.type === type).reduce((a, t) => a + t.amount, 0));
    const income = byType('Entrada'), expense = byType('Gasto'), saving = dec(byType('Reserva') - byType('Resgate'));
    return { tx, income, expense, saving, balance: dec(income - expense - saving), savingRate: income > 0 ? saving / income * 100 : 0 };
  }
  function annualData() { return MONTHS.map((_, idx) => monthData(monthKey(db.settings.year, idx + 1))); }
  function savingsForGoal(id) { return dec(db.transactions.filter(t => t.type === 'Reserva' && t.goalId === id).reduce((sum, t) => sum + t.amount, 0)); }
  function cofferTransactions(id) { return db.transactions.filter(t => t.cofferId === id); }
  function cofferBalance(c) { return dec(c.initial + cofferTransactions(c.id).reduce((sum, t) => sum + (t.type === 'Reserva' ? t.amount : t.type === 'Resgate' ? -t.amount : 0), 0)); }
  function cofferCells(c) {
    if (c.mode !== 'woodbox') return [];
    const plan = WOODBOX_PLANS[c.plan] || WOODBOX_PLANS.mil;
    const count = c.plan === 'custom' ? c.count : plan.count;
    return Array.from({ length: count }, (_, i) => dec(plan.ascending ? i + 1 : (c.plan === 'custom' ? c.unit : plan.unit)));
  }
  function cofferTarget(c) { return c.mode === 'woodbox' ? dec(cofferCells(c).reduce((a, b) => a + b, 0)) : c.target; }
  function occupiedCofferSlots(c) { return new Map(cofferTransactions(c.id).filter(t => t.type === 'Reserva' && Number.isInteger(t.boxSlot)).map(t => [t.boxSlot, t])); }
  function fixedTotal() { return dec(db.bills.filter(b => b.active).reduce((sum, b) => sum + b.amount, 0)); }
  function activeGoalIds() { return new Set(db.goals.map(g => g.id)); }
  // ===== 02. MENU, NAVEGAÇÃO E RENDERIZAÇÃO =====
  function render() {
    const titleMap = { painel: ['Seu dinheiro, sob controle.', 'Acompanhe suas receitas, gastos e quanto você está conseguindo guardar.', 'Visão geral'], lancamentos: ['Registre cada movimentação.', 'Tudo que entra, sai ou é separado para economizar.', 'Lançamentos'], orcamento: ['Planeje seu orçamento.', 'Defina limites de gastos e mantenha seu planejamento.', 'Orçamento'], contas: ['Suas contas em dia.', 'Organize os pagamentos recorrentes sem confundir previsão com gasto.', 'Contas fixas'], metas: ['Um passo de cada vez.', 'Transforme seus objetivos em metas de economia.', 'Minhas metas'], cofrinhos: ['Seu dinheiro vai ganhar destino.', 'Cofrinhos livres e desafios Woodbox com cartelas interativas.', 'Cofrinhos'], carteiras: ['Pontos, saldos e criptomoedas.', 'Acompanhe apps, organize criptoativos favoritos e consulte conversões.', 'Apps, pontos e moedas'], pix: ['Suas chaves Pix organizadas.', 'Guarde chaves de recebimento com nome e observações.', 'Minhas chaves Pix'], dividas: ['Negocie com organização.', 'Registre propostas, acordos, pagamentos e valores pendentes.', 'Dívidas e acordos'], calculadora: ['Faça suas contas em um só lugar.', 'Operações rápidas, porcentagem e histórico da sessão.', 'Calculadora'], notas: ['Guarde ideias e lembretes.', 'Crie, edite e pesquise suas anotações com salvamento automático.', 'Bloco de notas'], investimentos: ['Invista com informação.', 'Compare ativos, simule ganhos e perdas e acompanhe suas posições.', 'Investimentos e Trade'], ajuda: ['Aprenda a usar.', 'Seu guia de uso e as opções para proteger seus dados.', 'Como usar'] };
    const header = titleMap[view];
    $('#pageTitle').textContent = header[0]; $('#pageSubtitle').textContent = header[1]; $('#currentCrumb').textContent = header[2];
    $$('.view').forEach(el => el.classList.toggle('active', el.id === `view-${view}`));
    $$('[data-view]').forEach(el => el.classList.toggle('is-active', el.dataset.view === view));
    $('#monthSelect').value = String(db.settings.month); $('#yearSelect').value = String(db.settings.year);
    if (view === 'painel') renderDashboard();
    else if (view === 'lancamentos') renderTransactions();
    else if (view === 'orcamento') renderBudgets();
    else if (view === 'contas') renderBills();
    else if (view === 'metas') renderGoals();
    else if (view === 'cofrinhos') { renderCoffers(); renderYieldSimulator(); }
    else if (view === 'carteiras') renderWallets();
    else if (view === 'pix') renderPixKeys();
    else if (view === 'dividas') renderDebts();
    else if (view === 'calculadora' || view === 'notas') window.KaykoFerramentas.render(view);
    else if (view === 'investimentos') window.KaykoInvestimentos.render();
  }
  function navigate(next) {
    if (!['painel', 'lancamentos', 'orcamento', 'contas', 'metas', 'cofrinhos', 'carteiras', 'pix', 'dividas', 'calculadora', 'notas', 'investimentos', 'ajuda'].includes(next)) return;
    view = next;
    history.replaceState(null, '', `#${next}`);
    $('#sidebar').classList.remove('open'); $('#mobileShade').hidden = true; $('#mobileMenu').setAttribute('aria-expanded', 'false');
    render(); window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function stat(label, value, sub, cls, icon, accent = false) { return `<article class="stat-card ${accent ? 'accent' : ''}"><div class="stat-header"><span class="stat-title">${label}</span><span class="stat-icon ${cls}">${icon}</span></div><div class="stat-value ${value < 0 ? 'negative' : ''}">${money(value)}</div><div class="stat-detail">${sub}</div></article>`; }
  function infoCard(label, value, detail = '', cls = '') { return `<div class="info-card"><small>${label}</small><strong>${value}</strong>${detail ? `<small class="${cls}">${detail}</small>` : ''}</div>`; }
  function renderDashboard() {
    const d = monthData();
    $('#summaryGrid').innerHTML = stat('Dinheiro que entrou', d.income, 'Total de receitas no mês', 'income', '↗') + stat('Gastos do mês', d.expense, 'Compras e contas pagas', 'expense', '↘') + stat('Dinheiro guardado', d.saving, 'Reservas menos resgates do mês', 'saving', '◎') + stat('Saldo disponível', d.balance, 'Entradas − gastos − reservas', 'balance', '↗', true);
    const totalGoal = Number(db.settings.monthlySavingsTarget) || 0;
    const goalText = totalGoal > 0 ? `${Math.min(999, Math.round(d.saving / totalGoal * 100))}% da meta mensal` : 'Defina sua meta mensal';
    $('#dashboardMini').innerHTML = infoCard('Taxa de economia', `${d.savingRate.toFixed(1).replace('.', ',')}%`, 'Sobre as entradas do mês') + infoCard('Contas fixas previstas', money(fixedTotal()), 'Não descontadas do saldo') + `<div class="info-card"><small>Meta para guardar no mês</small><strong>${money(totalGoal)}</strong><small>${goalText} · <button type="button" class="text-button" data-action="edit-monthly-goal">Editar meta</button></small></div>`;
    const totalInCoffers = dec(db.coffers.reduce((sum, c) => sum + cofferBalance(c), 0));
    $('#dashboardCoffers').innerHTML = `<strong>${money(totalInCoffers)}</strong><small>${db.coffers.length} cofrinho(s) criado(s)</small>`;
    renderAnnual(); renderCategories(d); renderRecent(d); renderUpcomingBills(); renderDashboardWallets();
    $('#dashboardDebts').innerHTML = infoCard('Dívidas em negociação', String(db.debts.filter(x => x.status === 'negotiating').length), 'Ofertas em avaliação') + infoCard('Acordos confirmados a pagar', money(db.debts.reduce((a, x) => a + window.KaykoDividas.confirmedRemaining(x), 0)), 'Registro manual · fora do saldo mensal');
  }
  function renderAnnual() {
    const year = annualData(); let maximum = Math.max(1, ...year.flatMap(d => [d.income, d.expense, d.saving]));
    $('#chartYear').textContent = String(db.settings.year);
    $('#annualChart').innerHTML = year.map((d, i) => `<div class="chart-month"><div class="bar-groups"><span class="bar income" style="height:${d.income / maximum * 100}%" title="${SHORT_MONTHS[i]}: entradas ${esc(money(d.income))}"></span><span class="bar expense" style="height:${d.expense / maximum * 100}%" title="${SHORT_MONTHS[i]}: gastos ${esc(money(d.expense))}"></span><span class="bar saving" style="height:${Math.max(0, d.saving) / maximum * 100}%" title="${SHORT_MONTHS[i]}: guardado ${esc(money(d.saving))}"></span></div><span class="bar-chart-label">${SHORT_MONTHS[i]}</span></div>`).join('');
    $('#annualChart').setAttribute('aria-label', `Ano ${db.settings.year}. ${year.map((d, i) => `${SHORT_MONTHS[i]}: entradas ${money(d.income)}, gastos ${money(d.expense)}, guardado ${money(d.saving)}`).join('; ')}`);
  }
  function renderCategories(d) {
    const cats = expenseCats().map((cat, i) => ({ name: cat, value: dec(d.tx.filter(t => t.type === 'Gasto' && t.category === cat).reduce((s, t) => s + t.amount, 0)), color: CAT_COLORS[i % CAT_COLORS.length] })).filter(c => c.value > 0).sort((a, b) => b.value - a.value);
    if (!cats.length) { $('#categoryChart').innerHTML = '<div class="empty-state"><span class="empty-symbol">◉</span>Registre seus gastos para visualizar<br> a distribuição por categoria.</div>'; return; }
    const total = cats.reduce((s, c) => s + c.value, 0); let offset = 0;
    const stops = cats.map(c => { const from = offset; offset += (c.value / total) * 100; return `${c.color} ${from.toFixed(2)}% ${offset.toFixed(2)}%`; }).join(', ');
    $('#categoryChart').innerHTML = `<div class="donut-wrap"><div class="donut" style="background:conic-gradient(${stops})"><div class="donut-inner"><strong>${money(total)}</strong><small>Total gasto</small></div></div><div class="category-list">${cats.slice(0, 6).map(c => `<div class="category-item"><span class="category-item-label"><i class="small-dot" style="background:${c.color}"></i>${esc(c.name)}</span><b>${(100 * c.value / total).toFixed(0)}%</b></div>`).join('')}</div></div>`;
  }
  function sortedTransactions(list) { return [...list].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)); }
  function renderRecent(d) {
    const items = sortedTransactions(d.tx).slice(0, 5);
    $('#recentTransactions').innerHTML = items.length ? `<div class="activity-list">${items.map(t => { const cl = t.type === 'Entrada' || t.type === 'Resgate' ? 'income' : t.type === 'Gasto' ? 'expense' : 'saving'; return `<div class="activity-item"><span class="activity-icon ${cl}">${t.type === 'Entrada' || t.type === 'Resgate' ? '↗' : t.type === 'Gasto' ? '↘' : '◎'}</span><div class="activity-item-content"><strong>${esc(t.description)}</strong><small>${fmtDate(t.date)} · ${esc(t.category)}</small></div><span class="activity-value ${cl}">${t.type === 'Entrada' || t.type === 'Resgate' ? '+' : t.type === 'Gasto' ? '-' : '↘ '}${money(t.amount)}</span></div>` }).join('')}</div>` : '<div class="empty-state"><span class="empty-symbol">⇄</span>Nenhum lançamento neste mês.<br>Use “Novo lançamento” para começar.</div>';
  }
  // ===== CONTAS FIXAS: avisos no painel inicial =====
  // Lógica de prazos isolada em assets/js/contas-prioridades.js.
  function billPriorityBadge(priority) {
    return `<span class="bill-priority-badge priority--${priority.tone}" title="${esc(priority.description)}">${esc(priority.label)}</span>`;
  }
  // ===== CONTAS PAGAS: histórico por competência mensal =====
  // Confirmar pagamento NÃO cria lançamento de Gasto: o usuário registra o débito
  // em Lançamentos, caso deseje contabilizá-lo no saldo disponível.
  function billMonthKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  function billIsPaid(b, date = new Date()) {
    return Array.isArray(b.paidMonths) && b.paidMonths.includes(billMonthKey(date));
  }
  function toggleBillPaid(id) {
    const bill = db.bills.find(b => b.id === id);
    if (!bill || !bill.active) return;
    const key = billMonthKey();
    const paid = new Set(bill.paidMonths || []);
    const wasPaid = paid.has(key);
    if (wasPaid) paid.delete(key); else paid.add(key);
    bill.paidMonths = [...paid].sort().slice(-120);
    if (save()) { render(); notify(wasPaid ? 'Pagamento desmarcado.' : 'Conta marcada como paga neste mês!'); }
  }
  function renderUpcomingBills() {
    const priorityRules = window.ControlePrioridadeContas;
    const referenceDate = new Date(); // Prazo real: independe do mês filtrado no painel.
    const bills = priorityRules.sortBills(db.bills.filter(b => b.active && !billIsPaid(b, referenceDate)), referenceDate).slice(0, 5);
    $('#upcomingBills').innerHTML = bills.length
      ? `<div class="activity-list">${bills.map(b => {
        const priority = priorityRules.getPriority(b, referenceDate);
        return `<div class="activity-item bill-upcoming-entry">
            <span class="activity-icon priority--${priority.tone}" aria-hidden="true">▤</span>
            <div class="activity-item-content">
              <strong>${esc(b.name)}</strong>
              <small>${esc(b.category)} · Vencimento ${priority.dueText}</small>
            </div>
            <div class="bill-upcoming-right"><span class="activity-value">${money(b.amount)}</span>${billPriorityBadge(priority)}</div>
          </div>`;
      }).join('')}</div>`
      : '<div class="empty-state"><span class="empty-symbol">▤</span>Você ainda não cadastrou<br>contas fixas mensais ativas.</div>';
  }
  function renderTransactions() {
    const term = $('#transactionSearch').value.toLocaleLowerCase('pt-BR').trim();
    const type = $('#transactionTypeFilter').value;
    const all = $('#allMonthsToggle').checked;
    const goalMap = new Map(db.goals.map(g => [g.id, g.name]));
    const cofferMap = new Map(db.coffers.map(c => [c.id, c.name]));
    const filtered = sortedTransactions(db.transactions.filter(t => (all || txInMonth(t)) && (type === 'all' || t.type === type) && (!term || `${t.description} ${t.category} ${t.payment} ${t.notes} ${goalMap.get(t.goalId) || ''} ${cofferMap.get(t.cofferId) || ''}`.toLocaleLowerCase('pt-BR').includes(term))));
    $('#transactionsBody').innerHTML = filtered.length ? filtered.map(t => {
      const cls = t.type === 'Entrada' || t.type === 'Resgate' ? 'income' : t.type === 'Gasto' ? 'expense' : 'saving';
      const pay = t.cofferId ? (cofferMap.get(t.cofferId) || 'Cofrinho removido') : t.type === 'Reserva' ? (goalMap.get(t.goalId) || 'Sem meta definida') : (t.payment || '—');
      return `<tr><td>${fmtDate(t.date)}</td><td><div class="main-cell">${esc(t.description)}</div>${t.notes ? `<div class="secondary-line">${esc(t.notes)}</div>` : ''}</td><td>${esc(t.category)}</td><td><span class="pill ${cls}">${t.type === 'Reserva' ? 'Guardado' : esc(t.type)}</span></td><td>${esc(pay)}</td><td class="right currency-${cls}">${t.type === 'Entrada' || t.type === 'Resgate' ? '+' : t.type === 'Gasto' ? '-' : ''}${money(t.amount)}</td><td class="right"><div class="actions">${t.cofferId ? `<button class="action-small" type="button" data-view="cofrinhos">Cofrinho</button>` : `<button class="action-small" type="button" data-edit-transaction="${esc(t.id)}" aria-label="Editar lançamento">Editar</button>`}<button class="action-small danger" type="button" data-delete-transaction="${esc(t.id)}" aria-label="Excluir lançamento">✕</button></div></td></tr>`;
    }).join('') : '<tr><td colspan="7" class="empty-row">Nenhum lançamento encontrado. Adicione um registro ou altere os filtros.</td></tr>';
    $('#transactionsFooter').textContent = `${filtered.length} lançamento(s) exibido(s) ${all ? '· todos os meses' : `· ${MONTHS[db.settings.month - 1]} de ${db.settings.year}`}`;
  }
  function renderBudgets() {
    const budget = db.budgets[monthKey()] || {};
    const spent = Object.fromEntries(expenseCats().map(cat => [cat, dec(db.transactions.filter(t => t.type === 'Gasto' && txInMonth(t) && t.category === cat).reduce((sum, t) => sum + t.amount, 0))]));
    const setCats = expenseCats().filter(cat => Object.hasOwn(budget, cat));
    const limit = dec(setCats.reduce((sum, cat) => sum + budget[cat], 0));
    const spentTotal = dec(Object.values(spent).reduce((a, b) => a + b, 0));
    $('#budgetOverview').innerHTML = infoCard('Limites definidos', money(limit), `${setCats.length} de ${expenseCats().length} categorias`) + infoCard('Gasto real do mês', money(spentTotal), 'Somente lançamentos do tipo Gasto') + infoCard('Diferença planejado − gasto', money(limit - spentTotal), limit - spentTotal < 0 ? 'Acima do total definido' : 'Atenção às categorias sem teto', limit - spentTotal < 0 ? 'alert' : 'positive');
    $('#budgetRows').innerHTML = expenseCats().map(cat => {
      const exists = Object.hasOwn(budget, cat), target = exists ? budget[cat] : 0, actual = spent[cat];
      const ratio = target > 0 ? actual / target : 0;
      const percent = Math.min(100, ratio * 100);
      const situation = !exists ? 'Sem limite' : target === 0 ? (actual > 0 ? 'Acima do teto' : 'Teto zero') : ratio > 1 ? 'Acima do teto' : ratio >= .8 ? 'Perto do limite' : 'Dentro do limite';
      const color = ratio > 1 || target === 0 && exists && actual > 0 ? 'over' : ratio >= .8 ? 'warn' : 'ok';
      // Estrutura independente por célula: preserva o alinhamento com zoom de 50% a 400%.
      // O conteúdo da categoria nunca divide linha com os botões de ação.
      return `
        <div class="budget-row" role="group" aria-label="Categoria ${esc(cat)}">
          <div class="budget-cat">
            <strong class="budget-cat-title">${esc(cat)}</strong>
            <small class="category-note">${esc(db.categoryNotes[cat] || 'Sem observações')}</small>
            <div class="budget-cat-actions">
              <button type="button" class="action-small" data-edit-category="${esc(cat)}" aria-label="Editar categoria ${esc(cat)}">Editar</button>
              <button type="button" class="action-small danger" data-delete-category="${esc(cat)}" aria-label="Excluir categoria ${esc(cat)}">Excluir</button>
            </div>
          </div>
          <label class="budget-limit-field">
            <span class="budget-field-label">Teto mensal</span>
            <input aria-label="Teto mensal de ${esc(cat)}" data-budget-cat="${esc(cat)}" type="number" min="0" max="1000000000" step="0.01" placeholder="Definir teto" value="${exists ? target : ''}">
          </label>
          <div class="budget-number"><span class="budget-field-label">Gastos no mês</span>${money(actual)}</div>
          <div class="budget-progress-wrap">
            <span class="budget-field-label">Progresso</span>
            <div class="budget-progress"><span class="${color}" style="width:${percent}%"></span></div>
            <small>${exists ? `${target > 0 ? (ratio * 100).toFixed(0) : actual ? 'Acima do teto' : '0'}% utilizado · ${money(target - actual)} disponível` : 'Nenhum limite definido'}</small>
          </div>
          <div class="budget-status ${situation === 'Acima do teto' ? 'over' : color === 'ok' && exists ? 'ok' : ''}"><span class="budget-field-label">Situação</span>${situation}</div>
        </div>`;
    }).join('');
  }
  // ===== CONTAS FIXAS: tabela e cores de prioridade =====
  function renderBills() {
    const priorityRules = window.ControlePrioridadeContas;
    const referenceDate = new Date();
    const active = db.bills.filter(b => b.active);
    const unpaid = active.filter(b => !billIsPaid(b, referenceDate));
    const paidCount = active.length - unpaid.length;
    const urgent = unpaid.filter(b => priorityRules.getPriority(b, referenceDate).days <= 1).length;
    $('#billsStats').innerHTML =
      infoCard('Total previsto no mês', money(fixedTotal()), 'Previsão, não pagamento confirmado') +
      infoCard('Vencem hoje ou amanhã', String(urgent), 'Prioridade vermelha') +
      infoCard('Pagas neste mês', String(paidCount), `${unpaid.length} pendente(s) · ${db.bills.length - active.length} pausada(s)`);

    // Exibe primeiro a próxima conta a vencer; as pausadas ficam no final.
    const ordered = priorityRules.sortBills(db.bills, referenceDate).sort((a, b) => Number(billIsPaid(a, referenceDate)) - Number(billIsPaid(b, referenceDate)));
    $('#billsBody').innerHTML = ordered.length ? ordered.map(b => {
      const priority = priorityRules.getPriority(b, referenceDate);
      const paid = billIsPaid(b, referenceDate);
      return `<tr class="bill-row bill-row--${paid ? 'paid' : priority.tone}">
        <td class="main-cell">${esc(b.name)}</td>
        <td>${esc(b.category)}</td>
        <td class="bill-due-cell"><strong>${b.active ? priority.dueText : '—'}</strong><small>Todo dia ${String(b.day).padStart(2, '0')}</small></td>
        <td>${paid ? '<span class="bill-priority-badge priority--paid">✓ Paga</span>' : billPriorityBadge(priority)}</td>
        <td class="right"><strong>${money(b.amount)}</strong></td>
        <td><span class="pill ${paid ? 'income' : b.active ? 'expense' : 'inactive'}">${paid ? 'Paga' : b.active ? 'Pendente' : 'Pausada'}</span></td>
        <td class="right"><div class="actions">
          ${b.active ? `<button class="action-small bill-pay-button ${paid ? 'bill-undo-button' : ''}" type="button" data-toggle-bill-paid="${esc(b.id)}" aria-label="${paid ? 'Desmarcar pagamento de' : 'Marcar como paga'} ${esc(b.name)}">${paid ? '↶ Desmarcar' : '✓ Marcar paga'}</button>` : ''}
          <button class="action-small" data-edit-bill="${esc(b.id)}" type="button">Editar</button>
          <button class="action-small danger" data-delete-bill="${esc(b.id)}" type="button" aria-label="Excluir conta ${esc(b.name)}">✕</button>
        </div></td>
      </tr>`;
    }).join('') : '<tr><td colspan="7" class="empty-row">Nenhuma conta cadastrada. Use “Adicionar conta” para começar.</td></tr>';
  }
  function renderGoals() {
    const goalIds = activeGoalIds();
    const assigned = dec(db.transactions.filter(t => t.type === 'Reserva' && goalIds.has(t.goalId)).reduce((sum, t) => sum + t.amount, 0));
    const unassigned = dec(db.transactions.filter(t => t.type === 'Reserva' && !goalIds.has(t.goalId) && !t.cofferId).reduce((sum, t) => sum + t.amount, 0));
    const initialTotal = dec(db.goals.reduce((sum, g) => sum + g.initial, 0));
    $('#goalsStats').innerHTML = infoCard('Total em metas', money(initialTotal + assigned), 'Valor inicial + reservas registradas') + infoCard('Reservas sem meta', money(unassigned), 'Guardado, mas sem vínculo com objetivo') + infoCard('Metas cadastradas', String(db.goals.length), 'Escolha uma meta ao registrar a reserva');
    $('#goalsGrid').innerHTML = db.goals.length ? db.goals.map(g => {
      const saved = dec(g.initial + savingsForGoal(g.id)); const missing = Math.max(0, dec(g.target - saved)); const percentage = g.target > 0 ? saved / g.target * 100 : 0;
      return `<article class="goal-card"><div class="goal-card-header"><span class="goal-icon">◎</span><span class="pill ${g.target > 0 && saved >= g.target ? 'income' : 'saving'}">${g.target > 0 && saved >= g.target ? 'Meta alcançada' : 'Em andamento'}</span></div><div class="goal-title">${esc(g.name)}</div><div class="goal-sub">Objetivo: ${money(g.target)} · Inicial: ${money(g.initial)}</div><div class="goal-numbers"><strong>${money(saved)}</strong><span>${Math.round(percentage)}% concluído</span></div><div class="progress-track"><div class="progress-fill" style="width:${clamp(percentage, 0, 100)}%"></div></div><div class="goal-meta"><span>${missing > 0 ? `Faltam ${money(missing)}` : 'Objetivo alcançado'}</span><strong>${money(savingsForGoal(g.id))} em reservas</strong></div><div class="goal-actions"><button class="button button-outline" type="button" data-edit-goal="${esc(g.id)}">Editar meta</button><button class="action-small danger" type="button" data-delete-goal="${esc(g.id)}" aria-label="Excluir meta ${esc(g.name)}">✕</button></div></article>`;
    }).join('') : '<div class="panel empty-state"><span class="empty-symbol">◎</span>Nenhuma meta cadastrada.<br>Crie sua primeira meta para acompanhar quanto já guardou.</div>';
  }
  function renderCoffers() {
    const total = dec(db.coffers.reduce((sum, c) => sum + cofferBalance(c), 0));
    const target = dec(db.coffers.reduce((sum, c) => sum + cofferTarget(c), 0));
    const woodboxCount = db.coffers.filter(c => c.mode === 'woodbox').length;
    $('#cofferStats').innerHTML = infoCard('Guardado nos cofrinhos', money(total), 'Inclui valores iniciais informados') + infoCard('Objetivo dos cofrinhos', money(target), 'Soma das metas estabelecidas') + infoCard('Desafios Woodbox', String(woodboxCount), `${db.coffers.length} cofrinho(s) ao todo`);
    if (!db.coffers.length) {
      $('#cofferList').innerHTML = '<div class="panel coffer-empty"><span class="piggy-big">🐷</span><h2>Seu primeiro cofrinho começa aqui</h2><p>Crie um cofrinho livre ou escolha uma cartela Woodbox para completar cada depósito.</p><button class="button button-primary" type="button" data-action="add-coffer">+ Criar meu cofrinho</button></div>';
      $('#cofferDetails').innerHTML = ''; selectedCofferId = null; return;
    }
    if (!db.coffers.some(c => c.id === selectedCofferId)) selectedCofferId = db.coffers[0].id;
    $('#cofferList').innerHTML = db.coffers.map(c => {
      const balance = cofferBalance(c), goal = cofferTarget(c), pct = goal > 0 ? clamp(balance / goal * 100, 0, 100) : 0;
      const isWood = c.mode === 'woodbox';
      return `<button class="coffer-select ${isWood ? 'is-wood' : ''} ${c.id === selectedCofferId ? 'is-selected' : ''}" type="button" data-select-coffer="${esc(c.id)}" aria-pressed="${c.id === selectedCofferId}"><span class="coffer-card-top"><span class="coffer-card-icon">${isWood ? '▦' : '🐷'}</span><span class="coffer-type">${isWood ? 'DESAFIO WOODBOX' : 'COFRINHO LIVRE'}</span></span><strong class="coffer-card-title">${esc(c.name)}</strong><span class="coffer-card-amount">${money(balance)}</span><span class="coffer-card-meta">de ${money(goal)}</span><span class="progress-track coffer-progress"><span class="progress-fill" style="width:${pct}%"></span></span><span class="coffer-card-foot">${Math.round(pct)}% concluído <span>Abrir →</span></span></button>`;
    }).join('');
    const c = db.coffers.find(x => x.id === selectedCofferId);
    const balance = cofferBalance(c), goal = cofferTarget(c), remaining = Math.max(0, dec(goal - balance)), pct = goal > 0 ? clamp(balance / goal * 100, 0, 100) : 0;
    const actions = `<div class="coffer-title-actions">${c.mode === 'woodbox' ? '<button class="button button-outline" type="button" data-action="print-woodbox">Imprimir cartela</button>' : ''}<button class="button button-outline" type="button" data-edit-coffer="${esc(c.id)}">Editar</button><button class="action-small danger" type="button" data-delete-coffer="${esc(c.id)}">Excluir</button></div>`;
    if (c.mode === 'woodbox') {
      const cells = cofferCells(c), marks = occupiedCofferSlots(c);
      const sumMarked = dec([...marks.values()].reduce((sum, t) => sum + t.amount, 0));
      const remainingBoxes = cells.length - marks.size;
      $('#cofferDetails').innerHTML = `<section class="panel coffer-detail woodbox-detail"><div class="coffer-detail-heading"><div><span class="eyebrow">CARTELA INTERATIVA</span><h2>🪵 ${esc(c.name)}</h2><p>Selecione uma casa para confirmar que guardou o valor mostrado nela.</p></div>${actions}</div>
      <div class="woodbox-stats"><div><small>Total do desafio</small><strong>${money(goal)}</strong></div><div><small>Depósitos marcados</small><strong>${marks.size} / ${cells.length}</strong></div><div><small>Guardado nas casas</small><strong>${money(sumMarked)}</strong></div><div><small>Faltam nas casas</small><strong>${money(dec(goal - sumMarked))}</strong></div></div>
      <div class="woodbox-tools"><label>Data do depósito <input type="date" id="cofferDepositDate" value="${today()}" aria-label="Data do depósito Woodbox"></label><span class="woodbox-note">Clique numa casa livre para registrar o depósito; clique na casa marcada para desfazer o registro. Cada casa vale exatamente o valor exibido.</span></div>
      <div class="wooden-frame"><div class="wooden-label"><span>WOODBOX</span><small>Marque cada conquista</small></div><div class="woodbox-grid" aria-label="Cartela de depósitos Woodbox">${cells.map((value, index) => { const marked = marks.has(index); return `<button type="button" data-coffer-cell="${esc(c.id)}" data-slot="${index}" class="woodbox-cell ${marked ? 'is-marked' : ''}" aria-pressed="${marked}" title="Casa ${index + 1}: ${money(value)} · ${marked ? 'depositado' : 'a depositar'}"><span class="cell-number">${index + 1}</span><strong>${money(value).replace('R$', 'R$')}</strong><span class="cell-check">${marked ? '✓' : '○'}</span></button>`; }).join('')}</div><p class="woodbox-frame-footer">Só marque um valor quando o dinheiro tiver sido realmente separado. <strong>${remainingBoxes} casa(s) pendente(s)</strong>.</p></div>
      <p class="coffer-explain">Os depósitos da Woodbox são lançados automaticamente como <strong>Reserva</strong> e já aparecem no painel. Não registre novamente o mesmo valor em “Lançamentos”. ${c.plan === 'trintamil' ? 'Nesta cartela, as 300 casas representam parcelas de R$ 100 cada.' : ''}</p>
      </section>`;
    } else {
      const records = sortedTransactions(cofferTransactions(c.id));
      $('#cofferDetails').innerHTML = `<section class="panel coffer-detail"><div class="coffer-detail-heading"><div><span class="eyebrow">POUPANÇA PERSONALIZADA</span><h2>🐷 ${esc(c.name)}</h2><p>Guarde quando puder e retire quando precisar. Tudo fica no histórico.</p></div>${actions}</div><div class="free-coffer-hero"><div><small>Saldo atual neste cofrinho</small><strong>${money(balance)}</strong><span>Faltam ${money(remaining)} para seu objetivo</span></div><div class="free-coffer-target"><span>${Math.round(pct)}% da meta</span><strong>${money(goal)}</strong><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div></div>
      <div class="coffer-controls"><button class="button button-primary" type="button" data-coffer-move="${esc(c.id)}" data-move-type="deposit">+ Depositar</button><button class="button button-outline" type="button" data-coffer-move="${esc(c.id)}" data-move-type="withdraw" ${balance <= 0 ? 'disabled' : ''}>− Retirar</button></div>
      <div class="coffer-history"><h3>Movimentações do cofrinho</h3>${records.length ? records.slice(0, 15).map(t => `<div class="coffer-history-line"><div><strong>${esc(t.description)}</strong><small>${fmtDate(t.date)}</small></div><b class="${t.type === 'Resgate' ? 'currency-expense' : 'currency-income'}">${t.type === 'Resgate' ? '-' : '+'}${money(t.amount)}</b></div>`).join('') : '<p>Ainda não há depósitos. O valor inicial, caso informado, já está no saldo e não é um lançamento do mês.</p>'}</div><p class="coffer-explain">Depósitos são registrados como Reserva. Retiradas são Resgates: voltam ao saldo disponível, mas <strong>não são novas receitas</strong>.</p></section>`;
    }
  }
  // ===== 03-B. SIMULADOR CDI E TESOURO SELIC (APENAS PROJEÇÕES) =====
  // Matemática e consulta BCB ficam em assets/js/rendimentos-simulador.js.
  const yieldEngine = window.KaykoRendimentos;
  const getYieldSettings = () => db.settings.investmentSimulator ||= yieldEngine.normalize(null);
  const fmtPercent = n => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(n) + '%';
  function yieldPrincipal(p) {
    if (p.source.startsWith('coffer:')) {
      const c = db.coffers.find(c => c.id === p.source.slice(7));
      if (c) return Math.max(0, cofferBalance(c));
    }
    return p.principal;
  }
  function renderYieldSimulator() {
    const p = getYieldSettings();
    const source = $('#yieldSource');
    source.innerHTML = '<option value="manual">Valor informado por mim</option>' + db.coffers.map(c => `<option value="coffer:${esc(c.id)}">Cofrinho · ${esc(c.name)}</option>`).join('');
    if (p.source !== 'manual' && !db.coffers.some(c => `coffer:${c.id}` === p.source)) p.source = 'manual';
    source.value = p.source;
    renderYieldInputs();
    renderYieldResults();
  }
  function renderYieldInputs() {
    const p = getYieldSettings(), fromCoffer = p.source !== 'manual';
    $('#yieldSource').value = p.source;
    $('#yieldPrincipal').value = yieldPrincipal(p);
    $('#yieldPrincipal').disabled = fromCoffer;
    $('#yieldPrincipal').title = fromCoffer ? 'Para editar o valor, selecione “Valor informado por mim”.' : '';
    $('#yieldPeriodUnit').value = p.periodUnit;
    $('#yieldPeriodCount').max = p.periodUnit === 'days' ? '2520' : '360';
    $('#yieldPeriodCount').value = p.periodCount;
    $('#yieldCdiAnnual').value = Number(p.cdiAnnual.toFixed(4));
    $('#yieldSelicAnnual').value = Number(p.selicAnnual.toFixed(4));
    $('#yieldCdiPercent').value = p.cdiPercent;
  }
  function renderYieldResults() {
    const p = getYieldSettings();
    const result = yieldEngine.compare(p, yieldPrincipal(p));
    const duration = p.periodUnit === 'days' ? `${p.periodCount} dia(s) útil(eis)` : `${p.periodCount} mês(es)`;
    $('#yieldResults').innerHTML = [
      { name: `Aplicação a ${fmtPercent(p.cdiPercent)} do CDI`, rate: `CDI anual: ${fmtPercent(p.cdiAnnual)}`, data: result.cdi, icon: '↗' },
      { name: 'Tesouro Selic (estimado)', rate: `Selic anual: ${fmtPercent(p.selicAnnual)}`, data: result.treasury, icon: '◎' }
    ].map((item, i) => `<article class="yield-result-card ${i === 0 ? 'yield-cdi' : 'yield-treasury'}">
      <div class="yield-result-head"><span class="yield-result-mark" aria-hidden="true">${item.icon}</span><div><h3>${item.name}</h3><small>${item.rate}</small></div></div>
      <div class="yield-result-main"><span>Rendimento bruto em ${duration}</span><strong>${money(item.data.grossYield)}</strong></div>
      <div class="yield-result-foot"><span>Saldo inicial: ${money(result.principal)}</span><strong>Total projetado: ${money(item.data.grossTotal)}</strong></div>
    </article>`).join('');
    $('#yieldQuickResults').innerHTML = `<h3>Quanto poderia render por dia e por mês?</h3>
      <div class="yield-quick-grid"><div><span>1 dia útil</span><strong>CDI: ${money(result.quick.cdiDay)}</strong><strong>Tesouro Selic: ${money(result.quick.treasuryDay)}</strong></div>
      <div><span>1 mês (≈ 21 dias úteis)</span><strong>CDI: ${money(result.quick.cdiMonth)}</strong><strong>Tesouro Selic: ${money(result.quick.treasuryMonth)}</strong></div></div>
      <small>Projeção sobre o saldo de ${money(result.principal)} com taxas constantes. Não considera feriados, impostos e taxas.</small>`;
    $('#yieldRateStatus').textContent = p.rateSource === 'bcb'
      ? `Banco Central: ${p.rateDate || 'última consulta'} · taxas diárias anualizadas para simulação. Você pode ajustá-las manualmente.`
      : p.rateSource === 'manual'
        ? 'Taxas informadas manualmente. Confira as condições do seu investimento antes de comparar.'
        : 'Taxas iniciais de 10% ao ano são APENAS EXEMPLOS, não cotações atuais. Altere-as ou consulte o Banco Central.';
  }
  function handleYieldInput(e) {
    const el = e.target;
    const p = getYieldSettings();
    if (el.id === 'yieldSource') {
      p.source = el.value === 'manual' || db.coffers.some(c => el.value === `coffer:${c.id}`) ? el.value : 'manual';
      save(); renderYieldInputs(); renderYieldResults(); return;
    }
    if (el.id === 'yieldPeriodUnit') {
      p.periodUnit = el.value === 'days' ? 'days' : 'months';
      p.periodCount = Math.min(p.periodCount, p.periodUnit === 'days' ? 2520 : 360);
      save(); renderYieldInputs(); renderYieldResults(); return;
    }
    const controls = { yieldPrincipal: ['principal', 0, 1e12], yieldPeriodCount: ['periodCount', 1, p.periodUnit === 'days' ? 2520 : 360], yieldCdiAnnual: ['cdiAnnual', 0, 100], yieldCdiPercent: ['cdiPercent', 0, 200], yieldSelicAnnual: ['selicAnnual', 0, 100] };
    const config = controls[el.id]; if (!config) return;
    const [field, min, max] = config;
    const raw = el.value.trim(); if (raw === '') return;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < min || value > max || field === 'periodCount' && !Number.isInteger(value)) return;
    p[field] = value;
    if (field === 'cdiAnnual' || field === 'selicAnnual') { p.rateSource = 'manual'; p.rateDate = ''; }
    save(); renderYieldResults();
  }
  async function updateYieldRates() {
    const button = $('#yieldGetBcbRates');
    button.disabled = true;
    button.textContent = 'Consultando…';
    $('#yieldRateStatus').textContent = 'Consultando indicadores oficiais no Banco Central…';
    try {
      const r = await yieldEngine.fetchRates();
      const p = getYieldSettings();
      p.cdiAnnual = r.cdiAnnual; p.selicAnnual = r.selicAnnual; p.rateDate = r.rateDate; p.rateSource = 'bcb';
      save(); renderYieldInputs(); renderYieldResults(); notify('Taxas do Banco Central atualizadas para a simulação.');
    } catch (error) {
      renderYieldResults();
      $('#yieldRateStatus').textContent = 'Não foi possível buscar as taxas agora. Confira a conexão ou preencha as taxas manualmente. ' + (error?.message || '');
      notify('Consulta indisponível. Use as taxas manuais.', true);
    } finally { button.disabled = false; button.textContent = '↻ Consultar Banco Central'; }
  }

  function handleCofferCell(cofferId, slot, date) {
    const c = db.coffers.find(c => c.id === cofferId && c.mode === 'woodbox'); if (!c) return;
    const cells = cofferCells(c); if (!Number.isInteger(slot) || slot < 0 || slot >= cells.length) return;
    const existing = occupiedCofferSlots(c).get(slot);
    if (existing) {
      if (!confirm(`Desfazer o depósito da casa ${slot + 1} (${money(existing.amount)})? O lançamento será removido do histórico.`)) return;
      const old = db.transactions; db.transactions = old.filter(t => t.id !== existing.id);
      if (!save()) { db.transactions = old; return; } render(); notify('Depósito desmarcado e lançamento removido.'); return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T12:00:00`).getTime())) { notify('Escolha uma data válida.', true); return; }
    const amount = cells[slot]; if (!(amount > 0)) { notify('Valor de depósito inválido.', true); return; }
    if (!confirm(`Você já separou ${money(amount)} de verdade para a casa ${slot + 1}?\nConfirmar depósito em ${fmtDate(date)}?`)) return;
    const record = { id: uid(), date, type: 'Reserva', category: 'Economia', description: `Woodbox · ${c.name} · casa ${slot + 1}`, payment: '', amount, goalId: '', cofferId: c.id, boxSlot: slot, notes: 'Depósito confirmado na cartela Woodbox' };
    db.transactions.push(record); if (!save()) { db.transactions.pop(); return; } render(); notify(`Casa ${slot + 1} concluída! ${money(amount)} guardados.`);
  }
  function deleteCoffer(id) {
    const c = db.coffers.find(x => x.id === id); if (!c) return;
    if (!confirm(`Excluir o cofrinho "${c.name}"? Os depósitos e resgates continuarão no histórico financeiro, mas perderão o vínculo com este cofrinho. Faça backup antes, se necessário.`)) return;
    db.coffers = db.coffers.filter(x => x.id !== id);
    db.transactions.forEach(t => { if (t.cofferId === id) { t.cofferId = ''; t.boxSlot = null; } });
    selectedCofferId = db.coffers[0]?.id || null; save(); render(); notify('Cofrinho excluído. Histórico financeiro preservado.');
  }
  const field = (name, label, html, wide = false, help = '') => `<div class="form-field ${wide ? 'wide' : ''}"><label for="form-${name}">${label}</label>${html}${help ? `<p class="field-help">${help}</p>` : ''}</div>`;
  const input = (name, type, value, required = false, extra = '') => `<input id="form-${name}" name="${name}" type="${type}" ${required ? 'required' : ''} ${extra} value="${esc(value)}">`;
  const select = (name, values, value, extra = '') => `<select id="form-${name}" name="${name}" ${extra}>${values.map(v => `<option value="${esc(v[0])}" ${v[0] === value ? 'selected' : ''}>${esc(v[1])}</option>`).join('')}</select>`;
  const choices = arr => arr.map(c => [c, c]);
  // ===== PONTOS: MENU COM GRUPOS E EXEMPLOS SEPARADOS =====
  // Os IDs internos permanecem iguais aos dos backups antigos.
  const POINT_MODE_GROUPS = [
    ['Equivalência personalizada', [
      ['ratioBRL', 'Pontos → Reais (R$)'],
      ['ratioUSD', 'Pontos → Dólares (US$)'],
      ['ratioCrypto', 'Pontos → Criptomoeda']
    ]],
    ['Valor de cada ponto', [
      ['BRL', '1 ponto em reais (R$)'],
      ['USD', '1 ponto em dólares (US$)']
    ]],
    ['Outras regras', [
      ['legacy', 'Pontos para receber US$ 1']
    ]]
  ];
  const POINT_MODE_HELP = {
    ratioBRL: 'Exemplo: 3.615 pontos = R$ 15,00. Informe a quantidade de pontos e o valor total equivalente.',
    ratioUSD: 'Exemplo: 3.615 pontos = US$ 15,00. Informe a quantidade de pontos e o valor em dólares.',
    ratioCrypto: 'Exemplo: 3.615 pontos = 0,0001 BTC. Escolha a criptomoeda e informe a quantidade correspondente.',
    BRL: 'Exemplo: cada ponto vale R$ 0,01. Digite o valor de um único ponto.',
    USD: 'Exemplo: cada ponto vale US$ 0,01. Digite o valor de um único ponto.',
    legacy: 'Exemplo: 1.000 pontos = US$ 1. Informe quantos pontos são necessários para receber um dólar.'
  };
  function pointModeSelect(value) {
    return `<select id="form-pointValueMode" name="pointValueMode" aria-describedby="pointModeExplanation">${POINT_MODE_GROUPS.map(([group, items]) => `<optgroup label="${esc(group)}">${items.map(([key, label]) => `<option value="${key}" ${key === value ? 'selected' : ''}>${esc(label)}</option>`).join('')}</optgroup>`).join('')}</select>`;
  }
  // ===== 03. FORMULÁRIOS DE CADASTRO E EDIÇÃO =====
  function pixKeyRow(entry) {
    const options = [['random','Aleatória'],['cpf','CPF'],['cnpj','CNPJ'],['email','E-mail'],['phone','Celular']];
    return `<div class="pix-multi-row"><label>Tipo de chave <select name="pixEntryType" aria-label="Tipo de chave Pix">${options.map(([code,label]) => `<option value="${code}" ${entry.type === code ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>Chave Pix * <input name="pixEntryKey" type="text" value="${esc(entry.key || '')}" maxlength="160" autocomplete="off" required placeholder="Informe a chave de recebimento"></label><button class="action-small danger" type="button" data-remove-pix-row aria-label="Remover esta chave">Remover</button></div>`;
  }
  function openModal(kind, id = null, operation = 'deposit') {
    previousFocus = document.activeElement;
    editing = { kind, id, operation };
    const found = kind === 'transaction' ? db.transactions.find(x => x.id === id) : kind === 'bill' ? db.bills.find(x => x.id === id) : kind === 'goal' ? db.goals.find(x => x.id === id) : kind === 'coffer' || kind === 'cofferMove' ? db.coffers.find(x => x.id === id) : kind === 'wallet' ? db.wallets.find(x => x.id === id) : kind === 'category' && id ? { name: id, notes: db.categoryNotes[id] || '' } : kind === 'pix' ? db.pixKeys.find(x => x.id === id) : kind === 'debt' ? db.debts.find(x => x.id === id) : kind === 'customCrypto' && id ? db.customCryptos.find(x => x.symbol === id) : null;
    if (id && !found) return;
    if (kind === 'transaction' && found?.cofferId) { notify('Movimentações do cofrinho são gerenciadas na aba Cofrinhos.', true); return; }
    $('#dialogEyebrow').textContent = id ? 'EDITAR REGISTRO' : 'NOVO REGISTRO';
    if (kind === 'transaction') {
      const t = found || { date: today(), type: 'Gasto', category: 'Alimentação', description: '', payment: 'Pix', amount: '', goalId: '', notes: '' };
      $('#dialogTitle').textContent = id ? 'Editar lançamento' : 'Novo lançamento';
      $('#formFields').innerHTML = field('date', 'Data *', input('date', 'date', t.date, true)) + field('type', 'Tipo *', select('type', choices(t.type === 'Resgate' ? ['Resgate'] : ['Entrada', 'Gasto', 'Reserva']), t.type, 'required')) + field('description', 'Descrição *', input('description', 'text', t.description, true, 'maxlength="120" placeholder="Ex.: Supermercado"'), true) + field('category', 'Categoria *', `<select id="form-category" name="category" required></select>`) + field('payment', 'Forma de pagamento', select('payment', choices(PAYMENTS), t.payment)) + field('amount', 'Valor (R$) *', input('amount', 'number', t.amount, true, 'min="0.01" max="1000000000" step="0.01" placeholder="0,00"')) + field('goalId', 'Vincular a uma meta', select('goalId', [['', 'Sem meta definida'], ...db.goals.map(g => [g.id, g.name])], t.goalId), true, 'Só será utilizado para lançamentos do tipo Reserva.') + field('notes', 'Observações', `<textarea id="form-notes" name="notes" maxlength="300" placeholder="Opcional">${esc(t.notes)}</textarea>`, true);
      refreshTransactionFields(t.category);
      $('#form-type').addEventListener('change', () => refreshTransactionFields(null));
    } else if (kind === 'bill') {
      const b = found || { name: '', category: 'Contas', day: 10, amount: '', active: true };
      $('#dialogTitle').textContent = id ? 'Editar conta fixa' : 'Nova conta fixa';
      $('#formFields').innerHTML = field('name', 'Nome da conta *', input('name', 'text', b.name, true, 'maxlength="100" placeholder="Ex.: Internet"'), true) + field('category', 'Categoria', select('category', choices(expenseCats()), b.category)) + field('day', 'Dia do vencimento *', input('day', 'number', b.day, true, 'min="1" max="31" step="1"')) + field('amount', 'Valor previsto (R$) *', input('amount', 'number', b.amount, true, 'min="0.01" max="1000000000" step="0.01"')) + field('active', 'Situação', select('active', [['true', 'Ativa'], ['false', 'Pausada']], String(b.active)), true, 'Previsões não são descontadas automaticamente do saldo.');
    } else if (kind === 'goal') {
      const g = found || { name: '', target: '', initial: 0 };
      $('#dialogTitle').textContent = id ? 'Editar meta' : 'Nova meta';
      $('#formFields').innerHTML = field('name', 'Nome da meta *', input('name', 'text', g.name, true, 'maxlength="100" placeholder="Ex.: Casa, Emergência"'), true) + field('target', 'Quanto quer guardar (R$) *', input('target', 'number', g.target, true, 'min="0.01" max="1000000000" step="0.01"')) + field('initial', 'Quanto já tinha guardado (R$)', input('initial', 'number', g.initial, false, 'min="0" max="1000000000" step="0.01"'), false, 'Saldo anterior: não entra no dinheiro recebido deste mês.');
    } else if (kind === 'coffer') {
      const c = found || { name: '', mode: 'free', target: '', initial: 0, plan: 'mil', count: 100, unit: 10 };
      $('#dialogTitle').textContent = id ? 'Editar cofrinho' : 'Criar cofrinho';
      const hasDeposits = !!(id && cofferTransactions(id).length);
      const modeselect = select('mode', [['free', 'Cofrinho livre'], ['woodbox', 'Desafio Woodbox']], c.mode, hasDeposits ? 'disabled' : '');
      $('#formFields').innerHTML = field('name', 'Nome do cofrinho *', input('name', 'text', c.name, true, 'maxlength="100" placeholder="Ex.: Minha reserva"'), true)
        + field('mode', 'Modelo', modeselect, true, hasDeposits ? 'Para proteger o histórico, o tipo não pode mudar depois do primeiro lançamento.' : 'Você escolhe entre depósitos livres ou casas marcadas.')
        + field('target', 'Objetivo (R$) *', input('target', 'number', c.target || '', false, 'min="0.01" max="1000000000" step="0.01" placeholder="Ex.: 3000"'))
        + field('initial', 'Valor já guardado antes (R$)', input('initial', 'number', c.initial || 0, false, 'min="0" max="1000000000" step="0.01"'), false, 'Não entra como receita ou depósito deste mês.')
        + field('plan', 'Escolha o desafio', select('plan', Object.entries(WOODBOX_PLANS).map(([id, p]) => [id, p.name]), c.plan), true)
        + field('count', 'Quantidade de casas', input('count', 'number', c.count, false, 'min="1" max="500" step="1"'))
        + field('unit', 'Depósito por casa (R$)', input('unit', 'number', c.unit, false, 'min="0.01" max="1000000000" step="0.01"'))
        + `<div class="form-field wide"><p class="field-help" id="cofferPreview"></p></div>`;
      if (hasDeposits && c.mode === 'woodbox') $('#form-plan').disabled = true;
      const refresh = () => refreshCofferForm(c);
      ['mode', 'plan', 'count', 'unit'].forEach(x => $('#form-' + x).addEventListener('change', refresh));
      ['count', 'unit'].forEach(x => $('#form-' + x).addEventListener('input', refresh));
      refresh();
    } else if (kind === 'wallet') {
      const w = found || { app: '', kind: 'money', currency: 'BRL', balance: 0, pointsPerUsd: 0, pointValueMode: 'ratioBRL', pointUnitValue: 0, pointReferencePoints: 3615, pointReferenceBRL: 15, manualUsdPrice: 0 };
      $('#dialogTitle').textContent = id ? 'Editar saldo externo' : 'Adicionar app ou saldo';
      $('#formFields').innerHTML = field('app', 'Nome do aplicativo *', input('app', 'text', w.app, true, 'maxlength="100" placeholder="Ex.: aplicativo de recompensas"'), true)
        + field('kind', 'O que deseja acompanhar?', select('kind', [['money', 'Saldo em moeda'], ['points', 'Pontos / recompensas'], ['crypto', 'Criptomoeda']], w.kind), true)
        + field('balance', 'Quantidade ou saldo *', input('balance', 'number', w.balance, true, 'min="0" max="1000000000000" step="any" placeholder="Ex.: 250.5"'))
        + field('currency', 'Moeda do saldo', select('currency', FIAT_CURRENCIES.map(c => [c, c]), FIAT_CURRENCIES.includes(w.currency) ? w.currency : 'BRL'))
        + field('cryptoSearch', 'Buscar criptomoeda', input('cryptoSearch', 'search', '', false, 'placeholder="Pesquisar por nome ou sigla"'))
        + field('crypto', 'Criptomoeda', select('crypto', orderedCryptos().map(([c, v]) => [c, `${db.settings.cryptoFavorites.includes(c) ? '★ ' : ''}${c} · ${v[0]}`]), Object.hasOwn(cryptoCatalog(), w.currency) ? w.currency : 'BTC'))
        + field('pointValueMode', 'Como definir o valor dos pontos?', pointModeSelect(w.pointValueMode || 'legacy'), true, 'Escolha uma regra. Você poderá informar os valores logo abaixo.')
        + '<div class="point-mode-example wide" id="pointModeExplanation" role="status" aria-live="polite"></div>'
        + field('pointUnitValue', 'Quanto vale 1 ponto?', input('pointUnitValue', 'number', w.pointUnitValue || '', false, 'min="0" max="1000000000000" step="any" placeholder="Ex.: 0.01"'), true, 'Ex.: 1 ponto = R$ 0,01 ou US$ 0,01, conforme a moeda escolhida.')
        + field('pointReferencePoints', 'Quantidade de pontos de referência', input('pointReferencePoints', 'number', w.pointReferencePoints || 3615, false, 'min="0.00000001" max="1000000000000" step="any" placeholder="Ex.: 3615"'), true, 'Ex.: 3615 pontos valem R$ 15. Pode definir outro valor para cada app.')
        + field('pointReferenceBRL', 'Valor equivalente em reais (R$)', input('pointReferenceBRL', 'number', w.pointReferenceBRL || 15, false, 'min="0.00000001" max="1000000000000" step="any" placeholder="Ex.: 15"'), true, 'O cálculo divide o valor em reais pelos pontos de referência e multiplica pela quantidade cadastrada.')
        + field('pointsPerUsd', 'Quantos pontos equivalem a US$ 1?', input('pointsPerUsd', 'number', w.pointsPerUsd || '', false, 'min="0.00000001" max="1000000000000" step="any" placeholder="Ex.: 1000"'), true, 'Exemplo: 1000 pontos = US$ 1. Deixe vazio se o app não informar taxa de troca.')
        + field('pointReferenceCrypto', 'Criptomoeda da equivalência', select('pointReferenceCrypto', orderedCryptos().map(([c, v]) => [c, `${c} · ${v[0]}`]), w.pointReferenceCrypto || 'BTC'), true, 'Escolha a criptomoeda que o aplicativo oferece em troca dos pontos.')
        + '<p class="field-help wide" id="walletPointsPreview" aria-live="polite"></p>'
        + field('manualUsdPrice', 'Cotação manual (US$ por 1 unidade)', input('manualUsdPrice', 'number', w.manualUsdPrice || '', false, 'min="0" max="1000000000000" step="any" placeholder="Opcional"'), true, 'Se preenchida, substitui a cotação automática da criptomoeda.');
      const refresh = refreshWalletFields;
      $('#form-kind').addEventListener('change', refresh);
      $('#form-cryptoSearch').addEventListener('input', () => filterCryptoSelect($('#form-cryptoSearch').value, '#form-crypto'));
      $('#form-pointValueMode').addEventListener('change', refresh);
      $('#form-balance').addEventListener('input', refreshWalletPointPreview);
      $('#form-pointUnitValue').addEventListener('input', refreshWalletPointPreview);
      $('#form-pointReferencePoints').addEventListener('input', refreshWalletPointPreview);
      $('#form-pointReferenceBRL').addEventListener('input', refreshWalletPointPreview);
      $('#form-pointReferenceCrypto').addEventListener('change', refreshWalletPointPreview);
      $('#form-pointsPerUsd').addEventListener('input', refreshWalletPointPreview);
      refresh();
    } else if (kind === 'category') {
      $('#dialogTitle').textContent = id ? 'Editar categoria' : 'Nova categoria de orçamento';
      $('#formFields').innerHTML = field('name', 'Nome da categoria *', input('name', 'text', found?.name || '', true, 'maxlength="60" placeholder="Ex.: Pets, Assinaturas, Beleza"'), true, 'A categoria também ficará disponível nos gastos e nas contas fixas.') + field('notes', 'Observações da categoria', `<textarea id="form-notes" name="notes" maxlength="500" placeholder="Ex.: Contas e despesas desta categoria">${esc(found?.notes || '')}</textarea>`, true);
    } else if (kind === 'pix') {
      const x = found || { name: '', keys: [{ type: 'random', key: '' }], bank: '', owner: '', notes: '' };
      const items = Array.isArray(x.keys) && x.keys.length ? x.keys : [{ type: x.type || 'random', key: x.key || '' }];
      $('#dialogTitle').textContent = id ? 'Editar cadastro de chaves Pix' : 'Cadastrar chaves Pix';
      $('#formFields').innerHTML = field('name', 'Identificação *', input('name', 'text', x.name, true, 'maxlength="90" placeholder="Ex.: Minha conta pessoal"'), true)
        + field('bank', 'Banco ou instituição', input('bank', 'text', x.bank, false, 'maxlength="100"'))
        + field('owner', 'Nome do titular', input('owner', 'text', x.owner, false, 'maxlength="100"'))
        + `<div class="form-field wide pix-multi-section"><div class="pix-multi-heading"><strong>Chaves Pix deste cadastro</strong><button class="button button-outline button-small" id="addPixKeyRow" type="button">+ Adicionar outra chave</button></div><div id="pixKeyRows" class="pix-multi-rows"></div><small class="field-help">Cadastre até 20 chaves. Cada uma poderá ser mostrada ou copiada separadamente.</small></div>`
        + field('notes', 'Observações', `<textarea id="form-notes" name="notes" maxlength="500">${esc(x.notes || '')}</textarea>`, true)
        + '<p class="field-help wide">Informe somente chaves de recebimento. Nunca salve senhas bancárias, códigos de verificação ou tokens.</p>';
      const rows = $('#pixKeyRows');
      items.forEach(item => rows.insertAdjacentHTML('beforeend', pixKeyRow(item)));
      $('#addPixKeyRow').addEventListener('click', () => {
        if (rows.children.length >= 20) { notify('Limite de 20 chaves por cadastro.', true); return; }
        rows.insertAdjacentHTML('beforeend', pixKeyRow({type:'random', key:''}));
        rows.lastElementChild.querySelector('input').focus();
      });
      rows.addEventListener('click', event => {
        const button = event.target.closest('[data-remove-pix-row]');
        if (!button) return;
        if (rows.children.length === 1) { notify('Mantenha pelo menos uma chave neste cadastro.', true); return; }
        button.closest('.pix-multi-row').remove();
      });
    } else if (kind === 'debt') {
      const x = found || {
        creditor: '', original: '', paymentMode: 'review', offerCash: '', offerInstallment: '',
        installmentCount: 1, entryAmount: 0, customInstallments: false, installmentAmounts: [], agreed: 0, paid: 0, dueDate: '',
        status: 'negotiating', notes: ''
      };
      $('#dialogTitle').textContent = id ? 'Editar dívida ou acordo' : 'Nova dívida ou negociação';
      const modes = [
        ['review', 'Comparando propostas (sem acordo fechado)'],
        ['cash', 'À vista'], ['installments', 'Parcelado'],
        ...(x.paymentMode === 'legacy' ? [['legacy', 'Acordo antigo (sem modalidade)']] : [])
      ];
      $('#formFields').innerHTML = field('creditor', 'Credor ou instituição *', input('creditor', 'text', x.creditor, true, 'maxlength="100" placeholder="Ex.: Banco, loja ou operadora"'), true)
        + field('original', 'Valor original da dívida (R$) *', input('original', 'number', x.original, true, 'min="0.01" max="1000000000000" step="0.01"'))
        + '<div class="form-wide-heading wide"><strong>Propostas recebidas</strong><span>Preencha uma ou ambas para comparar. Não é obrigatório aceitar a oferta.</span></div>'
        + field('offerCash', 'Oferta de pagamento à vista (R$)', input('offerCash', 'number', x.offerCash || '', false, 'min="0" max="1000000000000" step="0.01" placeholder="Ex.: 750,00"'), false, 'Total para quitar de uma vez, com desconto se houver.')
        + field('offerInstallment', 'Valor total da proposta parcelada (R$)', input('offerInstallment', 'number', x.offerInstallment || '', false, 'min="0" max="1000000000000" step="0.01" placeholder="Ex.: 960,00"'), false, 'Valor total da negociação parcelada, incluindo a entrada.')
        + field('installmentCount', 'Número de parcelas (após a entrada)', input('installmentCount', 'number', x.installmentCount || 1, false, 'min="1" max="120" step="1"'))
        + field('entryAmount', 'Valor da entrada (R$)', input('entryAmount', 'number', x.entryAmount || 0, false, 'min="0" max="1000000000000" step="0.01"'), false, 'Opcional. Descontada do total parcelado para calcular as parcelas.')
        + `<div class="wide debt-custom-control"><label class="debt-switch"><input type="checkbox" name="customInstallments" id="form-customInstallments" value="yes" ${x.customInstallments ? 'checked' : ''}> Definir o valor de cada parcela individualmente</label><p class="field-help">Use quando o acordo tem parcelas de valores diferentes. A soma das parcelas e da entrada deve corresponder ao total parcelado.</p><div id="debtCustomInstallmentFields" class="debt-custom-installments"></div></div>`
        + '<div class="form-wide-heading wide"><strong>Acompanhamento do acordo</strong><span>Escolha a condição e registre o que já foi efetivamente pago.</span></div>'
        + field('paymentMode', 'Modalidade escolhida', select('paymentMode', modes, x.paymentMode || 'review'), true)
        + field('legacyTotal', 'Valor negociado no cadastro anterior (R$)', input('legacyTotal', 'number', x.agreed || '', false, 'min="0" max="1000000000000" step="0.01"'), false, 'Mantido para não perder os dados de acordos anteriores.')
        + field('status', 'Situação', select('status', [['negotiating', 'Em negociação'], ['agreed', 'Acordo confirmado'], ['paid', 'Quitada']], x.status))
        + field('paid', 'Total efetivamente pago (R$)', input('paid', 'number', x.paid || 0, false, 'min="0" max="1000000000000" step="0.01"'), false, 'Inclua a entrada somente quando ela já tiver sido paga. Atualização manual.')
        + field('dueDate', 'Data do pagamento à vista ou 1ª parcela', input('dueDate', 'date', x.dueDate || '', false), false, 'Para parcelas, as demais datas são calculadas por mês, mantendo o dia sempre que possível.')
        + field('notes', 'Observações da negociação', `<textarea id="form-notes" name="notes" maxlength="500" placeholder="Número do acordo, contato do credor, condições especiais...">${esc(x.notes)}</textarea>`, true)
        + '<div class="debt-form-preview wide" id="debtFormPreview" role="status" aria-live="polite"></div>'
        + '<p class="field-help wide">O site não contrata acordos, paga boletos nem importa dados bancários. Registre os pagamentos manualmente.</p>';
      // Preserva alterações ainda não salvas ao mudar a quantidade de parcelas.
      let installmentDraft = Array.isArray(x.installmentAmounts) ? [...x.installmentAmounts] : [];
      const renderInstallmentInputs = () => {
        const container = $('#debtCustomInstallmentFields');
        const enabled = $('#form-customInstallments').checked;
        container.hidden = !enabled;
        if (!enabled) return;
        const count = Math.max(1, Math.min(120, Number($('#form-installmentCount').value) || 1));
        const total = Math.round((Number($('#form-offerInstallment').value) || 0) * 100);
        const entry = Math.round((Number($('#form-entryAmount').value) || 0) * 100);
        const rest = Math.max(0, total - entry);
        const base = Math.floor(rest / count), extra = rest % count;
        container.innerHTML = `<strong>Valores individuais das parcelas</strong><div class="debt-custom-grid">${Array.from({length: count}, (_, i) => `<label class="debt-custom-item"><span>${i + 1}ª parcela (R$)</span><input type="number" inputmode="decimal" name="installmentAmount_${i}" min="0.01" max="1000000000000" step="0.01" required value="${installmentDraft[i] ?? ((base + (i < extra ? 1 : 0)) / 100).toFixed(2)}"></label>`).join('')}</div><p class="field-help" id="debtInstallmentSum"></p>`;
        container.querySelectorAll('input').forEach((input, i) => input.addEventListener('input', () => {
          installmentDraft[i] = input.value;
          refreshDebt();
        }));
      };
      const captureInstallments = () => {
        if (!$('#form-customInstallments').checked) return;
        $('#debtCustomInstallmentFields').querySelectorAll('input').forEach((input, i) => { installmentDraft[i] = input.value; });
      };
      const refreshDebt = () => {
        const mode = $('#form-paymentMode').value;
        const total = Number($('#form-original').value) || 0;
        const cash = Number($('#form-offerCash').value) || 0;
        const installments = Number($('#form-offerInstallment').value) || 0;
        const count = Number($('#form-installmentCount').value) || 1;
        const entry = Number($('#form-entryAmount').value) || 0;
        $('#form-legacyTotal').closest('.form-field').hidden = mode !== 'legacy';
        if (mode === 'review' && $('#form-status').value !== 'negotiating') $('#form-status').value = 'negotiating';
        const change = (amount) => total && amount ? ` · ${amount < total ? 'Economia' : amount > total ? 'Acréscimo' : 'Sem alteração'}: ${money(Math.abs(total - amount))}` : '';
        const custom = $('#form-customInstallments').checked;
        const amounts = [...$('#debtCustomInstallmentFields').querySelectorAll('input')].map(input => Number(input.value) || 0);
        const schedule = window.KaykoDividas.installmentSchedule({ offerInstallment: installments, installmentCount: count, entryAmount: entry, dueDate: $('#form-dueDate').value, customInstallments: custom, installmentAmounts: amounts });
        const sumNode = $('#debtInstallmentSum');
        if (sumNode) {
          const diff = Math.round((entry + amounts.reduce((sum, n) => sum + n, 0) - installments) * 100);
          sumNode.textContent = `Entrada + parcelas: ${money(entry + amounts.reduce((sum, n) => sum + n, 0))} / Total: ${money(installments)}${diff ? ` · Diferença: ${money(Math.abs(diff) / 100)}` : ' · Valores conferidos'}`;
          sumNode.classList.toggle('debt-sum-warning', diff !== 0);
        }
        const monthly = schedule.length ? money(schedule[0].amount) : '—';
        $('#debtFormPreview').innerHTML = `<strong>Comparativo das propostas</strong><div class="debt-preview-grid"><div><small>À vista</small><b>${cash ? money(cash) : 'Não informada'}</b><span>${change(cash)}</span></div><div><small>Parcelado</small><b>${installments ? money(installments) : 'Não informado'}</b><span>${installments ? `${count || 0} parcela(s) ${custom ? 'com valores individuais' : `de cerca de ${monthly}`}${entry ? ` + entrada de ${money(entry)}` : ''}${change(installments)}` : 'Informe uma proposta parcelada'}</span></div></div>`;
      };
      ['original', 'offerCash', 'offerInstallment', 'installmentCount', 'entryAmount', 'paymentMode', 'dueDate'].forEach(name => $('#form-' + name).addEventListener('input', refreshDebt));
      $('#form-paymentMode').addEventListener('change', refreshDebt);
      $('#form-customInstallments').addEventListener('change', () => { captureInstallments(); renderInstallmentInputs(); refreshDebt(); });
      ['installmentCount', 'offerInstallment', 'entryAmount'].forEach(name => $('#form-' + name).addEventListener('change', () => { captureInstallments(); renderInstallmentInputs(); refreshDebt(); }));
      renderInstallmentInputs();
      refreshDebt();
    } else if (kind === 'customCrypto') {
      const x = found || { symbol: '', name: '', paprikaId: '', geckoId: '' };
      $('#dialogTitle').textContent = 'Adicionar criptoativo ao catálogo';
      $('#formFields').innerHTML = field('symbol', 'Sigla *', input('symbol', 'text', x.symbol, true, 'maxlength="15" placeholder="Ex.: ABC"'))
        + field('name', 'Nome *', input('name', 'text', x.name, true, 'maxlength="80"'))
        + field('geckoId', 'ID CoinGecko (opcional)', input('geckoId', 'text', x.geckoId, false, 'maxlength="100" placeholder="ID informado pelo CoinGecko"'))
        + field('paprikaId', 'ID CoinPaprika (opcional)', input('paprikaId', 'text', x.paprikaId, false, 'maxlength="100" placeholder="ID informado pelo CoinPaprika"'))
        + '<p class="field-help wide">Sem identificador reconhecido pela API, só será possível estimar com o preço manual em dólares.</p>';
    } else if (kind === 'cofferMove') {
      if (found.mode !== 'free') return;
      const withdraw = operation === 'withdraw';
      $('#dialogTitle').textContent = withdraw ? 'Retirar do cofrinho' : 'Depositar no cofrinho';
      $('#formFields').innerHTML = field('date', 'Data *', input('date', 'date', today(), true)) + field('amount', 'Valor (R$) *', input('amount', 'number', '', true, 'min="0.01" max="1000000000" step="0.01" placeholder="0,00"')) + `<div class="form-field wide"><p class="field-help">${withdraw ? `Saldo disponível para resgatar: ${money(cofferBalance(found))}. Retiradas não são novas receitas.` : `O depósito será lançado automaticamente como Reserva e descontado do saldo disponível do mês.`}</p></div>`;
    }
    $('#modalOverlay').hidden = false; document.body.style.overflow = 'hidden';
    setTimeout(() => { const el = $('#entityForm input, #entityForm select'); if (el) el.focus() }, 10);
  }
  function refreshWalletFields() {
    const type = $('#form-kind').value;
    $('#form-currency').closest('.form-field').hidden = type !== 'money';
    $('#form-crypto').closest('.form-field').hidden = type !== 'crypto';
    $('#form-cryptoSearch').closest('.form-field').hidden = type !== 'crypto';
    $('#form-pointValueMode').closest('.form-field').hidden = type !== 'points';
    const pointMode = $('#form-pointValueMode').value;
    const explanation = $('#pointModeExplanation');
    if (explanation) { explanation.textContent = POINT_MODE_HELP[pointMode] || ''; explanation.hidden = type !== 'points'; }
    $('#form-pointsPerUsd').closest('.form-field').hidden = type !== 'points' || pointMode !== 'legacy';
    $('#form-pointUnitValue').closest('.form-field').hidden = type !== 'points' || !['BRL', 'USD'].includes(pointMode);
    $('#form-pointReferencePoints').closest('.form-field').hidden = type !== 'points' || !['ratioBRL', 'ratioUSD', 'ratioCrypto'].includes(pointMode);
    $('#form-pointReferenceBRL').closest('.form-field').hidden = type !== 'points' || !['ratioBRL', 'ratioUSD', 'ratioCrypto'].includes(pointMode);
    $('#form-pointReferenceCrypto').closest('.form-field').hidden = type !== 'points' || pointMode !== 'ratioCrypto';
    $('#form-pointReferenceBRL').closest('.form-field').querySelector('label').textContent = pointMode === 'ratioUSD' ? 'Valor equivalente em dólares (US$)' : pointMode === 'ratioCrypto' ? 'Quantidade equivalente de criptomoeda' : 'Valor equivalente em reais (R$)';
    $('#form-pointUnitValue').closest('.form-field').querySelector('label').textContent = pointMode === 'BRL' ? 'Valor de 1 ponto em reais (R$)' : 'Valor de 1 ponto em dólares (US$)';
    $('#form-manualUsdPrice').closest('.form-field').hidden = type !== 'crypto';
    $('#form-balance').closest('.form-field').querySelector('label').textContent = type === 'points' ? 'Quantidade de pontos *' : type === 'crypto' ? 'Quantidade de criptomoedas *' : 'Saldo no aplicativo *';
    refreshWalletPointPreview();
  }
  function refreshWalletPointPreview() {
    const node = $('#walletPointsPreview'); if (!node) return;
    const points = Number($('#form-balance')?.value || 0), mode = $('#form-pointValueMode')?.value;
    const unit = Number($('#form-pointUnitValue')?.value || 0), perUsd = Number($('#form-pointsPerUsd')?.value || 0);
    const refPoints = Number($('#form-pointReferencePoints')?.value || 0), refBRL = Number($('#form-pointReferenceBRL')?.value || 0);
    if ($('#form-kind').value !== 'points') { node.hidden = true; return; }
    node.hidden = false;
    const ratioMode = ['ratioBRL', 'ratioUSD', 'ratioCrypto'].includes(mode);
    const result = ratioMode ? (refPoints > 0 && refBRL > 0 ? points * refBRL / refPoints : null) : mode === 'legacy' ? (perUsd > 0 ? points / perUsd : null) : (unit > 0 ? points * unit : null);
    const curr = ['BRL', 'ratioBRL'].includes(mode) ? 'BRL' : 'USD';
    const crypto = $('#form-pointReferenceCrypto').value;
    node.textContent = result === null ? 'Informe a taxa manual para visualizar o valor estimado.' : `Total estimado: ${mode === 'ratioCrypto' ? amountLabel(result) + ' ' + crypto : cashLabel(result, curr)} (${amountLabel(points)} pontos).`;
  }
  function refreshCofferForm(c) {
    const wood = $('#form-mode').value === 'woodbox';
    const custom = $('#form-plan').value === 'custom';
    ['target', 'initial'].forEach(name => { $('#form-' + name).closest('.form-field').hidden = wood; });
    $('#form-plan').closest('.form-field').hidden = !wood;
    ['count', 'unit'].forEach(name => { $('#form-' + name).closest('.form-field').hidden = !wood || !custom; });
    const name = $('#form-plan').value, plan = WOODBOX_PLANS[name];
    const count = custom ? Number($('#form-count').value) : plan?.count;
    const unit = custom ? Number($('#form-unit').value) : plan?.unit;
    const target = count > 0 ? (plan?.ascending ? count * (count + 1) / 2 : count * (unit || 0)) : 0;
    $('#cofferPreview').textContent = wood ? `Cartela: ${Number(count) || 0} casas · objetivo total ${money(target)}. Os depósitos só são contabilizados quando você marca cada casa.` : 'Cofrinho livre: defina uma meta, deposite e retire quando precisar.';
  }
  function refreshTransactionFields(oldCategory = null) {
    const type = $('#form-type').value;
    const categories = type === 'Entrada' ? INCOME_CATS : type === 'Reserva' || type === 'Resgate' ? ['Economia'] : expenseCats();
    const category = $('#form-category');
    category.innerHTML = choices(categories).map(([value, label]) => `<option value="${esc(value)}" ${oldCategory === value ? 'selected' : ''}>${esc(label)}</option>`).join('');
    const goal = $('#form-goalId');
    goal.disabled = type !== 'Reserva';
    goal.closest('.form-field').style.display = type === 'Reserva' ? 'grid' : 'none';
    if (type !== 'Reserva') goal.value = '';
  }
  function closeModal() { $('#modalOverlay').hidden = true; document.body.style.overflow = ''; editing = null; if (previousFocus?.focus) previousFocus.focus(); }
  function parseAmount(value, positive = true) { const v = Number(value); return Number.isFinite(v) && v >= (positive ? 0.01 : 0) && v <= 1e9 ? dec(v) : null; }
  function foundMode(id, coffers, proposed) {
    const existing = coffers.find(c => c.id === id);
    return existing && cofferTransactions(id).length ? existing.mode : (proposed === 'woodbox' ? 'woodbox' : 'free');
  }
  // ===== 04. SALVAR OS REGISTROS =====
  function handleSubmit(event) {
    event.preventDefault(); if (!editing) return;
    const form = $('#entityForm');
    if (!form.reportValidity()) return;
    const fields = Object.fromEntries(new FormData(form).entries());
    const kind = editing.kind, id = editing.id;
    if (kind === 'transaction') {
      const amount = parseAmount(fields.amount);
      if (amount === null || !/^\d{4}-\d{2}-\d{2}$/.test(fields.date) || Number.isNaN(new Date(`${fields.date}T12:00:00`).getTime())) { notify('Informe uma data e um valor válido maior que zero.', true); return; }
      if (!fields.description.trim()) { notify('Preencha a descrição.', true); return; }
      const record = { id: id || uid(), date: fields.date, type: fields.type, category: fields.category, description: fields.description.trim().slice(0, 120), payment: fields.type === 'Reserva' ? '' : fields.payment, amount, goalId: fields.type === 'Reserva' ? fields.goalId || '' : '', cofferId: '', boxSlot: null, notes: fields.notes?.trim().slice(0, 300) || '' };
      if (id) db.transactions = db.transactions.map(t => t.id === id ? record : t); else db.transactions.push(record);
    } else if (kind === 'wallet') {
      const balance = Number(fields.balance), rate = Number(fields.pointsPerUsd || 0), manual = Number(fields.manualUsdPrice || 0), pointUnit = Number(fields.pointUnitValue || 0);
      const refPoints = Number(fields.pointReferencePoints || 0), refBRL = Number(fields.pointReferenceBRL || 0);
      if (!fields.app?.trim() || ![balance, rate, manual, pointUnit, refPoints, refBRL].every(v => Number.isFinite(v) && v >= 0 && v <= 1e12)) {
        notify('Informe um nome e valores válidos, sem números negativos.', true); return;
      }
      if (balance > 1e12 || rate > 1e12 || manual > 1e12 || pointUnit > 1e12 || refPoints > 1e12 || refBRL > 1e12) { notify('Valor maior que o permitido.', true); return; }
      const kind = fields.kind;
      const currency = kind === 'crypto' ? fields.crypto : kind === 'points' ? 'PTS' : fields.currency;
      if (!['money', 'points', 'crypto'].includes(kind) || (kind === 'money' && !FIAT_CURRENCIES.includes(currency)) || (kind === 'crypto' && !Object.hasOwn(cryptoCatalog(), currency))) { notify('Selecione um tipo de saldo válido.', true); return; }
      if (kind === 'points' && fields.pointValueMode === 'legacy' && fields.pointsPerUsd?.trim() && rate <= 0) { notify('Informe uma taxa de pontos maior que zero.', true); return; }
      if (kind === 'points' && ['BRL', 'USD'].includes(fields.pointValueMode) && fields.pointUnitValue?.trim() && pointUnit <= 0) { notify('O valor por ponto deve ser maior que zero.', true); return; }
      if (kind === 'points' && ['ratioBRL', 'ratioUSD', 'ratioCrypto'].includes(fields.pointValueMode) && !(refPoints > 0 && refBRL > 0)) { notify('Informe uma quantidade de pontos e um valor equivalente maiores que zero.', true); return; }
      if (kind === 'points' && fields.pointValueMode === 'ratioCrypto' && !Object.hasOwn(cryptoCatalog(), fields.pointReferenceCrypto)) { notify('Escolha uma criptomoeda válida.', true); return; }
      const record = { id: id || uid(), app: fields.app.trim().slice(0, 100), kind, currency, balance: precise(balance), pointsPerUsd: kind === 'points' ? precise(rate) : 0, pointValueMode: kind === 'points' ? fields.pointValueMode : 'legacy', pointUnitValue: kind === 'points' ? precise(pointUnit) : 0, pointReferencePoints: kind === 'points' ? precise(refPoints) : 0, pointReferenceBRL: kind === 'points' ? precise(refBRL) : 0, pointReferenceCrypto: kind === 'points' ? fields.pointReferenceCrypto : 'BTC', manualUsdPrice: kind === 'crypto' ? precise(manual) : 0, favorite: id ? (db.wallets.find(w => w.id === id)?.favorite === true) : false };
      if (id) db.wallets = db.wallets.map(w => w.id === id ? record : w); else db.wallets.push(record);
    } else if (kind === 'category') {
      const name = fields.name?.trim().replace(/\s+/g, ' ').slice(0, 60);
      if (!name) { notify('Digite um nome para a categoria.', true); return; }
      if (expenseCats().some(c => c.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR') && c !== id)) {
        notify('Essa categoria já existe.', true); return;
      }
      if (id) {
        if (name !== id) {
          db.categoryCatalog = db.categoryCatalog.map(c => c === id ? name : c);
          db.customCategories = db.customCategories.map(c => c === id ? name : c);
          db.transactions.forEach(t => { if (t.category === id && t.type === 'Gasto') t.category = name; });
          db.bills.forEach(b => { if (b.category === id) b.category = name; });
          for (const budget of Object.values(db.budgets)) {
            if (Object.hasOwn(budget, id)) { budget[name] = budget[id]; delete budget[id]; }
          }
          delete db.categoryNotes[id];
        }
      } else {
        if (db.categoryCatalog.length >= 200) { notify('Limite de categorias atingido.', true); return; }
        db.categoryCatalog.push(name); db.customCategories.push(name);
      }
      db.categoryNotes[name] = String(fields.notes || '').trim().slice(0, 500);
    } else if (kind === 'pix') {
      const name = String(fields.name || '').trim();
      const types = Array.from(form.querySelectorAll('[name="pixEntryType"]')).map(el => el.value);
      const values = Array.from(form.querySelectorAll('[name="pixEntryKey"]')).map(el => el.value.trim());
      const keys = values.map((key, i) => ({ type: types[i], key: key.slice(0, 160) }));
      if (!name || !keys.length || keys.some(x => !x.key)) { notify('Informe uma identificação e todas as chaves Pix.', true); return; }
      if (new Set(keys.map(x => x.key.toLowerCase())).size !== keys.length) { notify('Há chaves repetidas neste cadastro.', true); return; }
      const record = { id: id || uid(), name: name.slice(0, 90), keys,
        type: keys[0].type, key: keys[0].key,
        bank: String(fields.bank || '').trim().slice(0, 100),
        owner: String(fields.owner || '').trim().slice(0, 100),
        notes: String(fields.notes || '').trim().slice(0, 500) };
      if (id) db.pixKeys = db.pixKeys.map(x => x.id === id ? record : x); else db.pixKeys.push(record);
    } else if (kind === 'debt') {
      const creditor = String(fields.creditor || '').trim();
      const paymentMode = fields.paymentMode;
      // Propostas são independentes do acordo aceito; o histórico anterior continua compatível.
      const record = {
        id: id || uid(), creditor: creditor.slice(0, 100),
        original: Number(fields.original),
        offerCash: Number(fields.offerCash || 0), offerInstallment: Number(fields.offerInstallment || 0),
        installmentCount: Number(fields.installmentCount || 0), entryAmount: Number(fields.entryAmount || 0),
        customInstallments: fields.customInstallments === 'yes',
        installmentAmounts: fields.customInstallments === 'yes' ? Array.from({length: Number(fields.installmentCount) || 0}, (_, i) => Number(fields[`installmentAmount_${i}`])) : [],
        paymentMode, agreed: paymentMode === 'legacy' ? Number(fields.legacyTotal) : 0,
        paid: Number(fields.paid || 0), dueDate: fields.dueDate || '',
        status: fields.status,
        notes: String(fields.notes || '').trim().slice(0, 500)
      };
      const failure = window.KaykoDividas.validateDebt(record);
      if (failure) { notify(failure, true); return; }
      const debt = window.KaykoDividas.normalizeDebt(record);
      if (id) db.debts = db.debts.map(x => x.id === id ? debt : x); else db.debts.push(debt);
    } else if (kind === 'customCrypto') {
      const symbol = String(fields.symbol || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
      const name = String(fields.name || '').trim().slice(0, 80);
      if (!symbol || !name || Object.hasOwn(cryptoCatalog(), symbol)) {
        notify('Informe uma sigla e nome diferentes dos ativos existentes.', true); return;
      }
      db.customCryptos.push({ symbol, name, paprikaId: String(fields.paprikaId || '').trim().slice(0, 100), geckoId: String(fields.geckoId || '').trim().slice(0, 100) });
      db.settings.cryptoFavorites.push(symbol); fillConverterOptions();
    } else if (kind === 'bill') {
      const amount = parseAmount(fields.amount), day = Number(fields.day);
      if (!fields.name.trim() || amount === null || !Number.isInteger(day) || day < 1 || day > 31) { notify('Preencha nome, dia de 1 a 31 e valor maior que zero.', true); return; }
      const oldBill = id ? db.bills.find(b => b.id === id) : null;
      const record = { id: id || uid(), name: fields.name.trim().slice(0, 100), category: fields.category, day, amount, active: fields.active === 'true', paidMonths: oldBill?.paidMonths || [] };
      if (id) db.bills = db.bills.map(b => b.id === id ? record : b); else db.bills.push(record);
    } else if (kind === 'goal') {
      const target = parseAmount(fields.target), initial = parseAmount(fields.initial || 0, false);
      if (!fields.name.trim() || target === null || initial === null) { notify('Preencha nome e objetivo válidos.', true); return; }
      const record = { id: id || uid(), name: fields.name.trim().slice(0, 100), target, initial };
      if (id) db.goals = db.goals.map(g => g.id === id ? record : g); else db.goals.push(record);
    } else if (kind === 'coffer') {
      const name = fields.name?.trim(); if (!name) { notify('Dê um nome ao cofrinho.', true); return; }
      const mode = foundMode(id, db.coffers, fields.mode);
      if (mode === 'free') {
        const target = parseAmount(fields.target), initial = parseAmount(fields.initial || 0, false);
        if (target === null || initial === null) { notify('Informe uma meta válida e um saldo inicial maior ou igual a zero.', true); return; }
        const current = id ? db.coffers.find(c => c.id === id) : null;
        const otherMovement = current ? cofferTransactions(id).reduce((a, t) => a + (t.type === 'Reserva' ? t.amount : t.type === 'Resgate' ? -t.amount : 0), 0) : 0;
        if (initial + otherMovement < 0) { notify('O saldo inicial não pode ficar abaixo das retiradas já feitas.', true); return; }
        const record = { id: id || uid(), name: name.slice(0, 100), mode, target, initial, plan: 'mil', count: 100, unit: 10 };
        if (id) db.coffers = db.coffers.map(c => c.id === id ? record : c); else db.coffers.push(record);
      } else {
        const current = id ? db.coffers.find(c => c.id === id) : null;
        const locked = !!(current && cofferTransactions(id).length);
        const plan = locked ? current.plan : fields.plan;
        if (!WOODBOX_PLANS[plan]) { notify('Escolha um desafio válido.', true); return; }
        const count = locked ? current.count : Number(fields.count);
        const unit = locked ? current.unit : parseAmount(fields.unit);
        if (plan === 'custom' && (!Number.isInteger(count) || count < 1 || count > 500 || unit === null)) { notify('Escolha de 1 a 500 casas e valor por casa maior que zero.', true); return; }
        const record = { id: id || uid(), name: name.slice(0, 100), mode: 'woodbox', target: 0, initial: 0, plan, count: plan === 'custom' ? count : (WOODBOX_PLANS[plan].count), unit: plan === 'custom' ? unit : (WOODBOX_PLANS[plan].unit || 0) };
        if (cofferTarget(record) > 1e9) { notify('O objetivo do desafio excede o limite permitido.', true); return; }
        if (id) db.coffers = db.coffers.map(c => c.id === id ? record : c); else db.coffers.push(record);
      }
      selectedCofferId = id || db.coffers[db.coffers.length - 1].id;
    } else if (kind === 'cofferMove') {
      const c = db.coffers.find(c => c.id === id && c.mode === 'free'); if (!c) return;
      const amount = parseAmount(fields.amount);
      if (amount === null || !/^\d{4}-\d{2}-\d{2}$/.test(fields.date) || Number.isNaN(new Date(`${fields.date}T12:00:00`).getTime())) { notify('Data ou valor inválido.', true); return; }
      const withdraw = editing.operation === 'withdraw';
      if (withdraw && amount > cofferBalance(c)) { notify('O resgate não pode exceder o saldo do cofrinho.', true); return; }
      db.transactions.push({ id: uid(), date: fields.date, type: withdraw ? 'Resgate' : 'Reserva', category: 'Economia', description: `${withdraw ? 'Retirada' : 'Depósito'} · ${c.name}`, payment: '', amount, goalId: '', cofferId: c.id, boxSlot: null, notes: '' });
    }
    const succeeded = save(); closeModal(); render(); if (succeeded) notify(id ? 'Registro atualizado!' : 'Registro adicionado!');
  }
  function removeEntity(kind, id) {
    const group = kind === 'transaction' ? 'transactions' : kind === 'bill' ? 'bills' : 'goals';
    const record = db[group].find(x => x.id === id); if (!record) return;
    const desc = record.description || record.name;
    if (!confirm(`Excluir "${desc}"? Esta ação não pode ser desfeita.`)) return;
    db[group] = db[group].filter(x => x.id !== id);
    // Reservas ligadas a metas removidas continuam salvas como reservas sem meta.
    if (kind === 'goal') db.transactions.forEach(t => { if (t.goalId === id) t.goalId = '' });
    save(); render(); notify('Registro excluído.');
  }
  function deleteWallet(id) {
    const w = db.wallets.find(w => w.id === id); if (!w) return;
    if (!confirm(`Remover o aplicativo "${w.app}" e o saldo registrado?`)) return;
    db.wallets = db.wallets.filter(w => w.id !== id); save(); render(); notify('Saldo externo removido.');
  }
  function deleteCategory(name) {
    if (!db.categoryCatalog.includes(name)) return;
    if (db.transactions.some(t => t.type === 'Gasto' && t.category === name) || db.bills.some(b => b.category === name)) {
      notify('Esta categoria é utilizada. Reclassifique lançamentos e contas antes de excluí-la.', true); return;
    }
    if (!confirm(`Excluir a categoria "${name}" e seus limites de orçamento de todos os meses?`)) return;
    db.categoryCatalog = db.categoryCatalog.filter(c => c !== name);
    db.customCategories = db.customCategories.filter(c => c !== name);
    delete db.categoryNotes[name];
    for (const budget of Object.values(db.budgets)) delete budget[name];
    save(); renderBudgets(); notify('Categoria removida.');
  }
  function saveBudget(inputEl) {
    const cat = inputEl.dataset.budgetCat;
    if (!expenseCats().includes(cat)) return;
    const key = monthKey(); const value = inputEl.value.trim();
    const number = Number(value);
    if (value !== '' && (!Number.isFinite(number) || number < 0 || number > 1e9)) { notify('Informe um teto válido (zero ou maior).', true); renderBudgets(); return; }
    if (!db.budgets[key]) db.budgets[key] = {};
    if (value === '') delete db.budgets[key][cat]; else db.budgets[key][cat] = dec(number);
    save(); renderBudgets(); notify('Limite mensal salvo.');
  }
  function copyBudget() {
    const previous = new Date(db.settings.year, db.settings.month - 2, 1);
    const sourceKey = monthKey(previous.getFullYear(), previous.getMonth() + 1);
    const src = db.budgets[sourceKey];
    if (!src || !Object.keys(src).length) { notify('Não há limites cadastrados no mês anterior.', true); return; }
    if (!confirm(`Copiar os limites de ${MONTHS[previous.getMonth()]} para ${MONTHS[db.settings.month - 1]} de ${db.settings.year}? Isso substitui os limites do mês atual.`)) return;
    db.budgets[monthKey()] = { ...src }; save(); renderBudgets(); notify('Limites copiados.');
  }
  function editMonthlyGoal() {
    const current = db.settings.monthlySavingsTarget;
    const answer = prompt('Qual valor você deseja guardar por mês? (R$)\nDigite 0 para retirar a meta.', String(current));
    if (answer === null) return;
    const parsed = parseAmount(answer.replace(',', '.'), false);
    if (parsed === null) { notify('Digite um valor válido, como 300 ou 300,50.', true); return; }
    db.settings.monthlySavingsTarget = parsed; save(); renderDashboard(); notify('Meta mensal atualizada.');
  }
  // ===== 05. BACKUP, IMPORTAÇÃO E EXPORTAÇÃO CSV =====
  function downloadFile(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function backupFilename() { return `controle-financeiro-backup-${today().replaceAll('-', '')}.json`; }
  function backupExport() {
    // Download explícito: nunca salvar dados privados no repositório do GitHub.
    downloadFile(backupFilename(), JSON.stringify(db, null, 2), 'application/json;charset=utf-8');
    notify('Backup do dia gerado! Guarde o arquivo JSON em local privado.');
  }
  async function backupShare() {
    // Compartilhar só depois de clique do usuário. Web Share API depende do navegador/HTTPS.
    const file = new File([JSON.stringify(db, null, 2)], backupFilename(), { type: 'application/json' });
    if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function' || !navigator.canShare({ files: [file] })) {
      backupExport();
      notify('Backup baixado. Envie o JSON por um meio privado e importe no outro aparelho.');
      return;
    }
    try {
      await navigator.share({ title: 'Backup Meu Controle Financeiro', files: [file] });
      notify('Compartilhamento solicitado ao dispositivo.');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      notify('Compartilhamento indisponível. Baixe o backup e envie o arquivo manualmente.', true);
    }
  }
  let backupPreviousFocus = null;
  function openBackupCenter() {
    if (!$('#modalOverlay').hidden) closeModal();
    backupPreviousFocus = document.activeElement;
    $('#backupOverlay').hidden = false;
    document.body.classList.add('backup-dialog-open');
    $('#backupCloseButton').focus();
  }
  function closeBackupCenter() {
    if ($('#backupOverlay').hidden) return;
    $('#backupOverlay').hidden = true;
    document.body.classList.remove('backup-dialog-open');
    if (backupPreviousFocus?.isConnected) backupPreviousFocus.focus();
    backupPreviousFocus = null;
  }
  async function backupImport(file) {
    if (!file) return;
    try {
      if (file.size > 15e6) throw new Error('Arquivo muito grande (limite de 15 MB).');
      const candidate = normalize(JSON.parse(await file.text()));
      if (!confirm('Importar este backup? TODOS os dados deste navegador serão substituídos pelos do arquivo. Exporte seus dados atuais antes de continuar.')) return;
      const previous = db; db = candidate;
      if (!save()) { db = previous; return; }
      applyTheme(); render(); closeBackupCenter(); notify('Backup importado com sucesso.');
    } catch (err) { notify(err.message || 'Não foi possível importar o backup.', true); } finally { $('#backupFile').value = ''; }
  }
  function csvProtect(value) {
    let s = String(value ?? '');
    // Evita que textos fornecidos pelo usuário sejam interpretados como fórmulas no Excel.
    if (/^[\s]*[=+@\-]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  }
  function exportCSV() {
    const header = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Forma de pagamento', 'Valor (R$)', 'Meta', 'Cofrinho', 'Observações'];
    const goalMap = new Map(db.goals.map(g => [g.id, g.name]));
    const cofferMap = new Map(db.coffers.map(c => [c.id, c.name]));
    const rows = sortedTransactions(db.transactions).map(t => [fmtDate(t.date), t.type, t.category, t.description, t.payment, t.amount.toFixed(2).replace('.', ','), goalMap.get(t.goalId) || '', cofferMap.get(t.cofferId) || '', t.notes]);
    const text = '\ufeff' + [header, ...rows].map(row => row.map(csvProtect).join(';')).join('\r\n');
    downloadFile(`lancamentos-${today()}.csv`, text, 'text/csv;charset=utf-8'); notify('CSV exportado para abrir no Excel.');
  }
  // ===== 06. CÂMBIO E CRIPTOMOEDAS =====
  // Cotações só para estimativas e conversões; nunca alteram lançamentos ou saldos cadastrados.
  async function getJSON(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
      if (!response.ok) throw new Error(`Serviço de cotações indisponível (${response.status}).`);
      return await response.json();
    } finally { clearTimeout(timer); }
  }
  function cachedQuote(key, ttl, loader) {
    const old = rateCache.get(key);
    if (old && Date.now() - old.time < ttl) return old.promise;
    const promise = loader().catch(err => { if (rateCache.get(key)?.promise === promise) rateCache.delete(key); throw err; });
    rateCache.set(key, { time: Date.now(), promise });
    return promise;
  }
  async function fiatRate(from, to) {
    if (from === to) return { rate: 1, date: 'mesma moeda' };
    if (!FIAT_CURRENCIES.includes(from) || !FIAT_CURRENCIES.includes(to)) throw new Error('Moeda não reconhecida.');
    return cachedQuote(`fiat:${from}:${to}`, 12 * 3600e3, async () => {
      const result = await getJSON(`https://api.frankfurter.dev/v2/rate/${from.toLowerCase()}/${to.toLowerCase()}`);
      if (!Number.isFinite(Number(result.rate)) || Number(result.rate) <= 0) throw new Error('Cotação de câmbio inválida.');
      return { rate: Number(result.rate), date: String(result.date || 'não informada'), source: 'Frankfurter' };
    });
  }
  // ===== 06A. CRIPTO: seleção e fallback de provedores =====
  // Implementação e links: assets/js/cotacoes-fontes.js
  async function cryptoPrice(symbol) {
    if (!Object.hasOwn(cryptoCatalog(), symbol)) throw new Error('Criptomoeda não reconhecida.');
    const provider = window.KaykoCotacoes.validProvider(db.settings.cryptoQuoteSource);
    return cachedQuote(`crypto:${provider}:${symbol}`, 5 * 60e3,
      () => window.KaykoCotacoes.priceUSD(symbol, provider, getJSON, cryptoCatalog()[symbol]));
  }
  function updateQuoteReferenceLinks() {
    const from = $('#conversionFrom').value;
    const to = $('#conversionTo').value;
    const crypto = [from, to].find(code => Object.hasOwn(cryptoCatalog(), code));
    const links = window.KaykoCotacoes.referenceLinks(crypto);
    $('#quoteReferenceLinks').innerHTML = links.map(link =>
      `<a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.name)} ↗</a>`).join('');
  }
  function displayQuoteDate(value) {
    if (!value || value === 'não informada') return 'data não informada';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return fmtDate(value);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'data não informada' : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }
  function fillConverterOptions(query = '') {
    const fiat = FIAT_CURRENCIES.map(c => `<option value="${c}">${c}</option>`).join('');
    const crypto = orderedCryptos().filter(([c, v]) => `${c} ${v[0]}`.toLocaleLowerCase('pt-BR').includes(String(query).toLocaleLowerCase('pt-BR').trim())).map(([c, v]) => `<option value="${c}">${db.settings.cryptoFavorites.includes(c) ? '★ ' : ''}${c} · ${esc(v[0])}</option>`).join('');
    const options = `<optgroup label="Moedas tradicionais">${fiat}</optgroup><optgroup label="Criptomoedas">${crypto}</optgroup>`;
    $('#conversionFrom').innerHTML = options; $('#conversionTo').innerHTML = options;
    $('#conversionFrom').value = 'BRL'; $('#conversionTo').value = 'USD';
    updateQuoteReferenceLinks();
  }
  function applyTheme() {
    const mode = db.settings.themeMode === 'dark' ? 'dark' : 'light';
    const palette = ['current', 'blue', 'pink', 'purple'].includes(db.settings.themePalette) ? db.settings.themePalette : 'current';
    document.documentElement.dataset.mode = mode;
    document.documentElement.dataset.theme = palette;
    document.documentElement.style.colorScheme = mode;
    $('#themePalette').value = palette;
    $('#themeModeToggle').setAttribute('aria-pressed', String(mode === 'dark'));
    $('#themeModeToggle').setAttribute('aria-label', mode === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro');
    $('#themeModeToggle .theme-mode-label').textContent = mode === 'dark' ? 'Claro' : 'Escuro';
    $('#themeModeToggle .theme-mode-icon').textContent = mode === 'dark' ? '☀' : '☾';
    $('meta[name="theme-color"]').setAttribute('content', mode === 'dark' ? (palette === 'blue' ? '#0d192e' : palette === 'pink' ? '#1e1020' : '#121725') : palette === 'blue' ? '#edf5ff' : palette === 'pink' ? '#fff0f9' : palette === 'purple' ? '#f7f3ff' : '#f5f7fb');
  }
  async function conversionUnitUSD(code) {
    if (code === 'USD') return { rate: 1, source: 'paridade USD', date: '—' };
    if (FIAT_CURRENCIES.includes(code)) return fiatRate(code, 'USD');
    return cryptoPrice(code);
  }
  let converterRequestId = 0;
  async function convertCurrencies() {
    const amount = Number($('#conversionAmount').value);
    const from = $('#conversionFrom').value, to = $('#conversionTo').value;
    if (!Number.isFinite(amount) || amount < 0 || amount > 1e12) { notify('Informe uma quantidade válida para converter.', true); return; }
    const token = ++converterRequestId;
    $('#conversionResult').textContent = 'Consultando cotação…';
    $('#conversionRateLabel').textContent = 'Buscando informações dos provedores.';
    $('#converterForm button[type="submit"]').disabled = true;
    try {
      let converted, details = [];
      if (from === to) { converted = amount; details = ['Moedas iguais']; }
      else if (FIAT_CURRENCIES.includes(from) && FIAT_CURRENCIES.includes(to)) {
        const quote = await fiatRate(from, to);
        converted = amount * quote.rate; details = [`Frankfurter · referência: ${displayQuoteDate(quote.date)}`];
      } else {
        const [base, quote] = await Promise.all([conversionUnitUSD(from), conversionUnitUSD(to)]);
        converted = amount * base.rate / quote.rate;
        details = [...new Set([base, quote].filter(x => x.source !== 'paridade USD').map(x => `${x.source} · referência: ${displayQuoteDate(x.date)}`))];
      }
      if (!Number.isFinite(converted)) throw new Error('O valor convertido excede o limite de cálculo.');
      if (token !== converterRequestId) return;
      const format = n => amountLabel(n);
      $('#conversionResult').textContent = `${format(amount)} ${from} ≈ ${format(converted)} ${to}`;
      $('#conversionRateLabel').textContent = `1 ${from} ≈ ${format(amount === 0 ? (from === to ? 1 : converted || 0) : converted / (amount || 1))} ${to} · ${details.join(' / ')}. Referência sem tarifas.`;
      // Para quantia zero, a taxa deve ser calculada independentemente de seu valor.
      if (amount === 0 && from !== to) $('#conversionRateLabel').textContent = `Conversão de valor zero · ${details.join(' / ')}`;
    } catch (err) {
      if (token !== converterRequestId) return;
      $('#conversionResult').textContent = 'Não foi possível consultar esta cotação.';
      $('#conversionRateLabel').textContent = `${err?.message || 'Falha de conexão.'} Confira sua internet e tente novamente. Nenhum valor foi estimado.`;
    } finally { if (token === converterRequestId) $('#converterForm button[type="submit"]').disabled = false; }
  }
  async function valueWalletInBRL(w) {
    if (w.kind === 'money') {
      if (w.currency === 'BRL') return { value: w.balance, detail: 'Valor já registrado em reais', source: 'Manual' };
      const quote = await fiatRate(w.currency, 'BRL');
      return { value: w.balance * quote.rate, detail: `Frankfurter · ${displayQuoteDate(quote.date)}`, source: 'Câmbio' };
    }
    if (w.kind === 'points') {
      if (w.pointValueMode === 'ratioBRL') {
        return w.pointReferencePoints > 0 && w.pointReferenceBRL > 0 ? { value: w.balance * w.pointReferenceBRL / w.pointReferencePoints, detail: `${amountLabel(w.pointReferencePoints)} pontos = ${cashLabel(w.pointReferenceBRL, 'BRL')} · equivalência manual`, source: 'Pontos' } : { value: null, detail: 'Defina a equivalência dos pontos em reais.', source: 'Pontos' };
      }
      if (w.pointValueMode === 'ratioUSD' || w.pointValueMode === 'ratioCrypto') {
        if (!(w.pointReferencePoints > 0 && w.pointReferenceBRL > 0)) return { value: null, detail: 'Defina a equivalência personalizada.', source: 'Pontos' };
        const total = w.balance * w.pointReferenceBRL / w.pointReferencePoints;
        if (w.pointValueMode === 'ratioUSD') {
          const quote = await fiatRate('USD', 'BRL');
          return { value: total * quote.rate, detail: `${amountLabel(w.pointReferencePoints)} pontos = ${cashLabel(w.pointReferenceBRL, 'USD')} · total ≈ ${cashLabel(total, 'USD')}; câmbio ${displayQuoteDate(quote.date)}`, source: 'Pontos' };
        }
        const symbol = w.pointReferenceCrypto || 'BTC';
        const crypto = await cryptoPrice(symbol);
        const exchange = await fiatRate('USD', 'BRL');
        return { value: total * crypto.rate * exchange.rate, detail: `${amountLabel(w.pointReferencePoints)} pontos = ${amountLabel(w.pointReferenceBRL)} ${symbol} · total ≈ ${amountLabel(total)} ${symbol}; cotação ${displayQuoteDate(crypto.date)}`, source: 'Pontos' };
      }
      if (w.pointValueMode === 'BRL') {
        return w.pointUnitValue > 0 ? { value: w.balance * w.pointUnitValue, detail: `1 ponto = ${cashLabel(w.pointUnitValue, 'BRL')} · taxa manual`, source: 'Pontos' } : { value: null, detail: 'Informe o valor de 1 ponto em reais.', source: 'Pontos' };
      }
      const usd = w.pointValueMode === 'USD' ? (w.pointUnitValue > 0 ? w.balance * w.pointUnitValue : null) : (w.pointsPerUsd > 0 ? w.balance / w.pointsPerUsd : null);
      if (usd === null) return { value: null, detail: 'Informe a taxa manual de pontos para obter a estimativa.', source: 'Pontos' };
      const quote = await fiatRate('USD', 'BRL');
      return { value: usd * quote.rate, detail: `≈ US$ ${amountLabel(usd)} · taxa de pontos manual; câmbio de ${displayQuoteDate(quote.date)}`, source: 'Pontos' };
    }
    const manual = w.manualUsdPrice > 0;
    const quote = manual ? { rate: w.manualUsdPrice, date: 'manual' } : await cryptoPrice(w.currency);
    const exchange = await fiatRate('USD', 'BRL');
    return { value: w.balance * quote.rate * exchange.rate, detail: manual ? `Cotação manual: US$ ${amountLabel(w.manualUsdPrice)} por ${w.currency}; câmbio ${displayQuoteDate(exchange.date)}` : `${quote.source}: ${displayQuoteDate(quote.date)}; câmbio: ${displayQuoteDate(exchange.date)}`, source: manual ? 'Manual' : 'Cripto' };
  }
  // Dashboard: nunca mistura saldos externos com o saldo de lançamentos.
  let dashboardWalletToken = 0;
  function renderDashboardWallets() {
    const element = $('#dashboardWallets'); if (!element) return;
    const wallets = [...db.wallets], token = ++dashboardWalletToken;
    const counts = { money: wallets.filter(w => w.kind === 'money').length, points: wallets.filter(w => w.kind === 'points').length, crypto: wallets.filter(w => w.kind === 'crypto').length };
    const originals = wallets.slice(0, 6).map(w => {
      const label = w.kind === 'points' ? `${amountLabel(w.balance)} pontos` : w.kind === 'crypto' ? `${amountLabel(w.balance)} ${w.currency}` : cashLabel(w.balance, w.currency);
      return `<div class="dashboard-wallet-entry"><div><strong>${esc(w.app)}</strong><small>${w.kind === 'crypto' ? 'Criptomoeda' : w.kind === 'points' ? 'Pontos' : 'Saldo em moeda'}</small></div><b>${esc(label)}</b></div>`;
    }).join('');
    element.innerHTML = `<div class="mini-stats">${infoCard('Apps com saldo', String(counts.money), 'Moedas tradicionais')}${infoCard('Apps de pontos', String(counts.points), 'Equivalência configurável')}${infoCard('Criptoativos cadastrados', String(counts.crypto), 'Valores por cotação')}</div>${wallets.length ? `<div class="dashboard-wallet-list"><h3>Meus saldos cadastrados</h3>${originals}${wallets.length > 6 ? `<p>Mostrando 6 de ${wallets.length} saldos. Abra Apps, pontos e moedas para ver todos.</p>` : ''}</div>` : ''}<div id="dashboardWalletEstimates" class="mini-stats"><div class="info-card"><small>Estimativa em reais</small><strong>${wallets.length ? 'Calculando…' : '—'}</strong><small>Independente do saldo disponível</small></div></div>`;
    if (!wallets.length) return;
    void Promise.all(wallets.map(async w => { try { return await valueWalletInBRL(w); } catch { return { value: null }; } })).then(results => {
      if (token !== dashboardWalletToken || view !== 'painel') return;
      const subtotal = (kind) => wallets.reduce((sum, w, i) => sum + (w.kind === kind && Number.isFinite(results[i].value) ? results[i].value : 0), 0);
      const valued = results.filter(r => Number.isFinite(r.value)).length;
      $('#dashboardWalletEstimates').innerHTML = infoCard('Saldos de apps', money(subtotal('money')), `Estimativa ${wallets.filter(w => w.kind === 'money').length} app(s)`) + infoCard('Pontos convertidos', money(subtotal('points')), 'Somente conversões possíveis') + infoCard('Criptomoedas', money(subtotal('crypto')), 'Cotações disponíveis') + infoCard('Total externo estimado', valued ? money(subtotal('money') + subtotal('points') + subtotal('crypto')) : '—', `${valued}/${wallets.length} saldo(s) calculado(s) · fora do caixa${valued < wallets.length ? ' · total parcial' : ''}`);
    });
  }
  function filterCryptoSelect(query, selector) {
    const select = $(selector), current = select.value;
    const list = orderedCryptos().filter(([c, v]) => `${c} ${v[0]}`.toLocaleLowerCase('pt-BR').includes(String(query).toLocaleLowerCase('pt-BR').trim()));
    select.innerHTML = list.length ? list.map(([c, v]) => `<option value="${esc(c)}">${db.settings.cryptoFavorites.includes(c) ? '★ ' : ''}${esc(c)} · ${esc(v[0])}</option>`).join('') : '<option value="" disabled>Nenhum ativo encontrado</option>';
    if (list.some(([c]) => c === current)) select.value = current;
  }
  function toggleFavoriteWallet(id) {
    const w = db.wallets.find(x => x.id === id && x.kind === 'crypto'); if (!w) return;
    w.favorite = !w.favorite;
    const favourites = new Set(db.settings.cryptoFavorites);
    if (w.favorite) favourites.add(w.currency); else if (!db.wallets.some(x => x.kind === 'crypto' && x.currency === w.currency && x.favorite)) favourites.delete(w.currency);
    db.settings.cryptoFavorites = [...favourites]; save(); renderWallets();
  }
  function moveWallet(id, direction) {
    const current = db.wallets.findIndex(w => w.id === id && w.kind === 'crypto'); if (current < 0) return;
    const cryptoPositions = db.wallets.map((w, i) => w.kind === 'crypto' ? i : -1).filter(i => i >= 0);
    const position = cryptoPositions.indexOf(current), next = cryptoPositions[position + direction];
    if (next === undefined) return;
    [db.wallets[current], db.wallets[next]] = [db.wallets[next], db.wallets[current]];
    save(); renderWallets();
  }
  function renderPixKeys() {
    const count = db.pixKeys.reduce((sum, x) => sum + (x.keys?.length || (x.key ? 1 : 0)), 0);
    $('#pixStats').innerHTML = infoCard('Chaves cadastradas', String(count), `${db.pixKeys.length} cadastro(s) de pessoas ou instituições`) + infoCard('Armazenamento', 'Neste navegador', 'Dados incluídos em backup JSON');
    const typeLabel = {cpf:'CPF',cnpj:'CNPJ',email:'E-mail',phone:'Celular',random:'Chave aleatória'};
    $('#pixList').innerHTML = db.pixKeys.length ? db.pixKeys.map(x => {
      const keys = x.keys?.length ? x.keys : [{type:x.type,key:x.key}];
      const lines = keys.map((item, index) => `<div class="pix-entry"><span class="pix-entry-type">${esc(typeLabel[item.type] || 'Chave Pix')}</span><div class="pix-key-line"><code class="pix-key-value" data-pix-value="${esc(x.id)}" data-pix-index="${index}">•••• •••• ••••</code><button type="button" class="action-small" data-toggle-pix="${esc(x.id)}" data-pix-index="${index}">Mostrar</button><button type="button" class="action-small" data-copy-pix="${esc(x.id)}" data-pix-index="${index}">Copiar</button></div></div>`).join('');
      return `<article class="panel pix-card"><div class="panel-heading"><div><h3>${esc(x.name)}</h3><p>${esc(x.bank || 'Banco não informado')} · ${keys.length} chave(s)</p></div><span class="pill saving">Pix</span></div>${lines}${x.owner ? `<p>Titular: ${esc(x.owner)}</p>` : ''}${x.notes ? `<p class="category-note">${esc(x.notes)}</p>` : ''}<div class="wallet-actions"><button class="action-small" type="button" data-edit-pix="${esc(x.id)}">Editar cadastro</button><button class="action-small danger" type="button" data-delete-pix="${esc(x.id)}">Excluir cadastro</button></div></article>`;
    }).join('') : '<div class="panel empty-state">Nenhuma chave Pix cadastrada.</div>';
  }
  function renderDebts() {
    const calculator = window.KaykoDividas;
    const debts = db.debts;
    const confirmed = debts.filter(x => x.status === 'agreed');
    const remaining = confirmed.reduce((sum, x) => sum + calculator.confirmedRemaining(x), 0);
    $('#debtsStats').innerHTML = infoCard('Dívidas e negociações', String(debts.length), 'Registros manuais')
      + infoCard('Em negociação', String(debts.filter(x => x.status === 'negotiating').length), 'Propostas em avaliação')
      + infoCard('Total pago', money(debts.reduce((a, x) => a + x.paid, 0)), 'Informado manualmente')
      + infoCard('Acordos pendentes', money(remaining), 'Somente acordos confirmados');
    const term = ($('#debtSearch')?.value || '').toLocaleLowerCase('pt-BR');
    const status = $('#debtStatusFilter')?.value || 'all';
    const rows = debts.filter(x => (status === 'all' || x.status === status) && `${x.creditor} ${x.notes} ${x.paymentMode}`.toLocaleLowerCase('pt-BR').includes(term));
    const offer = (title, value, x, chosen, extra = '') => {
      const diff = calculator.discount(x.original, value);
      const saving = diff === null ? '' : diff > 0 ? `Economia: ${money(diff)}` : diff < 0 ? `Acréscimo: ${money(-diff)}` : 'Sem desconto';
      return `<div class="debt-offer ${chosen ? 'is-chosen' : ''}"><span class="debt-offer-title">${title}${chosen ? ' <b>✓ Escolhida</b>' : ''}</span><strong>${value > 0 ? money(value) : 'Não informada'}</strong><small>${esc(extra || saving)}</small>${extra && saving ? `<small>${esc(saving)}</small>` : ''}</div>`;
    };
    $('#debtsList').innerHTML = rows.length ? rows.map(x => {
      const total = calculator.selectedTotal(x);
      const schedule = calculator.installmentSchedule(x);
      const firstAmount = schedule.length ? schedule[0].amount : 0;
      const modeName = { cash: 'À vista', installments: 'Parcelado', review: 'Comparando propostas', legacy: 'Condição anterior' }[x.paymentMode];
      const offers = x.paymentMode === 'legacy' && !x.offerCash && !x.offerInstallment
        ? `<div class="debt-offers">${offer('Acordo cadastrado anteriormente', total, x, true)}</div>`
        : `<div class="debt-offers">${offer('À vista', x.offerCash, x, x.paymentMode === 'cash')}${offer('Parcelado', x.offerInstallment, x, x.paymentMode === 'installments', x.offerInstallment > 0 && schedule.length ? `${schedule.length} parcelas ${x.customInstallments ? 'de valores individuais' : `de cerca de ${money(firstAmount)}`}${x.entryAmount ? ` + entrada de ${money(x.entryAmount)}` : ''}` : '')}</div>`;
      const dates = x.dueDate ? `${x.paymentMode === 'installments' ? 'Primeira parcela' : 'Vencimento'}: ${fmtDate(x.dueDate)}` : 'Vencimento não informado';
      const installments = x.offerInstallment > 0 && schedule.length ? `<details class="debt-installments"><summary>Ver valores das ${schedule.length} parcelas${x.paymentMode === 'installments' ? ' escolhidas' : ''}</summary><p>Calendário indicativo; não confirma pagamento nem considera juros por atraso.</p><div class="debt-installments-list">${schedule.map(item => `<div><span>${item.number}ª parcela</span><strong>${money(item.amount)}</strong><time>${item.date ? fmtDate(item.date) : 'Sem data definida'}</time></div>`).join('')}</div></details>` : '';
      return `<article class="panel debt-card">
        <div class="panel-heading"><div><h3>${esc(x.creditor)}</h3><p>${esc(dates)}</p></div><span class="pill ${x.status === 'paid' ? 'income' : x.status === 'agreed' ? 'saving' : 'expense'}">${x.status === 'paid' ? 'Quitada' : x.status === 'agreed' ? 'Acordo confirmado' : 'Em negociação'}</span></div>
        <p class="debt-selection"><strong>Modalidade:</strong> ${modeName}</p>
        ${offers}
        <div class="mini-stats">${infoCard('Dívida original', money(x.original))}${infoCard(x.paymentMode === 'review' ? 'Acordo selecionado' : 'Valor do acordo', total > 0 ? money(total) : 'A definir')}${infoCard('Total pago', money(x.paid))}${infoCard(x.status === 'negotiating' ? 'Saldo se aceitar' : 'Falta pagar', total > 0 ? money(calculator.remaining(x)) : 'A definir')}</div>
        ${installments}${x.notes ? `<p class="category-note">${esc(x.notes)}</p>` : ''}
        <div class="wallet-actions"><button type="button" class="action-small" data-edit-debt="${esc(x.id)}">Editar / registrar pagamento</button><button type="button" class="action-small danger" data-delete-debt="${esc(x.id)}">Excluir</button></div>
      </article>`;
    }).join('') : '<div class="panel empty-state">Nenhuma dívida encontrada.</div>';
  }
  function removeExtra(group, id) {
    const labels = { pixKeys: 'chave Pix', debts: 'dívida ou acordo' };
    const x = db[group].find(r => r.id === id); if (!x) return;
    if (!confirm(`Excluir ${labels[group]} "${x.name || x.creditor}"?`)) return;
    db[group] = db[group].filter(r => r.id !== id); save(); render(); notify('Registro excluído.');
  }
  let walletRenderToken = 0;
  function renderWallets() {
    const token = ++walletRenderToken;
    const visibleWallets = db.wallets.filter(w => {
      const term = ($('#walletSearch')?.value || '').toLocaleLowerCase('pt-BR');
      const kind = $('#walletKindFilter')?.value || 'all';
      return (kind === 'all' || w.kind === kind) && `${w.app} ${w.currency}`.toLocaleLowerCase('pt-BR').includes(term);
    }).sort((a, b) => Number(b.favorite === true) - Number(a.favorite === true));
    const count = db.wallets.length;
    const points = db.wallets.filter(w => w.kind === 'points');
    $('#walletStats').innerHTML = infoCard('Estimativa convertida em reais', count ? 'Calculando…' : '—', 'Somente saldos com conversão disponível') + infoCard('Aplicativos registrados', String(count), 'Saldos externos, sem movimentação real') + infoCard('Apps de pontos', String(points.length), 'Taxas de troca definidas por você');
    $('#walletCards').innerHTML = visibleWallets.length ? visibleWallets.map(w => {
      const label = w.kind === 'money' ? 'Saldo em moeda' : w.kind === 'points' ? 'Recompensas e pontos' : 'Criptomoeda';
      const display = w.kind === 'money' ? cashLabel(w.balance, w.currency) : `${amountLabel(w.balance)} ${w.kind === 'points' ? 'pontos' : w.currency}`;
      const desc = w.kind === 'points' ? (['ratioBRL', 'ratioUSD', 'ratioCrypto'].includes(w.pointValueMode) ? (w.pointReferencePoints && w.pointReferenceBRL ? `${amountLabel(w.pointReferencePoints)} pontos = ${w.pointValueMode === 'ratioCrypto' ? amountLabel(w.pointReferenceBRL) + ' ' + (w.pointReferenceCrypto || 'BTC') : cashLabel(w.pointReferenceBRL, w.pointValueMode === 'ratioUSD' ? 'USD' : 'BRL')}` : 'Sem equivalência cadastrada') : w.pointValueMode === 'BRL' ? (w.pointUnitValue ? `1 ponto = ${cashLabel(w.pointUnitValue, 'BRL')}` : 'Sem taxa cadastrada') : w.pointValueMode === 'USD' ? (w.pointUnitValue ? `1 ponto = ${cashLabel(w.pointUnitValue, 'USD')}` : 'Sem taxa cadastrada') : (w.pointsPerUsd ? `1 USD = ${amountLabel(w.pointsPerUsd)} pontos` : 'Sem taxa de conversão cadastrada')) : w.kind === 'crypto' ? (w.manualUsdPrice ? `Cotação manual: US$ ${amountLabel(w.manualUsdPrice)} por ${w.currency}` : 'Preço de mercado sujeito a atualização') : `Moeda: ${w.currency}`;
      return `<article class="wallet-card" data-wallet-id="${esc(w.id)}" ${w.kind === 'crypto' ? 'draggable="true"' : ''}><div class="wallet-card-top"><span class="wallet-type">${esc(label)}</span><span class="wallet-symbol">${w.kind === 'money' ? '💵' : w.kind === 'points' ? '✦' : '₿'}</span></div><h3>${esc(w.app)}</h3><strong class="wallet-balance">${esc(display)}</strong><p class="wallet-description">${esc(desc)}</p><div class="wallet-estimate" data-wallet-estimate="${esc(w.id)}">Calculando estimativa…</div><div class="wallet-actions">${w.kind === 'crypto' ? `<button class="action-small wallet-favorite ${w.favorite ? 'is-favorite' : ''}" data-favorite-wallet="${esc(w.id)}" type="button" aria-label="${w.favorite ? 'Desmarcar' : 'Marcar'} favorito" title="Favorito">${w.favorite ? '★' : '☆'}</button><button class="action-small" data-move-wallet="${esc(w.id)}" data-move-direction="-1" type="button" title="Mover para cima" aria-label="Mover para cima">↑</button><button class="action-small" data-move-wallet="${esc(w.id)}" data-move-direction="1" type="button" title="Mover para baixo" aria-label="Mover para baixo">↓</button>` : ''}<button class="button button-outline" data-edit-wallet="${esc(w.id)}" type="button">Editar</button><button class="action-small danger" data-delete-wallet="${esc(w.id)}" type="button" aria-label="Excluir saldo do app ${esc(w.app)}">Excluir</button></div></article>`;
    }).join('') : `<div class="panel empty-state wallet-empty"><span class="empty-symbol">◈</span>${count ? 'Nenhum saldo corresponde ao filtro.' : 'Você ainda não cadastrou saldos de outros aplicativos. Adicione seu primeiro app, pontos ou cripto.'}</div>`;
    if (count) void refreshWalletValuations(token, [...db.wallets]);
  }
  async function refreshWalletValuations(token, wallets) {
    const results = await Promise.all(wallets.map(async w => {
      try { return await valueWalletInBRL(w); } catch (err) { return { value: null, detail: 'Cotação indisponível. Verifique a conexão ou tente atualizar.' }; }
    }));
    if (token !== walletRenderToken || view !== 'carteiras') return;
    let sum = 0, valued = 0;
    for (let i = 0; i < wallets.length; i++) {
      const w = wallets[i], result = results[i];
      const el = Array.from($('#walletCards').querySelectorAll('[data-wallet-estimate]')).find(x => x.dataset.walletEstimate === w.id);
      if (el) { el.innerHTML = result.value !== null && Number.isFinite(result.value) ? `<strong>≈ ${esc(money(result.value))}</strong><small>${esc(result.detail)}</small>` : `<strong>Sem estimativa</strong><small>${esc(result.detail)}</small>`; }
      if (result.value !== null && Number.isFinite(result.value)) { sum += result.value; valued++; }
    }
    $('#walletStats').innerHTML = infoCard('Estimativa convertida em reais', valued ? money(sum) : '—', `${valued} de ${wallets.length} saldo(s) com valor calculável · não é saldo disponível`) + infoCard('Aplicativos registrados', String(wallets.length), 'Cadastro manual') + infoCard('Apps de pontos', String(wallets.filter(w => w.kind === 'points').length), 'Taxa por US$ 1 configurável');
  }
  // ===== 07. INICIALIZAÇÃO E EVENTOS DO SITE =====
  function init() {
    load();
    window.KaykoInvestimentos.mount({
      getRecords: () => db.investments,
      saveRecords: records => { db.investments = window.KaykoInvestimentos.normalizeRecords(records); save(); },
      getSettings: () => db.settings.investmentMarket,
      saveSettings: settings => { db.settings.investmentMarket = window.KaykoInvestimentos.normalizeSettings(settings); save(); },
      notify
    });
    window.KaykoFerramentas.mount({
      getNotes: () => db.notes,
      setNotes: notes => { const previous = db.notes; db.notes = window.KaykoFerramentas.normalizeNotes(notes); if (!save()) { db.notes = previous; return false; } return true; },
      notify
    });
    $('#monthSelect').innerHTML = MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
    document.querySelector('.brand').addEventListener('click', e => { e.preventDefault(); navigate('painel'); });
    // A navegação tem listener próprio: não depende de outros formulários/eventos delegados.
    document.querySelectorAll('#sidebar button[data-view]').forEach(button => {
      button.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); navigate(button.dataset.view); });
    });
    window.addEventListener('hashchange', () => {
      const target = location.hash.slice(1);
      if (document.getElementById(`view-${target}`) && target !== view) navigate(target);
    });
    $('#monthSelect').addEventListener('change', e => { db.settings.month = Number(e.target.value); save(); render(); });
    $('#yearSelect').addEventListener('change', e => { const n = Number(e.target.value); if (Number.isInteger(n) && n >= 2000 && n <= 2100) { db.settings.year = n; save(); render(); } else { e.target.value = db.settings.year; notify('Escolha um ano entre 2000 e 2100.', true); } });
    $('#transactionSearch').addEventListener('input', () => { if (view === 'lancamentos') renderTransactions() });
    $('#transactionTypeFilter').addEventListener('change', () => { if (view === 'lancamentos') renderTransactions() });
    $('#allMonthsToggle').addEventListener('change', () => { if (view === 'lancamentos') renderTransactions() });
    $('#copyPreviousBudget').addEventListener('click', copyBudget);
    $('#themePalette').addEventListener('change', e => { db.settings.themePalette = e.target.value; applyTheme(); save(); });
    $('#themeModeToggle').addEventListener('click', () => { db.settings.themeMode = db.settings.themeMode === 'dark' ? 'light' : 'dark'; applyTheme(); save(); });
    $('#converterForm').addEventListener('submit', e => { e.preventDefault(); void convertCurrencies(); });
    $('#cryptoQuoteSource').value = window.KaykoCotacoes.validProvider(db.settings.cryptoQuoteSource);
    $('#cryptoQuoteSource').addEventListener('change', e => {
      db.settings.cryptoQuoteSource = window.KaykoCotacoes.validProvider(e.target.value);
      rateCache.clear(); save(); if (view === 'carteiras') renderWallets();
      void convertCurrencies();
    });
    ['conversionFrom', 'conversionTo'].forEach(id => $('#' + id).addEventListener('change', () => updateQuoteReferenceLinks()));
    $('#converterSwap').addEventListener('click', () => {
      const from = $('#conversionFrom'); const to = $('#conversionTo');[from.value, to.value] = [to.value, from.value]; updateQuoteReferenceLinks(); void convertCurrencies();
    });
    $('#walletRefreshRates').addEventListener('click', () => { rateCache.clear(); renderWallets(); });
    ['walletSearch', 'walletKindFilter'].forEach(id => $('#' + id).addEventListener(id === 'walletSearch' ? 'input' : 'change', () => { if (view === 'carteiras') renderWallets(); }));
    $('#converterCryptoSearch').addEventListener('input', e => {
      const query = e.target.value; const from = $('#conversionFrom'), to = $('#conversionTo');
      const a = from.value, b = to.value;
      fillConverterOptions(query);
      if ([...from.options].some(o => o.value === a)) from.value = a;
      if ([...to.options].some(o => o.value === b)) to.value = b;
      updateQuoteReferenceLinks();
    });
    $('#debtSearch').addEventListener('input', () => { if (view === 'dividas') renderDebts(); });
    $('#debtStatusFilter').addEventListener('change', () => { if (view === 'dividas') renderDebts(); });
    // Controles do simulador atualizam só os resultados, sem refazer a tela inteira.
    ['yieldSource', 'yieldPrincipal', 'yieldPeriodCount', 'yieldPeriodUnit', 'yieldCdiAnnual', 'yieldCdiPercent', 'yieldSelicAnnual'].forEach(id => {
      const el = $('#' + id); el.addEventListener('input', handleYieldInput);
      if (el.tagName === 'INPUT') el.addEventListener('change', () => renderYieldInputs());
    });
    $('#yieldGetBcbRates').addEventListener('click', () => { void updateYieldRates() });
    fillConverterOptions(); applyTheme();
    // Se o site ficou aberto de um dia para o outro, recalcula os avisos ao voltar à aba.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        if (view === 'cofrinhos') renderYieldResults();
        if (view === 'contas') renderBills();
        else if (view === 'painel') renderUpcomingBills();
      }
    });
    $('#entityForm').addEventListener('submit', handleSubmit);
    $('#closeModal').addEventListener('click', closeModal); $('#cancelModal').addEventListener('click', closeModal);
    $('#modalOverlay').addEventListener('click', e => { if (e.target.id === 'modalOverlay') closeModal() });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modalOverlay').hidden) closeModal() });
    // Ações de backup existentes na página Ajuda continuam disponíveis.
    $('#backupExport').addEventListener('click', backupExport); $('#csvExport').addEventListener('click', exportCSV);
    $('#backupImport').addEventListener('click', () => $('#backupFile').click());
    $('#backupFile').addEventListener('change', e => backupImport(e.target.files[0]));
    // Atalhos de acesso rápido no cabeçalho, em qualquer tela (PC e celular).
    $('#dailyBackupButton').addEventListener('click', backupExport);
    $('#backupCenterButton').addEventListener('click', openBackupCenter);
    $('#printReportButton').addEventListener('click', () => {
      if (!window.KaykoRelatorio || !window.KaykoRelatorio.abrir(db)) notify('Relatório bloqueado: permita janelas pop-up e tente novamente.', true);
    });
    $('#backupCloseButton').addEventListener('click', closeBackupCenter);
    $('#backupOverlay').addEventListener('click', e => { if (e.target.id === 'backupOverlay') closeBackupCenter() });
    $('#backupSaveNow').addEventListener('click', backupExport);
    $('#backupShareNow').addEventListener('click', backupShare);
    $('#backupRestoreNow').addEventListener('click', () => $('#backupFile').click());
    $('#backupCsvNow').addEventListener('click', exportCSV);
    document.addEventListener('keydown', e => {
      if ($('#backupOverlay').hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); closeBackupCenter(); }
      if (e.key === 'Tab') {
        const focusables = Array.from($('#backupOverlay').querySelectorAll('button:not([disabled])'));
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    $('#mobileMenu').addEventListener('click', () => { const opened = $('#sidebar').classList.toggle('open'); $('#mobileShade').hidden = !opened; $('#mobileMenu').setAttribute('aria-expanded', String(opened)) });
    $('#mobileShade').addEventListener('click', () => { $('#sidebar').classList.remove('open'); $('#mobileShade').hidden = true; $('#mobileMenu').setAttribute('aria-expanded', 'false') });
    document.addEventListener('click', e => {
      const elem = e.target.closest('button[data-view],button[data-action],[data-edit-wallet],[data-delete-wallet],[data-favorite-wallet],[data-move-wallet],[data-edit-pix],[data-delete-pix],[data-toggle-pix],[data-copy-pix],[data-edit-debt],[data-delete-debt],[data-edit-category],[data-delete-category],[data-select-coffer],[data-coffer-cell],[data-coffer-move],[data-edit-coffer],[data-delete-coffer],[data-edit-transaction],[data-delete-transaction],[data-edit-bill],[data-delete-bill],[data-toggle-bill-paid],[data-edit-goal],[data-delete-goal]');
      if (!elem) return;
      if (elem.dataset.view) { navigate(elem.dataset.view); return; }
      if (elem.dataset.toggleBillPaid) { toggleBillPaid(elem.dataset.toggleBillPaid); return; }
      if (elem.dataset.favoriteWallet) { toggleFavoriteWallet(elem.dataset.favoriteWallet); return; }
      if (elem.dataset.moveWallet) { moveWallet(elem.dataset.moveWallet, Number(elem.dataset.moveDirection)); return; }
      if (elem.dataset.editPix) { openModal('pix', elem.dataset.editPix); return; }
      if (elem.dataset.deletePix) { removeExtra('pixKeys', elem.dataset.deletePix); return; }
      if (elem.dataset.editDebt) { openModal('debt', elem.dataset.editDebt); return; }
      if (elem.dataset.deleteDebt) { removeExtra('debts', elem.dataset.deleteDebt); return; }
      if (elem.dataset.togglePix) {
        const x = db.pixKeys.find(r => r.id === elem.dataset.togglePix);
        const index = Number(elem.dataset.pixIndex || 0);
        const key = (x?.keys?.length ? x.keys[index] : {key:x?.key})?.key;
        const node = Array.from(document.querySelectorAll('[data-pix-value]')).find(n => n.dataset.pixValue === elem.dataset.togglePix && Number(n.dataset.pixIndex) === index);
        if (!key || !node) return;
        const show = elem.textContent === 'Mostrar'; node.textContent = show ? key : '•••• •••• ••••'; elem.textContent = show ? 'Ocultar' : 'Mostrar'; return;
      }
      if (elem.dataset.copyPix) {
        const x = db.pixKeys.find(r => r.id === elem.dataset.copyPix);
        const index = Number(elem.dataset.pixIndex || 0);
        const key = (x?.keys?.length ? x.keys[index] : {key:x?.key})?.key;
        if (!key) return;
        if (!navigator.clipboard?.writeText) { notify('Cópia indisponível neste navegador. Use Mostrar para selecionar a chave.', true); return; }
        void navigator.clipboard.writeText(key).then(() => notify('Chave Pix copiada.'), () => notify('Cópia bloqueada pelo navegador.', true)); return;
      }
      if (elem.dataset.editWallet) { openModal('wallet', elem.dataset.editWallet); return; }
      if (elem.dataset.deleteWallet) { deleteWallet(elem.dataset.deleteWallet); return; }
      if (elem.dataset.editCategory) { openModal('category', elem.dataset.editCategory); return; }
      if (elem.dataset.deleteCategory) { deleteCategory(elem.dataset.deleteCategory); return; }
      if (elem.dataset.selectCoffer) { selectedCofferId = elem.dataset.selectCoffer; renderCoffers(); return; }
      if (elem.dataset.cofferCell) { handleCofferCell(elem.dataset.cofferCell, Number(elem.dataset.slot), $('#cofferDepositDate')?.value || today()); return; }
      if (elem.dataset.cofferMove) { openModal('cofferMove', elem.dataset.cofferMove, elem.dataset.moveType); return; }
      if (elem.dataset.editCoffer) { openModal('coffer', elem.dataset.editCoffer); return; }
      if (elem.dataset.deleteCoffer) { deleteCoffer(elem.dataset.deleteCoffer); return; }
      const action = elem.dataset.action;
      if (action === 'add-wallet') openModal('wallet'); else if (action === 'add-pix') openModal('pix'); else if (action === 'add-debt') openModal('debt'); else if (action === 'add-custom-crypto') openModal('customCrypto'); else if (action === 'add-category') openModal('category'); else if (action === 'add-transaction') openModal('transaction'); else if (action === 'add-bill') openModal('bill'); else if (action === 'add-goal') openModal('goal'); else if (action === 'add-coffer') openModal('coffer'); else if (action === 'print-woodbox') window.print(); else if (action === 'edit-monthly-goal') editMonthlyGoal();
      const types = [['editTransaction', 'transaction', true], ['deleteTransaction', 'transaction', false], ['editBill', 'bill', true], ['deleteBill', 'bill', false], ['editGoal', 'goal', true], ['deleteGoal', 'goal', false]];
      for (const [attr, kind, edit] of types) { if (elem.dataset[attr]) { (edit ? openModal : removeEntity)(kind, elem.dataset[attr]); break; } }
    });
    document.addEventListener('change', e => { if (e.target.matches('[data-budget-cat]')) saveBudget(e.target) });
    let draggedWallet = null;
    $('#walletCards').addEventListener('dragstart', e => { const card = e.target.closest('.wallet-card[draggable="true"]'); draggedWallet = card?.dataset.walletId || null; if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; });
    $('#walletCards').addEventListener('dragover', e => { if (draggedWallet && e.target.closest('.wallet-card[draggable="true"]')) e.preventDefault(); });
    $('#walletCards').addEventListener('drop', e => {
      const card = e.target.closest('.wallet-card[draggable="true"]'); if (!card || !draggedWallet) return; e.preventDefault();
      const start = db.wallets.findIndex(w => w.id === draggedWallet), end = db.wallets.findIndex(w => w.id === card.dataset.walletId);
      if (start >= 0 && end >= 0 && start !== end) { const [item] = db.wallets.splice(start, 1); db.wallets.splice(end, 0, item); save(); renderWallets(); }
      draggedWallet = null;
    });
    $('#walletCards').addEventListener('dragend', () => { draggedWallet = null; });
    const validHash = location.hash.slice(1);
    view = ['painel', 'lancamentos', 'orcamento', 'contas', 'metas', 'cofrinhos', 'carteiras', 'pix', 'dividas', 'calculadora', 'notas', 'investimentos', 'ajuda'].includes(validHash) ? validHash : 'painel';
    render();
  }
  init();
})();
