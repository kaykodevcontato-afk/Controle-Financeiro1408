# Guia de manutenção e evolução

## Comece pelo básico

- `index.html`: estrutura HTML, menus e formulários. Não duplique `id` em novos elementos.
- `style.css`: variáveis `:root`, temas e responsividade. Estilos adicionais estão separados na seção `AJUSTES DE LAYOUT`.
- `app.js`: código principal dentro de uma IIFE com `use strict`. Encontre funções por `Ctrl+F`. Os demais JS estão em `assets/js` e são carregados **antes** de `app.js`.

## Dados

A função `defaultDB()` define o formato inicial. `normalize()` valida backups e aplica campos opcionais de versões anteriores. `save()` escreve em `localStorage`, sempre com a chave antiga `kayko-controle-financeiro-v1`. Não troque essa chave ou o número `version: 1` sem preparar uma migração.

Coleções novas: `categoryCatalog` (categorias visíveis), `categoryNotes`, `customCryptos`, `pixKeys`, `debts`. Favoritos ficam nos registros `wallets[].favorite` e em `settings.cryptoFavorites`. Posições dos cards são mantidas pela ordem dos registros em `wallets`.

## Distinção entre valores

1. **Saldo disponível:** entradas − gastos − reservas + resgates, no período escolhido.
2. **Saldos externos:** registros de outros aplicativos, pontos e criptomoedas, muitas vezes com cotação aproximada e potencialmente parcial. Não modificam a movimentação mensal.
3. **Dívidas e acordos:** controle informativo; atualizar o total pago não registra automaticamente um gasto.
4. **Investimentos:** operações e cenários indicativos, sem compra/venda real nem integração com o caixa.

## Adicionar nova criptomoeda

Pelo próprio site, vá em **Apps, pontos e moedas → Cadastrar outra cripto**. Informe símbolo e nome. O preço manual funciona sem IDs; cotações automáticas precisam de identificadores válidos no CoinGecko e/ou CoinPaprika. Para alterar o catálogo que vem instalado inicialmente, edite o objeto `CRYPTO_ASSETS` de `app.js`: `[nome, idCoinPaprika, idCoinGecko]`.

## Testar antes de publicar

- Navegue por todas as telas.
- Cadastre e exclua uma categoria sem lançamentos; tente excluir outra já usada e verifique que existe bloqueio.
- Cadastre chaves Pix (sem dados reais no teste), negociações e saldos de apps. Verifique a exibição no painel e os backups.
- Cadastre PI e SLC. Filtre os ativos e teste os botões ★, ↑ e ↓.
- Teste em janela estreita e largura grande.
- Exporte JSON, importe em outra sessão e confira os registros.
- Verifique a página sem rede: valores que dependem de câmbio/cotação devem ficar indisponíveis; não usar zero como preço verdadeiro.

## Cuidados

Não inclua tokens de APIs privadas no JavaScript do GitHub Pages. Os códigos-fonte são públicos e visíveis para os visitantes. Se futuramente houver Pix automático, autenticação, venda de licenças ou vários usuários, utilize um backend seguro com controles de acesso e políticas de privacidade adequadas.


## Ferramentas — v2.1

| Alteração | Onde editar |
|---|---|
| Menus e estrutura das novas telas | `index.html` (procure `view-calculadora` e `view-notas`) |
| Aparência e responsividade | `assets/css/ferramentas.css` |
| Operações matemáticas | `assets/js/ferramentas.js`, função `calculate` |
| Cadastro, edição e busca de notas | `assets/js/ferramentas.js`, funções `renderNotes`, `newNote` e `updateNote` |
| Integração com backups e armazenamento | `app.js` (procure `notes` e `KaykoFerramentas`) |

Notas são armazenadas no mesmo backup JSON. Históricos da calculadora são temporários.


## Acordos à vista e parcelados (v2.2)

- `assets/js/dividas-acordos.js`: validação, migração de dívidas antigas, cálculo de parcelas e vencimentos.
- `app.js`: formulário (`kind === 'debt'`), `renderDebts()` e painel de acordos.
- `style.css`: variáveis da paleta rosa e classes `.debt-*`.
- `index.html`: seção `view-dividas` e Instagram do desenvolvedor.
- `assets/js/relatorio-impressao.js`: colunas de acordos no relatório.
