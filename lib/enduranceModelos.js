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

import { JANELAS_PROVA, JANELA_PADRAO, resumoVolume, formatarDuracao } from './enduranceTreinos';
import { calcularVDOT, calcularFTP, calcularFTPRampa, nivelPorVDOT, nivelPorFTP } from './enduranceZonas';

// Fator de escala do VOLUME por nível de condicionamento (VDOT/FTP). Os alvos
// de LONGAO_ALVO são calibrados pro atleta intermediário/avançado; o iniciante
// recebe uma fração (não aguenta — e não deve — o longão de um avançado).
// Progressão conservadora, alinhada à "regra dos 10%" (aumentos graduais).
export const FATOR_NIVEL = { iniciante: 0.55, intermediario: 0.8, avancado: 1.0 };
// Fator do PICO do longão (perto da prova). O pico é ditado pela PROVA, não pelo
// nível: quem vai correr a maratona PRECISA chegar nos ~35km, iniciante ou não —
// senão não termina. O nível manda só no COMEÇO (min, via FATOR_NIVEL) e no TEMPO
// de rampa (o iniciante começa curto e leva mais semanas pra chegar). Por isso o
// pico quase converge — só um fio de folga pro iniciante/intermediário.
export const FATOR_NIVEL_PICO = { iniciante: 0.95, intermediario: 0.98, avancado: 1.0 };

/**
 * Deriva o nível do aluno (iniciante|intermediario|avancado) a partir do
 * teste salvo no enduranceProfile — recomputa VDOT (corrida) ou FTP (ciclismo).
 * Sem teste, assume 'intermediario' (neutro). pesoKg é opcional (FTP em W/kg).
 */
export function nivelDoPerfil(modalidade, perfil, pesoKg = null) {
  const dt = perfil?.dadosTeste;
  if (!dt) return 'intermediario';
  if (modalidade === 'ciclismo') {
    const pot = parseInt(dt.potencia, 10);
    if (!(pot > 0)) return 'intermediario';
    const ftp = dt.testeCic === 'rampa' ? calcularFTPRampa(pot) : calcularFTP(pot);
    // Peso: prefere o capturado no próprio teste (mais fiel à data do teste);
    // cai no peso do cadastro passado por parâmetro; senão FTP absoluto.
    const pesoTeste = parseFloat(dt.peso);
    const peso = pesoTeste > 0 ? pesoTeste : pesoKg;
    return nivelPorFTP(ftp, peso);
  }
  const tempoSeg = (parseInt(dt.min, 10) || 0) * 60 + (parseInt(dt.seg, 10) || 0);
  if (!(dt.distanciaM > 0) || !(tempoSeg > 0)) return 'intermediario';
  return nivelPorVDOT(calcularVDOT(dt.distanciaM, tempoSeg));
}

const min = (m) => Math.round(m * 60);   // minutos → segundos
const km  = (k) => Math.round(k * 1000);  // km → metros

// ── ESTRUTURA EM BLOCOS DOS MODELOS PRONTOS ──────────────────────────────────
//
// O `detalhe` de cada modelo já descrevia a sessão ("Aquec. 15 min + 5x 1 km
// [Z4] c/ 1 min de trote + 10 min solto"), mas como PROSA. Quem montava o treino
// à mão no Planner ganhava blocos de verdade — com pace, km/h de esteira e FC
// calculados por bloco —, e quem usava um modelo pronto recebia um parágrafo.
// O aluno tinha que interpretar o texto (achado pelo dono: "tem ficado muito
// confuso para os alunos").
//
// Aqui cada modelo com estrutura interna vira blocos de verdade. Modelo
// contínuo (regenerativo, rodagem, longão constante) NÃO entra: `blocosDaSessao`
// já o trata como bloco único, e listar um bloco só seria ruído.
//
// Fica separado da lista de modelos de propósito: a lista continua legível, e
// dá pra conferir a estrutura de um treino sem caçar no meio do texto.
const aquec  = (m, zona = 'Z1', obs = null) => ({ bloco: 'aquecimento',    medida: 'tempo', valor: min(m), zona, ...(obs ? { obs } : {}) });
const solto  = (m, zona = 'Z1') => ({ bloco: 'desaquecimento', medida: 'tempo', valor: min(m), zona });
const contT  = (m, zona)        => ({ bloco: 'continuo',       medida: 'tempo', valor: min(m), zona });
const contD  = (k, zona)        => ({ bloco: 'continuo',       medida: 'distancia', valor: km(k), zona });
const recT   = (m, zona = 'Z1') => ({ medida: 'tempo',     valor: min(m), zona });
const recD   = (mt, zona = 'Z1') => ({ medida: 'distancia', valor: mt,     zona });
// Séries por tempo e por distância. `rec` = o que fazer ENTRE os tiros.
const serieT = (n, m,  zona, rec = null, obs = null) => ({ bloco: 'intervalo', repeticoes: n, medida: 'tempo',     valor: min(m), zona, recuperacao: rec, ...(obs ? { obs } : {}) });
const serieD = (n, mt, zona, rec = null, obs = null) => ({ bloco: 'intervalo', repeticoes: n, medida: 'distancia', valor: mt,     zona, recuperacao: rec, ...(obs ? { obs } : {}) });
// Pausa ENTRE séries (não entre tiros) — vira um bloco de recuperação próprio.
const recBloco = (m, zona = 'Z1') => ({ bloco: 'recuperacao', medida: 'tempo', valor: min(m), zona });

const ESTRUTURAS = {
  // ── CORRIDA ──
  c_rodprog10:  [contD(8, 'Z2'), contD(2, 'Z3')],
  c_longprog18: [contD(12, 'Z2'), contD(6, 'Z3')],
  c_tempo20:    [aquec(15, 'Z2'), contT(20, 'Z4'), solto(10)],
  c_cruise5x1:  [aquec(15, 'Z2'), serieD(5, km(1), 'Z4', recT(1)), solto(10)],
  c_vo2_5x1000: [aquec(15, 'Z2'), serieD(5, km(1), 'Z5', recT(3)), solto(10)],
  c_vo2_6x800:  [aquec(15, 'Z2'), serieD(6, 800, 'Z5', recD(400)), solto(10)],
  c_billat:     [aquec(15, 'Z2'), serieT(14, 0.5, 'Z5', recT(0.5)), solto(10)],
  c_fartlek:    [aquec(10, 'Z2'), serieT(6, 3, 'Z4', recT(2, 'Z2')), solto(5)],
  c_subidas:    [aquec(15, 'Z2'), serieD(8, 60, 'Z5', recT(2), 'Subida de 5-8%; volta caminhando'), solto(10)],
  c_educativos: [aquec(10, 'Z1', 'Circuito: skipping, anfersen, dribles, saltitos'), serieD(4, 80, 'Z5', recT(1.5), 'Passada (stride) — solto e rápido, sem forçar'), solto(5)],
  c_mpace8:     [aquec(15, 'Z2'), contD(8, 'Z4'), solto(10)],
  c_longprog20: [contD(12, 'Z2'), contD(8, 'Z4')],
  c_mpace14:    [aquec(15, 'Z2'), contD(14, 'Z3'), solto(10)],
  c_longprog26: [contD(18, 'Z2'), contD(8, 'Z3')],

  // ── CICLISMO ──
  // 15 aquec + 3x10 + 3x5 de intervalo + 15 finais = os 75 min do modelo.
  b_endcad:     [aquec(15, 'Z2'), serieT(3, 10, 'Z2', recT(5, 'Z2'), 'Cadência alta: 100+ rpm'), contT(15, 'Z2')],
  b_tempo2x20:  [aquec(15, 'Z2'), serieT(2, 20, 'Z3', recT(5, 'Z2')), solto(10, 'Z2')],
  b_ss_3x12:    [aquec(15, 'Z2'), serieT(3, 12, 'Z3', recT(5, 'Z2'), 'Sweet Spot: 88-94% do FTP'), solto(10, 'Z2')],
  b_ss_4x15:    [aquec(15, 'Z2'), serieT(4, 15, 'Z3', recT(5, 'Z2'), 'Sweet Spot: 88-94% do FTP'), solto(10, 'Z2')],
  b_ftp_2x20:   [aquec(15, 'Z2'), serieT(2, 20, 'Z4', recT(8, 'Z2')), solto(10, 'Z2')],
  b_thr_7x4:    [aquec(10, 'Z2'), serieT(7, 4, 'Z4', recT(2, 'Z2')), solto(5, 'Z2')],
  b_vo2_5x3:    [aquec(15, 'Z2'), serieT(5, 3, 'Z5', recT(3, 'Z2')), solto(10, 'Z2')],
  b_forca:      [aquec(15, 'Z2'), serieT(6, 5, 'Z4', recT(3, 'Z2'), 'Marcha pesada, 50-60 rpm, sentado'), solto(10, 'Z2')],
  // Sprint de 15 s e Z7 (neuromuscular, >150% do FTP). Estava como Z5
  // (106-120% do FTP): o bloco mandava "sprint máximo" e o alvo mostrava a
  // potencia de Z5 — o aluno lia "dá tudo" e via 123-139 W (achado pelo dono).
  // Capacidade anaerobica: 1 min a 125-140% do FTP. Faixa que o app nao tinha —
  // tinha VO2max (Z5) e sprint (Z7), e nada no meio. E o esforco que decide um
  // criterium: fechar buraco, responder ataque, sair de curva.
  b_anaero_6x1: [aquec(15, 'Z2'), serieT(6, 1, 'Z6', recT(3, 'Z2'), 'Forte de verdade — 125-140% do FTP, sem sprintar'), solto(10, 'Z2')],
  b_sprint:     [aquec(15, 'Z2'), serieT(8, 0.25, 'Z7', recT(4.5, 'Z1'), 'Sprint máximo; recuperação COMPLETA entre tiros'), solto(10, 'Z2')],
  // Séries ANINHADAS (blocos de blocos) não cabem no formato de 1 nível: viram
  // séries repetidas, com a pausa entre blocos como recuperação da última.
  b_overunder:  [aquec(15, 'Z2'), serieT(3, 1, 'Z5', recT(2, 'Z3')), recBloco(5, 'Z2'),
                                  serieT(3, 1, 'Z5', recT(2, 'Z3')), recBloco(5, 'Z2'),
                                  serieT(3, 1, 'Z5', recT(2, 'Z3')), recBloco(5, 'Z2'),
                                  serieT(3, 1, 'Z5', recT(2, 'Z3')), solto(10, 'Z2')],
  b_ronnestad:  [aquec(15, 'Z2'), serieT(13, 0.5, 'Z5', recT(0.25, 'Z2')), recBloco(5, 'Z2'),
                                  serieT(13, 0.5, 'Z5', recT(0.25, 'Z2')), recBloco(5, 'Z2'),
                                  serieT(13, 0.5, 'Z5', recT(0.25, 'Z2')), solto(10, 'Z2')],
};

