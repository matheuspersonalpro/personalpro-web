/**
 * Modelos de treino PRONTOS, baseados na literatura científica moderna.
 *
 * Servem de ponto de partida no construtor de planilha (E2) — o coach aplica
 * e ajusta. Não substituem o julgamento do treinador.
 *
 * Cada modelo segue o formato de sessão do planner:
 *   { id, tipo, titulo, medida:'tempo'|'distancia', valor, zona, detalhe, ref }
 * valor em unidades-base: metros (distancia) ou segundos (tempo). O `valor`
 * representa o VOLUME PRINCIPAL/qualidade (o que aparece no resumo do dia);
 * o `detalhe` traz a prescrição completa (aquecimento, séries, recuperação).
 *
 * Referências: Daniels (Running Formula), Seiler (treino polarizado 80/20),
 * Coggan (zonas de potência/FTP), Billat (30/30), Rønnestad (30/15),
 * Sweet Spot Training.
 */

import { JANELAS_PROVA, JANELA_PADRAO } from './enduranceTreinos.js';

const min = (m) => Math.round(m * 60);   // minutos → segundos
const km  = (k) => Math.round(k * 1000);  // km → metros

// ── CORRIDA ───────────────────────────────────────────────────────────────────
export const MODELOS_CORRIDA = [
  // Fácil / base (a maior fatia do volume — base do modelo polarizado 80/20)
  { id: 'c_regen30',   tipo: 'regenerativo', titulo: 'Regenerativo 30 min', medida: 'tempo', valor: min(30), zona: 'Z1',
    detalhe: '30 min MUITO leve [Z1], conversando o tempo todo. Recuperação ativa entre treinos fortes.', ref: 'Seiler — fácil de verdade' },
  { id: 'c_rodagem8',  tipo: 'rodagem', titulo: 'Rodagem 8 km', medida: 'distancia', valor: km(8), zona: 'Z2',
    detalhe: '8 km em ritmo confortável [Z2], respiração controlada. É o pão-com-manteiga do volume semanal.', ref: 'Daniels — Easy (E)' },
  { id: 'c_rodprog10', tipo: 'rodagem', titulo: 'Rodagem progressiva 10 km', medida: 'distancia', valor: km(10), zona: 'Z2',
    detalhe: '10 km começando fácil [Z2] e terminando os últimos 2 km mais forte [Z3]. Ensina a acelerar cansado.' },

  // Longão
  { id: 'c_long16',    tipo: 'longao', titulo: 'Longão 16 km', medida: 'distancia', valor: km(16), zona: 'Z2',
    detalhe: '16 km constantes em [Z2]. Desenvolve resistência aeróbica, capilarização e economia de corrida.', ref: 'Daniels — Long (L)' },
  { id: 'c_longprog18',tipo: 'longao', titulo: 'Longão progressivo 18 km', medida: 'distancia', valor: km(18), zona: 'Z3',
    detalhe: '18 km: 12 km em [Z2] + 6 km finais em ritmo de maratona [Z3]. Simula fadiga de prova.' },

  // Limiar / Tempo
  { id: 'c_tempo20',   tipo: 'tempo', titulo: 'Tempo contínuo 20 min', medida: 'tempo', valor: min(20), zona: 'Z4',
    detalhe: 'Aquec. 15 min fácil [Z1-Z2] + 20 min contínuos no limiar, confortavelmente difícil [Z4] + 10 min solto [Z1].', ref: 'Daniels — Threshold (T)' },
  { id: 'c_cruise5x1', tipo: 'tempo', titulo: 'Cruise intervals 5x1 km', medida: 'distancia', valor: km(5), zona: 'Z4',
    detalhe: 'Aquec. 15 min fácil [Z1-Z2] + 5x 1 km em ritmo de limiar [Z4] c/ 1 min de trote + 10 min solto [Z1]. Limiar fracionado.', ref: 'Daniels — Cruise (T)' },

  // VO₂máx / Intervalado (a fatia "dura" do polarizado)
  { id: 'c_vo2_5x1000',tipo: 'intervalado', titulo: 'VO₂máx 5x1000 m', medida: 'distancia', valor: km(5), zona: 'Z5',
    detalhe: 'Aquec. 15 min fácil [Z1-Z2] + 5x 1000 m no ritmo de VO₂máx [Z5] c/ 2-3 min de trote + 10 min solto [Z1].', ref: 'Daniels — Intervals (I)' },
  { id: 'c_vo2_6x800', tipo: 'intervalado', titulo: 'VO₂máx 6x800 m', medida: 'distancia', valor: km(4.8), zona: 'Z5',
    detalhe: 'Aquec. 15 min fácil [Z1-Z2] + 6x 800 m forte [Z5] c/ 400 m de trote + 10 min solto [Z1]. Volume clássico de VO₂máx.' },
  { id: 'c_billat',    tipo: 'intervalado', titulo: '30/30 (Billat) 14x', medida: 'tempo', valor: min(14), zona: 'Z5',
    detalhe: 'Aquec. 15 min fácil [Z1-Z2] + 14x (30 s forte na velocidade aeróbica máxima [Z5] / 30 s de trote). Muito tempo em VO₂máx com menos desgaste.', ref: 'Billat' },

  // Fartlek
  { id: 'c_fartlek',   tipo: 'fartlek', titulo: 'Fartlek 6x (3min/2min)', medida: 'tempo', valor: min(30), zona: 'Z4',
    detalhe: 'Aquec. fácil + 6x (3 min forte [Z4] / 2 min leve [Z2]). Variação de ritmo, ótimo no terreno/rua sem marcação.' },

  // Força específica (subidas)
  { id: 'c_subidas',   tipo: 'subidas', titulo: 'Subidas 8x60 m', medida: 'tempo', valor: min(12), zona: 'Z5',
    detalhe: 'Aquec. fácil + 8 a 10x tiros curtos de subida (~60 m, inclinação 5-8%) forte [Z5], voltando caminhando. Força, potência e economia.', ref: 'Força específica' },

  // Técnica
  { id: 'c_educativos',tipo: 'educativos', titulo: 'Educativos de corrida', medida: 'tempo', valor: min(20), zona: 'Z1',
    detalhe: '2 voltas do circuito: skipping, anfersen, dribles, saltitos + 4x 80 m de passada (strides). Técnica e economia.' },
];

