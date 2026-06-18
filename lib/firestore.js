import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, writeBatch, setDoc,
} from 'firebase/firestore';
import { db, auth } from './firebase';

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
    .filter(d => d.global === true || d.personalId === pid)
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

// ── Histórico de cargas ───────────────────────────────────────────────────

export async function buscarHistoricoDoAluno(alunoId) {
  const q = query(collection(db, 'historicoCargas'), where('alunoId', '==', alunoId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
}
