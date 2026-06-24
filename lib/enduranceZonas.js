/** Motor de cálculo de zonas de treino — portado do mobile (utils/enduranceZonas.js). */

export function formatarPace(segPorKm) {
  if (!isFinite(segPorKm) || segPorKm <= 0) return '—';
  let m = Math.floor(segPorKm / 60);
  let s = Math.round(segPorKm % 60);
  if (s === 60) { m += 1; s = 0; }
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

function velocidadeParaPace(vMetrosPorMin) {
  return 60000 / vMetrosPorMin;
}

export function calcularVDOT(distanciaMetros, tempoSegundos) {
  const t = tempoSegundos / 60;
  const v = distanciaMetros / t;
  const vo2 = -4.60 + 0.182258 * v + 0.000104 * v * v;
  const pMax = 0.8
    + 0.1894393 * Math.exp(-0.012778 * t)
    + 0.2989558 * Math.exp(-0.1932605 * t);
  return vo2 / pMax;
}

function velocidadeParaVO2(vo2Alvo) {
  const a = 0.000104, b = 0.182258, c = -(4.60 + vo2Alvo);
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

const ZONAS_CORRIDA = [
  { zona: 'Z1', nome: 'Recuperação / Fácil', cor: '#34d399', lo: 0.59, hi: 0.74 },
  { zona: 'Z2', nome: 'Endurance (rodagem)',  cor: '#3B82F6', lo: 0.74, hi: 0.84 },
  { zona: 'Z3', nome: 'Maratona / Tempo',     cor: '#93C5FD', lo: 0.84, hi: 0.88 },
  { zona: 'Z4', nome: 'Limiar',               cor: '#fbbf24', lo: 0.88, hi: 0.95 },
  { zona: 'Z5', nome: 'VO₂máx (intervalado)', cor: '#fb7185', lo: 0.95, hi: 1.00 },
];

export function zonasCorridaPorVDOT(vdot) {
  return ZONAS_CORRIDA.map(z => {
    const vLento  = velocidadeParaVO2(z.lo * vdot);
    const vRapido = velocidadeParaVO2(z.hi * vdot);
    const paceMax = velocidadeParaPace(vLento);
    const paceMin = velocidadeParaPace(vRapido);
    return { zona: z.zona, nome: z.nome, cor: z.cor, paceMin, paceMax,
      texto: `${formatarPace(paceMin)} – ${formatarPace(paceMax)}` };
  });
}

export function calcularFTP(potenciaMedia20min) {
  return Math.round(potenciaMedia20min * 0.95);
}

export function calcularFTPRampa(melhorPotencia1min) {
  return Math.round(melhorPotencia1min * 0.75);
}

const ZONAS_POTENCIA = [
  { zona: 'Z1', nome: 'Recuperação',   cor: '#34d399', lo: 0,    hi: 0.55 },
  { zona: 'Z2', nome: 'Endurance',     cor: '#3B82F6', lo: 0.56, hi: 0.75 },
  { zona: 'Z3', nome: 'Tempo',         cor: '#93C5FD', lo: 0.76, hi: 0.90 },
  { zona: 'Z4', nome: 'Limiar',        cor: '#fbbf24', lo: 0.91, hi: 1.05 },
  { zona: 'Z5', nome: 'VO₂máx',        cor: '#fb923c', lo: 1.06, hi: 1.20 },
  { zona: 'Z6', nome: 'Anaeróbico',    cor: '#fb7185', lo: 1.21, hi: 1.50 },
  { zona: 'Z7', nome: 'Neuromuscular', cor: '#f472b6', lo: 1.51, hi: null },
];

export function zonasCiclismoPorFTP(ftp) {
  return ZONAS_POTENCIA.map(z => {
    const min = Math.round(z.lo * ftp);
    const max = z.hi ? Math.round(z.hi * ftp) : null;
    return { zona: z.zona, nome: z.nome, cor: z.cor, min, max,
      texto: max ? `${min} – ${max} W` : `> ${min} W` };
  });
}

export function fcMaxTanaka(idade) {
  return Math.round(208 - 0.7 * idade);
}

const ZONAS_FC_PCT = [
  { zona: 'Z1', nome: 'Recuperação',     cor: '#34d399', lo: 0.50, hi: 0.60 },
  { zona: 'Z2', nome: 'Aeróbico (base)', cor: '#3B82F6', lo: 0.60, hi: 0.70 },
  { zona: 'Z3', nome: 'Tempo',           cor: '#93C5FD', lo: 0.70, hi: 0.80 },
  { zona: 'Z4', nome: 'Limiar',          cor: '#fbbf24', lo: 0.80, hi: 0.90 },
  { zona: 'Z5', nome: 'VO₂máx',          cor: '#fb7185', lo: 0.90, hi: 1.00 },
];

export function zonasFCPorFCMax(fcMax) {
  return ZONAS_FC_PCT.map(z => {
    const min = Math.round(z.lo * fcMax);
    const max = Math.round(z.hi * fcMax);
    return { zona: z.zona, nome: z.nome, cor: z.cor, min, max, texto: `${min} – ${max} bpm` };
  });
}

export function zonasFCKarvonen(fcMax, fcRepouso) {
  const hrr = fcMax - fcRepouso;
  return ZONAS_FC_PCT.map(z => {
    const min = Math.round(fcRepouso + z.lo * hrr);
    const max = Math.round(fcRepouso + z.hi * hrr);
    return { zona: z.zona, nome: z.nome, cor: z.cor, min, max, texto: `${min} – ${max} bpm` };
  });
}
