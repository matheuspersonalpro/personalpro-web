/**
 * Cálculo ÚNICO do dinheiro do mês — usado pela tela Início e pela aba Finanças.
 *
 * Antes cada tela fazia a própria conta sobre a MESMA coleção `pagamentos`, mas
 * com critérios diferentes (Início filtrava por `criadoEm`, Finanças por `data`),
 * então os dois números divergiam e nenhum explicava o outro (achado pelo dono).
 *
 * Três perguntas DIFERENTES, que o app tratava como uma só:
 *
 *   FATURADO  — quanto foi cobrado no mês (competência). Responde "como foi o mês".
 *   RECEBIDO  — quanto já CAIU na conta (caixa). Responde "quanto eu tenho".
 *   A RECEBER — confirmado mas ainda não creditado, com a data de cada crédito.
 *
 * A diferença existe porque cartão no Asaas credita em D+32: o que o aluno paga
 * hoje só vira dinheiro em conta no mês seguinte. Somar tudo num número só fazia
 * o app mostrar como saldo algo que ainda não existia.
 *
 * Pagamento manual (PIX/dinheiro) não tem defasagem: o dinheiro já está na mão,
 * então conta em Faturado e em Recebido no mesmo dia.
 */

/** 'DD/MM/AAAA' → Date local (meia-noite). Nunca usar `new Date(str)` aqui. */
function brParaData(br) {
  const [d, m, a] = String(br || '').split('/').map(Number);
  if (!d || !m || !a) return null;
  return new Date(a, m - 1, d);
}

/** Data em que o pagamento foi COBRADO (competência). */
export function dataFaturamento(p) {
  if (p?.data) return brParaData(p.data);
  const c = p?.criadoEm;
  if (c?.toDate) return c.toDate();
  if (c) { const d = new Date(c); return isNaN(d) ? null : d; }
  return null;
}

/**
 * Data em que o dinheiro CAI na conta.
 * Sem `dataCredito` (lançamento manual, ou registro anterior a este campo)
 * assume que caiu junto com a cobrança — que é o certo pra PIX/dinheiro e o
 * melhor palpite pro histórico antigo.
 */
export function dataCredito(p) {
  return p?.dataCredito ? brParaData(p.dataCredito) : dataFaturamento(p);
}

const mesmoMes = (d, ref) =>
  !!d && d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();

/**
 * Texto de dinheiro -> número. Entende o jeito BRASILEIRO de escrever.
 *
 * A versão anterior era `parseFloat(String(v).replace(',', '.'))`, que troca
 * só a PRIMEIRA vírgula e não faz nada com o ponto de milhar. O resultado era
 * dinheiro lido como um milésimo do valor real:
 *
 *     "1.234,56" -> 1.234        (deveria ser 1234,56)
 *     "1.200"    -> 1.2          (deveria ser 1200)
 *     "2.500,00" -> 2.5          (deveria ser 2500)
 *     "R$ 900,00" -> 0           (o cifrão zerava tudo)
 *
 * O app não grava nesse formato -- o reajuste escreve "1234,56" --, mas o
 * personal DIGITA o valor do plano à mão, e no teclado do Android o ponto está
 * ali. Um "1.200" digitado uma vez viraria R$ 1,20 na carteira inteira: no
 * mensal total, nas projeções, na inadimplência.
 *
 * COMO DECIDE, quando só há ponto e nenhuma vírgula:
 *   - mais de um ponto              -> todos são milhar  ("1.234.567")
 *   - um ponto seguido de 3 dígitos -> milhar            ("1.200" = 1200)
 *   - qualquer outro caso           -> decimal           ("1234.56", "0.5")
 *
 * A regra dos 3 dígitos é o que resolve a ambiguidade real de "1.200", e vale
 * porque isto aqui é preço de plano, não medida científica.
 */
export const valorNum = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  // Fora dígitos, vírgula e ponto: some com "R$", espaço e qualquer sujeira.
  const limpo = String(v ?? '').replace(/[^\d,.-]/g, '');
  if (!limpo) return 0;

  let normal;
  if (limpo.includes(',')) {
    // Tem vírgula: ela é o decimal, e todo ponto é milhar.
    normal = limpo.split('.').join('').replace(',', '.');
  } else {
    const partes = limpo.split('.');
    const ultima = partes[partes.length - 1];
    const ehMilhar = partes.length > 2 || (partes.length === 2 && ultima.length === 3);
    normal = ehMilhar ? partes.join('') : limpo;
  }
  const n = parseFloat(normal);
  return Number.isFinite(n) ? n : 0;
};

