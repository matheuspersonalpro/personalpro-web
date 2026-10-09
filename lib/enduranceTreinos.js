/**
 * Helpers do construtor de planilha de endurance (E2).
 *
 * Funções PURAS (sem UI, sem Firestore): catálogo de tipos de treino,
 * cálculo de volume semanal, datas da semana e periodização simples.
 *
 * Uma SESSÃO (doc em `treinosEndurance`) tem o formato:
 *   { personalId, alunoId, modalidade, data:'YYYY-MM-DD',
 *     tipo, titulo, medida:'tempo'|'distancia', valor, zona, detalhe,
 *     status:'planejado'|'feito'|'pulado', criadoEm }
 */

// ── Catálogo de tipos de treino (POR MODALIDADE — métodos diferentes) ────────
// Cores alinhadas às zonas (enduranceZonas.js).

// CORRIDA: volume por distância (km), tiros, fartlek, educativos.
export const TIPOS_CORRIDA = [
  { id: 'regenerativo', nome: 'Regenerativo',        icon: 'sleep',               cor: '#34d399', zona: 'Z1', medida: 'tempo' },
  { id: 'rodagem',      nome: 'Rodagem / Base',      icon: 'run',                 cor: '#3B82F6', zona: 'Z2', medida: 'distancia' },
  { id: 'longao',       nome: 'Longão',              icon: 'map-marker-distance', cor: '#3B82F6', zona: 'Z2', medida: 'distancia' },
  { id: 'tempo',        nome: 'Tempo / Limiar',      icon: 'speedometer',         cor: '#fbbf24', zona: 'Z4', medida: 'tempo' },
  { id: 'intervalado',  nome: 'Intervalado / Tiros', icon: 'lightning-bolt',      cor: '#fb7185', zona: 'Z5', medida: 'distancia' },
  { id: 'fartlek',      nome: 'Fartlek',             icon: 'sine-wave',           cor: '#fb923c', zona: 'Z3', medida: 'tempo' },
  { id: 'subidas',      nome: 'Subidas / Força',     icon: 'trending-up',         cor: '#a78bfa', zona: 'Z4', medida: 'tempo' },
  { id: 'educativos',   nome: 'Educativos (drills)', icon: 'walk',                cor: '#60a5fa', zona: 'Z1', medida: 'tempo' },
  { id: 'prova',        nome: 'Prova',               icon: 'flag-checkered',      cor: '#fbbf24', zona: null, medida: null },
  { id: 'descanso',     nome: 'Descanso',            icon: 'bed',                 cor: '#64748b', zona: null, medida: null },
];

// CICLISMO: planejado por TEMPO (h) e potência; tem Sweet Spot, FTP, big gear.
export const TIPOS_CICLISMO = [
  { id: 'recuperacao',  nome: 'Recuperação',         icon: 'sleep',               cor: '#34d399', zona: 'Z1', medida: 'tempo' },
  { id: 'endurance',    nome: 'Endurance / Base',    icon: 'bike',                cor: '#3B82F6', zona: 'Z2', medida: 'tempo' },
  { id: 'longao',       nome: 'Longão (volume)',     icon: 'map-marker-distance', cor: '#3B82F6', zona: 'Z2', medida: 'tempo' },
  { id: 'tempo',        nome: 'Tempo',               icon: 'speedometer',         cor: '#93C5FD', zona: 'Z3', medida: 'tempo' },
  { id: 'sweetspot',    nome: 'Sweet Spot',          icon: 'target',              cor: '#fbbf24', zona: 'Z4', medida: 'tempo' },
  { id: 'limiar',       nome: 'Limiar / FTP',        icon: 'flash',               cor: '#fbbf24', zona: 'Z4', medida: 'tempo' },
  { id: 'vo2',          nome: 'VO₂máx / Intervalado',icon: 'lightning-bolt',      cor: '#fb7185', zona: 'Z5', medida: 'tempo' },
  { id: 'forca',        nome: 'Força / Subida',      icon: 'trending-up',         cor: '#a78bfa', zona: 'Z4', medida: 'tempo' },
  { id: 'anaerobico',   nome: 'Anaeróbico',          icon: 'rocket-launch-outline', cor: '#fb7185', zona: 'Z6', medida: 'tempo' },
  { id: 'sprint',       nome: 'Sprints / Neuro',     icon: 'flash-outline',       cor: '#f472b6', zona: 'Z7', medida: 'tempo' },
  { id: 'prova',        nome: 'Prova',               icon: 'flag-checkered',      cor: '#fbbf24', zona: null, medida: null },
  { id: 'descanso',     nome: 'Descanso',            icon: 'bed',                 cor: '#64748b', zona: null, medida: null },
];