// ── CORRIDA ───────────────────────────────────────────────────────────────────
export const MODELOS_CORRIDA = [
  // Fácil / base (a maior fatia do volume — base do modelo polarizado 80/20)
  { id: 'c_regen30',   tipo: 'regenerativo', titulo: 'Regenerativo 30 min', medida: 'tempo', valor: min(30), zona: 'Z1',
    detalhe: '30 min MUITO leve [Z1].', ref: 'Seiler — fácil de verdade' },
  { id: 'c_rodagem8',  tipo: 'rodagem', titulo: 'Rodagem 8 km', medida: 'distancia', valor: km(8), zona: 'Z2',
    detalhe: '8 km em ritmo confortável [Z2].', ref: 'Daniels — Easy (E)' },
  { id: 'c_rodprog10', tipo: 'rodagem', titulo: 'Rodagem progressiva 10 km', medida: 'distancia', valor: km(10), zona: 'Z2',
    detalhe: '10 km: 8 km em [Z2] + 2 km finais em [Z3].' },

  // Longão
  { id: 'c_long16',    tipo: 'longao', titulo: 'Longão 16 km', medida: 'distancia', valor: km(16), zona: 'Z2',
    detalhe: '16 km constantes em [Z2].', ref: 'Daniels — Long (L)' },
  { id: 'c_longprog18',tipo: 'longao', titulo: 'Longão progressivo 18 km', medida: 'distancia', valor: km(18), zona: 'Z3',
    detalhe: '18 km: 12 km em [Z2] + 6 km finais em ritmo de maratona [Z3].' },

  // Limiar / Tempo
  { id: 'c_tempo20',   tipo: 'tempo', titulo: 'Tempo contínuo 20 min', medida: 'tempo', valor: min(20), zona: 'Z4',
    detalhe: 'Aquec. 15 min fácil [Z1-Z2] + 20 min contínuos no limiar [Z4] + 10 min solto [Z1].', ref: 'Daniels — Threshold (T)' },
  { id: 'c_cruise5x1', tipo: 'tempo', titulo: 'Cruise intervals 5x1 km', medida: 'distancia', valor: km(5), zona: 'Z4',
    detalhe: 'Aquec. 15 min fácil [Z1-Z2] + 5x 1 km em ritmo de limiar [Z4] c/ 1 min de trote + 10 min solto [Z1].', ref: 'Daniels — Cruise (T)' },

  // VO₂máx / Intervalado (a fatia "dura" do polarizado)
  { id: 'c_vo2_5x1000',tipo: 'intervalado', titulo: 'VO₂máx 5x1000 m', medida: 'distancia', valor: km(5), zona: 'Z5',
    detalhe: 'Aquec. 15 min fácil [Z1-Z2] + 5x 1000 m no ritmo de VO₂máx [Z5] c/ 2-3 min de trote + 10 min solto [Z1].', ref: 'Daniels — Intervals (I)' },
  { id: 'c_vo2_6x800', tipo: 'intervalado', titulo: 'VO₂máx 6x800 m', medida: 'distancia', valor: km(4.8), zona: 'Z5',
    detalhe: 'Aquec. 15 min fácil [Z1-Z2] + 6x 800 m forte [Z5] c/ 400 m de trote + 10 min solto [Z1].' },
  { id: 'c_billat',    tipo: 'intervalado', titulo: '30/30 (Billat) 14x', medida: 'tempo', valor: min(14), zona: 'Z5',
    detalhe: 'Aquec. 15 min fácil [Z1-Z2] + 14x (30 s forte na velocidade aeróbica máxima [Z5] / 30 s de trote).', ref: 'Billat' },

  // Fartlek
  { id: 'c_fartlek',   tipo: 'fartlek', titulo: 'Fartlek 6x (3min/2min)', medida: 'tempo', valor: min(30), zona: 'Z4',
    detalhe: 'Aquec. 10 min [Z2] + 6x (3 min forte [Z4] / 2 min leve [Z2]) + 5 min solto [Z1].' },

  // Força específica (subidas)
  { id: 'c_subidas',   tipo: 'subidas', titulo: 'Subidas 8x60 m', medida: 'tempo', valor: min(12), zona: 'Z5',
    detalhe: 'Aquec. 15 min [Z2] + 8x tiros curtos de subida (~60 m, inclinação 5-8%) forte [Z5], voltando caminhando (~2 min) + 10 min solto [Z1].', ref: 'Força específica' },

  // Técnica
  { id: 'c_educativos',tipo: 'educativos', titulo: 'Educativos de corrida', medida: 'tempo', valor: min(20), zona: 'Z1',
    detalhe: 'Aquec. 10 min [Z1] com o circuito de educativos (skipping, anfersen, dribles, saltitos) + 4x 80 m de passada (strides) em ritmo de repetição [Z5] + 5 min solto [Z1].' },
];

// ── CICLISMO ──────────────────────────────────────────────────────────────────
export const MODELOS_CICLISMO = [
  // Recuperação / base
  { id: 'b_recup45',   tipo: 'recuperacao', titulo: 'Recuperação 45 min', medida: 'tempo', valor: min(45), zona: 'Z1',
    detalhe: '45 min MUITO leve [Z1], cadência alta e suave (90-100 rpm).', ref: 'Seiler' },
  { id: 'b_end90',     tipo: 'endurance', titulo: 'Endurance 1h30', medida: 'tempo', valor: min(90), zona: 'Z2',
    detalhe: '90 min constantes em [Z2].', ref: 'Seiler — polarizado' },
  { id: 'b_endcad',    tipo: 'endurance', titulo: 'Endurance + cadência 1h15', medida: 'tempo', valor: min(75), zona: 'Z2',
    detalhe: 'Aquec. 15 min [Z2] + 3x 10 min em cadência alta (100+ rpm) [Z2] c/ 5 min normais entre eles + 30 min finais em [Z2].' },

  // Longão
  { id: 'b_long3h',    tipo: 'longao', titulo: 'Longão 3 h', medida: 'tempo', valor: min(180), zona: 'Z2',
    detalhe: '3 h em [Z2].' },

  // Tempo
  { id: 'b_tempo2x20', tipo: 'tempo', titulo: 'Tempo 2x20 min', medida: 'tempo', valor: min(40), zona: 'Z3',
    detalhe: 'Aquec. 15 min [Z2] + 2x 20 min em tempo [Z3] c/ 5 min soltos [Z2] + 10 min de volta à calma [Z2].' },

  // Sweet Spot (melhor custo-benefício p/ subir FTP)
  { id: 'b_ss_3x12',   tipo: 'sweetspot', titulo: 'Sweet Spot 3x12 min', medida: 'tempo', valor: min(36), zona: 'Z3',
    detalhe: 'Aquec. 15 min [Z2] + 3x 12 min em Sweet Spot (88-94% do FTP) [Z3 alto] c/ 5 min soltos [Z2] + 10 min de volta à calma [Z2].', ref: 'Sweet Spot Training' },
  { id: 'b_ss_4x15',   tipo: 'sweetspot', titulo: 'Sweet Spot 4x15 min', medida: 'tempo', valor: min(60), zona: 'Z3',
    detalhe: 'Aquec. 15 min [Z2] + 4x 15 min em Sweet Spot (88-94% FTP) [Z3 alto] c/ 5 min soltos [Z2] + 10 min de volta à calma [Z2].' },

  // Limiar / FTP
  { id: 'b_ftp_2x20',  tipo: 'limiar', titulo: 'FTP 2x20 min', medida: 'tempo', valor: min(40), zona: 'Z4',
    detalhe: 'Aquec. 15 min [Z2] + 2x 20 min no limiar a 95-100% do FTP [Z4] c/ 8 min soltos [Z2] + 10 min de volta à calma [Z2].', ref: 'Coggan' },
  { id: 'b_thr_7x4',   tipo: 'limiar', titulo: 'Limiar 7x4 min', medida: 'tempo', valor: min(28), zona: 'Z4',
    detalhe: 'Aquec. 10 min [Z2] + 7x 4 min no limiar [Z4] c/ 2 min soltos [Z2] + 5 min de volta à calma [Z2].', ref: 'Estrutura clássica de treinador (TrainingPeaks)' },
  { id: 'b_overunder', tipo: 'limiar', titulo: 'Over-unders 4x9 min', medida: 'tempo', valor: min(36), zona: 'Z4',
    detalhe: 'Aquec. 15 min [Z2] + 4 blocos de 3x (1 min a 105% FTP [Z5] / 2 min a 90% FTP [Z3]) c/ 5 min soltos [Z2] entre blocos + 10 min de volta à calma [Z2].' },

  // VO₂máx
  { id: 'b_vo2_5x3',   tipo: 'vo2', titulo: 'VO₂máx 5x3 min', medida: 'tempo', valor: min(15), zona: 'Z5',
    detalhe: 'Aquec. 15 min [Z2] + 5x 3 min a 110-120% do FTP [Z5] c/ 3 min soltos [Z2] + 10 min de volta à calma [Z2].', ref: 'Coggan / Seiler' },
  { id: 'b_ronnestad', tipo: 'vo2', titulo: '30/15 (Rønnestad) 3x13', medida: 'tempo', valor: min(29), zona: 'Z5',
    detalhe: 'Aquec. 15 min [Z2] + 3 séries de 13x (30 s a ~115% FTP [Z5] / 15 s leve [Z2]) c/ 5 min soltos [Z2] entre séries + 10 min de volta à calma [Z2].', ref: 'Rønnestad 2015' },

  // Força específica
  { id: 'b_forca',     tipo: 'forca', titulo: 'Força big gear 6x5 min', medida: 'tempo', valor: min(30), zona: 'Z4',
    detalhe: 'Aquec. 15 min [Z2] + 6x 5 min em marcha pesada, baixa cadência (50-60 rpm), sentado [Z4] c/ 3 min soltos [Z2] + 10 min de volta à calma [Z2].' },

  // Neuromuscular
  { id: 'b_anaero_6x1',tipo: 'anaerobico', titulo: 'Anaeróbico 6x1 min', medida: 'tempo', valor: min(6), zona: 'Z6',
    detalhe: 'Aquec. 15 min [Z2] + 6x 1 min a 125-140% do FTP [Z6] c/ 3 min soltos [Z2] + 10 min de volta à calma [Z2].', ref: 'Coggan — Anaerobic Capacity' },
  { id: 'b_sprint',    tipo: 'sprint', titulo: 'Sprints 8x15 s', medida: 'tempo', valor: min(2), zona: 'Z7',
    detalhe: 'Aquec. 15 min [Z2] + 8x 15 s de sprint máximo [Z7] c/ 4-5 min de recuperação COMPLETA, quase parado [Z1] + 10 min de volta à calma [Z2].' },
];

