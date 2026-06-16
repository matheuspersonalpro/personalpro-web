import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, serverTimestamp, writeBatch,
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

// ── Exercícios (biblioteca global + exclusivos) ───────────────────────────────

export async function buscarExercicios() {
  const [globalSnap, exclusivoSnap] = await Promise.all([
    getDocs(query(collection(db, 'videosExercicios'), where('tipo', '==', 'global'))),
    getDocs(query(collection(db, 'videosExercicios'), where('personalId', '==', personalId()))),
  ]);
  const global = globalSnap.docs.map(d => ({ id: d.id, ...d.data(), fonte: 'global' }));
  const exclusivos = exclusivoSnap.docs.map(d => ({ id: d.id, ...d.data(), fonte: 'exclusivo' }));
  return [...global, ...exclusivos];
}