// ── CICLISMO ──────────────────────────────────────────────────────────────────
export const MODELOS_CICLISMO = [
  // Recuperação / base
  { id: 'b_recup45',   tipo: 'recuperacao', titulo: 'Recuperação 45 min', medida: 'tempo', valor: min(45), zona: 'Z1',
    detalhe: '45 min MUITO leve [Z1], cadência alta e suave (90-100 rpm). Recuperação ativa, sem carga.', ref: 'Seiler' },
  { id: 'b_end90',     tipo: 'endurance', titulo: 'Endurance 90 min', medida: 'tempo', valor: min(90), zona: 'Z2',
    detalhe: '90 min constantes em [Z2] (consegue conversar). Base aeróbica — a maior parte do volume.', ref: 'Seiler — polarizado' },
  { id: 'b_endcad',    tipo: 'endurance', titulo: 'Endurance + cadência 75 min', medida: 'tempo', valor: min(75), zona: 'Z2',
    detalhe: '75 min em [Z2] incluindo 3x 10 min em cadência alta (100+ rpm). Eficiência de pedalada.' },

  // Longão
  { id: 'b_long3h',    tipo: 'longao', titulo: 'Longão 3 h', medida: 'tempo', valor: min(180), zona: 'Z2',
    detalhe: '3 h em [Z2], comendo a cada 30-40 min. Resistência de longa duração e metabolismo de gordura.' },

  // Tempo
  { id: 'b_tempo2x20', tipo: 'tempo', titulo: 'Tempo 2x20 min', medida: 'tempo', valor: min(40), zona: 'Z3',
    detalhe: 'Aquec. 15 min + 2x 20 min em tempo [Z3] c/ 5 min [Z1] + volta à calma.' },

  // Sweet Spot (melhor custo-benefício p/ subir FTP)
  { id: 'b_ss_3x12',   tipo: 'sweetspot', titulo: 'Sweet Spot 3x12 min', medida: 'tempo', valor: min(36), zona: 'Z4',
    detalhe: 'Aquec. 15 min fácil + 3x 12 min em Sweet Spot (88-94% do FTP) c/ 5 min em [Z1]. Muito estímulo com fadiga gerenciável.', ref: 'Sweet Spot Training' },
  { id: 'b_ss_4x15',   tipo: 'sweetspot', titulo: 'Sweet Spot 4x15 min', medida: 'tempo', valor: min(60), zona: 'Z4',
    detalhe: 'Aquec. 15 min fácil + 4x 15 min em Sweet Spot (88-94% FTP) c/ 5 min em [Z1] de recuperação. Bloco robusto de limiar.' },

  // Limiar / FTP
  { id: 'b_ftp_2x20',  tipo: 'limiar', titulo: 'FTP 2x20 min', medida: 'tempo', valor: min(40), zona: 'Z4',
    detalhe: 'Aquec. 15 min fácil + 2x 20 min no limiar a 95-100% do FTP [Z4] c/ 8 min em [Z1]. O clássico para elevar o limiar.', ref: 'Coggan' },
  { id: 'b_overunder', tipo: 'limiar', titulo: 'Over-unders 4x9 min', medida: 'tempo', valor: min(36), zona: 'Z4',
    detalhe: '4 blocos de 3x (1 min a 105% FTP / 2 min a 90% FTP) c/ 5 min em [Z1] de recuperação. Tolerância ao lactato.' },

  // VO₂máx
  { id: 'b_vo2_5x3',   tipo: 'vo2', titulo: 'VO₂máx 5x3 min', medida: 'tempo', valor: min(15), zona: 'Z5',
    detalhe: 'Aquec. 15 min fácil + 5x 3 min a 110-120% do FTP [Z5] c/ 3 min em [Z1]. Estímulo direto de VO₂máx.', ref: 'Coggan / Seiler' },
  { id: 'b_ronnestad', tipo: 'vo2', titulo: '30/15 (Rønnestad) 3x13', medida: 'tempo', valor: min(29), zona: 'Z5',
    detalhe: '3 séries de 13x (30 s a ~115% FTP [Z5] / 15 s leve) c/ 5 min entre séries. Acumula muito tempo em VO₂máx.', ref: 'Rønnestad 2015' },

  // Força específica
  { id: 'b_forca',     tipo: 'forca', titulo: 'Força big gear 6x5 min', medida: 'tempo', valor: min(30), zona: 'Z4',
    detalhe: '6x 5 min em marcha pesada, baixa cadência (50-60 rpm), sentado [Z3-Z4]. Força específica de pedalada.' },

  // Neuromuscular
  { id: 'b_sprint',    tipo: 'sprint', titulo: 'Sprints 8x15 s', medida: 'tempo', valor: min(2), zona: 'Z5',
    detalhe: 'Aquec. 15 min fácil + 8x 15 s de sprint máximo c/ 4-5 min de recuperação completa. Potência neuromuscular.' },
];