// Taxa do Asaas por transação (cartão): R$ 0,49 fixo + 2,99%.
export const ASAAS_TAXA_PCT = 0.0299;
export const ASAAS_TAXA_FIXA = 0.49;

/** Líquido: usa o netValue REAL do Asaas quando existe; senão estima a taxa. */
export function liquidoAsaas(bruto, netValue) {
  const nv = (netValue === null || netValue === undefined || netValue === '') ? null : valorNum(netValue);
  if (nv != null && nv > 0) return nv;
  return Math.max(0, valorNum(bruto) * (1 - ASAAS_TAXA_PCT) - ASAAS_TAXA_FIXA);
}

export const somaBruto   = (itens) => itens.reduce((s, x) => s + x.bruto, 0);
export const somaLiquido = (itens) => itens.reduce((s, x) => s + x.liquido, 0);

/**
 * Lista única do que ainda VAI CAIR na conta, de duas fontes que são dois
 * estados do mesmo dinheiro:
 *   1. `jaPagos`   — o aluno já pagou, o crédito é que ainda não caiu (D+32).
 *   2. `previstos` — nem foi cobrado ainda; é a próxima cobrança do ciclo.
 *
 * Ler só a (2) foi o bug do 1.3.20: ela guarda apenas o PRÓXIMO ciclo de cada
 * aluno, então com D+32 esse ciclo cai no mês seguinte e a lista do mês corrente
 * ia esvaziando aluno a aluno até sumir (achado pelo dono).
 */
export function montarAReceber(pagamentosAReceber = [], previstos = [], agora = new Date(), manuais = []) {
  const jaPagos = pagamentosAReceber.map(p => ({
    alunoId: p.alunoId || p.alunoNome || '—',
    nome: p.alunoNome || '—',
    data: dataCredito(p),
    bruto: valorNum(p.valor),
    liquido: liquidoAsaas(p.valor, p.valorLiquido),
    estimado: false,
  })).filter(x => !!x.data && x.data > agora);

  // Aluno que já pagou não pode reaparecer como cobrança prevista.
  const jaListados = new Set(jaPagos.map(x => x.alunoId));
  const aindaVem = previstos.filter(r => r.data > agora && !jaListados.has(r.alunoId));

  // 3. `manuais` — aluno de PIX/dinheiro que vence até o fim do mês e ainda
  //    não pagou (ver `previstosManuais`). Já vêm filtrados por dia; aqui só
  //    garante que nenhum aluno entra duas vezes na lista.
  aindaVem.forEach(r => jaListados.add(r.alunoId));
  const manuaisNovos = manuais.filter(r => !jaListados.has(r.alunoId));

  return [...jaPagos, ...aindaVem, ...manuaisNovos].sort((a, b) => a.data - b.data);
}

/**
 * A receber dos alunos SEM cobrança automática (PIX/dinheiro).
 *
 * Antes o "A receber" só enxergava o Asaas: quem paga por PIX ou em dinheiro
 * não existia ali, e o card mostrava uma fração do que o personal ainda tem
 * pra receber no mês (achado na revisão: R$ 350 na tela contra ~R$ 3,4 mil
 * devidos).
 *
 * Pagamento manual empurra o `vencimento` pro próximo ciclo na hora em que é
 * registrado — então vencimento DENTRO do mês corrente quer dizer "ainda não
 * pagou este mês". Entra quem:
 *   - está ativo, tem valor > 0 e NÃO tem cobrança automática (esse já conta
 *     pelo Asaas, uma vez só);
 *   - vence de hoje até o fim do mês corrente;
 *   - não está atrasado (`pagamentoVencido`) — atrasado aparece no card de
 *     Inadimplência, e contar nos dois somaria a mesma dívida duas vezes.
 *
 * Sem taxa: PIX/dinheiro cai inteiro, então líquido = bruto.
 */
export function previstosManuais(alunos = [], agora = new Date()) {
  const hoje = new Date(agora);
  hoje.setHours(0, 0, 0, 0);
  return alunos
    .filter(a => a && a.ativo !== false && !a.cobrancaAutomatica && !a.pagamentoVencido)
    .map(a => {
      const venc = lerData(a.vencimento);
      const bruto = valorNum(a.valor);
      if (!venc || bruto <= 0) return null;
      if (venc < hoje || !mesmoMes(venc, hoje)) return null;
      return { alunoId: a.id, nome: a.nome || '—', data: venc, bruto, liquido: bruto, estimado: false, manual: true };
    })
    .filter(Boolean);
}

