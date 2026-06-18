import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, writeBatch,
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
    const { setDoc } = await import('firebase/firestore');
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
