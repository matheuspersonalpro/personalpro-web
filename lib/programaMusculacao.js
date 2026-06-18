/**
 * MOTOR DE PROGRAMAS DE MUSCULAÇÃO — 12 meses progressivos.
 *
 * Substitui os "templates estáticos" por POUCOS programas inteligentes que o
 * app calcula conforme o mês do aluno. Cada programa (ex.: Masculino 4x) é um
 * motor de 12 meses que combina:
 *
 *   1) MÉTODO ONDULATÓRIO  — dentro da sessão, a sequência varia o estímulo
 *      (força 4-6 → hipertrofia 8-12 → resistência 15-20 → isometria).
 *   2) ROTAÇÃO DE EXERCÍCIOS — a cada mês troca a seleção dentro do mesmo
 *      padrão de movimento (índice = (mês-1) % 4). Mês 1 e Mês 5 = mesmos
 *      exercícios → o aluno REVISITA e mede a evolução, mas no bloco mais forte.
 *   3) PROGRESSÃO DE MÉTODOS — técnicas de intensificação só nos ISOLADORES
 *      (compostos pesados evoluem por carga). Sobem por COMPLEXIDADE ao longo
 *      do ano e respeitam gatilhos de segurança (FST-7 só do mês 6 em diante,
 *      giant-set só no bloco final). Base científica: ACSM Progression Models
 *      (2009), Schoenfeld (hipertrofia/proximidade da falha), Bompa/Stone
 *      (periodização).
 *
 * Funções PURAS (sem Firestore/UI) — testáveis isoladamente.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCOS DE DIFICULDADE (macrociclo de 12 meses → 4 blocos de 3 meses)
// RIR começa afastado da falha (técnica/base) e aproxima ao longo do ano.
// ─────────────────────────────────────────────────────────────────────────────
export const BLOCOS = [
  { id: 1, nome: 'Adaptação',      meses: '1-3',   nivel: 'Intermediário', rir: '2-3 reps na reserva',
    foco: 'Consolidar técnica e construir base de volume. Carga controlada, longe da falha. Pico de contração é o único recurso de intensidade, e só nos isoladores.' },
  { id: 2, nome: 'Hipertrofia',    meses: '4-6',   nivel: 'Intermediário', rir: '1-2 reps na reserva',
    foco: 'Aumento de densidade e volume. Entram drop-set e rest-pause nos isoladores. O FST-7 estreia no mês 6 no finalizador de cada grupo.' },
  { id: 3, nome: 'Intensificação', meses: '7-9',   nivel: 'Avançado',      rir: '1 rep na reserva',
    foco: 'Técnicas avançadas (cluster, 6x20, FST-7). Maior proximidade da falha nos finalizadores; compostos seguem por carga.' },
  { id: 4, nome: 'Choque / Pico',  meses: '10-12', nivel: 'Avançado',      rir: '0-1 rep (falha nos finalizadores)',
    foco: 'Máximo estresse metabólico e mecânico: giant-set e cluster nos isoladores. Exige recuperação e sono impecáveis.' },
];

/** Bloco (1-4) a que o mês pertence. */
export function blocoDoMes(mes) {
  const i = Math.min(3, Math.max(0, Math.floor((mes - 1) / 3)));
  return BLOCOS[i];
}

// ─────────────────────────────────────────────────────────────────────────────
// TRILHAS DE MÉTODO — por PAPEL do exercício no treino, indexadas por bloco.
// A complexidade sobe a cada bloco. Compostos pesados NÃO recebem método.
//   pico       → isolador de contração (deltoide post., bíceps, etc.)
//   densidade  → isolador de máquina no miolo do treino
//   metabolico → finalizador do grupo (vitrine das técnicas mais intensas)
// Gatilhos de segurança aplicados em metodoDoMes().
// ─────────────────────────────────────────────────────────────────────────────
const TRILHA_METODO = {
  //                bloco1                bloco2        bloco3         bloco4
  pico:       ['Pico de contração', 'Rest-pause',  'Cluster set',  'Cluster set'],
  densidade:  ['Rest-pause',        'Drop-set',    '6x20',         'Drop-set'],
  metabolico: ['6x20',              'FST-7',       'FST-7',        'Giant-set'],
};

