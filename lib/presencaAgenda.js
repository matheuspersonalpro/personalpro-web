// Porte de utils/presencaAgenda.js do app: círculo de presença da Agenda do personal.
// A marcação do PERSONAL ('presencial') manda (true ou false); sem ela, acende se o
// aluno fechou a MUSCULAÇÃO no app. Yoga/corrida/aula avulsa não acendem.
export function mapaPresencaAgenda(lista = []) {
  const doPersonal = {};
  const musculacao = {};
  for (const p of lista || []) {
    if (!p?.alunoId) continue;
    const mod = p.modalidade || 'musculacao';
    if (mod === 'presencial') doPersonal[p.alunoId] = p.presente === true;
    else if (mod === 'musculacao' && p.presente === true) musculacao[p.alunoId] = true;
  }
  return { ...musculacao, ...doPersonal };
}

// "DD/MM/AAAA" → Date local (meia-noite) ou null.
function dataDeBR(str) {
  const [d, m, a] = String(str || '').split('/').map(Number);
  if (!d || !m || !a) return null;
  return new Date(a, m - 1, d);
}

// Ids dos alunos com férias APROVADAS cobrindo `data` (porte de alunosDeFeriasNoDia).
export function alunosDeFeriasNoDia(ferias, data = new Date()) {
  const h = new Date(data); h.setHours(0, 0, 0, 0);
  const out = new Set();
  for (const f of ferias || []) {
    if (!f?.alunoId || f.status !== 'aprovada') continue;
    const ini = dataDeBR(f.dataInicio);
    const fim = dataDeBR(f.dataFim) || ini;
    if (ini && fim && fim >= ini && ini <= h && h <= fim) out.add(f.alunoId);
  }
  return out;
}
