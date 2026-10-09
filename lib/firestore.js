import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, writeBatch, setDoc, deleteField, runTransaction,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { diaAncoraDe, somarMeses } from './financeiro';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

function personalId() {
  return auth.currentUser?.uid;
}

// ── Alunos ────────────────────────────────────────────────────────────────────

export async function buscarAlunos() {
  const q = query(collection(db, 'alunos'), where('personalId', '==', personalId()));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function buscarAluno(alunoId) {
  const snap = await getDoc(doc(db, 'alunos', alunoId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function criarAluno(dados) {
  return addDoc(collection(db, 'alunos'), {
    ...dados,
    personalId: personalId(),
    ativo: true,
    criadoEm: serverTimestamp(),
  });
}

// Funil único de escrita da ficha do aluno -- espelha atualizarAluno do app
// (data/alunos.js). Duas regras que o app ganhou depois de incidentes e que o site
// não tinha:
//
// 1. CARIMBO DE QUEM MEXEU NO VALOR. Em 22/08/2026 o valor de 19 alunos foi
//    multiplicado por 961,48 e a causa nunca foi achada: não havia registro de quem
//    gravou. O gatilho auditarValorAluno (servidor) vê a mudança mas não sabe o
//    autor; este carimbo dá o nome. Sem ele, uma escrita vinda DO SITE (reajuste em
//    lote, edição da ficha) ficaria anônima.
//
// 2. DIA-ÂNCORA DO VENCIMENTO. Quem grava um vencimento sem dizer a âncora está
//    fazendo uma mudança deliberada (plano novo, férias, ajuste manual) e o dia novo
//    passa a ser o contratado. A renovação automática é a única que PRESERVA, e por
//    isso manda diaVencimento explícito junto.
export async function atualizarAluno(alunoId, dados) {
  const { senha, ...dadosSeguros } = dados; // nunca persistir senha

  if (Object.prototype.hasOwnProperty.call(dadosSeguros, 'valor')) {
    dadosSeguros.valorAlteradoPor = auth.currentUser?.uid || null;
    dadosSeguros.valorAlteradoPorEmail = auth.currentUser?.email || null;
    dadosSeguros.valorAlteradoEm = new Date().toISOString();
  }

  const temVenc = Object.prototype.hasOwnProperty.call(dadosSeguros, 'vencimento');
  const temAncora = Object.prototype.hasOwnProperty.call(dadosSeguros, 'diaVencimento');
  if (temVenc && !temAncora) {
    const dia = Number(String(dadosSeguros.vencimento || '').split('/')[0]);
    if (Number.isInteger(dia) && dia >= 1 && dia <= 31) dadosSeguros.diaVencimento = dia;
  }

  await updateDoc(doc(db, 'alunos', alunoId), dadosSeguros);
}

// Renova o plano do aluno a partir de um pagamento do Asaas -- ATOMICO. Copia de
// renovarPlanoPorPagamentoAsaas do app (data/financeiro.js).
//
// Lê ultimoPagamentoAsaasId de DENTRO da transação e só grava (pagamento novo +
// vencimento) se aquele pagamento ainda não foi processado. Sem isso, duas
// sincronizações concorrentes (duas abas, ou site + app abertos ao mesmo tempo)
// liam o mesmo valor "antigo" e criavam o MESMO pagamento em duplicidade.
//
// O id do pagamento é o MESMO que o webhook usa (asaas_<id>): se o servidor já
// registrou, a escrita cai no mesmo documento em vez de criar um segundo. (Antes o
// site usava addDoc, com id aleatório -- e o pagamento entrava em dobro.)
//
// Retorna true se gravou algo novo, false se outra chamada já tinha processado.
export async function renovarPlanoPorPagamentoAsaas(alunoId, alunoNome, pagamentoAsaas, patchExtra = {}) {
  const alunoRef = doc(db, 'alunos', alunoId);
  const pagRef = doc(db, 'pagamentos', `asaas_${pagamentoAsaas.id}`);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(alunoRef);
    if (!snap.exists()) return false;
    const aluno = snap.data();
    if (aluno.ultimoPagamentoAsaasId === pagamentoAsaas.id) return false;

    let partida = new Date();
    if (aluno.vencimento) {
      const [d, m, a] = aluno.vencimento.split('/').map(Number);
      const v = new Date(a, m - 1, d);
      if (v > partida) partida = v;
    }
    // somarMeses (não setMonth): 31/01 + 1 mês tem que virar 28/02, não 03/03. E a
    // âncora vem da ficha: renovar não pode mudar o dia contratado.
    const ancora = diaAncoraDe(aluno);
    const base = somarMeses(partida, 1, ancora);
    const pad = n => String(n).padStart(2, '0');
    const fmt = dt => `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;

    tx.set(pagRef, {
      alunoId,
      alunoNome,
      valor: pagamentoAsaas.value,
      metodo: 'asaas_cartao',
      data: fmt(new Date()),
      descricao: `Mensalidade automática Asaas — ${aluno.plano}`,
      personalId: personalId(),
      asaasPaymentId: pagamentoAsaas.id,
      criadoEm: serverTimestamp(),
    }, { merge: true });
    // pagamentoVencido:false junto: este é o caminho em que o painel descobre o
    // pagamento sozinho quando o webhook não chegou (foi o caso da Célia em 30/08).
    tx.update(alunoRef, {
      ...patchExtra,
      vencimento: fmt(base),
      ...(ancora ? { diaVencimento: ancora } : {}),
      ultimoPagamentoAsaasId: pagamentoAsaas.id,
      pagamentoVencido: false,
    });
    return true;
  });
}

export async function excluirAluno(alunoId) {
  await deleteDoc(doc(db, 'alunos', alunoId));
}

// ── Treinos ───────────────────────────────────────────────────────────────────

export async function buscarTreinos(alunoId) {
  const q = query(
    collection(db, 'treinos'),
    where('personalId', '==', personalId()),
    where('alunoId', '==', alunoId),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function buscarTreinosBiblioteca() {
  const q = query(
    collection(db, 'treinos'),
    where('personalId', '==', personalId()),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function salvarTreino(dados) {
  if (dados.id) {
    const { id, ...rest } = dados;
    await updateDoc(doc(db, 'treinos', id), { ...rest, atualizadoEm: serverTimestamp() });
    return id;
  }
  const ref = await addDoc(collection(db, 'treinos'), {
    ...dados,
    personalId: personalId(),
    criadoEm: serverTimestamp(),
  });
  return ref.id;
}

export async function buscarTreino(treinoId) {
  const snap = await getDoc(doc(db, 'treinos', treinoId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function excluirTreino(treinoId) {
  await deleteDoc(doc(db, 'treinos', treinoId));
}

// ── Financeiro ────────────────────────────────────────────────────────────────

export async function buscarPagamentos() {
  const q = query(collection(db, 'pagamentos'), where('personalId', '==', personalId()));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
}

export async function registrarPagamento(dados) {
  return addDoc(collection(db, 'pagamentos'), {
    ...dados,
    personalId: personalId(),
    criadoEm: serverTimestamp(),
  });
}

export async function excluirPagamento(pagId) {
  await deleteDoc(doc(db, 'pagamentos', pagId));
}

// ── Agenda (sessões) ──────────────────────────────────────────────────────────

export async function buscarSessoes() {
  const q = query(collection(db, 'sessoes'), where('personalId', '==', personalId()));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const cmp = (a.data || '').localeCompare(b.data || '');
      return cmp !== 0 ? cmp : (a.horario || '').localeCompare(b.horario || '');
    });
}

export async function criarSessao(dados) {
  return addDoc(collection(db, 'sessoes'), {
    ...dados,
    personalId: personalId(),
    criadoEm: serverTimestamp(),
  });
}

export async function atualizarSessao(sessaoId, dados) {
  await updateDoc(doc(db, 'sessoes', sessaoId), dados);
}

export async function excluirSessao(sessaoId) {
  await deleteDoc(doc(db, 'sessoes', sessaoId));
}

// ── Avaliações físicas ────────────────────────────────────────────────────────

// Instante da avaliação: a data que o personal ESCOLHEU (dataISO), não a de quando foi
// salva. Avaliação lançada depois com data antiga virava "a última" (mesmo critério do app).
export const tsAvaliacao = av => av?.dataISO ? new Date(av.dataISO).getTime() : (av?.criadoEm?.seconds || 0) * 1000;

export async function buscarAvaliacoes(alunoId) {
  const q = query(
    collection(db, 'avaliacoes'),
    where('personalId', '==', personalId()),
    where('alunoId', '==', alunoId),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (tsAvaliacao(b) - tsAvaliacao(a)) || ((b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0)));
}

export async function criarAvaliacao(dados) {
  return addDoc(collection(db, 'avaliacoes'), {
    ...dados,
    personalId: personalId(),
    criadoEm: serverTimestamp(),
  });
}

export async function excluirAvaliacao(avalId) {
  await deleteDoc(doc(db, 'avaliacoes', avalId));
}

// ── Configurações do personal (appConfig) ────────────────────────────────────

export async function buscarConfigApp() {
  const pid = personalId();
  if (!pid) return {};
  const snap = await getDoc(doc(db, 'appConfig', pid));
  return snap.exists() ? snap.data() : {};
}

// Perfil do personal + assinatura (collection usuarios, onde as Cloud Functions escrevem)
export async function buscarUsuario() {
  const uid = personalId();
  if (!uid) return {};
  const snap = await getDoc(doc(db, 'usuarios', uid));
  return snap.exists() ? snap.data() : {};
}

export async function salvarConfigApp(dados) {
  const pid = personalId();
  if (!pid) return;
  await updateDoc(doc(db, 'appConfig', pid), dados).catch(async (e) => {
    // Só cria um doc novo se o erro for de fato "não existe ainda"
    // (not-found) — qualquer OUTRO erro (permissão, rede) tratado como
    // "doc ausente" disparava um setDoc SEM merge, que apaga todo o resto
    // da configuração salva se o doc já existia e a falha foi outra coisa.
    if (e?.code !== 'not-found') throw e;
    await setDoc(doc(db, 'appConfig', pid), dados);
  });
}

// ── Exercícios customizados (Firebase exerciciosCustom) ──────────────────────

export async function buscarExerciciosCustom() {
  const pid = personalId();
  if (!pid) return [];
  const [propSnap, globalSnap] = await Promise.all([
    getDocs(query(collection(db, 'exerciciosCustom'), where('personalId', '==', pid))),
    getDocs(query(collection(db, 'exerciciosCustom'), where('global', '==', true))),
  ]);
  const vistos = new Set();
  const todos = [];
  for (const d of [...propSnap.docs, ...globalSnap.docs]) {
    if (!vistos.has(d.id)) { vistos.add(d.id); todos.push({ id: d.id, ...d.data() }); }
  }
  return todos;
}

export async function criarExercicioCustom(dados) {
  return addDoc(collection(db, 'exerciciosCustom'), {
    ...dados, personalId: personalId(), criadoEm: serverTimestamp(),
  });
}

// ── Biblioteca de treinos (templates) ─────────────────────────────────────

export async function buscarTemplatesTreinos() {
  const pid = personalId();
  if (!pid) return [];
  const q = query(collection(db, 'treinos'), where('personalId', '==', pid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.template === true);
}

export async function buscarTemplatesGlobais() {
  const q = query(collection(db, 'treinos'), where('global', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.template === true);
}

export async function copiarTemplateGlobal(template) {
  const { id: _id, criadoEm: _c, global: _g, ...dados } = template;
  const ref = await addDoc(collection(db, 'treinos'), {
    ...dados, global: false, personalId: personalId(), criadoEm: serverTimestamp(),
  });
  return ref.id;
}

export async function clonarTemplateParaAlunos(template, alunoIds, alunos) {
  const { id: _id, criadoEm: _c, template: _t, ...dados } = template;
  return Promise.all(alunoIds.map(alunoId => {
    const aluno = alunos.find(a => a.id === alunoId);
    return addDoc(collection(db, 'treinos'), {
      ...dados, alunoId, alunoNome: aluno?.nome || '',
      template: false, personalId: personalId(), criadoEm: serverTimestamp(),
    });
  }));
}

export async function salvarTemplateTreino(dados) {
  if (dados.id) {
    const { id, ...rest } = dados;
    await updateDoc(doc(db, 'treinos', id), { ...rest, atualizadoEm: serverTimestamp() });
    return id;
  }
  const ref = await addDoc(collection(db, 'treinos'), {
    ...dados, template: true, personalId: personalId(), criadoEm: serverTimestamp(),
  });
  return ref.id;
}

// ── Vídeos de exercícios ──────────────────────────────────────────────────

export async function buscarVideosExercicios() {
  const pid = personalId();
  const snap = await getDocs(collection(db, 'exercicioVideos'));
  const globais = {}, proprios = {};
  snap.docs.forEach(d => {
    const data = d.data();
    if (!data.videoUrl) return;
    const ehGlobal = data.global === true || !data.personalId;
    const pertence = data.personalId === pid;
    if (!ehGlobal && !pertence) return;
    const entrada = { id: d.id, nome: data.nome, videoUrl: data.videoUrl, thumbnailUrl: data.thumbnailUrl || '', global: ehGlobal };
    if (pertence) proprios[data.nome] = entrada;
    else globais[data.nome] = entrada;
  });
  return { ...globais, ...proprios };
}

export async function listarVideosExercicios() {
  const pid = personalId();
  const snap = await getDocs(collection(db, 'exercicioVideos'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    // vídeo com URL, e que seja: global, legado (sem personalId = global) ou do próprio personal
    .filter(d => d.videoUrl && (d.global === true || !d.personalId || d.personalId === pid))
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
}

export async function salvarVideoExercicio(nome, videoUrl, thumbnailUrl = '') {
  const pid = personalId();
  const nomeId = nome.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const id = `${pid}_${nomeId}`;
  await setDoc(doc(db, 'exercicioVideos', id), {
    nome, videoUrl, thumbnailUrl, personalId: pid, global: false, atualizadoEm: serverTimestamp(),
  });
  return id;
}

export async function removerVideoExercicio(id) {
  await deleteDoc(doc(db, 'exercicioVideos', id));
}

export async function buscarExerciciosOcultos() {
  try {
    const pid = personalId();
    const [ownSnap, globalSnap] = await Promise.all([
      getDocs(query(collection(db, 'exerciciosOcultos'), where('personalId', '==', pid))),
      getDocs(query(collection(db, 'exerciciosOcultos'), where('global', '==', true))),
    ]);
    const nomes = new Set();
    [...globalSnap.docs, ...ownSnap.docs].forEach(d => nomes.add(d.data().nome));
    return nomes;
  } catch (e) {
    console.error('Erro ao buscar exercícios ocultos:', e);
    return new Set();
  }
}

// ── Histórico de cargas ───────────────────────────────────────────────────

export async function buscarHistoricoDoAluno(alunoId) {
  const q = query(collection(db, 'historicoCargas'), where('alunoId', '==', alunoId), where('personalId', '==', personalId()));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
}

// ── Programa muscular automático ──────────────────────────────────────────

// Data LOCAL "AAAA-MM-DD" ancorada: o bloco `mes` começa há (mes-1)*passo dias. Nada de
// toISOString(): das 21h em diante o UTC já virou o dia seguinte no Brasil e a âncora
// sairia um dia adiantada.
function ancoraDoPrograma(mes, passo) {
  const ini = new Date();
  ini.setDate(ini.getDate() - (mes - 1) * passo);
  const p = (n) => String(n).padStart(2, '0');
  return `${ini.getFullYear()}-${p(ini.getMonth() + 1)}-${p(ini.getDate())}`;
}

// Troca o mês do programa do aluno de forma ATÔMICA (porte de trocarMesProgramaAtomico do
// app): apaga os treinos do mês anterior, cria os do mês novo e atualiza o aluno num único
// writeBatch. Preserva dia da semana e ordem que o personal arrumou (casando pelo nome sem
// o sufixo "· Mês N") e dá um dia padrão na 1ª atribuição.
async function trocarMesProgramaAtomico(aluno, programaId, mes, pid, metaPatch) {
  const { gerarProgramaMes, PROGRAMAS } = await import('./programaMusculacao.js');
  const ocultos = await buscarExerciciosOcultos();
  // Filtra por personalId também (não só alunoId): sem isso a regra de delete precisa de um
  // get() por documento e estoura o limite quando o aluno acumula treinos de programa.
  const snap = await getDocs(query(collection(db, 'treinos'),
    where('alunoId', '==', aluno.id), where('personalId', '==', pid)));
  const antigos = snap.docs.filter(d => d.data().origem === 'programa');
  const novos = gerarProgramaMes(programaId, mes, ocultos);
  const categoria = PROGRAMAS[programaId]?.nome || 'Programa';

  const chaveOrg = (nome) => String(nome || '').replace(/\s*·\s*M[eê]s\s*\d+\s*$/i, '').trim();
  const orgPorNome = {};
  antigos.forEach(d => {
    const a = d.data();
    if (a?.nome) orgPorNome[chaveOrg(a.nome)] = { diaSemana: a.diaSemana ?? null, ordem: a.ordem ?? null };
  });
  const DIA_PADRAO_POR_QTD = {
    1: ['Seg'],
    2: ['Seg', 'Qui'],
    3: ['Seg', 'Qua', 'Sex'],
    4: ['Seg', 'Ter', 'Qui', 'Sex'],
    5: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'],
    6: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    7: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
  };
  const diasPadrao = DIA_PADRAO_POR_QTD[novos.length] || [];

  const montarNovo = (t) => {
    const org = orgPorNome[chaveOrg(t.nome)] || {};
    const diaSemana = org.diaSemana ?? diasPadrao[novos.indexOf(t)] ?? null;
    return {
      nome: t.nome, foco: t.foco, dificuldade: t.dificuldade, categoria,
      orientacoes: t.orientacoes || '', exercicios: t.exercicios || [],
      alunoId: aluno.id, alunoNome: aluno.nome || '', template: false,
      origem: 'programa', programaId, programaMes: mes, personalId: pid,
      ...(diaSemana != null ? { diaSemana } : {}),
      ...(org.ordem != null ? { ordem: org.ordem } : {}),
      criadoEm: serverTimestamp(),
    };
  };

  if (antigos.length + novos.length + 1 <= 498) {
    const lote = writeBatch(db);
    antigos.forEach(d => lote.delete(d.ref));
    novos.forEach(t => lote.set(doc(collection(db, 'treinos')), montarNovo(t)));
    lote.update(doc(db, 'alunos', aluno.id), metaPatch);
    await lote.commit();
  } else {
    for (let i = 0; i < antigos.length; i += 450) {
      const lote = writeBatch(db);
      antigos.slice(i, i + 450).forEach(d => lote.delete(d.ref));
      await lote.commit();
    }
    for (const t of novos) await addDoc(collection(db, 'treinos'), montarNovo(t));
    await updateDoc(doc(db, 'alunos', aluno.id), metaPatch);
  }
  return novos.length;
}

// Atribui um programa ao aluno: materializa o mês inicial e salva os metadados. `ritmo` é
// opcional ({ diasPorBloco }, 0 = "só quando eu mandar"); sem ele PRESERVA o que o aluno já
// tinha, senão reatribuir apagaria calado o ritmo de 45 dias configurado.
export async function atribuirProgramaMuscular(aluno, programaId, mesInicial = 1, ritmo = null) {
  const { PROGRAMAS, DIAS_BLOCO_PADRAO } = await import('./programaMusculacao.js');
  if (!PROGRAMAS[programaId]) throw new Error('Programa inválido');
  const pid = personalId();
  const mes = Math.min(12, Math.max(1, mesInicial));
  const anterior = aluno?.programaMuscular || {};
  const diasPorBloco = ritmo && ritmo.diasPorBloco !== undefined
    ? Number(ritmo.diasPorBloco)
    : (anterior.diasPorBloco !== undefined ? Number(anterior.diasPorBloco) : DIAS_BLOCO_PADRAO);
  // Modo manual (0) não tem passo de calendário; a âncora usa o padrão só pra ter data coerente.
  const passo = diasPorBloco > 0 ? diasPorBloco : DIAS_BLOCO_PADRAO;
  const dataInicio = ancoraDoPrograma(mes, passo);
  await trocarMesProgramaAtomico(aluno, programaId, mes, pid, {
    programaMuscular: { programaId, mesAtual: mes, dataInicio, diasPorBloco },
  });
  return mes;
}

// Muda SÓ o ritmo de troca de bloco, sem regenerar treino: a âncora é recalculada pra o
// bloco ATUAL valer o novo ritmo a partir de hoje.
export async function definirRitmoPrograma(aluno, diasPorBloco) {
  const meta = aluno?.programaMuscular;
  if (!meta?.programaId) return null;
  const { DIAS_BLOCO_PADRAO } = await import('./programaMusculacao.js');
  const dias = Number(diasPorBloco);
  if (!Number.isFinite(dias) || dias < 0) throw new Error('Ritmo inválido');
  const mes = Number(meta.mesAtual) || 1;
  const dataInicio = ancoraDoPrograma(mes, dias > 0 ? dias : DIAS_BLOCO_PADRAO);
  await updateDoc(doc(db, 'alunos', aluno.id), {
    'programaMuscular.diasPorBloco': dias,
    'programaMuscular.dataInicio': dataInicio,
  });
  return { diasPorBloco: dias, dataInicio };
}

// Define manualmente o mês do programa (re-ancorando a data de início).
export async function definirMesPrograma(aluno, mes) {
  const meta = aluno.programaMuscular;
  if (!meta?.programaId) return null;
  return atribuirProgramaMuscular(aluno, meta.programaId, mes);
}

export async function listarProgramas() {
  const { listarProgramas: listar } = await import('./programaMusculacao.js');
  return listar();
}

// Remove o programa do aluno: apaga os treinos gerados por ele (treinos
// manuais permanecem) e limpa o metadado. Só existia no app mobile — o site
// só tinha "atribuir/trocar" programa, então não dava pra só REMOVER sem
// colocar outro no lugar.
export async function removerProgramaMuscular(aluno) {
  const pid = personalId();
  const snap = await getDocs(query(collection(db, 'treinos'),
    where('alunoId', '==', aluno.id), where('personalId', '==', pid)));
  const alvos = snap.docs.filter(d => d.data().origem === 'programa');
  if (alvos.length > 0) {
    const lote = writeBatch(db);
    for (const d of alvos) lote.delete(d.ref);
    await lote.commit();
  }
  await updateDoc(doc(db, 'alunos', aluno.id), { programaMuscular: deleteField() });
}

// Sincroniza com o calendário (porte do app e da Cloud Function virarMesProgramas): se o bloco
// do aluno já venceu, avança UM mês e o bloco novo começa HOJE. Idempotente: chamar ao abrir a
// ficha. Respeita o ritmo do aluno (30/45/60 dias) e o modo "só quando eu mandar".
export async function sincronizarProgramaMuscular(aluno) {
  const { mesAlvoPrograma, diasDoBloco, viraSozinho } = await import('./programaMusculacao.js');
  // SEMPRE relê do Firestore: nunca confia no `aluno.programaMuscular` recebido (um mesAtual
  // local novo com dataInicio velha fazia esta função REGREDIR o mês sozinha).
  const snapAtual = await getDoc(doc(db, 'alunos', aluno.id));
  const meta = snapAtual.data()?.programaMuscular;
  if (!meta?.programaId || !meta.dataInicio) return null;
  // Modo manual: o personal assumiu a troca; só o botão "Avançar mês" mexe.
  if (!viraSozinho(meta)) return meta.mesAtual || 1;
  const atual = Number(meta.mesAtual) || 1;
  if (atual >= 12) return atual;
  const passo = diasDoBloco(meta);
  const alvo = mesAlvoPrograma(meta.dataInicio, new Date(), passo);
  if (alvo <= atual) return atual;

  const novoMes = atual + 1;
  await trocarMesProgramaAtomico(aluno, meta.programaId, novoMes, personalId(), {
    'programaMuscular.mesAtual': novoMes,
    'programaMuscular.dataInicio': ancoraDoPrograma(novoMes, passo),
  });
  return novoMes;
}

// ── Endurance ─────────────────────────────────────────────────────────────────

export async function criarSessaoEndurance(alunoId, modalidade, dados) {
  return addDoc(collection(db, 'treinosEndurance'), {
    alunoId, personalId: personalId(), modalidade,
    data: dados.data, tipo: dados.tipo,
    titulo: dados.titulo || '',
    medida: dados.medida || null,
    valor: dados.valor != null ? Number(dados.valor) : null,
    zona: dados.zona || null,
    detalhe: dados.detalhe || '',
    status: dados.status || 'planejado',
    criadoEm: serverTimestamp(),
  });
}

export async function buscarSessoesEndurance(alunoId, modalidade) {
  const q = query(collection(db, 'treinosEndurance'), where('alunoId', '==', alunoId), where('personalId', '==', personalId()));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s => s.modalidade === modalidade)
    .sort((a, b) => (a.data || '').localeCompare(b.data || ''));
}

export async function atualizarSessaoEndurance(id, dados) {
  const patch = { ...dados };
  if (patch.valor != null) patch.valor = Number(patch.valor);
  await updateDoc(doc(db, 'treinosEndurance', id), patch);
}

export async function deletarSessaoEndurance(id) {
  await deleteDoc(doc(db, 'treinosEndurance', id));
}

export async function buscarModelosEndurance(modalidade) {
  const pid = personalId();
  const q = query(collection(db, 'modelosEndurance'), where('personalId', '==', pid));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(m => m.modalidade === modalidade);
}

export async function salvarModeloEndurance(modalidade, modelo) {
  return addDoc(collection(db, 'modelosEndurance'), {
    ...modelo, modalidade, personalId: personalId(), criadoEm: serverTimestamp(),
  });
}

export async function deletarModeloEndurance(id) {
  await deleteDoc(doc(db, 'modelosEndurance', id));
}

export async function limparPlanoEndurance(alunoId, modalidade) {
  const snap = await getDocs(
    query(collection(db, 'treinosEndurance'), where('alunoId', '==', alunoId), where('personalId', '==', personalId()))
  );
  const alvos = snap.docs.filter(d => d.data().modalidade === modalidade);
  let removidas = 0;
  for (let i = 0; i < alvos.length; i += 450) {
    const lote = writeBatch(db);
    for (const d of alvos.slice(i, i + 450)) lote.delete(d.ref);
    await lote.commit();
    removidas += Math.min(450, alvos.length - i);
  }
  return removidas;
}

// ── Fotos de evolução ─────────────────────────────────────────────────────

export async function buscarFotosEvolucao(alunoId) {
  const q = query(collection(db, 'fotosEvolucao'), where('alunoId', '==', alunoId), where('personalId', '==', personalId()));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
}

export async function uploadFotoEvolucao(alunoId, file, posicao) {
  const pid = personalId();
  const ts = Date.now();
  const path = `fotos/${pid}/${alunoId}/${ts}_${posicao}.jpg`;
  const fRef = storageRef(storage, path);
  await uploadBytes(fRef, file);
  return await getDownloadURL(fRef);
}

export async function salvarFotosEvolucao(alunoId, fotosUrls) {
  return addDoc(collection(db, 'fotosEvolucao'), {
    alunoId, personalId: personalId(),
    fotos: fotosUrls, criadoEm: serverTimestamp(),
  });
}

export async function deletarSessaoFotos(sessaoId) {
  await deleteDoc(doc(db, 'fotosEvolucao', sessaoId));
}

export async function definirProvaEndurance(alunoId, modalidade, dataProva, distanciaProva) {
  await updateDoc(doc(db, 'alunos', alunoId), {
    [`enduranceProfile.${modalidade}.dataProva`]:      dataProva      || null,
    [`enduranceProfile.${modalidade}.distanciaProva`]: distanciaProva || null,
  });
}

export async function salvarTesteEndurance(alunoId, modalidade, dadosTeste, zonas) {
  const pid = personalId();
  await addDoc(collection(db, 'testesEndurance'), {
    alunoId, personalId: pid, modalidade, dadosTeste, zonas,
    criadoEm: serverTimestamp(),
  });
  await updateDoc(doc(db, 'alunos', alunoId), {
    [`enduranceProfile.${modalidade}`]: {
      dadosTeste, zonas, atualizadoEm: new Date().toISOString(),
    },
  });
}

export async function removerTesteEndurance(alunoId, modalidade) {
  await updateDoc(doc(db, 'alunos', alunoId), {
    [`enduranceProfile.${modalidade}.zonas`]:        deleteField(),
    [`enduranceProfile.${modalidade}.dadosTeste`]:   deleteField(),
    [`enduranceProfile.${modalidade}.atualizadoEm`]: deleteField(),
  });
}

// ── Presenças (frequência do aluno) ───────────────────────────────────────────

export async function buscarPresencasDoAluno(alunoId) {
  const pid = personalId();
  if (!pid) return [];
  const q = query(
    collection(db, 'presencas'),
    where('alunoId', '==', alunoId),
    where('personalId', '==', pid),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Mesmo id e mesmos campos do app (data/agenda.js): `${alunoId}_${data}_presencial`.
// Antes o site gravava `${pid}_${alunoId}_${data}` SEM modalidade, e o app lia isso como
// musculação -- a marcação do personal no site não valia na Agenda do app.
export async function registrarPresenca(alunoId, data, presente, alunoNome = '') {
  const pid = personalId();
  if (!pid) return;
  const id = `${alunoId}_${data}_presencial`;
  await setDoc(doc(db, 'presencas', id), {
    alunoId, alunoNome, modalidade: 'presencial', personalId: pid, data, presente,
    registradoEm: serverTimestamp(),
  });
}

export async function buscarPresencasDia(data) {
  const pid = personalId();
  if (!pid) return [];
  const q = query(collection(db, 'presencas'), where('personalId', '==', pid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.data === data);
}

// ── Férias ────────────────────────────────────────────────────────────────────

// Presenças da janela recente (alerta de aluno sumido). Query limitada por data, como o app;
// devolve [] se o índice personalId+data não estiver no ar, em vez de quebrar o Início.
export async function buscarPresencasDesde(dataISOInicio) {
  const pid = personalId();
  if (!pid) return [];
  try {
    const q = query(collection(db, 'presencas'), where('personalId', '==', pid), where('data', '>=', dataISOInicio));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('buscarPresencasDesde (índice pode não estar no ar):', e?.message);
    return [];
  }
}

export async function buscarFeriasPendentes() {
  const pid = personalId();
  if (!pid) return [];
  const q = query(collection(db, 'ferias'), where('personalId', '==', pid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(f => f.status === 'pendente');
}

// Pendentes (pra aprovar) + aprovadas (pra tirar da agenda quem está de férias).
export async function buscarFeriasPorStatus() {
  const pid = personalId();
  if (!pid) return { pendentes: [], aprovadas: [] };
  const q = query(collection(db, 'ferias'), where('personalId', '==', pid));
  const snap = await getDocs(q);
  const todas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return { pendentes: todas.filter(f => f.status === 'pendente'), aprovadas: todas.filter(f => f.status === 'aprovada') };
}

export async function atualizarStatusFerias(id, status) {
  await updateDoc(doc(db, 'ferias', id), { status });
}

export async function aprovarFeriasEEstenderPlano(feriaId, alunoId, dias, vencimentoAtual) {
  const [d, m, a] = (vencimentoAtual || '').split('/').map(Number);
  if (!d || !m || !a) throw new Error('Vencimento do aluno inválido');
  const novaData = new Date(a, m - 1, d);
  novaData.setDate(novaData.getDate() + Number(dias || 0));
  const novoVencimento = novaData.toLocaleDateString('pt-BR');
  await updateDoc(doc(db, 'ferias', feriaId), { status: 'aprovada' });
  await updateDoc(doc(db, 'alunos', alunoId), { vencimento: novoVencimento });
  return novoVencimento;
}

// ── Slots livres (reposição) ──────────────────────────────────────────────────

export async function criarSlotLivre(dados) {
  const pid = personalId();
  return addDoc(collection(db, 'slotsLivres'), { ...dados, personalId: pid, criadoEm: serverTimestamp() });
}

export async function buscarSlotsLivres() {
  const pid = personalId();
  if (!pid) return [];
  const q = query(collection(db, 'slotsLivres'), where('personalId', '==', pid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deletarSlotLivre(id) {
  await deleteDoc(doc(db, 'slotsLivres', id));
}

export async function buscarSolicitacoesReposicao() {
  const pid = personalId();
  if (!pid) return [];
  const q = query(collection(db, 'solicitacoesReposicao'), where('personalId', '==', pid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.status === 'aprovada');
}

// ── Troca de horários ─────────────────────────────────────────────────────────

export async function criarTrocaHorario(dados) {
  const pid = personalId();
  return addDoc(collection(db, 'trocaHorarios'), { ...dados, personalId: pid, criadoEm: serverTimestamp() });
}

export async function buscarTrocasHorario() {
  const pid = personalId();
  if (!pid) return [];
  const q = query(collection(db, 'trocaHorarios'), where('personalId', '==', pid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deletarTrocaHorario(id) {
  await deleteDoc(doc(db, 'trocaHorarios', id));
}