/** Lista de tipos da modalidade. */
export function tiposPorModalidade(modalidade) {
  return modalidade === 'ciclismo' ? TIPOS_CICLISMO : TIPOS_CORRIDA;
}

// Lista unificada (ids podem repetir entre modalidades — lookup prioriza a modalidade).
const _TODOS = [...TIPOS_CORRIDA, ...TIPOS_CICLISMO];

/** Busca um tipo por id (preferindo a modalidade informada). */
export function tipoTreino(id, modalidade) {
  const lista = modalidade ? tiposPorModalidade(modalidade) : _TODOS;
  return lista.find(t => t.id === id)
    || _TODOS.find(t => t.id === id)
    || (modalidade ? tiposPorModalidade(modalidade)[1] : TIPOS_CORRIDA[1]);
}

// Compat: alguns lugares só precisam checar se um texto é nome de tipo.
export const TIPOS_TREINO = _TODOS;

// ── Dias da semana ──────────────────────────────────────────────────────────
export const DIAS_SEMANA_CURTO = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/** Segunda-feira (00:00) da semana que contém `d`. */
export function inicioDaSemana(d = new Date()) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  const dow = dt.getDay();             // 0=Dom … 6=Sáb
  const diff = dow === 0 ? -6 : 1 - dow; // volta até segunda
  dt.setDate(dt.getDate() + diff);
  return dt;
}

/** Array com os 7 dias (Date) da semana iniciada em `seg`. */
export function diasDaSemana(seg) {
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(seg);
    dt.setDate(dt.getDate() + i);
    return dt;
  });
}

