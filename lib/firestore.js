import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, writeBatch, setDoc, deleteField,
} from 'firebase/firestore';
import { db, auth } from './firebase';
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

export async function atualizarAluno(alunoId, dados) {
  await updateDoc(doc(db, 'alunos', alunoId), dados);
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

export async function buscarAvaliacoes(alunoId) {
  const q = query(
    collection(db, 'avaliacoes'),
    where('personalId', '==', personalId()),
    where('alunoId', '==', alunoId),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
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
  await updateDoc(doc(db, 'appConfig', pid), dados).catch(async () => {
    // doc não existe ainda — cria
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
  } catch (e) { return new Set(); }
}

// ── Histórico de cargas ───────────────────────────────────────────────────

export async function buscarHistoricoDoAluno(alunoId) {
  const q = query(collection(db, 'historicoCargas'), where('alunoId', '==', alunoId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
}

// ── Programa muscular automático ──────────────────────────────────────────

export async function atribuirProgramaMuscular(aluno, programaId, mesInicial = 1) {
  const { gerarProgramaMes, PROGRAMAS } = await import('./programaMusculacao.js');
  const pid = personalId();
  // Apaga treinos de programa existentes do aluno — filtra por personalId
  // também (não só alunoId): sem isso, a regra de delete do Firestore
  // (meuDado()) precisa de um get() por documento pra confirmar o dono via
  // /alunos/{alunoId}, e estoura o limite de get()s quando o aluno acumula
  // muitos treinos de programa (vira "permission-denied" mesmo sendo dono).
  const snap = await getDocs(query(collection(db, 'treinos'),
    where('alunoId', '==', aluno.id), where('personalId', '==', pid)));
  const alvos = snap.docs.filter(d => d.data().origem === 'programa');
  if (alvos.length > 0) {
    const lote = writeBatch(db);
    for (const d of alvos) lote.delete(d.ref);
    await lote.commit();
  }
  // Gera e salva treinos do mês inicial — respeita exercícios ocultos/excluídos
  // pelo personal (globais + próprios), igual ao app.
  const ocultos = await buscarExerciciosOcultos();
  const treinos = gerarProgramaMes(programaId, mesInicial, ocultos);
  const categoria = PROGRAMAS[programaId]?.nome || 'Programa';
  for (const t of treinos) {
    await addDoc(collection(db, 'treinos'), {
      nome: t.nome, foco: t.foco, dificuldade: t.dificuldade,
      exercicios: t.exercicios || [],
      categoria, orientacoes: t.orientacoes || '',
      alunoId: aluno.id, alunoNome: aluno.nome || '',
      template: false, origem: 'programa',
      programaId, programaMes: mesInicial,
      personalId: pid, criadoEm: serverTimestamp(),
    });
  }
}

export async function listarProgramas() {
  const { listarProgramas: listar } = await import('./programaMusculacao.js');
  return listar();
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
  const q = query(collection(db, 'treinosEndurance'), where('alunoId', '==', alunoId));
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
    query(collection(db, 'treinosEndurance'), where('alunoId', '==', alunoId))
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
  const q = query(collection(db, 'fotosEvolucao'), where('alunoId', '==', alunoId));
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

export async function registrarPresenca(alunoId, data, presente) {
  const pid = personalId();
  if (!pid) return;
  const id = `${pid}_${alunoId}_${data}`;
  await setDoc(doc(db, 'presencas', id), {
    personalId: pid, alunoId, data, presente,
    atualizadoEm: serverTimestamp(),
  }, { merge: true });
}

export async function buscarPresencasDia(data) {
  const pid = personalId();
  if (!pid) return [];
  const q = query(collection(db, 'presencas'), where('personalId', '==', pid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.data === data);
}

// ── Férias ────────────────────────────────────────────────────────────────────

export async function buscarFeriasPendentes() {
  const pid = personalId();
  if (!pid) return [];
  const q = query(collection(db, 'ferias'), where('personalId', '==', pid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(f => f.status === 'pendente');
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