/** Método (nome que casa com METODOS do app) para um papel + mês. */
function metodoDoMes(role, mes) {
  if (!role) return null;
  const b = blocoDoMes(mes).id;
  let m = (TRILHA_METODO[role] || [])[b - 1] || null;
  // Gatilho científico: FST-7 é avançado → só a partir do mês 6. Antes disso o
  // finalizador usa 6x20 (não Drop-set, pra não colidir com o densidade).
  if (m === 'FST-7' && mes < 6) m = '6x20';
  return m;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROTAÇÃO DE EXERCÍCIOS — cada base do M1 tem 3 equivalentes do MESMO padrão.
// índice 0 = base (mês 1/5/9) · 1,2,3 = variações. Todos exercícios reais da
// biblioteca (estáticos + criados). Os que ainda não têm vídeo recebem depois.
// ─────────────────────────────────────────────────────────────────────────────
export const VARIACOES = {
  // ── Peitoral ──
  'Supino Reto com Barra':            ['Supino Reto com Halteres', 'Supino Máquina', 'Supino Reto Articulado'],
  'Supino Inclinado com Halteres':    ['Supino Inclinado com Barra', 'Supino Inclinado na Máquina', 'Supino Inclinado Articulado'],
  'Crucifixo Inclinado com Halteres': ['Crucifixo Reto com Halteres', 'Crucifixo Máquina', 'Crucifixo Inclinado na Polia'],
  'Cross Over':                       ['Crossover Baixo para Cima', 'Voador (Peck Deck)', 'Crucifixo Reto na Polia'],
  'Supino Fechado':                   ['Supino Máquina Deitado (Pegada Fechada)', 'Flexão de Braços Fechada', 'Tríceps no Banco'],
  // ── Deltóide ──
  'Desenvolvimento com Halteres':     ['Desenvolvimento com Barra Frontal', 'Desenvolvimento na Máquina', 'Press Militar em Pé'],
  'Desenvolvimento Arnold':           ['Desenvolvimento Máquina Articulada', 'Desenvolvimento na Máquina', 'Desenvolvimento com Barra Frontal'],
  'Elevação Lateral com Halteres':    ['Elevação Lateral na Polia', 'Deltóide Máquina', 'Elevação Lateral 45°'],
  'Elevação Lateral na Polia':        ['Elevação Lateral Unilateral na Polia', 'Elevação Lateral com Halteres', 'Deltóide Máquina'],
  'Elevação Frontal com Halter':      ['Elevação Frontal com Barra', 'Elevação Frontal na Polia', 'Elevação Frontal com Corda'],
  'Crucifixo Invertido':              ['Crucifixo Invertido com Halteres', 'Crucifixo Invertido Unilateral na Polia', 'Face Pull'],
  // ── Tríceps ──
  'Tríceps Francês com Halter':       ['Tríceps Testa com Halteres', 'Extensão Unilateral na Polia', 'Extensão de Tríceps na Máquina'],
  'Tríceps na Polia (Corda)':         ['Tríceps na Polia (Barra)', 'Tríceps Prensa', 'Extensão de Tríceps na Máquina'],
  'Tríceps na Polia (Barra)':         ['Tríceps na Polia (Corda)', 'Tríceps Testa na Polia', 'Extensão Unilateral na Polia'],
  'Extensão Unilateral na Polia':     ['Tríceps Coice com Halter', 'Tríceps Francês Unilateral', 'Tríceps na Polia (Corda)'],
  // ── Dorsal ──
  'Remada Curvada com Barra':         ['Remada Cavalinho', 'Remada Serrote', 'Remada Articulada Neutra'],
  'Puxada Frontal com Barra':         ['Puxada Fechada / Triângulo', 'Puxada Articulada', 'Barra Fixa'],
  'Remada Sentada na Máquina':         ['Remada Unilateral na Polia', 'Remada Máquina Fechado', 'Remada Articulada Neutra'],
  'Puxada Articulada':                ['Puxada Articulada Neutra', 'Puxada Articulada Supinada', 'Pulldown com Barra'],
  // ── Bíceps ──
  'Rosca Direta com Barra':           ['Rosca Direta com Halteres', 'Rosca na Polia Baixa', 'Bíceps Máquina'],
  'Rosca Martelo com Halteres':       ['Rosca Martelo Alternada', 'Rosca Martelo na Polia', 'Rosca Martelo 45°'],
  'Rosca Scott com Barra':            ['Rosca Scott Máquina', 'Rosca Concentrada', 'Rosca Inclinada com Halteres'],
  // ── Trapézio ──
  'Encolhimento com Halteres':        ['Encolhimento com Barra', 'Encolhimento na Máquina', 'Encolhimento no Smith'],
  // ── Lombar ──
  'Hiperextensão Lombar (Banco Romano)': ['Superman Solo', 'Bird-dog'],
  // ── Quadríceps ──
  'Agachamento Livre com Barra':      ['Agachamento Smith', 'Agachamento Frontal com Barra', 'Hack Machine'],
  'Leg Press 45°':                    ['Leg Press Horizontal', 'Leg Press 45° Unilateral', 'Agachamento Máquina'],
  'Hack Machine':                     ['Globet Squat', 'Agachamento Smith', 'Leg Press Horizontal'],
  'Afundo com Halteres':              ['Avanço com Halteres', 'Avanço no Smith', 'Passada Reversa'],
  'Cadeira Extensora':                ['Cadeira Extensora Unilateral', 'Hack Machine', 'Leg Press 45° Unilateral'],
  // ── Isquios / Glúteos ──
  'Stiff com Barra Livre':            ['Stiff no Smith', 'Deadlift', 'Bom Dia no Smith'],
  'Mesa Flexora':                     ['Cadeira Flexora', 'Mesa Flexora Unilateral', 'Flexão de Joelho Vertical'],
  'Cadeira Flexora':                  ['Mesa Flexora', 'Cadeira Flexora Unilateral', 'Flexão de Joelho Vertical'],
  'Elevação de Quadril com Barra':    ['Elevação de Quadril com Halter', 'Elevação de Quadril no Smith', 'Elevação Pélvica com Barra Livre'],
  'Elevação Pélvica na Máquina':       ['Elevação Pélvica no Solo', 'Elevação Pélvica Solo Unilateral', 'Glúteo 4 Apoios'],
  'Búlgaro com Halteres':             ['Búlgaro no Smith', 'Agachamento Búlgaro', 'Afundo no Hack Machine'],
  'Extensão de Quadril na Máquina':   ['Coice de Glúteo', 'Extensão de Quadril na Polia', 'Extensão de Quadril Cruzado'],
  // ── Panturrilha ──
  'Panturrilha Em Pé na Máquina':      ['Panturrilha no Leg Press', 'Panturrilha na Smith', 'Gêmeos Sentado'],
  'Panturrilha Sentado na Máquina':    ['Gêmeos Sentado', 'Panturrilha no Degrau', 'Panturrilha no Leg Press'],
  'Panturrilha no Leg Press':         ['Panturrilha Em Pé na Máquina', 'Panturrilha Sentado na Máquina', 'Gêmeos Sentado'],
  // ── Abdômen / Core ──
  'Abdominal na Polia':               ['Abdominal na Máquina', 'Abdominal Máquina Total', 'Abdominal Supra'],
  'Abdominal Supra':                  ['Abdominal na Polia', 'Abdominal Oblíquo', 'Abdominal na Máquina'],
  'Prancha Frontal':                  ['Prancha Lateral', 'Hollow Body', 'Bird-dog'],
  'Prancha Lateral':                  ['Prancha Frontal', 'Hollow Body', 'Bird-dog'],
  // ── Femininos (glúteo/posterior + braço com halter) ──
  'Cadeira Abdutora':                 ['Cadeira Abdutora 45°', 'Cadeira Abdutora a Frente', 'Abdução de Quadril na Máquina'],
  'Cadeira Abdutora 45°':             ['Cadeira Abdutora a Frente', 'Abdução de Quadril na Máquina', 'Abdução de Quadril Solo'],
  'Rosca Direta com Halteres':        ['Rosca na Polia Baixa', 'Rosca Concentrada', 'Bíceps Máquina'],
  'Rosca na Polia Baixa':             ['Rosca Concentrada', 'Bíceps Máquina', 'Rosca Inclinada com Halteres'],
  'Remada Unilateral na Polia':       ['Remada Máquina Unilateral', 'Remada Serrote', 'Remada Articulada Unilateral'],
  'Crucifixo Máquina':                ['Crucifixo Inclinado com Halteres', 'Voador (Peck Deck)', 'Crucifixo Inclinado na Polia'],
  'Agachamento Sumô com Barra':       ['Agachamento Sumo com Halteres', 'Agachamento Sumo no Smith', 'Agachamento Sumo no Leg Press Horizontal'],
  'Elevação de Quadril com Halter':   ['Elevação Pélvica no Solo', 'Elevação Pélvica Solo Unilateral', 'Elevação de Quadril no Smith'],
  'Extensão de Quadril na Polia':     ['Coice de Glúteo', 'Glúteo 4 Apoios', 'Extensão de Quadril Cruzado'],
  'Cadeira Adutora':                  ['Adução de Quadril na Máquina'],
  'Passada Reversa':                  ['Step Up', 'Avanço com Barra', 'Avanço no Smith'],
  // ── Compartilhados ──
  'Face Pull':                        ['Crucifixo Invertido', 'Crucifixo Invertido com Halteres', 'Crucifixo Invertido Unilateral na Polia'],
};

function varEx(base, vIdx) {
  if (vIdx === 0) return base;
  const alt = VARIACOES[base];
  return (alt && alt[vIdx - 1]) || base;
}

// ─────────────────────────────────────────────────────────────────────────────
// SLOTS — cada exercício tem uma FAIXA DE REPETIÇÃO com critério científico
// (ACSM Progression Models 2009; Schoenfeld, rep ranges para hipertrofia):
//   F  força 4-6      → composto principal: tensão mecânica, alto limiar motor
//   H  hipertrofia 8-12 → maioria do volume: faixa-ouro de hipertrofia
//   R  metabólico 12-15 → isoladores/finalizadores: estresse metabólico c/ tensão
//   I  isometria        → tempo sob tensão (core)
// Panturrilha e abdômen (posturais, resistentes à fadiga) usam 15-20 explícito.
// O método do slot pode reescrever as reps (ex.: 6x20 → 6-20).
// ─────────────────────────────────────────────────────────────────────────────
const F = (base, { n = 4, pausa = '120s', role = null } = {})              => ({ base, fase: 'forca',  n, reps: '4-6',  pausa, role });
const H = (base, { n = 4, reps = '8-10', pausa = '90s', role = null } = {}) => ({ base, fase: 'hiper',  n, reps,        pausa, role });
const R = (base, { n = 3, reps = '12-15', pausa = '45s', role = null } = {}) => ({ base, fase: 'metab', n, reps,        pausa, role });
const I = (base, { n = 3, tempo = '40s', pausa = '45s', role = null } = {}) => ({ base, fase: 'iso',    n, reps: tempo,   pausa, role });

// ── TREINOS MASCULINOS ───────────────────────────────────────────────────────
// Cada treino tem exatamente 3 slots com método (1 pico + 1 densidade + 1
// metabolico) → 3 métodos DISTINTOS por sessão em todo bloco. Compostos pesados
// ficam sem método (progressão por carga).
const TREINOS_H = {
  // PUSH/PULL/LEGS — 3x (A cobre o ombro inteiro)
  A3: { nome: 'A — Push: Peito · Ombro · Tríceps', foco: 'Peitoral · Ombro · Tríceps', ex: [
    F('Supino Reto com Barra'),
    H('Supino Inclinado com Halteres', { reps: '8-10' }),
    H('Crucifixo Inclinado com Halteres', { n: 3, reps: '10-12', pausa: '75s', role: 'densidade' }),
    R('Cross Over'),
    H('Desenvolvimento com Halteres', { n: 3, reps: '8-10', pausa: '75s' }),
    R('Elevação Lateral com Halteres', { role: 'pico' }),
    H('Tríceps Francês com Halter', { n: 3, reps: '10-12', pausa: '60s' }),
    R('Tríceps na Polia (Corda)', { role: 'metabolico' }),
  ]},
  // PULL — compartilhado 3x/4x
  B: { nome: 'B — Pull: Dorsal e Bíceps', foco: 'Dorsal · Bíceps · Lombar', ex: [
    F('Remada Curvada com Barra'),
    H('Puxada Frontal com Barra', { reps: '8-10' }),
    H('Remada Sentada na Máquina', { n: 3, reps: '10-12', pausa: '75s', role: 'pico' }),
    R('Puxada Articulada', { role: 'densidade' }),
    H('Rosca Direta com Barra', { n: 3, reps: '10-12', pausa: '60s' }),
    R('Rosca Martelo com Halteres', { role: 'metabolico' }),
    R('Face Pull'),
    H('Hiperextensão Lombar (Banco Romano)', { n: 3, reps: '12-15', pausa: '60s' }),
  ]},
  // LEGS — compartilhado 3x/4x
  C: { nome: 'C — Pernas + Core', foco: 'Quadríceps · Posteriores · Panturrilha · Core', ex: [
    F('Agachamento Livre com Barra', { pausa: '180s' }),
    H('Leg Press 45°'),
    R('Cadeira Extensora', { role: 'densidade' }),
    H('Stiff com Barra Livre'),
    R('Mesa Flexora', { role: 'metabolico' }),
    H('Panturrilha Em Pé na Máquina', { n: 4, reps: '10-12', pausa: '60s', role: 'pico' }),
    R('Abdominal na Polia', { reps: '15-20' }),
    I('Prancha Frontal'),
  ]},
  // PUSH — 4x (peito + tríceps; ombro fica no D)
  A4: { nome: 'A — Push: Peito e Tríceps', foco: 'Peitoral · Tríceps', ex: [
    F('Supino Reto com Barra'),
    H('Supino Inclinado com Halteres', { reps: '8-10' }),
    H('Crucifixo Inclinado com Halteres', { n: 3, reps: '10-12', pausa: '75s', role: 'densidade' }),
    R('Cross Over'),
    H('Supino Fechado', { n: 3, reps: '8-10', pausa: '90s' }),
    H('Tríceps Francês com Halter', { n: 3, reps: '10-12', pausa: '60s', role: 'pico' }),
    H('Tríceps na Polia (Barra)', { n: 3, reps: '10-12', pausa: '60s' }),
    R('Extensão Unilateral na Polia', { role: 'metabolico' }),
  ]},
  // OMBRO — 4x (trapézio entra aqui)
  D: { nome: 'D — Deltoide + Trapézio + Panturrilha', foco: 'Ombro (3 feixes) · Trapézio · Panturrilha', ex: [
    H('Desenvolvimento com Halteres', { n: 4, reps: '8-10', pausa: '90s' }),
    H('Desenvolvimento Arnold', { n: 3, reps: '10-12', pausa: '75s' }),
    H('Elevação Lateral com Halteres', { n: 3, reps: '12-15', pausa: '60s', role: 'densidade' }),
    R('Elevação Lateral na Polia', { role: 'metabolico' }),
    R('Crucifixo Invertido', { role: 'pico' }),
    H('Encolhimento com Halteres', { n: 3, reps: '12-15', pausa: '60s' }),
    H('Panturrilha Sentado na Máquina', { n: 4, reps: '10-12', pausa: '60s' }),
    R('Panturrilha no Leg Press', { reps: '15-20' }),
  ]},
  // ALTO VOLUME — 5x
  A5: { nome: 'A — Peito + Tríceps', foco: 'Peitoral · Tríceps', ex: [
    F('Supino Reto com Barra'),
    H('Supino Inclinado com Halteres', { reps: '8-10' }),
    H('Crucifixo Inclinado com Halteres', { n: 3, reps: '10-12', pausa: '75s', role: 'densidade' }),
    R('Cross Over', { role: 'metabolico' }),
    H('Supino Fechado', { n: 3, reps: '8-10', pausa: '90s' }),
    H('Tríceps Francês com Halter', { n: 3, reps: '10-12', pausa: '60s', role: 'pico' }),
    R('Tríceps na Polia (Corda)'),
    R('Abdominal Supra', { reps: '15-20' }),
  ]},
  B5: { nome: 'B — Quadríceps + Panturrilha', foco: 'Quadríceps · Panturrilha', ex: [
    F('Agachamento Livre com Barra', { pausa: '180s' }),
    H('Leg Press 45°'),
    H('Hack Machine', { n: 3, reps: '10-12', pausa: '90s' }),
    H('Afundo com Halteres', { n: 3, reps: '10-12', pausa: '75s', role: 'pico' }),
    R('Cadeira Extensora', { role: 'metabolico' }),
    H('Panturrilha Em Pé na Máquina', { n: 4, reps: '10-12', pausa: '60s', role: 'densidade' }),
    R('Panturrilha no Leg Press', { reps: '15-20' }),
    R('Abdominal na Polia', { reps: '15-20' }),
  ]},
  C5: { nome: 'C — Dorsal + Bíceps', foco: 'Dorsal · Bíceps · Lombar', ex: [
    F('Remada Curvada com Barra'),
    H('Puxada Frontal com Barra', { reps: '8-10' }),
    H('Remada Sentada na Máquina', { n: 3, reps: '10-12', pausa: '75s', role: 'pico' }),
    R('Puxada Articulada', { role: 'densidade' }),
    H('Rosca Direta com Barra', { n: 3, reps: '10-12', pausa: '60s' }),
    H('Rosca Scott com Barra', { n: 3, reps: '10-12', pausa: '60s' }),
    R('Rosca Martelo com Halteres', { role: 'metabolico' }),
    H('Hiperextensão Lombar (Banco Romano)', { n: 3, reps: '12-15', pausa: '60s' }),
  ]},
  D5: { nome: 'D — Posteriores/Glúteos + Core', foco: 'Posteriores · Glúteos · Panturrilha · Core', ex: [
    F('Stiff com Barra Livre'),
    H('Mesa Flexora'),
    H('Elevação de Quadril com Barra', { n: 3, reps: '10-12', pausa: '75s' }),
    R('Cadeira Flexora', { role: 'densidade' }),
    R('Extensão de Quadril na Máquina', { role: 'metabolico' }),
    H('Panturrilha Sentado na Máquina', { n: 3, reps: '12-15', pausa: '60s', role: 'pico' }),
    R('Abdominal na Polia', { reps: '15-20' }),
    I('Prancha Frontal'),
  ]},
  // OMBRO — 5x
  E5: { nome: 'E — Deltoide + Trapézio', foco: 'Ombro (3 feixes) · Trapézio', ex: [
    H('Desenvolvimento com Halteres'),
    H('Desenvolvimento Arnold', { n: 3, reps: '10-12', pausa: '75s' }),
    H('Elevação Frontal com Halter', { n: 3, reps: '10-12', pausa: '60s' }),
    H('Elevação Lateral com Halteres', { n: 3, reps: '12-15', pausa: '60s', role: 'densidade' }),
    R('Elevação Lateral na Polia', { role: 'metabolico' }),
    R('Crucifixo Invertido', { role: 'pico' }),
    R('Face Pull'),
    H('Encolhimento com Halteres', { n: 3, reps: '12-15', pausa: '60s' }),
  ]},

  // ── TREINOS FEMININOS — ênfase em inferiores (perna 2x), glúteo em alta
  //    frequência, superior sem peito e sem trapézio, core em todo treino.
  FA: { nome: 'A — Quadríceps + Glúteos', foco: 'Quadríceps · Glúteos · Panturrilha · Core', ex: [
    F('Agachamento Livre com Barra', { pausa: '180s' }),
    H('Leg Press 45°'),
    R('Cadeira Extensora', { role: 'densidade' }),
    H('Afundo com Halteres', { n: 3, reps: '10-12', pausa: '75s' }),
    H('Elevação de Quadril com Barra', { n: 3, reps: '10-12', pausa: '75s', role: 'pico' }),
    R('Cadeira Abdutora', { role: 'metabolico' }),
    H('Panturrilha Em Pé na Máquina', { n: 3, reps: '12-15', pausa: '60s' }),
    R('Abdominal na Polia', { reps: '15-20' }),
  ]},
  FB: { nome: 'B — Superiores: Dorsal · Ombro · Braços', foco: 'Dorsal · Ombro · Bíceps · Tríceps', ex: [
    F('Puxada Frontal com Barra'),
    H('Remada Sentada na Máquina', { n: 3, reps: '10-12', pausa: '75s', role: 'pico' }),
    H('Desenvolvimento com Halteres', { n: 3, reps: '8-10', pausa: '75s' }),
    R('Elevação Lateral com Halteres', { role: 'densidade' }),
    R('Face Pull'),
    H('Rosca Direta com Halteres', { n: 3, reps: '10-12', pausa: '60s' }),
    H('Rosca Martelo com Halteres', { n: 3, reps: '10-12', pausa: '60s' }),
    R('Tríceps na Polia (Corda)', { role: 'metabolico' }),
  ]},
  // FC — posterior-dominante; sem nenhum exercício em comum com o FA.
  FC: { nome: 'C — Posteriores + Glúteos', foco: 'Posteriores · Glúteos · Panturrilha · Core', ex: [
    F('Stiff com Barra Livre'),
    H('Mesa Flexora', { n: 4, reps: '8-10', pausa: '90s' }),
    H('Elevação Pélvica na Máquina', { n: 3, reps: '10-12', pausa: '75s' }),
    R('Extensão de Quadril na Máquina', { role: 'metabolico' }),
    H('Búlgaro com Halteres', { n: 3, reps: '10-12', pausa: '75s', role: 'pico' }),
    R('Cadeira Flexora', { role: 'densidade' }),
    H('Panturrilha Sentado na Máquina', { n: 3, reps: '12-15', pausa: '60s' }),
    I('Prancha Lateral'),
  ]},
  // ── 4x/5x: superior dividido em PUXAR (B) e EMPURRAR (D) ──
  FBP: { nome: 'B — Puxar: Costas + Bíceps', foco: 'Dorsal · Bíceps · Posterior de ombro', ex: [
    F('Puxada Frontal com Barra'),
    H('Remada Sentada na Máquina', { n: 4, reps: '8-10', pausa: '90s', role: 'pico' }),
    H('Puxada Articulada', { n: 3, reps: '10-12', pausa: '75s' }),
    R('Remada Unilateral na Polia', { role: 'densidade' }),
    R('Face Pull'),
    H('Rosca Direta com Halteres', { n: 3, reps: '10-12', pausa: '60s' }),
    H('Rosca Martelo com Halteres', { n: 3, reps: '10-12', pausa: '60s' }),
    R('Rosca na Polia Baixa', { role: 'metabolico' }),
  ]},
  FDP: { nome: 'D — Empurrar: Ombro + Tríceps', foco: 'Ombro (3 feixes) · Tríceps · Peito (leve)', ex: [
    H('Desenvolvimento com Halteres', { n: 4, reps: '8-10', pausa: '90s' }),
    H('Desenvolvimento Arnold', { n: 3, reps: '10-12', pausa: '75s' }),
    H('Elevação Lateral com Halteres', { n: 3, reps: '12-15', pausa: '60s', role: 'densidade' }),
    R('Elevação Lateral na Polia', { role: 'metabolico' }),
    H('Crucifixo Máquina', { n: 3, reps: '10-12', pausa: '75s' }),
    H('Tríceps Francês com Halter', { n: 3, reps: '10-12', pausa: '60s', role: 'pico' }),
    H('Tríceps na Polia (Barra)', { n: 3, reps: '10-12', pausa: '60s' }),
    R('Extensão Unilateral na Polia'),
  ]},
  // ── 5x: dia de glúteo isolado (6 glúteo/adutor + panturrilha + core) ──
  FE: { nome: 'E — Glúteo Isolado', foco: 'Glúteos · Adutores · Panturrilha · Core', ex: [
    F('Agachamento Sumô com Barra', { pausa: '150s' }),
    H('Elevação de Quadril com Halter', { n: 4, reps: '10-12', pausa: '90s', role: 'pico' }),
    R('Cadeira Abdutora 45°', { role: 'densidade' }),
    R('Extensão de Quadril na Polia', { role: 'metabolico' }),
    H('Cadeira Adutora', { n: 3, reps: '12-15', pausa: '60s' }),
    H('Passada Reversa', { n: 3, reps: '12-15', pausa: '60s' }),
    H('Panturrilha no Leg Press', { n: 3, reps: '12-15', pausa: '60s' }),
    I('Prancha Frontal'),
  ]},

  // ── TREINOS 2x — Full Body A/B Masculino ────────────────────────────────────
  // MA2: polo FORÇA (compostos pesados + isoladores com pico/densidade/metabolico)
  MA2: { nome: 'A — Full Body: Força', foco: 'Full Body · Ênfase Força', ex: [
    F('Agachamento Livre com Barra'),
    F('Remada Curvada com Barra'),
    F('Supino Reto com Barra'),
    H('Puxada Articulada', { n: 3, reps: '10-12', pausa: '75s', role: 'pico' }),
    H('Crucifixo Inclinado com Halteres', { n: 3, reps: '10-12', pausa: '60s', role: 'densidade' }),
    H('Stiff com Barra Livre', { reps: '10-12' }),
    H('Rosca Direta com Barra', { n: 3, reps: '10-12', pausa: '60s', role: 'pico' }),
    R('Tríceps na Polia (Corda)', { role: 'metabolico' }),
  ]},
  // MB2: polo VOLUME (volume maior, reps mais altas, mais isoladores)
  MB2: { nome: 'B — Full Body: Volume', foco: 'Full Body · Ênfase Volume', ex: [
    H('Leg Press 45°', { reps: '10-12' }),
    H('Puxada Frontal com Barra', { reps: '10-12' }),
    H('Supino Inclinado com Halteres', { reps: '10-12' }),
    R('Elevação Lateral com Halteres', { role: 'pico' }),
    H('Remada Sentada na Máquina', { n: 3, reps: '12-15', pausa: '60s', role: 'densidade' }),
    R('Cadeira Extensora', { role: 'metabolico' }),
    H('Rosca Martelo com Halteres', { n: 3, reps: '12-15', pausa: '60s' }),
    H('Tríceps Francês com Halter', { n: 3, reps: '12-15', pausa: '60s', role: 'densidade' }),
  ]},

  // ── TREINOS 2x — Full Body A/B Feminino ─────────────────────────────────────
  // FA2: polo FORÇA — sem peito e sem trapézio, foco glúteo/posterior
  FA2: { nome: 'A — Full Body: Força', foco: 'Full Body · Ênfase Glúteo/Força', ex: [
    F('Agachamento Livre com Barra'),
    F('Stiff com Barra Livre'),
    H('Remada Curvada com Barra', { reps: '8-10' }),
    H('Elevação de Quadril com Barra', { reps: '10-12' }),
    H('Desenvolvimento com Halteres', { n: 3, reps: '10-12', pausa: '75s', role: 'pico' }),
    R('Cadeira Abdutora', { role: 'metabolico' }),
    H('Rosca Direta com Halteres', { n: 3, reps: '12-15', pausa: '60s', role: 'pico' }),
    I('Prancha Frontal'),
  ]},
  // FB2: polo VOLUME — sem peito e sem trapézio, foco posterior/volume
  FB2: { nome: 'B — Full Body: Volume', foco: 'Full Body · Ênfase Posterior/Volume', ex: [
    H('Leg Press 45°', { reps: '12-15' }),
    H('Elevação Pélvica na Máquina', { reps: '12-15', role: 'densidade' }),
    H('Puxada Frontal com Barra', { reps: '12-15' }),
    H('Búlgaro com Halteres', { n: 3, reps: '12-15', pausa: '60s' }),
    R('Extensão de Quadril na Máquina', { role: 'metabolico' }),
    H('Remada Unilateral na Polia', { n: 3, reps: '12-15', pausa: '60s', role: 'pico' }),
    R('Elevação Lateral na Polia', { role: 'pico' }),
    I('Prancha Frontal'),
  ]},
};

// ─────────────────────────────────────────────────────────────────────────────
// PROGRAMAS — cada um aponta para a lista de treinos por frequência.
// ─────────────────────────────────────────────────────────────────────────────
export const PROGRAMAS = {
  'masc_3x': { sexo: 'M', freq: 3, nome: 'Masculino · 3x/semana', treinos: ['A3', 'B', 'C'],
               desc: 'Push/Pull/Legs em 3 dias. "A" cobre o ombro inteiro (não há dia exclusivo).' },
  'masc_4x': { sexo: 'M', freq: 4, nome: 'Masculino · 4x/semana', treinos: ['A4', 'B', 'C', 'D'],
               desc: 'Push/Pull/Legs + dia dedicado de ombro e trapézio.' },
  'masc_5x': { sexo: 'M', freq: 5, nome: 'Masculino · 5x/semana', treinos: ['A5', 'B5', 'C5', 'D5', 'E5'],
               desc: 'Alto volume com pernas divididas e dia exclusivo de ombro/trapézio.' },
  'fem_3x': { sexo: 'F', freq: 3, nome: 'Feminino · 3x/semana', treinos: ['FA', 'FB', 'FC'],
              desc: 'Inferiores 2x: quadríceps/glúteos no A e posteriores/glúteos no C. B é superior completo, sem peito e sem trapézio. Core nos dias de perna.' },
  'fem_4x': { sexo: 'F', freq: 4, nome: 'Feminino · 4x/semana', treinos: ['FA', 'FBP', 'FC', 'FDP'],
              desc: 'Inferiores 2x (quadríceps no A, posteriores/glúteos no C) + superiores divididos em puxar (B) e empurrar (D). Sem trapézio. Core nos dias de perna.' },
  'fem_5x': { sexo: 'F', freq: 5, nome: 'Feminino · 5x/semana', treinos: ['FA', 'FBP', 'FC', 'FDP', 'FE'],
              desc: 'Igual ao 4x + dia exclusivo de glúteo (E). Glúteo treinado 3x na semana (A, C e E). Core nos dias de perna.' },
  'masc_2x': { sexo: 'M', freq: 2, nome: 'Masculino · 2x/semana', treinos: ['MA2', 'MB2'],
               desc: 'Full Body A/B com periodização ondulatória semanal (WUP). A = polo força, B = polo volume. Ideal para rotinas ocupadas.' },
  'fem_2x':  { sexo: 'F', freq: 2, nome: 'Feminino · 2x/semana', treinos: ['FA2', 'FB2'],
               desc: 'Full Body A/B com ênfase glúteo e posterior. Sem peito/trapézio. A = polo força, B = polo volume.' },
};

// ── Geração ───────────────────────────────────────────────────────────────────

// Monta um exercício no formato que o app salva (igual ao clone de template).
// excluir = nomes ocultos/excluídos pelo personal → nunca entram na geração.
function montarExercicio(slot, vIdx, mes, usados, excluir) {
  // 1) resolve o exercício do mês (rotação) + anti-colisão/anti-oculto.
  //    Inválido = já usado no programa OU oculto pelo personal.
  const invalido = (n) => usados.has(n) || excluir.has(n);
  let nome = varEx(slot.base, vIdx);
  if (invalido(nome)) {
    const cands = [slot.base, ...(VARIACOES[slot.base] || [])];
    const livre = cands.find(c => !invalido(c));
    // Se base e variações estão todas ocultas/usadas, fica na rotação (raro).
    if (livre) nome = livre;
  }
  usados.add(nome);
  // 2) método pela trilha do papel + mês (com gatilhos de segurança)
  const metodo = metodoDoMes(slot.role, mes);
  // 3) séries — no 6x20 as reps precisam casar com o método (6 reps carga total
  //    + 20 reps com 50%), então o esquema mostrado vira "6-20".
  const reps = metodo === '6x20' ? '6-20' : slot.reps;
  const series = Array.from({ length: slot.n }, () => ({ reps, carga: '', pausa: slot.pausa }));
  return {
    nome,
    series,
    seriesTexto: series.map((s, i) => `S${i + 1}: ${s.reps}`).join(' | '),
    carga: null,
    pausa: slot.pausa,
    metodo,
    videoUrl: null,
    grupoId: '',
  };
}

// Orientações gerais exibidas em todo treino automatizado (texto do Matheus/MFIT).
export const ORIENTACOES_GERAIS =
`Antes de iniciar o treino, fazer uma série com carga leve para reconhecimento muscular.
Use um cronômetro para controlar o tempo de descanso entre as séries.
Mantenha a margem de repetições estipulada em cada exercício/ciclo.

Lembre-se, é muito importante para sua evolução fazer no mínimo 30 minutos de atividade aeróbica diariamente, dê preferência após o treino resistido.`;

/**
 * Gera os treinos de um programa para um mês específico (1-12).
 * @returns {Array} lista de treinos no formato do app
 *   { nome, foco, dificuldade, orientacoes, exercicios }
 */
export function gerarProgramaMes(programaId, mes, excluir = new Set()) {
  const prog = PROGRAMAS[programaId];
  if (!prog) return [];
  const m = Math.min(12, Math.max(1, mes));
  const bloco = blocoDoMes(m);
  const vIdx = (m - 1) % 4;
  // Aceita Set ou array de nomes ocultos/excluídos pelo personal.
  const ocultos = excluir instanceof Set ? excluir : new Set(excluir || []);

  // usados é compartilhado por TODO o programa: nenhum exercício se repete
  // entre os treinos A/B/C (nem pela rotação mensal).
  const usados = new Set();
  return prog.treinos.map(tid => {
    const def = TREINOS_H[tid];
    const exercicios = def.ex.map(slot => montarExercicio(slot, vIdx, m, usados, ocultos));
    return {
      nome: `${def.nome} · Mês ${m}`,
      foco: def.foco,
      dificuldade: bloco.nivel,
      orientacoes: ORIENTACOES_GERAIS,
      exercicios,
    };
  });
}

/** Lista de programas disponíveis (para a tela). */
export function listarProgramas() {
  return Object.entries(PROGRAMAS).map(([id, p]) => ({ id, ...p }));
}

/**
 * Mês-alvo (1-12) do programa com base na data de início (regra de 30 dias).
 * A data de início é a âncora: avanços manuais re-ancoram essa data.
 */
export function mesAlvoPrograma(dataInicioISO, hoje = new Date()) {
  if (!dataInicioISO) return 1;
  const ini = new Date(dataInicioISO + 'T00:00:00');
  const dias = Math.floor((hoje - ini) / 86400000);
  return Math.min(12, Math.max(1, Math.floor(dias / 30) + 1));
}

/** Dias restantes até o próximo mês liberar (0 se já liberou ou no mês 12). */
export function diasParaProximoMes(meta, hoje = new Date()) {
  if (!meta?.dataInicio || (meta.mesAtual || 1) >= 12) return 0;
  const ini = new Date(meta.dataInicio + 'T00:00:00');
  const dias = Math.floor((hoje - ini) / 86400000);
  const faltam = 30 - (dias % 30);
  return mesAlvoPrograma(meta.dataInicio, hoje) > (meta.mesAtual || 1) ? 0 : faltam;
}