/** Quebra a lista em grupos de mês, cada um com seu subtotal bruto e líquido. */
export function agruparPorMes(itens = []) {
  const mapa = new Map();
  itens.forEach(x => {
    const chave = `${x.data.getFullYear()}-${x.data.getMonth()}`;
    if (!mapa.has(chave)) {
      mapa.set(chave, { mes: x.data.getMonth(), ano: x.data.getFullYear(), itens: [] });
    }
    mapa.get(chave).itens.push(x);
  });
  return [...mapa.values()]
    .sort((a, b) => (a.ano - b.ano) || (a.mes - b.mes))
    .map(g => ({ ...g, bruto: somaBruto(g.itens), liquido: somaLiquido(g.itens) }));
}

const soma = (lista) => lista.reduce((s, p) => {
  const v = parseFloat(String(p?.valor ?? 0).replace(',', '.'));
  return s + (Number.isFinite(v) ? v : 0);
}, 0);

/**
 * Resumo do mês. `pagamentos` é a coleção crua; `ref` é qualquer data do mês
 * desejado (default: hoje); `agora` existe só pra testes.
 */
export function resumoFinanceiro(pagamentos = [], ref = new Date(), agora = new Date()) {
  const doMesFaturado = pagamentos.filter(p => mesmoMes(dataFaturamento(p), ref));
  const doMesCreditado = pagamentos.filter(p => {
    const dc = dataCredito(p);
    return mesmoMes(dc, ref) && dc <= agora; // ainda não caiu não é "recebido"
  });
  // A receber: crédito no futuro, independente do mês da cobrança — é dinheiro
  // que ainda vem, e o personal precisa ver junto mesmo se foi vendido antes.
  const aReceber = pagamentos
    .filter(p => { const dc = dataCredito(p); return !!dc && dc > agora; })
    .sort((a, b) => dataCredito(a) - dataCredito(b));

  return {
    faturado: soma(doMesFaturado),
    recebido: soma(doMesCreditado),
    aReceber: soma(aReceber),
    qtdFaturado: doMesFaturado.length,
    qtdRecebido: doMesCreditado.length,
    listaAReceber: aReceber,
  };
}

// ─── Regras de VENCIMENTO ────────────────────────────────────────────────────
// Estavam duplicadas nas telas (FinanceiroPersonal e AlunosPersonal) e as cópias
// DIVERGIRAM: a do Financeiro tratava o plano Anual, a de Alunos não — aluno
// anual marcado como pago pela tela de Alunos ficava com o vencimento parado e
// voltava a aparecer como atrasado. Aqui é a única fonte da regra.

/** Quantos meses cada plano avança o vencimento. */
export const MESES_POR_PLANO = {
  Mensal: 1,
  Trimestral: 3,
  Semestral: 6,
  Anual: 12,
};

/**
 * Valor MENSAL da assinatura recorrente do Asaas (cycle MONTHLY), a partir do
 * preço do plano. Única fonte: a ativação dividia, mas o reajuste em massa e a
 * edição do aluno mandavam o preço do plano INTEIRO como mensalidade.
 */
/**
 * A cobrança PAGA do Asaas do ciclo mais recente -- pelo vencimento (dueDate),
 * que é a ordem dos ciclos. paymentDate no cartão é a data do CRÉDITO (~30 dias
 * depois), e ordenar por ele punha a cobrança do mês passado na frente da deste.
 */
export function ultimaPagaAsaas(lista = []) {
  const quando = (c) => String(c.dueDate || c.confirmedDate || c.paymentDate || '');
  return lista
    .filter(c => c.status === 'RECEIVED' || c.status === 'CONFIRMED')
    .sort((a, b) => quando(b).localeCompare(quando(a)))[0];
}

export function valorMensalAsaas(valorPlano, plano) {
  const meses = MESES_POR_PLANO[plano] || 1;
  return Math.round((valorNum(valorPlano) / meses) * 100) / 100;
}

const pad2 = (n) => String(n).padStart(2, '0');

/** Date → "DD/MM/AAAA" (o formato gravado no banco e mostrado nas telas). */
export function formatarData(d) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * "DD/MM/AAAA" → Date (meia-noite local), ou null.
 *
 * Mais rígida que a `brParaData` acima de propósito: aqui uma data impossível
 * (31/02) vira null, em vez de deslizar pro mês seguinte. Renovar um plano a
 * partir de uma data inventada erra a cobrança; nos relatórios, mexer nisso
 * mudaria número de mês fechado, então a outra segue como está.
 */