// ── Modelos extras — longões e treinos de ritmo específico por distância ────────
// Longões 5km (base curta) e 21km/42km (base longa) — Daniels / Pfitzinger
const EXTRAS_CORRIDA = [
  // Longões por nível de distância-alvo
  { id: 'c_long12',    tipo: 'longao', titulo: 'Longão 12 km', medida: 'distancia', valor: km(12), zona: 'Z2',
    detalhe: '12 km constantes em [Z2]. Volume de longão para quem prepara provas de 5km — suficiente para adaptar cadeia posterior sem acúmulo excessivo de fadiga.', ref: 'Daniels — Long (L)' },
  { id: 'c_long20',    tipo: 'longao', titulo: 'Longão 20 km', medida: 'distancia', valor: km(20), zona: 'Z2',
    detalhe: '20 km em [Z2], ritmo confortável. Longão típico da fase build de meia — desenvolve resistência específica para 21km.', ref: 'Daniels / Hudson' },
  { id: 'c_long24',    tipo: 'longao', titulo: 'Longão 24 km', medida: 'distancia', valor: km(24), zona: 'Z2',
    detalhe: '24 km em [Z2]. Longão da fase build maratonístico — aumenta a capacidade de oxidar gordura e depleta glicogênio de forma controlada.', ref: 'Pfitzinger — Medium Long Run' },
  { id: 'c_long28',    tipo: 'longao', titulo: 'Longão 28 km', medida: 'distancia', valor: km(28), zona: 'Z2',
    detalhe: '28 km em [Z2]. Longão de pico maratonístico (semana -4 a -6 da prova). Simula a depleção de glicogênio e treina o sistema nervoso para o esforço prolongado.', ref: 'Pfitzinger "Advanced Marathoning"' },

  // Treinos de ritmo específico — 21km
  { id: 'c_mpace8',    tipo: 'tempo', titulo: 'Ritmo de meia 8 km', medida: 'distancia', valor: km(8), zona: 'Z4',
    detalhe: 'Aquec. 15 min [Z2] + 8 km no ritmo-alvo de 21km, limiar [Z4] + 10 min solto [Z1]. Treino específico de meia — ensina o sistema a manter o pace de prova.', ref: 'Daniels — Threshold / Hudson "Run Faster"' },
  { id: 'c_longprog20',tipo: 'longao', titulo: 'Longão progressivo 20 km', medida: 'distancia', valor: km(20), zona: 'Z3',
    detalhe: '20 km: 12 km em [Z2] + 8 km finais no ritmo de 21km [Z3-Z4]. Combina longão com ritmo específico — ótimo nas semanas de pico de meia maratona.', ref: 'Hudson / Daniels' },

  // Treinos de ritmo específico — 42km
  { id: 'c_mpace14',   tipo: 'tempo', titulo: 'Ritmo de maratona 14 km', medida: 'distancia', valor: km(14), zona: 'Z3',
    detalhe: 'Aquec. 15 min [Z1-Z2] + 14 km no ritmo-alvo de maratona, abaixo do limiar [Z3] + 10 min solto [Z1]. Treino central de Pfitzinger: ensina o corpo a correr no pace de prova enquanto cansado.', ref: 'Pfitzinger "Advanced Marathoning"' },
  { id: 'c_longprog26',tipo: 'longao', titulo: 'Longão progressivo 26 km', medida: 'distancia', valor: km(26), zona: 'Z3',
    detalhe: '26 km: 18 km em [Z2] + 8 km finais no ritmo de maratona [Z3]. Simula o segundo tempo da maratona — a parte mais exigente. Semanas de pico (-5 a -7 da prova).', ref: 'Pfitzinger / Daniels' },
];

// Quebra o texto de detalhe em linhas (estilo TrainingPeaks): cada etapa
// separada por " + " vira uma linha própria — fica muito mais legível.
const fmtDet = (s) => (s ? s.replace(/\s\+\s/g, '\n') : s);
const comDetalheFormatado = (lista) => lista.map(m => ({ ...m, detalhe: fmtDet(m.detalhe) }));

