'use client';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

async function verificarPersonal(uid) {
  const snap = await getDoc(doc(db, 'usuarios', uid));
  const dados = snap.data() || {};
  if (!snap.exists() || (dados.perfil !== 'personal' && dados.tipo !== 'personal')) {
    await firebaseSignOut(auth);
    throw new Error('Acesso restrito ao personal trainer.');
  }
  return { uid, ...dados };
}

export async function loginPersonal(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return verificarPersonal(cred.user.uid);
}

export async function loginGoogle() {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return verificarPersonal(cred.user.uid);
}

export async function resetSenha(email) {
  if (!email?.trim()) throw new Error('Informe o e-mail para redefinir a senha.');
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logout() {
  await firebaseSignOut(auth);
}
