/**
 * Motor de cálculo das zonas de treino de endurance (corrida & ciclismo).
 *
 * Funções PURAS (sem dependências, sem UI) — base do módulo Endurance.
 * Ver esboço em docs/endurance-mvp.md.
 *
 * Corrida → VDOT (Daniels & Gilbert) → ritmos por zona.
 * Ciclismo → FTP (teste 20 min) → zonas de potência (Coggan).
 * FC → FCmax (Tanaka), LTHR e Karvonen → zonas de frequência cardíaca.
 *
 * Todas as faixas de zona são padrões da literatura, mas pensadas para serem
 * AJUSTÁVEIS pelo coach na UI.
 */

// ── Helpers de pace ───────────────────────────────────────────────────────────

/** Converte segundos por km em texto "m:ss/km". */
export function formatarPace(segPorKm) {
  if (!isFinite(segPorKm) || segPorKm <= 0) return '—';
  let m = Math.floor(segPorKm / 60);
  let s = Math.round(segPorKm % 60);
  if (s === 60) { m += 1; s = 0; }   // carry: 3:60 → 4:00
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

/**
 * Faixa de velocidade de ESTEIRA (km/h) a partir de uma zona de corrida.
 * Pace é o padrão de prescrição (Daniels/VDOT, TrainingPeaks), mas esteira se
 * regula em km/h — sem essa conversão o aluno não sabe o que digitar no painel.
 * Ordem crescente: pace mais LENTO (paceMax) vira a velocidade MENOR.
 * Retorna null pra ciclismo ou zonas antigas sem paceMin/paceMax.
 */
export function esteiraKmh(zona) {
  const { paceMin, paceMax } = zona || {};
  if (!isFinite(paceMin) || !isFinite(paceMax) || paceMin <= 0 || paceMax <= 0) return null;
  const kmh = (segPorKm) => (3600 / segPorKm).toFixed(1).replace('.', ',');
  return `${kmh(paceMax)} – ${kmh(paceMin)} km/h`;
}

/** Velocidade (m/min) → pace (segundos por km). */
function velocidadeParaPace(vMetrosPorMin) {
  return 60000 / vMetrosPorMin; // 1000 m a v m/min = 1000/v min = 60000/v s
}

// ── CORRIDA: VDOT ─────────────────────────────────────────────────────────────

/**
 * Calcula o VDOT a partir de um teste de corrida (distância + tempo).
 * Fórmula de Daniels & Gilbert.
 * @param {number} distanciaMetros  ex.: 5000
 * @param {number} tempoSegundos    ex.: 1200 (20:00)
 * @returns {number} VDOT (~30 a ~85)
 */
export function calcularVDOT(distanciaMetros, tempoSegundos) {
  const t = tempoSegundos / 60;                 // minutos
  const v = distanciaMetros / t;                // m/min
  const vo2 = -4.60 + 0.182258 * v + 0.000104 * v * v;
  const pMax = 0.8
    + 0.1894393 * Math.exp(-0.012778 * t)
    + 0.2989558 * Math.exp(-0.1932605 * t);
  return vo2 / pMax;
}

/** Velocidade (m/min) que corresponde a um VO2 alvo (inverte a quadrática). */
function velocidadeParaVO2(vo2Alvo) {
  const a = 0.000104, b = 0.182258, c = -(4.60 + vo2Alvo);
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

// Faixas de intensidade (% do VDOT/VO2máx) por zona de corrida — base Daniels.
//
// Os NOMES estavam deslocados em uma posição: conferindo com a tabela oficial
// do Daniels (VDOT 40 e 50), a faixa que o app chamava de "Maratona/Tempo" é o
// ritmo de LIMIAR, a de "Limiar" é o de VO₂máx, e a de "VO₂máx" é o de
// REPETIÇÃO (achado pelo dono, que estranhou o Z5 parecer lento pro rótulo).
// As faixas em si conferem — só os rótulos estavam errados.
const ZONAS_CORRIDA = [
  { zona: 'Z1', nome: 'Fácil (regenerativo)',  cor: '#34d399', lo: 0.59, hi: 0.74 },
  { zona: 'Z2', nome: 'Maratona (rodagem)',    cor: '#3B82F6', lo: 0.74, hi: 0.84 },
  { zona: 'Z3', nome: 'Limiar',                cor: '#93C5FD', lo: 0.84, hi: 0.88 },
  { zona: 'Z4', nome: 'VO₂máx (intervalado)',  cor: '#fbbf24', lo: 0.88, hi: 0.95 },
  { zona: 'Z5', nome: 'Repetição (tiros)',     cor: '#fb7185', lo: 0.95, hi: 1.00 },
];

/**
 * Zonas de ritmo de corrida a partir do VDOT.
 * @returns {Array} [{ zona, nome, cor, paceMin, paceMax, texto }]
 *   paceMin = ritmo mais rápido da zona (s/km), paceMax = mais lento.
 */
export function zonasCorridaPorVDOT(vdot) {
  return ZONAS_CORRIDA.map(z => {
    const vLento  = velocidadeParaVO2(z.lo * vdot); // menor intensidade → mais lento
    const vRapido = velocidadeParaVO2(z.hi * vdot); // maior intensidade → mais rápido
    const paceMax = velocidadeParaPace(vLento);
    const paceMin = velocidadeParaPace(vRapido);
    return {
      zona: z.zona, nome: z.nome, cor: z.cor,
      paceMin, paceMax,
      texto: `${formatarPace(paceMin)} – ${formatarPace(paceMax)}`,
    };
  });
}

// ── CICLISMO: FTP ─────────────────────────────────────────────────────────────

/** FTP a partir do teste de 20 min (FTP = 95% da média). */
export function calcularFTP(potenciaMedia20min) {
  return Math.round(potenciaMedia20min * 0.95);
}

/**
 * FTP a partir do teste de RAMPA (incremental até a exaustão).
 * Protocolo comum (ex.: Zwift): FTP = 75% da melhor potência de 1 min (MAP).
 */
export function calcularFTPRampa(melhorPotencia1min) {
  return Math.round(melhorPotencia1min * 0.75);
}

// ── NÍVEL DE CONDICIONAMENTO ──────────────────────────────────────────────────
// Classifica o atleta em 3 níveis a partir do teste, pra ESCALAR o volume do
// plano (um iniciante não pode receber o longão de um avançado).
// Referências: corrida = VDOT (Jack Daniels, "Daniels' Running Formula");
// ciclismo = FTP em W/kg (Coggan & Allen, "Training and Racing with a Power
// Meter" — perfil de potência).

/** VDOT → nível. Recreativo típico <40; intermediário 40–50; avançado ≥50. */
export function nivelPorVDOT(vdot) {
  if (!vdot || vdot < 40) return 'iniciante';
  if (vdot < 50) return 'intermediario';
  return 'avancado';
}

/**
 * FTP → nível. O correto é W/kg (Coggan): <2.5 destreinado/iniciante;
 * 2.5–3.5 moderado/intermediário; ≥3.5 bem treinado/avançado.
 * Sem o peso, cai num proxy por FTP absoluto (menos preciso).
 */
export function nivelPorFTP(ftp, pesoKg = null) {
  if (pesoKg > 0) {
    const wkg = ftp / pesoKg;
    if (wkg < 2.5) return 'iniciante';
    if (wkg < 3.5) return 'intermediario';
    return 'avancado';
  }
  if (!ftp || ftp < 180) return 'iniciante';
  if (ftp < 260) return 'intermediario';
  return 'avancado';
}

// Zonas de potência de Coggan (% do FTP).
const ZONAS_POTENCIA = [
  { zona: 'Z1', nome: 'Recuperação',   cor: '#34d399', lo: 0,    hi: 0.55 },
  { zona: 'Z2', nome: 'Endurance',     cor: '#3B82F6', lo: 0.56, hi: 0.75 },
  { zona: 'Z3', nome: 'Tempo',         cor: '#93C5FD', lo: 0.76, hi: 0.90 },
  { zona: 'Z4', nome: 'Limiar',        cor: '#fbbf24', lo: 0.91, hi: 1.05 },
  { zona: 'Z5', nome: 'VO₂máx',        cor: '#fb923c', lo: 1.06, hi: 1.20 },
  { zona: 'Z6', nome: 'Anaeróbico',    cor: '#fb7185', lo: 1.21, hi: 1.50 },
  { zona: 'Z7', nome: 'Neuromuscular', cor: '#f472b6', lo: 1.51, hi: null },
];

/** Zonas de potência (watts) a partir do FTP. */
export function zonasCiclismoPorFTP(ftp) {
  return ZONAS_POTENCIA.map(z => {
    const min = Math.round(z.lo * ftp);
    const max = z.hi ? Math.round(z.hi * ftp) : null;
    return {
      zona: z.zona, nome: z.nome, cor: z.cor, min, max,
      // Mesma coisa da FC: "até X W" lê melhor que "0 – X W".
      texto: !max ? `> ${min} W` : (min === 0 ? `até ${max} W` : `${min} – ${max} W`),
    };
  });
}

// ── FREQUÊNCIA CARDÍACA ───────────────────────────────────────────────────────

/** FCmáx estimada (Tanaka, 2001) — melhor que 220−idade. */
export function fcMaxTanaka(idade) {
  return Math.round(208 - 0.7 * idade);
}

/** FC alvo por % da reserva de FC (Karvonen). pct em 0–1. */
export function fcKarvonen(pct, fcMax, fcRepouso) {
  return Math.round(fcRepouso + pct * (fcMax - fcRepouso));
}

// Faixas de % aplicadas à FCmáx (ou à reserva, no Karvonen).
//
// ATENÇÃO: estas faixas TÊM que corresponder às mesmas intensidades de
// ZONAS_CORRIDA, senão "Z3" quer dizer uma coisa no pace e outra na FC — era
// exatamente o que acontecia antes (o modelo genérico 50/60/70/80/90 punha o
// Z1 da Débora em 92-110 bpm quando o pace Z1 dela dá ~140 bpm de verdade).
// Ancoradas na orientação de FC do próprio Daniels para cada ritmo:
// E 65-79%, M ~80-89%, T 88-92%, I 95-100% da FCmáx.
const ZONAS_FC_PCT = [
  { zona: 'Z1', nome: 'Fácil (regenerativo)', cor: '#34d399', lo: 0.65, hi: 0.79 },
  { zona: 'Z2', nome: 'Maratona (rodagem)',   cor: '#3B82F6', lo: 0.79, hi: 0.88 },
  { zona: 'Z3', nome: 'Limiar',               cor: '#93C5FD', lo: 0.88, hi: 0.92 },
  { zona: 'Z4', nome: 'VO₂máx (intervalado)', cor: '#fbbf24', lo: 0.92, hi: 0.97 },
  { zona: 'Z5', nome: 'Repetição (tiros)',    cor: '#fb7185', lo: 0.97, hi: 1.00 },
];

/** Zonas de FC por % da FC máxima (simples — só precisa da FCmáx). */
export function zonasFCPorFCMax(fcMax) {
  return ZONAS_FC_PCT.map(z => {
    const min = Math.round(z.lo * fcMax);
    const max = Math.round(z.hi * fcMax);
    return { zona: z.zona, nome: z.nome, cor: z.cor, min, max, texto: `${min} – ${max} bpm` };
  });
}

/** Zonas de FC por Karvonen (% da reserva de FC) — mais personalizado. */
export function zonasFCKarvonen(fcMax, fcRepouso) {
  const hrr = fcMax - fcRepouso;
  return ZONAS_FC_PCT.map(z => {
    const min = Math.round(fcRepouso + z.lo * hrr);
    const max = Math.round(fcRepouso + z.hi * hrr);
    return { zona: z.zona, nome: z.nome, cor: z.cor, min, max, texto: `${min} – ${max} bpm` };
  });
}

// Zonas de FC por % da LTHR (limiar). Corrida = Friel; ciclismo = Coggan.
const ZONAS_FC = {
  corrida: [
    { zona: 'Z1', nome: 'Recuperação', cor: '#34d399', lo: 0,    hi: 0.85 },
    { zona: 'Z2', nome: 'Endurance',   cor: '#3B82F6', lo: 0.85, hi: 0.89 },
    { zona: 'Z3', nome: 'Tempo',       cor: '#93C5FD', lo: 0.90, hi: 0.94 },
    { zona: 'Z4', nome: 'Limiar',      cor: '#fbbf24', lo: 0.95, hi: 0.99 },
    { zona: 'Z5', nome: 'VO₂máx',      cor: '#fb7185', lo: 1.00, hi: null },
  ],
  ciclismo: [
    { zona: 'Z1', nome: 'Recuperação', cor: '#34d399', lo: 0,    hi: 0.68 },
    { zona: 'Z2', nome: 'Endurance',   cor: '#3B82F6', lo: 0.69, hi: 0.83 },
    { zona: 'Z3', nome: 'Tempo',       cor: '#93C5FD', lo: 0.84, hi: 0.94 },
    { zona: 'Z4', nome: 'Limiar',      cor: '#fbbf24', lo: 0.95, hi: 1.05 },
    { zona: 'Z5', nome: 'VO₂máx',      cor: '#fb7185', lo: 1.06, hi: null },
  ],
};

/**
 * FC média de um teste → FC de LIMIAR (LTHR/FTHR).
 *
 * O protocolo de referência (Friel) é um contrarrelógio de ~30 min: nele a FC
 * média É o limiar. Só que ninguém quer fazer um teste SÓ pra isso — o aluno já
 * faz o teste de pace/FTP, e o relógio dele já mostra a FC média no fim. O que
 * muda é a duração: num esforço curto a FC média fica ACIMA do limiar (o atleta
 * segura acima do limiar por pouco tempo), e num longo fica um pouco abaixo.
 * Esta função corrige por isso, então o personal só digita o que leu no relógio.
 *
 * Fatores = FC média ÷ limiar, por faixa de duração do esforço máximo.
 * É aproximação, não medida — mas erra MUITO menos que %FCmáx genérico, que
 * ignora completamente o teste.
 *
 * @param {number} fcMediaTeste  FC média do teste (bpm)
 * @param {number} duracaoMin    duração do esforço (minutos)
 */
export function limiarPorTeste(fcMediaTeste, duracaoMin) {
  if (!(fcMediaTeste > 0) || !(duracaoMin > 0)) return null;
  let fator;
  if (duracaoMin <= 15)      fator = 1.04;  // ~3 km: bem acima do limiar
  else if (duracaoMin <= 25) fator = 1.02;  // ~5 km / teste de 20 min de FTP
  else if (duracaoMin <= 35) fator = 1.00;  // protocolo de referência (30 min)
  else if (duracaoMin <= 50) fator = 0.99;  // ~10 km
  else                       fator = 0.98;  // acima disso, já abaixo do limiar
  return Math.round(fcMediaTeste / fator);
}

/**
 * FCmáx → FC de LIMIAR estimada. Fallback AUTOMÁTICO: como a FCmáx já vem da
 * idade do cadastro (Tanaka), isso faz as zonas de FC baterem com as de
 * pace/potência sem exigir NENHUM dado novo do personal.
 *
 * O limiar fica perto de 90% da FCmáx na corrida e ~87% no ciclismo — correr
 * usa mais massa muscular e sustenta FC mais alta no mesmo esforço relativo.
 * É estimativa grosseira (varia muito entre pessoas): sempre que houver a FC
 * média de um teste, ela ganha desta.
 */
export function limiarPorFCMax(fcMax, modalidade = 'corrida') {
  if (!(fcMax > 0)) return null;
  return Math.round(fcMax * (modalidade === 'ciclismo' ? 0.87 : 0.90));
}

/** Zonas de FC (bpm) a partir da LTHR. modalidade: 'corrida'|'ciclismo'. */
export function zonasFCPorLTHR(lthr, modalidade = 'corrida') {
  const faixas = ZONAS_FC[modalidade] || ZONAS_FC.corrida;
  return faixas.map(z => {
    const min = Math.round(z.lo * lthr);
    const max = z.hi ? Math.round(z.hi * lthr) : null;
    return {
      zona: z.zona, nome: z.nome, cor: z.cor, min, max,
      // Z1 começa em 0 na tabela, mas "0 – 109 bpm" não existe: ninguém tem
      // batimento zero (achado pelo dono). Faixa aberta embaixo vira "até X".
      texto: !max ? `> ${min} bpm` : (min === 0 ? `até ${max} bpm` : `${min} – ${max} bpm`),
    };
  });
}