// ── Modelos extras — longões e treinos de ritmo específico por distância ────────
// Longões 5km (base curta) e 21km/42km (base longa) — Daniels / Pfitzinger
const EXTRAS_CORRIDA = [
  // Longões por nível de distância-alvo
  { id: 'c_long12',    tipo: 'longao', titulo: 'Longão 12 km', medida: 'distancia', valor: km(12), zona: 'Z2',
    detalhe: '12 km constantes em [Z2].', ref: 'Daniels — Long (L)' },
  { id: 'c_long20',    tipo: 'longao', titulo: 'Longão 20 km', medida: 'distancia', valor: km(20), zona: 'Z2',
    detalhe: '20 km em [Z2], ritmo confortável.', ref: 'Daniels / Hudson' },
  { id: 'c_long24',    tipo: 'longao', titulo: 'Longão 24 km', medida: 'distancia', valor: km(24), zona: 'Z2',
    detalhe: '24 km em [Z2].', ref: 'Pfitzinger — Medium Long Run' },
  { id: 'c_long28',    tipo: 'longao', titulo: 'Longão 28 km', medida: 'distancia', valor: km(28), zona: 'Z2',
    detalhe: '28 km em [Z2].', ref: 'Pfitzinger "Advanced Marathoning"' },

  // Treinos de ritmo específico — 21km
  { id: 'c_mpace8',    tipo: 'tempo', titulo: 'Ritmo de meia 8 km', medida: 'distancia', valor: km(8), zona: 'Z4',
    detalhe: 'Aquec. 15 min [Z2] + 8 km no ritmo-alvo de 21km [Z4] + 10 min solto [Z1].', ref: 'Daniels — Threshold / Hudson "Run Faster"' },
  { id: 'c_longprog20',tipo: 'longao', titulo: 'Longão progressivo 20 km', medida: 'distancia', valor: km(20), zona: 'Z3',
    detalhe: '20 km: 12 km em [Z2] + 8 km finais no ritmo de 21km [Z3-Z4].', ref: 'Hudson / Daniels' },

  // Treinos de ritmo específico — 42km
  { id: 'c_mpace14',   tipo: 'tempo', titulo: 'Ritmo de maratona 14 km', medida: 'distancia', valor: km(14), zona: 'Z3',
    detalhe: 'Aquec. 15 min [Z1-Z2] + 14 km no ritmo-alvo de maratona [Z3] + 10 min solto [Z1].', ref: 'Pfitzinger "Advanced Marathoning"' },
  { id: 'c_longprog26',tipo: 'longao', titulo: 'Longão progressivo 26 km', medida: 'distancia', valor: km(26), zona: 'Z3',
    detalhe: '26 km: 18 km em [Z2] + 8 km finais no ritmo de maratona [Z3].', ref: 'Pfitzinger / Daniels' },
];

// Quebra o texto de detalhe em linhas (estilo TrainingPeaks): cada etapa
// separada por " + " vira uma linha própria — fica muito mais legível.
const fmtDet = (s) => (s ? s.replace(/\s\+\s/g, '\n') : s);
// Anexa a estrutura em blocos junto com a formatação do detalhe: TODO consumidor
// de modelo passa por `modelosProntos` (inclusive a sugestão de semana e a
// geração automática), então ligar aqui cobre os três caminhos de uma vez.
const comDetalheFormatado = (lista) => lista.map(m => ({
  ...m,
  detalhe: fmtDet(m.detalhe),
  ...(ESTRUTURAS[m.id] ? { estrutura: ESTRUTURAS[m.id] } : {}),
}));

/** Lista de modelos prontos da modalidade (inclui extras de corrida). */
export function modelosProntos(modalidade) {
  if (modalidade === 'ciclismo') return comDetalheFormatado(MODELOS_CICLISMO);
  return comDetalheFormatado([...MODELOS_CORRIDA, ...EXTRAS_CORRIDA]);
}

// As dicas de "por que este treino serve" saíram daqui em 01/09/2026.
//
// Elas explicavam jargão (Sweet Spot, over-under, FTP) a quem vem da
// musculação, numa caixa amarela embaixo de cada modelo. O dono olhou a tela
// cheia delas e cortou: "essas dicas nada a ver". É a mesma regra que já
// valeu na tela do aluno — texto didático no meio da prescrição tem cara de
// dev amador, e quem usa este app é treinador formado.
//
// O texto está no histórico do git, se um dia servir em outro lugar.

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
    // ── 21km: LIMIAR é o determinante principal (Daniels, Brad Hudson) ────────
    '21km': {
      geral: ['c_rodagem8', 'c_long16', 'c_tempo20', 'c_cruise5x1', 'c_rodprog10', 'c_regen30'],
      base:  ['c_rodagem8', 'c_long16', 'c_rodprog10', 'c_subidas', 'c_tempo20', 'c_regen30'],
      build: ['c_cruise5x1', 'c_tempo20', 'c_long20', 'c_fartlek', 'c_rodprog10', 'c_regen30'],
      pico:  ['c_mpace8', 'c_cruise5x1', 'c_longprog20', 'c_tempo20', 'c_rodagem8', 'c_regen30'],
      taper: ['c_regen30', 'c_rodagem8', 'c_cruise5x1', 'c_long16'],
      prova: ['c_regen30', 'c_educativos'],
    },
    // ── 42km: BASE AERÓBICA + ritmo de prova (Pfitzinger "Advanced Marathoning") ──
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
      build: ['rest', 'b_ss_3x12',  'b_recup45',  'b_vo2_5x3', 'rest',     'b_anaero_6x1','b_end90'],
      pico:  ['rest', 'b_ronnestad','b_recup45',  'b_anaero_6x1','rest',   'b_sprint',   'b_end90'],
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
      // Pico de ULTRA e volume, nao intensidade: o over-under (Z5/Z3) sai e
      // entram cadencia + endurance. Antes este pico era IDENTICO ao do
      // granfondo — as duas provas so se diferenciavam pelo tamanho do longao.
      pico:  ['rest', 'b_ss_3x12',  'b_end90',    'b_endcad',  'b_end90',  'b_long3h',   'b_recup45'],
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
    '21km': { min: 12, pico: 18 },   // teto 18km (~85% da prova) — escolha do treinador
    '42km': { min: 16, pico: 36 },   // teto 36km (~85% da prova) — máximo do longão de maratona
  },
  ciclismo: {
    'criterium': { min: 90,  pico: 150 }, // 1h30 → 2h30 (potência; longão menos central)
    'granfondo': { min: 120, pico: 270 }, // 2h00 → 4h30 (resistência específica de estrada)
    'endurance': { min: 150, pico: 360 }, // 2h30 → 6h00 (ultradistância — base aeróbica)
  },
};

// Meta da RODAGEM (corrida) por fase da prova — só corrida: no modelo ela ficava
// travada em 8 km do início ao fim da periodização, mesmo com o volume total
// crescendo. Crescimento modesto (não é o longão, é o "pão-com-manteiga" da
// semana) — escala pelo nível como o resto (sem convergência forçada de pico).
const RODAGEM_ALVO = {
  corrida: {
    '5km':  { min: 6, pico: 9 },
    '10km': { min: 6, pico: 10 },
    '21km': { min: 7, pico: 11 },
    '42km': { min: 8, pico: 13 },
  },
};