/** Date → 'YYYY-MM-DD' (chave de dia, sem fuso). */
export function chaveData(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const dia = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

/** 'YYYY-MM-DD' → 'DD/MM'. */
export function dataCurta(chave) {
  if (!chave) return '';
  const [, m, d] = chave.split('-');
  return `${d}/${m}`;
}

// ── Volume ──────────────────────────────────────────────────────────────────

/** Formata distância em metros → "X,XX km" ou "Xm". */
export function formatarDistancia(metros) {
  if (!metros || metros <= 0) return '—';
  if (metros < 1000) return `${Math.round(metros)} m`;
  const km = metros / 1000;
  return `${km.toFixed(km % 1 === 0 ? 0 : 1).replace('.', ',')} km`;
}

/** Formata duração em segundos → "Xh YYmin" / "XX min". */
export function formatarDuracao(seg) {
  if (!seg || seg <= 0) return '—';

  // SEGUNDOS NÃO PODEM SUMIR. Isto arredondava tudo pra minuto, então os 30 s
  // do Billat (30/30) apareciam como "1 min" e os 90 s de recuperação como
  // "2 min" — na lista de modelos E na tela do aluno. Um 30/30 escrito como
  // 1 min/1 min não é o mesmo treino: é o dobro do tiro e o dobro da pausa.
  if (seg < 60) return `${Math.round(seg)} s`;

  const totalMin = Math.floor(seg / 60);
  const resto = Math.round(seg % 60);
  // "1min30" segue o mesmo formato compacto do "1h34" logo abaixo.
  if (totalMin < 60) return resto
    ? `${totalMin}min${String(resto).padStart(2, '0')}`
    : `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  // Formato unico do app: abaixo de 1 h escreve em MINUTOS, de 1 h pra cima
  // escreve em HORA (1h34). Antes esta funcao dizia "1h 34min" e o titulo do
  // treino dizia "1h34" — a mesma duracao escrita de dois jeitos no mesmo card
  // (achado pelo dono). `fmtDur` em enduranceModelos delega pra ca, entao os
  // dois nao podem mais divergir.
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

// ── Estrutura em blocos (estilo TrainingPeaks) ───────────────────────────────
// Sessão pode ter `estrutura: [{bloco,repeticoes,medida,valor,zona,recuperacao,obs}]`.
// Sessões antigas (sem `estrutura`) são tratadas como 1 bloco único implícito
// a partir dos campos planos — nenhum código de leitura precisa checar os
// dois formatos separadamente, só chamar blocosDaSessao().

/** Lista de blocos de uma sessão (real ou sintética a partir dos campos antigos). */
export function blocosDaSessao(sess) {
  if (Array.isArray(sess?.estrutura) && sess.estrutura.length) return sess.estrutura;
  if (!sess?.zona && !sess?.valor) return [];
  return [{
    id: 'unico', bloco: 'continuo', repeticoes: null,
    medida: sess.medida, valor: sess.valor, zona: sess.zona,
    // obs VAZIA de propósito. Aqui ficava `sess.detalhe`, e o texto saía DUAS
    // vezes: uma dentro do bloco sintético e outra na linha logo abaixo, que
    // renderiza `sess.detalhe` justamente quando não há estrutura. Valia pra
    // tela de hoje, pro modal de execução e pro PDF — os três imprimem o
    // detalhe por conta própria nesse caso. Achado pelo Matheus num print.
    recuperacao: null, obs: '',
  }];
}

/** Soma o volume total (tempo em s, distância em m) de uma lista de blocos. */
export function resumoVolume(estrutura) {
  let tempo = 0, distancia = 0;
  for (const b of estrutura || []) {
    const n = Math.max(1, Number(b.repeticoes) || 1);
    const v = (Number(b.valor) || 0) * n;
    const vRec = b.recuperacao ? (Number(b.recuperacao.valor) || 0) * n : 0;
    if (b.medida === 'tempo') tempo += v; else if (b.medida === 'distancia') distancia += v;
    if (b.recuperacao?.medida === 'tempo') tempo += vRec; else if (b.recuperacao?.medida === 'distancia') distancia += vRec;
  }
  // Prioriza a medida com valor: tempo se houver, senão distância.
  return tempo > 0 ? { medida: 'tempo', valor: tempo } : { medida: 'distancia', valor: distancia };
}

/**
 * Volume a EXIBIR de uma sessão — o tempo que o aluno precisa reservar.
 *
 * `sess.valor` é a parte PRINCIPAL do treino (os 2x20 min do FTP), e é assim
 * que tem que ser: a progressão automática escala em cima do estímulo forte, e
 * escalar o treino todo faria o aquecimento crescer junto com os tiros.
 *
 * Só que o aluno lia esse número como se fosse a sessão inteira: "FTP 2x20 min
 * — 40 min" pra um treino que, com aquecimento, recuperação entre séries e
 * volta à calma, leva 1h21. Numa semana de ciclismo isso dava 1h16 a menos do
 * que o aluno de fato treina (achado auditando os modelos).
 *
 * Quando há blocos, o volume exibido passa a ser a soma deles. O título segue
 * carregando a parte principal, então nada se perde.
 */
export function volumeDaSessao(sess) {
  if (Array.isArray(sess?.estrutura) && sess.estrutura.length) return resumoVolume(sess.estrutura);
  return { medida: sess?.medida, valor: Number(sess?.valor) || 0 };
}

/** Resumo de volume de uma lista de sessões: total tempo (s) e distância (m). */
export function volumeSemanal(sessoes) {
  let tempo = 0, distancia = 0, treinos = 0;
  for (const s of sessoes) {
    if (s.tipo === 'descanso' || s.tipo === 'prova') continue;
    treinos += 1;
    // Conta o treino inteiro, não só a parte principal — é o tempo real da
    // semana do aluno. Ver `volumeDaSessao`.
    const { medida, valor } = volumeDaSessao(s);
    const v = Number(valor) || 0;
    if (medida === 'tempo') tempo += v;
    else if (medida === 'distancia') distancia += v;
  }
  return { tempo, distancia, treinos };
}

// ── Anotação de zonas no detalhe (estilo TrainingPeaks) ──────────────────────
// Os modelos marcam a intensidade como token: [Z4] ou [Z1-Z2]. Esta função
// troca o token pelo ALVO real do aluno (pace/potência) + a zona entre
// parênteses:  "[Z4]" → "3:55/km – 4:10/km (Z4)".
// Sem zonas salvas para o aluno → mostra só a zona ("Z4"), sem quebrar nada.

/** Monta um mapa { Z1: 'texto-alvo', ... } a partir do perfil do aluno na modalidade. */
export function mapaZonas(perfilModalidade) {
  const arr = perfilModalidade?.zonas?.zonas;
  if (!Array.isArray(arr)) return null;
  const map = {};
  for (const z of arr) if (z?.zona && z?.texto) map[z.zona] = z.texto;
  return Object.keys(map).length ? map : null;
}

// Extrai os valores numéricos de uma faixa ("3:55/km – 4:10/km" → [235, 250]).
function _faixaNums(texto) {
  const out = [];
  const re = /(\d+):(\d+)|\d+(?:[.,]\d+)?/g;
  let m;
  while ((m = re.exec(texto))) {
    if (m[1] != null) out.push(parseInt(m[1], 10) * 60 + parseInt(m[2], 10));
    else out.push(parseFloat(m[0].replace(',', '.')));
  }
  return out;
}
const _segPace = (seg) => {
  let m = Math.floor(seg / 60), s = Math.round(seg % 60);
  if (s === 60) { m += 1; s = 0; }   // carry: 3:60 → 4:00
  return `${m}:${String(s).padStart(2, '0')}`;
};

// Mescla duas faixas de zonas vizinhas (ex.: Z1-Z2) numa faixa só.
function _mesclarFaixa(a, b) {
  const nums = [..._faixaNums(a), ..._faixaNums(b)];
  if (!nums.length) return a;
  const min = Math.min(...nums), max = Math.max(...nums);
  if (/\/km|:/.test(a)) return `${_segPace(min)} – ${_segPace(max)}/km`;
  if (/W/.test(a))      return `${Math.round(min)} – ${Math.round(max)} W`;
  if (/bpm/.test(a))    return `${Math.round(min)} – ${Math.round(max)} bpm`;
  return `${min} – ${max}`;
}

/** Injeta o alvo real do aluno nos tokens [Zn]/[Zn-Zm] de um texto. */
export function anotarZonasDetalhe(texto, zonasMap) {
  if (!texto) return texto;
  return texto.replace(/\[Z([1-7])(?:\s*-\s*Z([1-7]))?\]/g, (_full, a, b) => {
    const alvoA = zonasMap && zonasMap['Z' + a];
    if (!alvoA) return b ? `Z${a}-Z${b}` : `Z${a}`;        // sem zonas → só a zona
    if (b) {
      const alvoB = zonasMap['Z' + b];
      const faixa = alvoB ? _mesclarFaixa(alvoA, alvoB) : alvoA;
      return `${faixa} (Z${a}-Z${b})`;
    }
    return `${alvoA} (Z${a})`;
  });
}

// ── Periodização simples ──────────────────────────────────────────────────────

/** Nº de semanas (arredondado p/ cima) entre hoje e a prova. */
export function semanasAteProva(dataProvaISO, hoje = new Date()) {
  if (!dataProvaISO) return null;
  const prova = new Date(dataProvaISO + 'T00:00:00');
  const ini = inicioDaSemana(hoje);
  const ms = prova - ini;
  if (ms < 0) return 0;
  return Math.ceil(ms / (7 * 24 * 60 * 60 * 1000));
}

/**
 * Fase de periodização baseada na distância/tipo da prova (evidência científica).
 *
 * Taper por distância:
 *   5km / 10km → 1 semana  (Daniels: 7-10 dias)
 *   21km       → 2 semanas (Daniels / Hudson: 10-14 dias)
 *   42km       → 3 semanas (Pfitzinger: 21 dias — maior taper do atletismo)
 *   ciclismo   → 1 semana  (Coggan / Seiler)
 *
 * Janelas build/pico escalam com a duração do ciclo necessário:
 *   5km:  base >7 sem | build 4-7 | pico 2-3 | taper 1
 *   10km: base >9 sem | build 5-9 | pico 2-4 | taper 1
 *   21km: base >11sem | build 5-11| pico 2-4 | taper 2
 *   42km: base >14sem | build 6-14| pico 3-5 | taper 3
 *
 * @param {number|null} semanasRestantes
 * @param {string|null} distanciaProva  '5km'|'10km'|'21km'|'42km'|'criterium'|'granfondo'|'endurance'|null
 */
// Janelas de periodização por distância/tipo (em semanas) — exportadas para o
// motor de progressão (enduranceModelos) reusar a mesma referência.
export const JANELAS_PROVA = {
  '5km':       { taper: 1, pico: 2, build: 4 },
  '10km':      { taper: 1, pico: 3, build: 5 },
  '21km':      { taper: 2, pico: 4, build: 5 },
  '42km':      { taper: 3, pico: 5, build: 6 },
  'criterium': { taper: 1, pico: 2, build: 4 },
  'granfondo': { taper: 1, pico: 3, build: 5 },
  'endurance': { taper: 1, pico: 3, build: 5 },
};
export const JANELA_PADRAO = { taper: 1, pico: 2, build: 4 };

export function fasePeriodizacao(semanasRestantes, distanciaProva = null) {
  if (semanasRestantes == null) return null;
  if (semanasRestantes <= 0) return {
    chave: 'prova', fase: 'Prova', cor: '#fb7185',
    foco: 'Ativação leve e descanso — chegar inteiro na largada.' };

  const j = JANELAS_PROVA[distanciaProva] || JANELA_PADRAO;

  if (semanasRestantes <= j.taper) return {
    chave: 'taper', fase: 'Polimento (taper)', cor: '#fbbf24',
    foco: distanciaProva === '42km'
      ? `Taper de 3 semanas — redução progressiva de volume, mantendo tiros curtos.`
      : distanciaProva === '21km'
      ? `Taper de 2 semanas — reduz volume, 1 sessão de qualidade por semana.`
      : `Reduz volume e intensidade — chegar descansado e afiado.` };

  if (semanasRestantes <= j.taper + j.pico) return {
    chave: 'pico', fase: 'Pico', cor: '#fb923c',
    foco: distanciaProva === '42km'
      ? `Semanas de pico: longões máximos + ritmo de maratona (Pfitzinger).`
      : distanciaProva === '21km'
      ? `Semanas de pico: longão progressivo + cruise intervals no ritmo de meia.`
      : `Intensidade específica da prova: VO₂máx e/ou limiar.` };

  if (semanasRestantes <= j.taper + j.pico + j.build) return {
    chave: 'build', fase: 'Específico (build)', cor: '#3B82F6',
    foco: distanciaProva === '42km'
      ? `Build maratonístico — aumentar longão progressivamente + tempo runs.`
      : distanciaProva === '21km'
      ? `Build de meia — tempo runs e longão crescente até 20km.`
      : `Introduz limiar e ritmo específico com base já consolidada.` };

  return {
    chave: 'base', fase: 'Base aeróbica', cor: '#34d399',
    foco: distanciaProva === '42km'
      ? `Base maratonística — volume fácil Z1-Z2, cadência, rodagem leve. Daniels E-Pace.`
      : `Volume aeróbico — maioria fácil (Z1-Z2). Fundação para o build.` };
}