export function lerData(txt) {
  if (typeof txt !== 'string') return null;
  const [d, m, a] = txt.split('/').map(Number);
  if (!d || !m || !a) return null;
  const dt = new Date(a, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  if (dt.getDate() !== d || dt.getMonth() !== m - 1) return null;
  return dt;
}

/**
 * Soma meses GRUDANDO no último dia quando o mês de destino é mais curto. Sem
 * isso, vencimento 31/01 + 1 mês vira 03/03 no JS (fevereiro não tem 31) e o
 * aluno ganha dias de plano de graça a cada renovação.
 */
export function somarMeses(data, meses, ancora = null) {
  const d = new Date(data);
  // O dia que a gente QUER é a âncora, não o dia da data de partida. Sem
  // isso o clamp é irreversível: 31/01 vira 28/02, e no mês seguinte a conta
  // parte do 28 — o aluno que contratou dia 31 passa a vencer dia 28 pra
  // sempre, cobrado 3 dias mais cedo todo mês. Com a âncora, fevereiro
  // continua caindo em 28 (não existe 31), mas março volta pro 31.
  const dia = diaValido(ancora) ? ancora : d.getDate();
  d.setDate(1);                       // evita o transbordo durante a conta
  d.setMonth(d.getMonth() + meses);
  const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dia, ultimoDia));
  return d;
}

/** Dia do mês utilizável como âncora (1–31). Qualquer outra coisa é ignorada. */
function diaValido(n) {
  return Number.isInteger(n) && n >= 1 && n <= 31;
}

/**
 * O dia do mês em que ESTE aluno vence, por contrato.
 *
 * `diaVencimento` é gravado na ficha e é a fonte da verdade. Quando não
 * existe (aluno cadastrado antes deste campo), cai no dia do vencimento atual
 * — que é a melhor evidência disponível, ainda que já possa ter escorregado.
 * O script de backfill usa o histórico de pagamentos pra recuperar o dia
 * original nesses casos.
 */
export function diaAncoraDe(aluno) {
  const gravado = Number(aluno?.diaVencimento);
  if (diaValido(gravado)) return gravado;
  const venc = lerData(aluno?.vencimento);
  return venc ? venc.getDate() : null;
}

/**
 * Próximo vencimento ao registrar um pagamento.
 *
 * Parte do vencimento ATUAL quando ele ainda está no futuro (quem paga adiantado
 * não perde os dias que já tinha) e de HOJE quando já venceu. Plano
 * desconhecido devolve null — melhor não renovar do que gravar data errada.
 */
export function proximoVencimento(vencimentoAtual, plano, hoje = new Date(), ancora = null) {
  const meses = MESES_POR_PLANO[plano];
  if (!meses) return null;

  const base = new Date(hoje);
  base.setHours(0, 0, 0, 0);

  const atual = lerData(vencimentoAtual);
  const partida = (atual && atual > base) ? atual : base;

  // `ancora` é opcional de propósito: sem ela o comportamento é o de antes
  // (dia derivado da data de partida), então nenhum chamador antigo muda.
  return formatarData(somarMeses(partida, meses, ancora));
}

/**
 * Receita recorrente mensal (MRR) da carteira: quanto entra por mês se todo
 * mundo pagar em dia. Plano trimestral de R$ 900 conta R$ 300 por mês.
 *
 * SÓ ALUNO ATIVO. `buscarAlunos` devolve a carteira inteira, inativos incluídos,
 * e a tela somava todos — então quem era inativado continuava contando pra
 * sempre e o "Mensal total" inflava mês a mês, ficando acima do Faturado sem
 * explicação. O dono, que só tem plano mensal, viu R$ 3 mil de sobra.
 */
export function mrrAtivos(alunos = []) {
  return alunos
    .filter(a => a?.ativo !== false)
    .reduce((soma, a) => {
      const meses = MESES_POR_PLANO[a?.plano] || 1;
      const valor = valorNum(a?.valor); // "1.200" = mil e duzentos (parseFloat lia 1,2)
      return soma + valor / meses;
    }, 0);
}

/** Dias até o vencimento (negativo = venceu). Conta por DIA, não por instante. */
export function diasAteVencimento(vencimento, hoje = new Date()) {
  const venc = lerData(vencimento);
  if (!venc) return null;
  const base = new Date(hoje);
  base.setHours(0, 0, 0, 0);
  return Math.round((venc - base) / 86400000);
}