/** Lista de modelos prontos da modalidade (inclui extras de corrida). */
export function modelosProntos(modalidade) {
  if (modalidade === 'ciclismo') return comDetalheFormatado(MODELOS_CICLISMO);
  return comDetalheFormatado([...MODELOS_CORRIDA, ...EXTRAS_CORRIDA]);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUGESTÕES POR FASE — organizadas por distância/tipo de prova
// Base científica: Daniels (5/10/21km), Pfitzinger (42km),
//                  Coggan + Rønnestad (criterium), Coggan Sweet Spot (granfondo),
//                  Seiler polarizado (endurance longa)
// ─────────────────────────────────────────────────────────────────────────────
const SUGESTOES_FASE = {
  corrida: {
    // ── 5km: VO₂máx é o determinante principal (Daniels, Billat 2001) ────────
    '5km': {
      geral: ['c_vo2_6x800', 'c_billat', 'c_tempo20', 'c_rodagem8', 'c_long12', 'c_fartlek'],
      base:  ['c_rodagem8', 'c_long12', 'c_subidas', 'c_educativos', 'c_regen30', 'c_rodprog10'],
      build: ['c_vo2_5x1000', 'c_billat', 'c_tempo20', 'c_fartlek', 'c_rodagem8', 'c_long12'],
      pico:  ['c_billat', 'c_vo2_5x1000', 'c_vo2_6x800', 'c_fartlek', 'c_long12', 'c_rodagem8'],
      taper: ['c_regen30', 'c_rodagem8', 'c_vo2_6x800'],
      prova: ['c_regen30', 'c_educativos'],
    },
    // ── 10km: VO₂máx + limiar equilibrados (Daniels "Running Formula") ────────
    '10km': {
      geral: ['c_rodagem8', 'c_long16', 'c_tempo20', 'c_vo2_6x800', 'c_fartlek', 'c_regen30'],
      base:  ['c_rodagem8', 'c_long16', 'c_subidas', 'c_rodprog10', 'c_educativos', 'c_regen30'],
      build: ['c_tempo20', 'c_cruise5x1', 'c_long16', 'c_vo2_6x800', 'c_fartlek', 'c_rodagem8'],
      pico:  ['c_vo2_5x1000', 'c_cruise5x1', 'c_billat', 'c_long16', 'c_fartlek', 'c_rodagem8'],
      taper: ['c_regen30', 'c_rodagem8', 'c_tempo20'],
      prova: ['c_regen30', 'c_educativos'],
    },
    // ── 21km (Meia Maratona) — mais procurada no Brasil ────────────────────
    '21km': {
      geral: ['c_rodagem8', 'c_long16', 'c_tempo20', 'c_cruise5x1', 'c_rodprog10', 'c_regen30'],
      base:  ['c_rodagem8', 'c_long16', 'c_rodprog10', 'c_subidas', 'c_tempo20', 'c_regen30'],
      build: ['c_cruise5x1', 'c_tempo20', 'c_long20', 'c_fartlek', 'c_rodprog10', 'c_regen30'],
      pico:  ['c_mpace8', 'c_cruise5x1', 'c_longprog20', 'c_tempo20', 'c_rodagem8', 'c_regen30'],
      taper: ['c_regen30', 'c_rodagem8', 'c_cruise5x1', 'c_long16'],
      prova: ['c_regen30', 'c_educativos'],
    },
    // ── 42km (Maratona) — maior volume, taper 3 semanas (Pfitzinger) ──────
    '42km': {
      geral: ['c_rodagem8', 'c_long16', 'c_tempo20', 'c_rodprog10', 'c_longprog18', 'c_regen30'],
      base:  ['c_rodagem8', 'c_long16', 'c_rodprog10', 'c_subidas', 'c_tempo20', 'c_regen30'],
      build: ['c_long24', 'c_tempo20', 'c_rodprog10', 'c_cruise5x1', 'c_rodagem8', 'c_regen30'],
      pico:  ['c_long28', 'c_mpace14', 'c_longprog26', 'c_cruise5x1', 'c_rodagem8', 'c_regen30'],
      taper: ['c_mpace14', 'c_regen30', 'c_rodagem8', 'c_long20'],
      prova: ['c_regen30', 'c_educativos'],
    },
    // Fallback sem distância definida (condicionamento geral — como era antes)
    geral: ['c_rodagem8', 'c_long16', 'c_tempo20', 'c_vo2_6x800', 'c_regen30', 'c_fartlek'],
    base:  ['c_rodagem8', 'c_rodprog10', 'c_long16', 'c_regen30', 'c_subidas', 'c_tempo20'],
    build: ['c_tempo20', 'c_cruise5x1', 'c_longprog18', 'c_vo2_6x800', 'c_fartlek', 'c_rodagem8'],
    pico:  ['c_vo2_5x1000', 'c_cruise5x1', 'c_billat', 'c_fartlek', 'c_rodagem8'],
    taper: ['c_regen30', 'c_rodagem8', 'c_vo2_6x800'],
    prova: ['c_regen30', 'c_rodagem8'],
  },
  ciclismo: {
    // ── Criterium / Prova curta: potência + VO₂máx (Rønnestad 2014, Coggan) ──
    'criterium': {
      geral: ['b_ronnestad', 'b_vo2_5x3', 'b_ss_3x12', 'b_sprint', 'b_end90', 'b_forca'],
      base:  ['b_end90', 'b_forca', 'b_endcad', 'b_long3h', 'b_recup45', 'b_tempo2x20'],
      build: ['b_ss_3x12', 'b_vo2_5x3', 'b_forca', 'b_end90', 'b_ss_4x15', 'b_recup45'],
      pico:  ['b_ronnestad', 'b_vo2_5x3', 'b_ftp_2x20', 'b_sprint', 'b_ss_3x12', 'b_end90'],
      taper: ['b_recup45', 'b_vo2_5x3', 'b_sprint', 'b_end90'],
      prova: ['b_recup45', 'b_sprint'],
    },
    // ── Granfondo / Prova de estrada: Sweet Spot é o rei (Coggan) ────────────
    'granfondo': {
      geral: ['b_end90', 'b_long3h', 'b_ss_3x12', 'b_ftp_2x20', 'b_recup45', 'b_tempo2x20'],
      base:  ['b_end90', 'b_long3h', 'b_endcad', 'b_forca', 'b_recup45', 'b_tempo2x20'],
      build: ['b_ss_3x12', 'b_ss_4x15', 'b_ftp_2x20', 'b_long3h', 'b_end90', 'b_recup45'],
      pico:  ['b_ss_4x15', 'b_overunder', 'b_ftp_2x20', 'b_long3h', 'b_end90', 'b_recup45'],
      taper: ['b_recup45', 'b_end90', 'b_ss_3x12', 'b_tempo2x20'],
      prova: ['b_recup45', 'b_end90'],
    },
    // ── Endurance longa (5h+): Seiler polarizado + fat adaptation ────────────
    'endurance': {
      geral: ['b_end90', 'b_long3h', 'b_ss_3x12', 'b_tempo2x20', 'b_endcad', 'b_recup45'],
      base:  ['b_end90', 'b_long3h', 'b_endcad', 'b_recup45', 'b_forca', 'b_tempo2x20'],
      build: ['b_end90', 'b_long3h', 'b_ss_3x12', 'b_ss_4x15', 'b_recup45', 'b_ftp_2x20'],
      pico:  ['b_long3h', 'b_ss_4x15', 'b_overunder', 'b_end90', 'b_ftp_2x20', 'b_recup45'],
      taper: ['b_recup45', 'b_end90', 'b_ss_3x12', 'b_endcad'],
      prova: ['b_recup45', 'b_end90'],
    },
    // Fallback sem tipo definido
    geral: ['b_end90', 'b_long3h', 'b_ss_3x12', 'b_vo2_5x3', 'b_recup45', 'b_forca', 'b_tempo2x20'],
    base:  ['b_end90', 'b_long3h', 'b_endcad', 'b_forca', 'b_recup45', 'b_tempo2x20'],
    build: ['b_ss_3x12', 'b_ss_4x15', 'b_ftp_2x20', 'b_tempo2x20', 'b_end90', 'b_long3h'],
    pico:  ['b_vo2_5x3', 'b_ftp_2x20', 'b_overunder', 'b_ronnestad', 'b_end90'],
    taper: ['b_recup45', 'b_ss_3x12', 'b_vo2_5x3', 'b_end90'],
    prova: ['b_recup45', 'b_sprint'],
  },
};

/**
 * Modelos recomendados para a fase atual (na ordem de prioridade).
 * @param {string} modalidade  'corrida' | 'ciclismo'
 * @param {string} chaveFase   'geral'|'base'|'build'|'pico'|'taper'|'prova'
 * @param {string|null} distanciaProva  ex: '21km', '42km', 'criterium'
 */
export function modelosSugeridos(modalidade, chaveFase, distanciaProva = null) {
  const sub = SUGESTOES_FASE[modalidade];
  const ids = (distanciaProva && sub?.[distanciaProva]?.[chaveFase])
    ?? sub?.[chaveFase]
    ?? [];
  if (!ids.length) return [];
  const lista = modelosProntos(modalidade);
  return ids.map(id => lista.find(m => m.id === id)).filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// SEMANAS SUGERIDAS por distância/tipo — distribuição polarizada (Seg→Dom)
// 'rest' = descanso | id do modelo = treino daquele dia
// Seg = recuperação/descanso fixo (SEMPRE após o domingo de maior volume)
// ─────────────────────────────────────────────────────────────────────────────
const SEMANA_FASE = {
  corrida: {
    '5km': {
      //          Seg      Ter             Qua             Qui           Sex    Sáb           Dom
      geral: ['rest', 'c_rodagem8',  'c_vo2_6x800',  'c_regen30',  'rest', 'c_long12',   'c_rodagem8'],
      base:  ['rest', 'c_rodagem8',  'c_subidas',    'c_educativos','rest', 'c_long12',   'c_regen30'],
      build: ['rest', 'c_vo2_5x1000','c_rodagem8',   'c_tempo20',  'rest', 'c_long12',   'c_fartlek'],
      pico:  ['rest', 'c_billat',    'c_rodagem8',   'c_vo2_6x800','rest', 'c_long12',   'c_regen30'],
      taper: ['rest', 'c_regen30',   'c_vo2_6x800',  'rest',       'rest', 'c_rodagem8', 'c_regen30'],
      prova: ['rest', 'c_regen30',   'c_educativos', 'rest',       'rest', 'rest',       'c_regen30'],
    },
    '10km': {
      geral: ['rest', 'c_rodagem8',  'c_tempo20',    'c_regen30',  'rest', 'c_long16',    'c_rodagem8'],
      base:  ['rest', 'c_rodagem8',  'c_subidas',    'c_rodprog10','rest', 'c_long16',    'c_regen30'],
      build: ['rest', 'c_tempo20',   'c_rodagem8',   'c_cruise5x1','rest', 'c_longprog18','c_regen30'],
      pico:  ['rest', 'c_vo2_5x1000','c_rodagem8',   'c_cruise5x1','rest', 'c_long16',    'c_regen30'],
      taper: ['rest', 'c_regen30',   'c_tempo20',    'rest',       'rest', 'c_rodagem8',  'c_regen30'],
      prova: ['rest', 'c_regen30',   'c_educativos', 'rest',       'rest', 'rest',        'c_regen30'],
    },
    // ── 21km (Meia Maratona) — mais procurada no Brasil ────────────────────
    '21km': {
      geral: ['rest', 'c_rodagem8',  'c_tempo20',    'c_regen30',   'rest', 'c_long16',    'c_rodprog10'],
      base:  ['rest', 'c_rodagem8',  'c_subidas',    'c_rodprog10', 'rest', 'c_long16',    'c_regen30'],
      build: ['rest', 'c_cruise5x1', 'c_rodagem8',   'c_tempo20',   'rest', 'c_long20',    'c_regen30'],
      pico:  ['rest', 'c_mpace8',    'c_rodagem8',   'c_cruise5x1', 'rest', 'c_longprog20','c_regen30'],
      taper: ['rest', 'c_regen30',   'c_cruise5x1',  'rest',        'rest', 'c_rodagem8',  'c_regen30'],
      prova: ['rest', 'c_regen30',   'c_educativos', 'rest',        'rest', 'rest',        'c_regen30'],
    },
    // ── 42km (Maratona) — maior volume, taper 3 semanas (Pfitzinger) ──────
    '42km': {
      geral: ['rest', 'c_rodagem8',  'c_tempo20',    'c_regen30',   'c_rodprog10', 'c_long16',    'c_regen30'],
      base:  ['rest', 'c_rodagem8',  'c_subidas',    'c_rodprog10', 'c_rodagem8',  'c_long16',    'c_regen30'],
      build: ['rest', 'c_tempo20',   'c_rodprog10',  'c_rodagem8',  'c_cruise5x1', 'c_long24',    'c_regen30'],
      pico:  ['rest', 'c_mpace14',   'c_rodagem8',   'c_cruise5x1', 'c_rodagem8',  'c_long28',    'c_regen30'],
      taper: ['rest', 'c_rodagem8',  'c_mpace14',    'c_regen30',   'rest',        'c_long20',    'c_regen30'],
      prova: ['rest', 'c_regen30',   'c_educativos', 'rest',        'rest',        'rest',        'c_regen30'],
    },
    // Fallback sem distância
    geral: ['rest', 'c_rodagem8', 'c_tempo20',     'c_regen30',  'rest', 'c_long16',     'c_rodagem8'],
    base:  ['rest', 'c_rodagem8', 'c_subidas',     'c_rodprog10','rest', 'c_long16',     'c_regen30'],
    build: ['rest', 'c_vo2_6x800','c_rodagem8',    'c_cruise5x1','rest', 'c_longprog18', 'c_regen30'],
    pico:  ['rest', 'c_vo2_5x1000','c_rodagem8',   'c_cruise5x1','rest', 'c_rodagem8',  'c_long16'],
    taper: ['rest', 'c_rodagem8', 'c_vo2_6x800',   'c_regen30',  'rest', 'c_rodagem8',  'rest'],
    prova: ['rest', 'c_regen30',  'rest',          'c_rodagem8', 'rest', 'c_regen30',   'rest'],
  },
  ciclismo: {
    // ── Criterium: VO₂máx + neuromuscular + base (Rønnestad 2014) ────────────
    'criterium': {
      geral: ['rest', 'b_end90',    'b_vo2_5x3',  'b_recup45', 'rest',     'b_ss_3x12',  'b_end90'],
      base:  ['rest', 'b_end90',    'b_forca',    'b_endcad',  'rest',     'b_long3h',   'b_recup45'],
      build: ['rest', 'b_ss_3x12',  'b_recup45',  'b_vo2_5x3', 'rest',     'b_ss_4x15',  'b_end90'],
      pico:  ['rest', 'b_ronnestad','b_recup45',  'b_ftp_2x20','rest',     'b_sprint',   'b_end90'],
      taper: ['rest', 'b_recup45',  'b_vo2_5x3',  'rest',      'b_recup45','rest',       'b_end90'],
      prova: ['rest', 'b_recup45',  'b_sprint',   'rest',      'rest',     'rest',       'b_recup45'],
    },
    // ── Granfondo: Sweet Spot + FTP + longão (Coggan) ─────────────────────────
    'granfondo': {
      geral: ['rest', 'b_end90',    'b_ss_3x12',  'b_recup45', 'rest',     'b_long3h',   'b_endcad'],
      base:  ['rest', 'b_end90',    'b_forca',    'b_endcad',  'rest',     'b_long3h',   'b_recup45'],
      build: ['rest', 'b_ss_3x12',  'b_end90',    'b_ftp_2x20','b_end90',  'b_long3h',   'b_recup45'],
      pico:  ['rest', 'b_ss_4x15',  'b_end90',    'b_overunder','b_end90', 'b_long3h',   'b_recup45'],
      taper: ['rest', 'b_end90',    'b_ss_3x12',  'b_recup45', 'rest',     'b_end90',    'b_recup45'],
      prova: ['rest', 'b_recup45',  'b_end90',    'rest',      'rest',     'rest',       'b_recup45'],
    },
    // ── Endurance longa: base aeróbica + polarizado (Seiler) ─────────────────
    'endurance': {
      geral: ['rest', 'b_end90',    'b_tempo2x20','b_recup45', 'b_endcad', 'b_long3h',   'b_recup45'],
      base:  ['rest', 'b_end90',    'b_endcad',   'b_recup45', 'b_end90',  'b_long3h',   'b_recup45'],
      build: ['rest', 'b_end90',    'b_ss_3x12',  'b_recup45', 'b_end90',  'b_long3h',   'b_recup45'],
      pico:  ['rest', 'b_ss_4x15',  'b_end90',    'b_overunder','b_end90', 'b_long3h',   'b_recup45'],
      taper: ['rest', 'b_end90',    'b_ss_3x12',  'b_recup45', 'rest',     'b_end90',    'b_recup45'],
      prova: ['rest', 'b_recup45',  'b_end90',    'rest',      'rest',     'rest',       'b_recup45'],
    },
    // Fallback sem tipo
    geral: ['rest', 'b_end90',    'b_ss_3x12',     'b_recup45',  'rest', 'b_long3h',     'b_end90'],
    base:  ['rest', 'b_end90',    'b_forca',       'b_endcad',   'rest', 'b_long3h',     'b_recup45'],
    build: ['rest', 'b_ss_3x12',  'b_end90',       'b_ftp_2x20', 'rest', 'b_long3h',     'b_recup45'],
    pico:  ['rest', 'b_vo2_5x3',  'b_end90',       'b_ftp_2x20', 'rest', 'b_long3h',     'b_recup45'],
    taper: ['rest', 'b_recup45',  'b_ss_3x12',     'b_recup45',  'rest', 'b_vo2_5x3',    'rest'],
    prova: ['rest', 'b_recup45',  'rest',          'b_sprint',   'rest', 'b_recup45',    'rest'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESSÃO SEMANA-A-SEMANA (sobrecarga progressiva + deload + variação)
// Base: Daniels (Running Formula), Pfitzinger (step cycles 3:1), Seiler, Coggan.
//
// O molde fixo de cada fase (SEMANA_FASE) define a ESTRUTURA da semana
// (quais dias têm longão, qualidade, recuperação). A progressão por cima dele:
//   1) faz o LONGÃO crescer conforme aproxima do pico e recuar no taper;
//   2) aplica DELOAD a cada 4 semanas (reduz volume/intensidade — recupera);
//   3) ALTERNA os treinos de qualidade entre semanas (mesmo sistema, estímulo
//      renovado) — evita a sensação de "semana idêntica".
// Vale para CORRIDA (volume em km) e CICLISMO (volume em tempo/horas).
// ─────────────────────────────────────────────────────────────────────────────

// Longão-alvo por modalidade: volume no início do build → volume no pico.
// CORRIDA em km · CICLISMO em minutos (duração do pedal longo).
const LONGAO_ALVO = {
  corrida: {
    '5km':  { min: 8,  pico: 12 },
    '10km': { min: 10, pico: 18 },
    '21km': { min: 12, pico: 22 },
    '42km': { min: 16, pico: 32 },
  },
  ciclismo: {
    'criterium': { min: 90,  pico: 150 }, // 1h30 → 2h30 (potência; longão menos central)
    'granfondo': { min: 120, pico: 270 }, // 2h00 → 4h30 (resistência específica de estrada)
    'endurance': { min: 150, pico: 360 }, // 2h30 → 6h00 (ultradistância — base aeróbica)
  },
};

// Pares de troca de qualidade (mesmo sistema energético — variação de estímulo).
const ALT_QUALIDADE = {
  corrida: {
    c_tempo20:    'c_cruise5x1',  c_cruise5x1:  'c_tempo20',   // limiar contínuo ↔ fracionado
    c_vo2_6x800:  'c_vo2_5x1000', c_vo2_5x1000: 'c_vo2_6x800', // VO₂máx
    c_fartlek:    'c_billat',     c_billat:     'c_fartlek',   // variação Z3-Z5
  },
  ciclismo: {
    b_ss_3x12:   'b_ss_4x15',   b_ss_4x15:   'b_ss_3x12',     // Sweet Spot (volumes)
    b_ftp_2x20:  'b_overunder', b_overunder: 'b_ftp_2x20',    // limiar / FTP
    b_vo2_5x3:   'b_ronnestad', b_ronnestad: 'b_vo2_5x3',     // VO₂máx
  },
};

// Sessão "fácil" da modalidade (p/ suavizar alta intensidade no deload).
const EASY_DELOAD = { corrida: 'c_rodagem8', ciclismo: 'b_end90' };

// Formata minutos → "3h" / "2h30" / "45 min".
function fmtDur(minTotal) {
  if (minTotal < 60) return `${minTotal} min`;
  const h = Math.floor(minTotal / 60);
  const m = minTotal % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

// Gera um modelo de longão "na hora" (corrida em km OU ciclismo em min).
function longaoModelo(modalidade, vol, prog = false) {
  if (modalidade === 'ciclismo') {
    const m = Math.max(60, Math.round(vol / 15) * 15); // arredonda p/ 15 min
    return {
      id: `b_long_${m}`, tipo: 'longao', titulo: `Longão ${fmtDur(m)}`,
      medida: 'tempo', valor: min(m), zona: 'Z2',
      detalhe: `${fmtDur(m)} em [Z2] constante, alimentando a cada 30-40 min. Resistência de longa duração e metabolismo de gordura.`,
      ref: 'Seiler / Coggan',
    };
  }
  const k = Math.max(6, Math.round(vol));
  return {
    id: `c_long_${prog ? 'prog_' : ''}${k}`, tipo: 'longao',
    titulo: `Longão ${prog ? 'progressivo ' : ''}${k} km`,
    medida: 'distancia', valor: km(k), zona: prog ? 'Z3' : 'Z2',
    detalhe: prog
      ? `${k} km progressivos: ~70% em [Z2] + final no ritmo de prova [Z3]. Simula a fadiga da prova.`
      : `${k} km contínuos em [Z2] confortável. Resistência aeróbica, capilarização e economia de corrida.`,
    ref: 'Daniels / Pfitzinger',
  };
}

// Volume do longão de build/pico (km p/ corrida, min p/ ciclismo).
function volumeLongaoDaSemana(modalidade, chaveAlvo, chaveFase, semRest, ehDeload) {
  const alvo = LONGAO_ALVO[modalidade]?.[chaveAlvo];
  if (!alvo) return null;
  const j = JANELAS_PROVA[chaveAlvo] || JANELA_PADRAO;

  let v;
  if (chaveFase === 'base') {
    v = alvo.min;                                     // base: longão estável e modesto
  } else {
    // build/pico: cresce de min→pico ao longo da janela build+pico
    const W = j.build + j.pico;
    const depth = Math.max(0, Math.min(W, (j.taper + W) - semRest));
    const frac = W > 0 ? depth / W : 0;
    v = Math.round(alvo.min + (alvo.pico - alvo.min) * frac);
  }
  if (ehDeload) v = Math.round(v * 0.75);             // deload: -25%
  return v;
}

// Deload = semana de recuperação a cada 4 semanas (fora do taper/prova).
function semanaDeDeload(chaveAlvo, chaveFase, semRest) {
  if (chaveFase === 'taper' || chaveFase === 'prova') return false;
  const j = JANELAS_PROVA[chaveAlvo] || JANELA_PADRAO;
  if (semRest <= j.taper) return false;
  return ((semRest - j.taper) % 4) === 0;
}

// Fator de redução do TAPER: encolhe progressivamente até a prova.
// 1ª semana de taper ~0,70 do volume; última (véspera) ~0,40. (Pfitzinger/Daniels)
function fatorTaper(chaveAlvo, semRest) {
  const t = (JANELAS_PROVA[chaveAlvo] || JANELA_PADRAO).taper;
  if (t <= 1) return 0.45;
  return 0.40 + 0.30 * ((semRest - 1) / (t - 1));
}

// Reescreve o número de volume dentro de um título ("14 km" → "10 km").
function tituloComVolume(titulo, n, unidade) {
  const re = unidade === 'km' ? /(\d+(?:[.,]\d+)?)\s*km/i : /(\d+)\s*min/i;
  return re.test(titulo) ? titulo.replace(re, `${n} ${unidade}`) : `${titulo} (${n} ${unidade})`;
}

// Substitui o nº ANTIGO de volume dentro do detalhe ("20 min" → "24 min"),
// mirando o valor exato p/ não pegar o aquecimento ("15 min") por engano.
function detalheComVolume(detalhe, oldN, n, unidade) {
  if (!detalhe) return detalhe;
  const re = new RegExp(`\\b${oldN}\\s*${unidade}`, 'i');
  return re.test(detalhe) ? detalhe.replace(re, `${n} ${unidade}`) : detalhe;
}

// Escala o volume de uma sessão contínua (sem alterar a estrutura de tiros).
function escalarSessao(m, fator) {
  if (!m.valor) return m;
  const isDist = m.medida === 'distancia';
  const unidade = isDist ? 'km' : 'min';
  const oldN = Math.round(m.valor / (isDist ? 1000 : 60));
  const n = Math.max(isDist ? 3 : 10, Math.round(oldN * fator));
  return {
    ...m,
    id: `${m.id}_t${n}`,
    valor: isDist ? km(n) : min(n),
    titulo: tituloComVolume(m.titulo, n, unidade),
    detalhe: detalheComVolume(m.detalhe, oldN, n, unidade),
  };
}

// Tipos que NÃO são qualidade (volume fácil/recuperação — não progridem como tiro).
const NAO_QUALIDADE = ['rodagem', 'longao', 'regenerativo', 'recuperacao', 'endurance', 'educativos', 'descanso', 'prova'];
const ehQualidade = (tipo) => !NAO_QUALIDADE.includes(tipo);

// Fator de progressão do VOLUME de qualidade ao longo do bloco build/pico.
// Início do build ~0,90 → pico ~1,25 do volume nominal. Deload reduz 20%.
function fatorQualidade(chaveAlvo, chaveFase, semRest, ehDeload) {
  let f;
  if (chaveFase === 'base') {
    f = 1.0;                                   // base: qualidade leve e estável
  } else {
    const j = JANELAS_PROVA[chaveAlvo] || JANELA_PADRAO;
    const W = j.build + j.pico;
    const depth = Math.max(0, Math.min(W, (j.taper + W) - semRest));
    const frac = W > 0 ? depth / W : 0;
    f = 0.90 + 0.35 * frac;
  }
  if (ehDeload) f *= 0.8;
  return f;
}

// Escala o VOLUME de uma sessão de qualidade:
//  • tiros/séries ("Nx...") → ajusta o nº de repetições (mantém a estrutura por tiro);
//  • contínua ("20 min" / "8 km") → ajusta a duração/distância.
function escalarQualidade(m, fator) {
  if (!m || !m.titulo) return m;
  const mx = m.titulo.match(/(\d+)(\s*x)/i);   // primeiro "Nx" do título = nº de tiros/séries
  if (mx) {
    const n0 = parseInt(mx[1], 10);
    const n1 = Math.max(2, Math.round(n0 * fator));
    if (n1 === n0) return m;
    const reps = /(\d+)(\s*x)/i;               // sincroniza o nº de tiros no detalhe também
    return {
      ...m,
      id: `${m.id}_q${n1}`,
      titulo: m.titulo.replace(reps, `${n1}$2`),
      valor: m.valor ? Math.round((m.valor * n1) / n0) : m.valor,
      detalhe: m.detalhe ? m.detalhe.replace(reps, `${n1}$2`) : m.detalhe,
    };
  }
  return escalarSessao(m, fator);              // sem tiros → contínua
}

/**
 * Semana sugerida da fase: array de 7 itens (Seg→Dom).
 * Cada item: { rest: true } (descanso) OU um objeto-modelo completo.
 * @param {string} modalidade  'corrida' | 'ciclismo'
 * @param {string} chaveFase
 * @param {string|null} distanciaProva  ex: '21km', '42km', 'granfondo'
 * @param {number|null} semRest  semanas restantes até a prova (ativa a progressão)
 */
export function semanaSugerida(modalidade, chaveFase, distanciaProva = null, semRest = null) {
  const sub = SEMANA_FASE[modalidade];
  const plano = (distanciaProva && sub?.[distanciaProva]?.[chaveFase])
    ?? sub?.[chaveFase]
    ?? sub?.geral
    ?? [];
  const lista = modelosProntos(modalidade);
  let semana = plano.map(item => {
    if (item === 'rest') return { rest: true };
    return lista.find(m => m.id === item) || { rest: true };
  });

  // Progressão ativa quando há longão-alvo p/ a modalidade+prova e semRest conhecido.
  const temAlvo = LONGAO_ALVO[modalidade]?.[distanciaProva];
  const progAtiva = temAlvo && semRest != null && chaveFase !== 'geral' && chaveFase !== 'prova';
  if (!progAtiva) return semana;

  const altMap = ALT_QUALIDADE[modalidade] || {};
  const easyId = EASY_DELOAD[modalidade];
  const ehTaper = chaveFase === 'taper';
  const fTaper  = ehTaper ? fatorTaper(distanciaProva, semRest) : null;
  const ehDeload = semanaDeDeload(distanciaProva, chaveFase, semRest);
  const alternar = (semRest % 2) === 0; // alterna qualidade em semanas pares
  // Fator de volume da qualidade: no taper reduz (fTaper); no build/pico progride.
  const fQual = ehTaper ? fTaper : fatorQualidade(distanciaProva, chaveFase, semRest, ehDeload);

  semana = semana.map(d => {
    if (d.rest) return d;

    // 1) LONGÃO — sobrecarga progressiva (build/pico) ou redução (taper)
    if (d.tipo === 'longao') {
      if (ehTaper) {
        const div = modalidade === 'ciclismo' ? 60 : 1000;
        const base = d.valor ? d.valor / div : temAlvo.pico;
        return longaoModelo(modalidade, Math.round(base * fTaper));
      }
      const v = volumeLongaoDaSemana(modalidade, distanciaProva, chaveFase, semRest, ehDeload);
      return v ? longaoModelo(modalidade, v, chaveFase === 'pico') : d;
    }

    // 2) DELOAD — alta intensidade (Z5) vira treino fácil (recuperação, sem escalar)
    if (ehDeload && d.zona === 'Z5') {
      return lista.find(m => m.id === easyId) || d;
    }

    // 3) Escolhe o treino do dia (alterna a qualidade em semanas pares)
    let model = (alternar && altMap[d.id]) ? (lista.find(m => m.id === altMap[d.id]) || d) : d;

    // 4) PROGRESSÃO DE VOLUME da qualidade (tiros crescem/encolhem; contínuo idem)
    if (ehQualidade(model.tipo)) {
      model = escalarQualidade(model, fQual);
    }
    return model;
  });

  return semana;
}