// Meta do pedal de ENDURANCE (ciclismo) — mesmo problema da rodagem: ficava
// travado em 90 min (b_end90) do início ao fim, só o Longão progredindo.
// Crescimento modesto, escalado só pelo nível (sem convergência de pico).
const ENDURANCE_ALVO = {
  ciclismo: {
    'criterium': { min: 60, pico: 100 }, // endurance é secundário aqui (potência manda)
    'granfondo': { min: 75, pico: 120 },
    'endurance': { min: 90, pico: 150 }, // ultradistância — base aeróbica mais robusta
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

// Pares de troca dos dias "leves" (rodagem/regenerativo) — mesmo papel na
// semana, estímulo levemente diferente. Usado junto com ALT_QUALIDADE no modo
// SEM prova pra mesclar a semana toda, não só o dia de qualidade.
const ALT_LEVE = {
  corrida: {
    c_regen30:   'c_educativos', c_educativos: 'c_regen30',
    c_rodagem8:  'c_rodprog10',  c_rodprog10:  'c_rodagem8',
  },
  ciclismo: {
    b_recup45: 'b_endcad', b_endcad: 'b_recup45',
  },
};

// Métodos de altíssima intensidade (VO₂máx / anaeróbio / neuromuscular) que
// NÃO devem ser prescritos a iniciantes: risco de lesão e estímulo sem base
// aeróbica formada. Evidência: iniciantes respondem melhor a volume Z2 +
// qualidade sustentável (limiar/tempo/fartlek) antes de tiros máximos
// (Daniels; Seiler — modelo polarizado exige base; Coggan p/ ciclismo).
const METODOS_AVANCADOS = new Set([
  'c_billat', 'c_vo2_5x1000', 'c_vo2_6x800',   // corrida: VO₂máx (Z5)
  'b_ronnestad', 'b_vo2_5x3', 'b_sprint',      // ciclismo: VO₂máx / neuromuscular
  'b_anaero_6x1',                              // ciclismo: anaerobico (Z6)
]);

// Troca o estímulo Z5 por uma qualidade sustentável (fartlek/limiar/sweetspot)
// quando o atleta é iniciante. Se o substituto não existir na lista, mantém o
// original (fallback seguro em bloquearAvancado).
const SUBST_INICIANTE = {
  c_billat:     'c_fartlek',    // 30/30 máximo → fartlek lúdico Z3
  c_vo2_5x1000: 'c_cruise5x1',  // VO₂máx → intervalado de limiar (Z4)
  c_vo2_6x800:  'c_fartlek',    // VO₂máx → fartlek Z3
  b_ronnestad:  'b_ss_3x12',    // 30/15 VO₂ → sweet spot Z4
  b_vo2_5x3:    'b_ss_3x12',    // VO₂ → sweet spot Z4
  b_sprint:     'b_end90',      // sprints neuromusculares → endurance Z2
  b_anaero_6x1: 'b_ss_3x12',    // anaeróbico Z6 → sweet spot Z3
};

/** Troca método avançado por alternativa segura quando nivel==='iniciante'. */
function bloquearAvancado(model, nivel, lista) {
  if (!model || nivel !== 'iniciante' || !METODOS_AVANCADOS.has(model.id)) return model;
  const substId = SUBST_INICIANTE[model.id];
  return (substId && lista.find(m => m.id === substId)) || model;
}

// Formata minutos → "3h" / "2h30" / "45 min".
// Duracao em MINUTOS -> texto. Delega pro formatador da tela pra que titulo e
// volume nunca escrevam a mesma duracao de jeitos diferentes.
function fmtDur(minTotal) {
  return formatarDuracao(Math.round(minTotal) * 60);
}

// Gera um modelo de longão "na hora" (corrida em km OU ciclismo em min).
function longaoModelo(modalidade, vol, prog = false) {
  if (modalidade === 'ciclismo') {
    const m = Math.max(60, Math.round(vol / 15) * 15); // arredonda p/ 15 min
    return {
      id: `b_long_${m}`, tipo: 'longao', titulo: `Longão ${fmtDur(m)}`,
      medida: 'tempo', valor: min(m), zona: 'Z2',
      detalhe: `${fmtDur(m)} em [Z2] constante.`,
      ref: 'Seiler / Coggan',
    };
  }
  const k = Math.max(6, Math.round(vol));
  return {
    id: `c_long_${prog ? 'prog_' : ''}${k}`, tipo: 'longao',
    titulo: `Longão ${prog ? 'progressivo ' : ''}${k} km`,
    medida: 'distancia', valor: km(k), zona: prog ? 'Z3' : 'Z2',
    detalhe: prog
      ? `${k} km progressivos: ~70% em [Z2] + final no ritmo de prova [Z3].`
      : `${k} km contínuos em [Z2] confortável. Resistência aeróbica, capilarização e economia de corrida.`,
    ref: 'Daniels / Pfitzinger',
  };
}

// Rodagem com volume dinâmico — mesmo texto/estilo do c_rodagem8 original.
function rodagemModelo(km_) {
  const k = Math.max(4, Math.round(km_));
  return {
    id: `c_rodagem_${k}`, tipo: 'rodagem', titulo: `Rodagem ${k} km`,
    medida: 'distancia', valor: km(k), zona: 'Z2',
    detalhe: `${k} km em ritmo confortável [Z2].`,
    ref: 'Daniels — Easy (E)',
  };
}

// Pedal de endurance (ciclismo) com volume dinâmico — mesmo texto/estilo do
// b_end90 original.
function enduranceModeloBike(min_) {
  const m = Math.max(45, Math.round(min_ / 15) * 15); // arredonda p/ 15 min
  return {
    id: `b_end_${m}`, tipo: 'endurance', titulo: `Endurance ${fmtDur(m)}`,
    medida: 'tempo', valor: min(m), zona: 'Z2',
    detalhe: `${fmtDur(m)} em [Z2] constante.`,
    ref: 'Seiler — polarizado',
  };
}

// Volume do longão de build/pico (km p/ corrida, min p/ ciclismo).
function volumeLongaoDaSemana(modalidade, chaveAlvo, chaveFase, semRest, ehDeload, nivel = 'intermediario') {
  const alvo = LONGAO_ALVO[modalidade]?.[chaveAlvo];
  if (!alvo) return null;
  const j = JANELAS_PROVA[chaveAlvo] || JANELA_PADRAO;
  // Início escala forte pelo nível (iniciante começa curto); pico escala suave
  // (todo mundo que vai à prova chega perto do race-ready — o iniciante SOBE ao
  // longo dos meses até lá, não fica preso num teto baixo).
  const alvoMin = alvo.min * (FATOR_NIVEL[nivel] ?? 1);
  const alvoPico = alvo.pico * (FATOR_NIVEL_PICO[nivel] ?? 1);

  // Progressao GEOMETRICA (percentual constante), nao linear.
  //
  // Linear entre min e pico empilha todo o crescimento percentual no comeco:
  // no granfondo do iniciante o longao ia de 60 pra 90 min (+50%) e de 90 pra
  // 120 (+33%) em semanas seguidas, e depois subia 7% por semana no fim. Com
  // passo percentual constante o plano inteiro respeita a regra dos ~10%.
  //
  // E a BASE tambem constroi: antes ficava travada no minimo por ate 11 semanas
  // e jogava a progressao toda no build. Agora ela sobe do ponto de partida ate
  // o minimo, e o build comeca exatamente onde a base parou (sem degrau).
  // O PISO do longao (o menor pedal/corrida que ainda merece o nome) entra como
  // ponto de partida da rampa, nao como corte no fim. Cortando no fim, o plano
  // do iniciante ficava 15 semanas parado no piso e so entao subia; usando o
  // piso como base, ele comeca ali e sobe dali em diante, sem degrau. No TAPER
  // o piso nao vale — encurtar o longao e o proposito da fase.
  const piso = (chaveFase === 'taper' || chaveFase === 'prova') ? 0
    : (modalidade === 'ciclismo'
      ? (LONGAO_GERAL_CICLISMO[nivel] ?? LONGAO_GERAL_CICLISMO.intermediario).piso
      : (LONGAO_GERAL_CORRIDA[nivel] ?? LONGAO_GERAL_CORRIDA.intermediario).piso);
  const alvoMinEf = Math.max(alvoMin, piso);
  const alvoBase = Math.max(piso, alvoMinEf * 0.65);
  const RAMPA_BASE = 8;                 // semanas de base que ja progridem

  let v;
  if (chaveFase === 'base') {
    const ateBuild = Math.max(0, semRest - (j.taper + j.pico + j.build));
    const frac = Math.max(0, Math.min(1, 1 - ateBuild / RAMPA_BASE));
    v = alvoBase * Math.pow(alvoMinEf / alvoBase, frac);
  } else {
    const W = j.build + j.pico;
    const depth = Math.max(0, Math.min(W, (j.taper + W) - semRest));
    const frac = W > 0 ? depth / W : 0;
    v = alvoMinEf * Math.pow(Math.max(alvoPico, alvoMinEf) / alvoMinEf, frac);
  }
  if (ehDeload) v = v * 0.75;                         // deload: -25%
  return Math.round(v);
}

// Volume da RODAGEM (corrida) na semana — mesma curva do longão, mas sem
// convergência forçada de pico (rodagem não precisa "chegar na distância da
// prova"); pico também escala pelo nível.
function volumeRodagemDaSemana(chaveAlvo, chaveFase, semRest, ehDeload, nivel = 'intermediario') {
  const alvo = RODAGEM_ALVO.corrida?.[chaveAlvo];
  if (!alvo) return null;
  const j = JANELAS_PROVA[chaveAlvo] || JANELA_PADRAO;
  const f = FATOR_NIVEL[nivel] ?? 1;
  const alvoMin = alvo.min * f;
  const alvoPico = alvo.pico * f;

  let v;
  if (chaveFase === 'base') {
    v = alvoMin;
  } else {
    const W = j.build + j.pico;
    const depth = Math.max(0, Math.min(W, (j.taper + W) - semRest));
    const frac = W > 0 ? depth / W : 0;
    v = alvoMin + (alvoPico - alvoMin) * frac;
  }
  if (ehDeload) v = v * 0.85;                         // deload leve (não é o volume principal)
  return Math.round(v);
}

// Volume do pedal de ENDURANCE (ciclismo) na semana — mesma curva da rodagem.
function volumeEnduranceDaSemana(chaveAlvo, chaveFase, semRest, ehDeload, nivel = 'intermediario') {
  const alvo = ENDURANCE_ALVO.ciclismo?.[chaveAlvo];
  if (!alvo) return null;
  const j = JANELAS_PROVA[chaveAlvo] || JANELA_PADRAO;
  const f = FATOR_NIVEL[nivel] ?? 1;
  const alvoMin = alvo.min * f;
  const alvoPico = alvo.pico * f;

  let v;
  if (chaveFase === 'base') {
    v = alvoMin;
  } else {
    const W = j.build + j.pico;
    const depth = Math.max(0, Math.min(W, (j.taper + W) - semRest));
    const frac = W > 0 ? depth / W : 0;
    v = alvoMin + (alvoPico - alvoMin) * frac;
  }
  if (ehDeload) v = v * 0.85;
  return Math.round(v);
}

// Deload = semana de recuperação a cada 4 semanas (fora do taper/prova).
function semanaDeDeload(chaveAlvo, chaveFase, semRest, semanaIdx = 0) {
  if (chaveFase === 'taper' || chaveFase === 'prova') return false;
  // SEM PROVA (condicionamento contínuo): o deload não pode depender do
  // calendário de uma prova que não existe. Antes, `semRest` vinha null e a
  // conta abaixo dizia "nunca é deload" — o aluno ficava em carga alta pra
  // sempre, que é como se chega em overtraining. Aqui o ciclo é fixo: 3
  // semanas progredindo + 1 leve, repetindo.
  if (semRest == null) return (semanaIdx % 4) === 3;
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
  if (unidade === 'km') {
    const re = /(\d+(?:[.,]\d+)?)\s*km/i;
    return re.test(titulo) ? titulo.replace(re, `${n} km`) : `${titulo} (${n} km)`;
  }
  // Tempo: o título pode estar em MINUTOS ("Tempo 20 min") ou em HORAS
  // ("Longão 3 h"). Antes só se procurava "min", então o de horas não casava e
  // caía no fallback, virando "Longão 3 h (90 min)" — dizendo 3 h e 90 min ao
  // mesmo tempo, contradição na cara do aluno (achado pelo dono no card dele).
  // "1h45" NAO casava com o padrao antigo (que exigia limite de palavra depois
  // do h, e ali vem digito). O titulo caia no fallback e virava "Endurance 1h45
  // (1h30)" — a duracao escrita duas vezes, uma delas errada.
  const emHoras = /(\d+)\s*h(?:\s*\d{2})?/i;
  const emMin   = /(\d+)\s*min/i;
  // Acima de 90 min escreve em hora, que é como se fala de longão — e no
  // formato "2h15", não "2,25 h", que ninguém usa.
  // Mesmo formatador do resto (fmtDur): vira hora a partir de 1h, igual ao que
  // a tela e o PDF exibem. Antes o titulo so virava hora acima de 1h30, entao
  // o card mostrava "Longão 77 min" em cima e "1h17" no volume — a mesma coisa
  // escrita de dois jeitos (achado pelo dono no PDF da Gabriela).
  const txt = fmtDur(n);
  if (emMin.test(titulo)) return titulo.replace(emMin, txt);
  if (emHoras.test(titulo)) return titulo.replace(emHoras, txt);
  return `${titulo} (${txt})`;
}

// Substitui o nº ANTIGO de volume dentro do detalhe ("20 min" → "24 min"),
// mirando o valor exato p/ não pegar o aquecimento ("15 min") por engano.
function detalheComVolume(detalhe, oldN, n, unidade) {
  if (!detalhe) return detalhe;

  // Primeiro o formato cru ("180 min", "16 km").
  const re = new RegExp(`\\b${oldN}\\s*${unidade}`, 'i');
  if (re.test(detalhe)) return detalhe.replace(re, `${n} ${unidade}`);

  // Em minutos a descricao costuma vir em HORA ("3 h em [Z2]", "1h30"), e o
  // texto cru nunca batia: o longao de 3 h encolhido pra 1h34 ficava com
  // "Longão 1h34" no titulo e "3 h" na descricao (achado pelo dono).
  if (unidade === 'min' && oldN >= 60) {
    const h = Math.floor(oldN / 60);
    const mm = oldN % 60;
    const alvo = mm > 0
      ? new RegExp(`\\b${h}\\s*h\\s*${String(mm).padStart(2, '0')}\\b`, 'i')
      : new RegExp(`\\b${h}\\s*h(?!\\s*\\d)`, 'i');
    // Mesmo formatador do titulo (fmtDur), pra descricao e cabecalho nunca
    // divergirem no formato.
    const txt = fmtDur(n);
    if (alvo.test(detalhe)) return detalhe.replace(alvo, txt);
  }

  return detalhe;
}

// Escala os blocos junto com o volume/nº de tiros da sessão. Sem isto, um
// treino escalado de 5x1km para 7x1km ficaria com o TÍTULO dizendo 7x e os
// BLOCOS dizendo 5x — o aluno leria uma coisa e executaria outra.
//   `reps`  → só troca o nº de repetições da série (mantém o tiro do mesmo tamanho).
//   `fator` → estica proporcionalmente os blocos contínuos (aquecimento e
//             desaquecimento ficam de fora: 15 min de aquecimento é 15 min).
function escalarEstrutura(estrutura, { reps = null, fator = null } = {}) {
  if (!Array.isArray(estrutura) || !estrutura.length) return estrutura;

  // Ha dois formatos de modelo intervalado, e eles encurtam de jeitos opostos:
  //
  //   BLOCO UNICO  — 1 bloco com repeticoes = nº de tiros ('Limiar 6x4 min').
  //                  Encurtar = baixar `repeticoes`.
  //   MULTI-SERIE  — 1 bloco POR SERIE, e `repeticoes` conta os ciclos DENTRO
  //                  da serie (over-unders, 30/15 do Ronnestad: 3 series de 13
  //                  ciclos de 30s/15s). Encurtar = TIRAR uma serie inteira.
  //
  // Tratar o segundo como o primeiro estragava o treino nos dois eixos: o 30/15
  // virava 2 ciclos por serie em vez de 13, e continuava com as 3 series.
  const nSeries = estrutura.filter(b => b.bloco === 'intervalo').length;
  if (reps && nSeries > 1 && reps !== nSeries) {
    const idxUltima = estrutura.map(b => b.bloco).lastIndexOf('intervalo');
    const fim = estrutura.slice(idxUltima + 1);       // recuperacao final + desaquecimento

    if (reps < nSeries) {                              // TIRA serie
      const out = [];
      let vistas = 0;
      for (const b of estrutura.slice(0, idxUltima + 1)) {
        if (b.bloco === 'intervalo') {
          vistas++;
          if (vistas > reps) break;                    // daqui pra frente e serie cortada
        }
        out.push(b);
      }
      return [...out, ...fim];
    }

    // ACRESCENTA serie: repete o par (recuperacao + serie) que ja existe, em vez
    // de inflar as repeticoes internas — senao o titulo diz 5 series e o aluno
    // recebe 4 mais longas.
    const ultimaSerie = estrutura[idxUltima];
    const recEntre = estrutura.slice(0, idxUltima).reverse().find(b => b.bloco === 'recuperacao');
    const extra = [];
    for (let k = nSeries; k < reps; k++) {
      if (recEntre) extra.push({ ...recEntre });
      extra.push({ ...ultimaSerie });
    }
    return [...estrutura.slice(0, idxUltima + 1), ...extra, ...fim];
  }

  return estrutura.map(b => {
    if (reps && b.bloco === 'intervalo') return { ...b, repeticoes: reps };
    if (fator && b.bloco === 'continuo') {
      return { ...b, valor: Math.max(b.medida === 'distancia' ? 500 : 60, Math.round(b.valor * fator)) };
    }
    return b;
  });
}

// Escala o volume de uma sessão contínua (sem alterar a estrutura de tiros).
function escalarSessao(m, fator) {
  if (!m.valor) return m;
  const isDist = m.medida === 'distancia';
  const unidade = isDist ? 'km' : 'min';
  const oldN = Math.round(m.valor / (isDist ? 1000 : 60));
  const n = Math.max(isDist ? 3 : 10, Math.round(oldN * fator));
  const fatorReal = oldN > 0 ? n / oldN : 1;   // fator EFETIVO (o pedido pode ter batido no piso)
  return {
    ...m,
    id: `${m.id}_t${n}`,
    valor: isDist ? km(n) : min(n),
    titulo: tituloComVolume(m.titulo, n, unidade),
    detalhe: detalheComVolume(m.detalhe, oldN, n, unidade),
    ...(m.estrutura ? { estrutura: escalarEstrutura(m.estrutura, { fator: fatorReal }) } : {}),
  };
}

// Tipos que NÃO são qualidade (volume fácil/recuperação — não progridem como tiro).
const NAO_QUALIDADE = ['rodagem', 'longao', 'regenerativo', 'recuperacao', 'endurance', 'educativos', 'descanso', 'prova'];
const ehQualidade = (tipo) => !NAO_QUALIDADE.includes(tipo);

// Fator de progressão do VOLUME de qualidade ao longo do bloco build/pico.
// Início do build ~0,90 → pico ~1,25 do volume nominal. Deload reduz 20%.
function fatorQualidade(chaveAlvo, chaveFase, semRest, ehDeload, semanaIdx = 0) {
  let f;
  // SEM PROVA: progride dentro de um ciclo de 4 semanas em vez de mirar uma
  // data. Antes a conta de baixo recebia `semRest` null, resultava em frac=1 e
  // travava no fator MÁXIMO (1,25) pra sempre — carga de pico permanente.
  if (semRest == null) {
    const naCiclo = semanaIdx % 4;             // 0,1,2 sobem; 3 é a semana leve
    f = [0.95, 1.05, 1.15, 0.80][naCiclo];
    return f;
  }
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
      // Blocos acompanham o novo nº de tiros — senão título e execução divergem.
      ...(m.estrutura ? { estrutura: escalarEstrutura(m.estrutura, { reps: n1 }) } : {}),
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
// Prioridade do treino pra decidir o que MANTER quando reduz a frequência.
// Mantém o essencial (longão + qualidade) e corta o dispensável primeiro.
function prioridadeTipo(tipo) {
  if (tipo === 'longao' || tipo === 'prova') return 1;                     // longão: pilar do endurance
  if (['intervalado','tempo','limiar','vo2','fartlek','sweetspot','tiros',
       'subidas','forca','sprint','anaerobico'].includes(tipo)) return 2;              // qualidade
  if (['rodagem','endurance'].includes(tipo)) return 3;                    // contínuo/base
  return 4;                                                                // regenerativo/educativo (corta 1º)
}

// Dias ESPAÇADOS por frequência — dia sim, dia não. Dois padrões:
// - COM longão: os outros treinos ficam em Seg-Sex (o longão trava no Sáb).
// - SEM longão (fase/tipo sem sessão longa): espalha nos 7 dias normalmente.
const DIA_UTIL_ESPACADO = {   // pros treinos QUE NÃO são o longão (Seg=0 .. Sex=4)
  0: [], 1: [0], 2: [1, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 6], // raríssimo (freq quase todo dia) — usa também o Dom
};
// Na CORRIDA, sexta colada no longao de sabado e impacto forte em dois dias
// seguidos — o gerador sem prova ja deixava a sexta livre, o com prova nao.
// Aqui vale a mesma regra ate 4 treinos alem do longao; acima disso nao ha
// como evitar a sexta.
const DIA_UTIL_CORRIDA = {
  3: [0, 2, 3],       // Seg, Qua, Qui — sexta livre
  4: [0, 1, 2, 3],    // Seg a Qui
}; 
const DIA_ESPACADO_POR_FREQ = { // fallback quando não há longão sobrevivente
  1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6],
};

/**
 * Ajusta a semana pra ter EXATAMENTE `freq` dias de treino. Decide QUAIS tipos
 * ficam por prioridade (regenerativo/fácil sai primeiro; longão e qualidade
 * ficam) — igual antes. A diferença: em vez de deixar os sobreviventes presos
 * nos dias originais do template (podia sobrar Qui+Sex+Sáb juntos, sem
 * descanso nenhum entre sessões — achado pelo dono testando a Gabriela),
 * agora ESPALHA eles pela semana (dia sim, dia não). O LONGÃO sempre trava no
 * SÁBADO, independente de tudo (pedido explícito) — os outros treinos se
 * espalham em volta dele, Seg-Sex. Se já tem ≤ freq dias, não mexe.
 */
export function aplicarFrequencia(semana, freq, modalidade = null) {
  if (!freq) return semana;
  const treinos = semana.map((d, i) => ({ i, tipo: d.rest ? null : d.tipo, item: d })).filter(x => x.tipo);
  if (!treinos.length) return semana;
  // Antes saia aqui quando o template ja cabia na frequencia — e nesse caso os
  // treinos ficavam nos dias CRUS do template, que podiam deixar a segunda
  // vazia e amontoar o resto (Ter->Dom). Agora a redistribuicao roda sempre:
  // corta o que sobra (nCortar pode ser 0) e reposiciona pelos dias ESPACADOS
  // (ver DIA_UTIL_ESPACADO), com o longao travado no sabado.
  const nCortar = Math.max(0, treinos.length - freq);
  // Ordena os MENOS importantes primeiro (prioridade numérica maior = corta antes).
  const cortar = new Set(
    [...treinos].sort((a, b) => prioridadeTipo(b.tipo) - prioridadeTipo(a.tipo))
      .slice(0, nCortar).map(x => x.i)
  );
  const sobreviventes = treinos.filter(t => !cortar.has(t.i)); // já em ordem Seg→Dom
  const nova = Array.from({ length: 7 }, () => ({ rest: true }));

  const idxLongao = sobreviventes.findIndex(s => s.tipo === 'longao');
  if (idxLongao >= 0) {
    nova[5] = sobreviventes[idxLongao].item; // Sábado, sempre
    const outros = sobreviventes.filter((_, i) => i !== idxLongao);
    const diasAlvo = (modalidade === 'corrida' && DIA_UTIL_CORRIDA[outros.length])
      || DIA_UTIL_ESPACADO[outros.length] || outros.map(s => s.i);
    outros.forEach((s, idx) => { nova[diasAlvo[idx] ?? s.i] = s.item; });
  } else {
    const diasAlvo = DIA_ESPACADO_POR_FREQ[freq] || sobreviventes.map(s => s.i);
    sobreviventes.forEach((s, idx) => { nova[diasAlvo[idx] ?? s.i] = s.item; });
  }
  return nova;
}

/**
 * Completa a semana quando o TEMPLATE tem menos sessoes do que o aluno pode
 * treinar. `aplicarFrequencia` so corta — entao quem dizia poder pedalar/correr
 * 6x recebia 5, calado, porque nenhum template de prova passa de 5 dias.
 *
 * O preenchimento e sempre com sessao FACIL (rodagem na corrida, endurance na
 * bike): dia extra de aluno que ja treina 5x nao pode virar mais um dia duro.
 * Nao completa no taper nem na semana da prova — la a semana curta e proposital.
 */
function completarFrequencia(semana, freq, modalidade, nivel, chaveFase) {
  if (!freq) return semana;
  if (chaveFase === 'taper' || chaveFase === 'prova') return semana;
  const ocupados = semana.map((d, i) => (d && !d.rest ? i : -1)).filter(i => i >= 0);
  let faltam = freq - ocupados.length;
  if (faltam <= 0) return semana;

  // Escalado pelo nivel, igual todo o resto: iniciante que treina 6x nao
  // recebe o mesmo dia extra que o avancado.
  const fNivel = FATOR_NIVEL[nivel] ?? 1;
  const base = modalidade === 'ciclismo'
    ? enduranceModeloBike(60 * fNivel)
    : rodagemModelo(8 * fNivel);
  if (!base) return semana;

  const nova = [...semana];
  // Preenche os dias vagos mais espacados dos que ja tem treino, pra nao
  // empilhar sessao colada no longao de sabado.
  const vagos = [0, 1, 2, 3, 4, 6].filter(i => !nova[i] || nova[i].rest);
  vagos.sort((a, b) => {
    const dist = (x) => Math.min(...ocupados.map(o => Math.abs(o - x)));
    return dist(b) - dist(a);
  });
  for (const dia of vagos) {
    if (faltam <= 0) break;
    nova[dia] = { ...base };
    faltam--;
  }
  return nova;
}



// Teto de duração dos treinos de MEIO DE SEMANA (Seg–Sex).
//
// Quem treina com personal trabalha: não tem 2 h livres numa terça. O volume
// longo pertence ao fim de semana, que é quando sobra tempo. Sem este teto, um
// aluno avançado na 3ª semana do ciclo pegava 1h43 numa quinta (achado pelo
// dono, que pedia o limite de 1h30).
//
// A sessão é medida pelo TOTAL (com aquecimento, recuperação e volta à calma),
// que é o tempo que ele de fato reserva — não pela parte principal.
// Ciclismo aguenta 1h30 numa terca; corrida, nao. Um treino de corrida de meio
// de semana raramente passa de 50 min na pratica — o teto menor aqui e trava de
// seguranca, nao corte: hoje nenhum modelo encosta nele.
const TETO_DIA_UTIL = min(90);          // ciclismo
const TETO_DIA_UTIL_CORRIDA = min(60);  // corrida

function duracaoTotalSessao(sess) {
  if (Array.isArray(sess?.estrutura) && sess.estrutura.length) {
    const r = resumoVolume(sess.estrutura);
    return r.medida === 'tempo' ? r.valor : 0;
  }
  return sess?.medida === 'tempo' ? (Number(sess.valor) || 0) : 0;
}

function limitarDuracaoDiaUtil(sess, teto = TETO_DIA_UTIL) {
  if (!sess || sess.rest) return sess;
  const total = duracaoTotalSessao(sess);
  if (!total || total <= teto) return sess;

  // Com séries: encurta o nº de tiros (mantém o tamanho de cada um, que é o que
  // define o estímulo). Nunca desce de 2 tiros — abaixo disso deixa de ser série.
  const serie = (sess.estrutura || []).find(b => b.bloco === 'intervalo' && b.repeticoes > 1);
  if (serie) {
    for (let reps = serie.repeticoes - 1; reps >= 2; reps--) {
      const tentativa = escalarQualidade(sess, reps / serie.repeticoes);
      if (duracaoTotalSessao(tentativa) <= teto) return tentativa;
    }
    // Nem com 2 tiros coube: devolve a versão de 2, que é o mínimo defensável.
    return escalarQualidade(sess, 2 / serie.repeticoes);
  }

  // Contínuo (rodagem/endurance): encolhe a duração direto.
  return escalarSessao(sess, teto / total);
}

// ─────────────────────────────────────────────────────────────────────────────
// CICLISMO SEM PROVA — plano contínuo de condicionamento.
//
// O caso mais comum de aluno de personal: pedala por condicionamento, não pra
// competir. O treinador pede o FTP e manda planilha toda semana, sem nunca
// perguntar de prova (relato do dono sobre a própria experiência com treinador).
//
// Antes isso não existia direito: o app EXIGIA prova-alvo pra gerar plano, e o
// modo sem prova devolvia um template fixo de 5 sessões, sem progressão e sem
// semana leve — quem pedala 6x por semana não era atendido (não cabia no
// template), e quem seguisse o plano ficava em carga alta pra sempre, que é
// como se chega em overtraining.
//
// Estrutura polarizada (Seiler): a maior parte do volume em Z2 e uma fatia
// pequena de qualidade forte. Por CONTAGEM parecem 2 de 6, mas por TEMPO dá os
// ~20% clássicos, porque as sessões fáceis são bem mais longas.
//
// A composição muda por FREQUÊNCIA em vez de cortar de um template único —
// cortar desequilibrava o plano (sobrava qualidade demais em frequência baixa)
// e impedia 6x/semana.
const GERAL_CICLISMO_POR_FREQ = {
  1: { qual: 0, end: 0, longao: 1, recup: 0 },   // 1 pedal só: o longão é o que rende
  2: { qual: 1, end: 0, longao: 1, recup: 0 },   // 1 forte + 1 longo
  3: { qual: 1, end: 1, longao: 1, recup: 0 },
  4: { qual: 1, end: 2, longao: 1, recup: 0 },   // polarizado: ainda só 1 forte
  5: { qual: 2, end: 2, longao: 1, recup: 0 },
  6: { qual: 2, end: 3, longao: 1, recup: 0 },   // 2 fortes + 3 rodagens + longão
  7: { qual: 2, end: 3, longao: 1, recup: 1 },
};

// Rodízio de qualidade ao longo do ciclo: o aluno não repete o mesmo estímulo
// toda semana, e o plano cobre limiar, sweet spot, VO₂máx e força.
// Longao de ciclismo SEM prova: piso e teto por nivel, em minutos.
//
// Antes o longao saia de escalar o modelo de 3 h pelo fator de nivel, e o
// iniciante recebia 1h17 num sabado — que nao e longao nenhum ("longao e pelo
// menos 3 horas", disse o dono). Agora todo longao nasce longo: o piso e o
// menor pedal que ainda merece o nome, e o pico e onde o ciclo chega na 3a
// semana. Iniciante entra em 2 h em vez de pular direto pras 3 h de um
// avancado — o nome fica honesto sem jogar quem esta comecando num volume que
// ele nao aguenta.
const LONGAO_GERAL_CICLISMO = {
  iniciante:     { piso: 120, pico: 165 },   // 2h   -> 2h45
  intermediario: { piso: 150, pico: 210 },   // 2h30 -> 3h30
  avancado:      { piso: 180, pico: 240 },   // 3h   -> 4h
};

// Longao de CORRIDA sem prova, em km. Mesma ideia do ciclismo, em escala de
// corredor: longao de corrida raramente passa de 1h30 mesmo pra quem e bom, e o
// que importa e ele ser claramente MAIOR que a rodagem do meio de semana —
// antes o iniciante fazia 5 km na quarta e 7 km no "longao" de sabado, e nao
// dava pra sentir diferenca.
const LONGAO_GERAL_CORRIDA = {
  iniciante:     { piso: 8,  pico: 11 },
  intermediario: { piso: 12, pico: 16 },
  avancado:      { piso: 16, pico: 22 },
};

const GERAL_CICLISMO_QUALIDADE = [
  ['b_thr_7x4',  'b_ss_3x12'],
  ['b_ftp_2x20', 'b_vo2_5x3'],
  ['b_thr_7x4',  'b_forca'],
  ['b_ss_3x12',  'b_endcad'],   // semana leve: nada de VO₂máx
];

// Dias da semana (0=Seg ... 6=Dom). O LONGAO cai sempre no ultimo dia da lista.
//
// A regra numero 1 e ESPACAR: dia sim, dia nao, enquanto couber. Frequencia
// baixa nao deve amontoar treino no comeco da semana so pra "comecar na
// segunda" — 3x e Ter/Qui/Sab, que e o classico. Da 5x pra cima nao ha como
// alternar, entao ai a semana ocupa de segunda a sabado e o domingo e a folga.
// (Antes 6x saia Ter->Dom, deixando a segunda parada — achado pelo dono.)
const GERAL_CICLISMO_DIAS = {
  1: [5],                // so o longao, no sabado
  2: [2, 5],             // Qua + Sab
  3: [1, 3, 5],          // Ter, Qui, Sab — alternado
  4: [0, 2, 4, 5],       // Seg, Qua, Sex — alternado — + longao no Sab
  5: [0, 1, 3, 4, 5],    // quarta e domingo de folga
  6: [0, 1, 2, 3, 4, 5], // Seg a Sab, domingo de recuperacao
  7: [0, 1, 2, 3, 4, 5, 6],
};

/**
 * Semana de ciclismo sem prova, em ciclo de 4 semanas (3 progredindo + 1 leve).
 * @param {Array}  lista      modelos da modalidade (já com estrutura em blocos)
 * @param {number} freq       pedaladas por semana (1–7)
 * @param {string} nivel      'iniciante'|'intermediario'|'avancado'
 * @param {number} semanaIdx  índice da semana no plano (0, 1, 2, …)
 */
function semanaGeralCiclismo(lista, freq, nivel, semanaIdx) {
  const f = Math.max(1, Math.min(7, Number(freq) || 4));
  const comp = GERAL_CICLISMO_POR_FREQ[f];
  const naCiclo = semanaIdx % 4;
  const ehLeve = naCiclo === 3;
  // 3 semanas subindo + 1 leve, repetindo. Progressão infinita não existe: o
  // ciclo já entrega sobrecarga seguida de recuperação, que é o que adapta.
  const fCiclo = [0.95, 1.05, 1.15, 0.78][naCiclo] * (FATOR_NIVEL[nivel] ?? 1);

  const achar = (id) => lista.find(m => m.id === id);
  const qualIds = GERAL_CICLISMO_QUALIDADE[naCiclo];
  const sessoes = [];

  for (let i = 0; i < comp.qual; i++) {
    let m = achar(qualIds[i % qualIds.length]);
    if (!m) continue;
    m = bloquearAvancado(m, nivel, lista);
    sessoes.push({ ...escalarQualidade(m, fCiclo), _slot: 'qual' });
  }
  for (let i = 0; i < comp.end; i++) {
    const base = achar('b_end90');
    if (base) sessoes.push({ ...escalarSessao(base, fCiclo), _slot: 'end' });
  }
  if (comp.longao) {
    // Semana 4 (leve) volta pro piso, nao abaixo dele: o descanso vem do resto
    // da semana, nao de descaracterizar o longao.
    const alvoL = LONGAO_GERAL_CICLISMO[nivel] ?? LONGAO_GERAL_CICLISMO.intermediario;
    const fracL = [0, 0.5, 1, 0][naCiclo];
    const minutosL = Math.round(alvoL.piso + (alvoL.pico - alvoL.piso) * fracL);
    sessoes.push({ ...longaoModelo('ciclismo', minutosL), _slot: 'longao' });
  }
  for (let i = 0; i < comp.recup; i++) {
    const base = achar('b_recup45');
    if (base) sessoes.push({ ...base, _slot: 'recup' });
  }

  const dias = GERAL_CICLISMO_DIAS[f] || GERAL_CICLISMO_DIAS[4];
  const semana = Array.from({ length: 7 }, () => ({ rest: true }));
  const longao = sessoes.find(s => s._slot === 'longao');
  const outros = sessoes.filter(s => s._slot !== 'longao');
  const diasOutros = [...dias];
  if (longao) {
    semana[dias[dias.length - 1]] = longao;
    diasOutros.pop();
  }
  // Intercala forte/fácil pra nunca empilhar dois dias fortes seguidos.
  const fortes = outros.filter(s => s._slot === 'qual');
  const faceis = outros.filter(s => s._slot !== 'qual');
  const ordem = [];
  while (fortes.length || faceis.length) {
    if (fortes.length) ordem.push(fortes.shift());
    if (faceis.length) ordem.push(faceis.shift());
    if (fortes.length && faceis.length) ordem.push(faceis.shift());
  }
  ordem.forEach((s, i) => { if (diasOutros[i] != null) semana[diasOutros[i]] = s; });

  // Teto de meio de semana: quem trabalha não tem 2h livres numa terça. O
  // volume longo fica pro fim de semana, que é quando sobra tempo — sem isto,
  // aluno avançado na 3ª semana do ciclo pegava 1h43 numa quinta.
  for (let i = 0; i <= 4; i++) semana[i] = limitarDuracaoDiaUtil(semana[i]);

  // Marca a semana leve — o personal precisa enxergar o ciclo no planner.
  if (ehLeve) semana.forEach(d => { if (!d.rest) d.semanaLeve = true; });
  return semana;
}


// ─────────────────────────────────────────────────────────────────────────────
// CORRIDA SEM PROVA — plano contínuo de condicionamento.
//
// Mesma ideia do ciclismo (o aluno corre por saúde, não pra competir), mas a
// metodologia NÃO é a mesma: corrida tem impacto, e volume demais quebra o
// corredor. Por isso três diferenças em relação à bike:
//
//   • Progressão mais conservadora no ciclo (a "regra dos 10%" clássica, não os
//     ~15% que a bike aguenta), porque o limitante aqui é osso e tendão, não
//     fôlego.
//   • Só UMA sessão forte por semana até 4x; a segunda só entra a partir de 5x.
//     Dois treinos duros de corrida numa semana pequena é receita de lesão.
//   • Frequência baixa privilegia a rodagem, não o longão: correr 1x por semana
//     e essa única vez ser o longão é justamente como se machuca.
const GERAL_CORRIDA_POR_FREQ = {
  1: { qual: 0, rod: 1, longao: 0, regen: 0 },   // 1x: rodagem, não longão
  2: { qual: 1, rod: 1, longao: 0, regen: 0 },
  3: { qual: 1, rod: 1, longao: 1, regen: 0 },
  4: { qual: 1, rod: 2, longao: 1, regen: 0 },
  5: { qual: 2, rod: 2, longao: 1, regen: 0 },
  6: { qual: 2, rod: 2, longao: 1, regen: 1 },
  7: { qual: 2, rod: 3, longao: 1, regen: 1 },
};

// Rodízio de estímulo ao longo do ciclo — cobre limiar, VO₂máx, fartlek e
// técnica, sem repetir o mesmo tipo em semanas seguidas.
const GERAL_CORRIDA_QUALIDADE = [
  ['c_tempo20',   'c_fartlek'],
  ['c_vo2_6x800', 'c_subidas'],
  ['c_cruise5x1', 'c_fartlek'],
  ['c_tempo20',   'c_educativos'],   // semana leve: nada de VO₂máx
];

// Mesma regra de espacamento do ciclismo, com um cuidado a mais: a corrida tem
// impacto, entao a SEXTA fica livre sempre que der, pra nao colar treino no
// longao de sabado.
const GERAL_CORRIDA_DIAS = {
  1: [2],                // corrida unica no meio da semana (rodagem)
  2: [1, 4],             // Ter + Sex
  3: [1, 3, 5],          // Ter, Qui, Sab — alternado
  4: [0, 2, 3, 5],       // Seg, Qua, Qui, Sab — sexta livre antes do longao
  5: [0, 1, 2, 3, 5],    // Seg a Qui + Sab — folga sexta e domingo
  6: [0, 1, 2, 3, 4, 5], // Seg a Sab, domingo de folga
  7: [0, 1, 2, 3, 4, 5, 6],
};

/**
 * Semana de corrida sem prova, em ciclo de 4 semanas (3 progredindo + 1 leve).
 * Progressão mais suave que a do ciclismo — ver comentário acima.
 */
function semanaGeralCorrida(lista, freq, nivel, semanaIdx) {
  const f = Math.max(1, Math.min(7, Number(freq) || 3));
  const comp = GERAL_CORRIDA_POR_FREQ[f];
  const naCiclo = semanaIdx % 4;
  const ehLeve = naCiclo === 3;
  // ~10% de variação entre semanas (regra clássica da corrida), contra os ~15%
  // do ciclismo. A semana leve corta mais fundo porque é ela que repara.
  const fCiclo = [0.95, 1.02, 1.10, 0.75][naCiclo] * (FATOR_NIVEL[nivel] ?? 1);

  const achar = (id) => lista.find(m => m.id === id);
  const qualIds = GERAL_CORRIDA_QUALIDADE[naCiclo];
  const sessoes = [];

  for (let i = 0; i < comp.qual; i++) {
    let m = achar(qualIds[i % qualIds.length]);
    if (!m) continue;
    m = bloquearAvancado(m, nivel, lista);
    sessoes.push({ ...escalarQualidade(m, fCiclo), _slot: 'qual' });
  }
  for (let i = 0; i < comp.rod; i++) {
    const base = achar('c_rodagem8');
    if (base) sessoes.push({ ...escalarSessao(base, fCiclo), _slot: 'rod' });
  }
  if (comp.longao) {
    // Igual ao ciclismo: na semana leve volta ao PISO, nao abaixo dele.
    const alvoL = LONGAO_GERAL_CORRIDA[nivel] ?? LONGAO_GERAL_CORRIDA.intermediario;
    const fracL = [0, 0.5, 1, 0][naCiclo];
    const kmL = Math.round(alvoL.piso + (alvoL.pico - alvoL.piso) * fracL);
    sessoes.push({ ...longaoModelo('corrida', kmL), _slot: 'longao' });
  }
  for (let i = 0; i < comp.regen; i++) {
    const base = achar('c_regen30');
    if (base) sessoes.push({ ...base, _slot: 'regen' });
  }

  const dias = GERAL_CORRIDA_DIAS[f] || GERAL_CORRIDA_DIAS[3];
  const semana = Array.from({ length: 7 }, () => ({ rest: true }));
  const longao = sessoes.find(s => s._slot === 'longao');
  const outros = sessoes.filter(s => s._slot !== 'longao');
  const diasOutros = [...dias];
  if (longao) {
    semana[dias[dias.length - 1]] = longao;
    diasOutros.pop();
  }
  // Intercala forte/fácil — nunca dois dias de impacto alto seguidos.
  const fortes = outros.filter(s => s._slot === 'qual');
  const faceis = outros.filter(s => s._slot !== 'qual');
  const ordem = [];
  while (fortes.length || faceis.length) {
    if (fortes.length) ordem.push(fortes.shift());
    if (faceis.length) ordem.push(faceis.shift());
    if (fortes.length && faceis.length) ordem.push(faceis.shift());
  }
  ordem.forEach((s, i) => { if (diasOutros[i] != null) semana[diasOutros[i]] = s; });

  // Teto de meio de semana, mais curto que o da bike (ver TETO_DIA_UTIL_CORRIDA).
  for (let i = 0; i <= 4; i++) semana[i] = limitarDuracaoDiaUtil(semana[i], TETO_DIA_UTIL_CORRIDA);

  if (ehLeve) semana.forEach(d => { if (!d.rest) d.semanaLeve = true; });
  return semana;
}

export function semanaSugerida(modalidade, chaveFase, distanciaProva = null, semRest = null, nivel = 'intermediario', freq = null, semanaIdx = 0) {
  const sub = SEMANA_FASE[modalidade];
  const plano = (distanciaProva && sub?.[distanciaProva]?.[chaveFase])
    ?? sub?.[chaveFase]
    ?? sub?.geral
    ?? [];
  const lista = modelosProntos(modalidade);

  // SEM PROVA: geradores dedicados (um por modalidade), com composição por
  // FREQUÊNCIA e ciclo de 4 semanas. O caminho comum abaixo depende do alvo da
  // prova pra progredir e monta a semana cortando sessões de um template fixo de
  // 5 — não atende quem treina 6x, e nunca dá semana leve. A corrida tem regras
  // próprias (impacto): ver `semanaGeralCiclismo` e `semanaGeralCorrida`.
  if (!distanciaProva && semRest == null) {
    return modalidade === 'ciclismo'
      ? semanaGeralCiclismo(lista, freq, nivel, semanaIdx)
      : semanaGeralCorrida(lista, freq, nivel, semanaIdx);
  }

  let semana = plano.map(item => {
    if (item === 'rest') return { rest: true };
    return lista.find(m => m.id === item) || { rest: true };
  });

  // Fator de escala da QUALIDADE (tiros) pelo nível: iniciante faz menos volume
  // de alta intensidade. Base científica: mesma lógica do longão (FATOR_NIVEL).
  const fNivel = FATOR_NIVEL[nivel] ?? 1;

  // Progressão ativa quando há longão-alvo p/ a modalidade+prova e semRest conhecido.
  const temAlvo = LONGAO_ALVO[modalidade]?.[distanciaProva];
  const progAtiva = temAlvo && semRest != null && chaveFase !== 'geral' && chaveFase !== 'prova';

  const altMapV = ALT_QUALIDADE[modalidade] || {};
  const leveMapV = ALT_LEVE[modalidade] || {};
  if (!progAtiva) {
    // SEM prova (modo 'geral'): antes devolvia SEMPRE o mesmo plano toda semana.
    // Agora VARIA a semana INTEIRA — em semanas ímpares troca tanto a
    // qualidade (ALT_QUALIDADE) quanto os dias leves/rodagem (ALT_LEVE),
    // não só um treino isolado — fica mesclado como no plano de prova.
    // Trava método avançado p/ iniciante e escala o volume da qualidade pelo nível.
    const variar = (semanaIdx % 2) === 1;
    semana = semana.map(d => {
      if (d.rest) return d;
      // LONGÃO — sem data de prova (semRest desconhecido) ele ficava FIXO toda
      // semana ("parece igual em todos"). Agora, havendo distância-alvo conhecida,
      // progride num ciclo de 4 semanas usando semanaIdx (sobe 3, 4ª é deload),
      // dentro dos limites do LONGAO_ALVO — então o teto do 42k (32km) e o piso
      // do 5k (12km) já vêm de graça, é o mesmo alvo do modo com prova. Sem
      // distância-alvo, mantém o antigo (só escala pelo nível).
      if (d.tipo === 'longao') {
        if (temAlvo) {
          const fracCiclo = [0, 0.5, 1, 0.4][semanaIdx % 4]; // sobe min→pico; 4ª = deload
          const mn = temAlvo.min * fNivel;                       // início forte pelo nível
          const pk = temAlvo.pico * (FATOR_NIVEL_PICO[nivel] ?? 1); // pico suave (race-ready)
          const v = mn + (pk - mn) * fracCiclo;
          return longaoModelo(modalidade, Math.round(v));
        }
        if (fNivel !== 1) {
          const div = modalidade === 'ciclismo' ? 60 : 1000;
          const base = d.valor ? d.valor / div : null;
          return base ? longaoModelo(modalidade, Math.round(base * fNivel)) : d;
        }
        return d;
      }

      // RODAGEM (corrida) — mesmo problema do longão: sem data de prova ficava
      // travada no valor estático (8km) pra sempre. Mesmo ciclo de 4 semanas do
      // longão, com o teto mais modesto do RODAGEM_ALVO. Substitui a alternação
      // cosmética (ALT_LEVE) por progressão de verdade quando há distância-alvo.
      if (d.tipo === 'rodagem' && modalidade === 'corrida') {
        const alvoRod = RODAGEM_ALVO.corrida[distanciaProva];
        if (alvoRod) {
          const fracCiclo = [0, 0.5, 1, 0.4][semanaIdx % 4];
          const mn = alvoRod.min * fNivel, pk = alvoRod.pico * fNivel;
          return rodagemModelo(mn + (pk - mn) * fracCiclo);
        }
        // Sem distância-alvo (condicionamento geral, sem prova nenhuma): a
        // rodagem ficava travada nos 8km estáticos do modelo pra QUALQUER
        // nível — iniciante recebia o mesmo volume que avançado (achado pelo
        // dono: aluna com teste fraco de 3km recebendo rodagem de 8km igual
        // a atleta treinado). Escala pelo mesmo fator do longão.
        if (fNivel !== 1 && d.valor) return rodagemModelo((d.valor / 1000) * fNivel);
      }

      // ENDURANCE (ciclismo) — mesma lógica da rodagem, pro pedal de base.
      if (d.tipo === 'endurance' && modalidade === 'ciclismo') {
        const alvoEnd = ENDURANCE_ALVO.ciclismo[distanciaProva];
        if (alvoEnd) {
          const fracCiclo = [0, 0.5, 1, 0.4][semanaIdx % 4];
          const mn = alvoEnd.min * fNivel, pk = alvoEnd.pico * fNivel;
          return enduranceModeloBike(mn + (pk - mn) * fracCiclo);
        }
        if (fNivel !== 1 && d.valor) return enduranceModeloBike((d.valor / 60) * fNivel);
      }

      const altId = altMapV[d.id] || leveMapV[d.id];
      let model = (variar && altId) ? (lista.find(m => m.id === altId) || d) : d;
      model = bloquearAvancado(model, nivel, lista);
      if (ehQualidade(model.tipo) && fNivel !== 1) model = escalarQualidade(model, fNivel);
      return model;
    });
  const teto = modalidade === 'ciclismo' ? TETO_DIA_UTIL : TETO_DIA_UTIL_CORRIDA;
  // Na SEMANA DA PROVA os dias do template sao deliberados: leve na terca/quarta
  // e nada perto da largada. Redistribuir por espacamento aqui podia empurrar
  // treino pra vespera da corrida — entao essa semana passa intacta.
  const pronta = chaveFase === 'prova'
    ? semana
    : completarFrequencia(aplicarFrequencia(semana, freq, modalidade), freq, modalidade, nivel, chaveFase);
  // Mesmo teto de meio de semana do plano sem prova: ter a prova marcada nao
  // faz o aluno ganhar duas horas livres numa terca.
  for (let i = 0; i <= 4; i++) pronta[i] = limitarDuracaoDiaUtil(pronta[i], teto);
  return pronta;
  }

  const altMap = ALT_QUALIDADE[modalidade] || {};
  const easyId = EASY_DELOAD[modalidade];
  const ehTaper = chaveFase === 'taper';
  const fTaper  = ehTaper ? fatorTaper(distanciaProva, semRest) : null;
  const ehDeload = semanaDeDeload(distanciaProva, chaveFase, semRest, semanaIdx);
  const alternar = ((semRest == null ? semanaIdx : semRest) % 2) === 0; // alterna qualidade em semanas pares
  // Fator de volume da qualidade: no taper reduz (fTaper); no build/pico progride.
  const fQual = ehTaper ? fTaper : fatorQualidade(distanciaProva, chaveFase, semRest, ehDeload, semanaIdx);

  semana = semana.map(d => {
    if (d.rest) return d;

    // 1) LONGÃO — sobrecarga progressiva (build/pico) ou redução (taper)
    if (d.tipo === 'longao') {
      if (ehTaper) {
        // BUG (achado pelo dono, testando a Gabriela p/ 42km): usava o valor
        // ESTÁTICO do modelo antigo (ex. c_long20 = 20km) como base do taper —
        // ficava desalinhado do pico DINÂMICO calculado (ex. 33-36km), gerando
        // taper de 14km/11km em vez de ~23-25km/~13-15km. Agora usa o mesmo
        // pico (escalado pelo nível) que a fase de pico já usa.
        const alvoPicoDin = temAlvo ? temAlvo.pico * (FATOR_NIVEL_PICO[nivel] ?? 1) : null;
        const div = modalidade === 'ciclismo' ? 60 : 1000;
        const base = alvoPicoDin ?? (d.valor ? d.valor / div : null);
        return base != null ? longaoModelo(modalidade, Math.round(base * fTaper)) : d;
      }
      const v = volumeLongaoDaSemana(modalidade, distanciaProva, chaveFase, semRest, ehDeload, nivel);
      return v ? longaoModelo(modalidade, v, chaveFase === 'pico') : d;
    }

    // 1b) RODAGEM (corrida) — antes ficava travada no valor estático do modelo
    // (8km) do início ao fim da periodização, mesmo o volume total crescendo.
    // Cresce um pouco também — sem convergência forçada de pico como o longão.
    if (d.tipo === 'rodagem' && modalidade === 'corrida' && RODAGEM_ALVO.corrida[distanciaProva]) {
      const alvo = RODAGEM_ALVO.corrida[distanciaProva];
      if (ehTaper) {
        const base = alvo.pico * (FATOR_NIVEL[nivel] ?? 1);
        return rodagemModelo(base * fTaper);
      }
      const v = volumeRodagemDaSemana(distanciaProva, chaveFase, semRest, ehDeload, nivel);
      return v ? rodagemModelo(v) : d;
    }

    // 1c) ENDURANCE (ciclismo) — mesmo problema da rodagem: o pedal de base
    // ficava travado em 90 min do início ao fim, só o Longão progredindo.
    if (d.tipo === 'endurance' && modalidade === 'ciclismo' && ENDURANCE_ALVO.ciclismo[distanciaProva]) {
      const alvo = ENDURANCE_ALVO.ciclismo[distanciaProva];
      if (ehTaper) {
        const base = alvo.pico * (FATOR_NIVEL[nivel] ?? 1);
        return enduranceModeloBike(base * fTaper);
      }
      const v = volumeEnduranceDaSemana(distanciaProva, chaveFase, semRest, ehDeload, nivel);
      return v ? enduranceModeloBike(v) : d;
    }

    // 2) DELOAD — alta intensidade (Z5) vira treino fácil (recuperação, sem escalar)
    if (ehDeload && d.zona === 'Z5') {
      return lista.find(m => m.id === easyId) || d;
    }

    // 3) Escolhe o treino do dia (alterna a qualidade em semanas pares)
    let model = (alternar && altMap[d.id]) ? (lista.find(m => m.id === altMap[d.id]) || d) : d;

    // 3b) Trava método avançado (VO₂ hardcore) p/ iniciante
    model = bloquearAvancado(model, nivel, lista);

    // 4) PROGRESSÃO DE VOLUME da qualidade (tiros crescem/encolhem; contínuo idem)
    //    escalada tbm pelo nível — iniciante faz menos volume de tiro.
    if (ehQualidade(model.tipo)) {
      model = escalarQualidade(model, fQual * fNivel);
    }

    // 5) SEM PROVA: longão, endurance e rodagem também acompanham o ciclo.
    //    Com prova, quem cuida disso é `volumeLongaoDaSemana` e companhia — mas
    //    elas dependem do alvo da prova, que aqui não existe (ENDURANCE_ALVO[null]
    //    é undefined). Sem isto, só a qualidade variava e o volume de base ficava
    //    congelado: as semanas pareciam ciclar mas o total mal mudava.
    if (semRest == null && ['longao', 'endurance', 'rodagem'].includes(model.tipo)) {
      model = escalarSessao(model, fQual * fNivel);
    }
    return model;
  });

  const teto = modalidade === 'ciclismo' ? TETO_DIA_UTIL : TETO_DIA_UTIL_CORRIDA;
  // Na SEMANA DA PROVA os dias do template sao deliberados: leve na terca/quarta
  // e nada perto da largada. Redistribuir por espacamento aqui podia empurrar
  // treino pra vespera da corrida — entao essa semana passa intacta.
  const pronta = chaveFase === 'prova'
    ? semana
    : completarFrequencia(aplicarFrequencia(semana, freq, modalidade), freq, modalidade, nivel, chaveFase);
  // Mesmo teto de meio de semana do plano sem prova: ter a prova marcada nao
  // faz o aluno ganhar duas horas livres numa terca.
  for (let i = 0; i <= 4; i++) pronta[i] = limitarDuracaoDiaUtil(pronta[i], teto);
  return pronta;
}
