'use client';
import { signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export async function loginPersonal(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, 'usuarios', cred.user.uid));
  const dados = snap.data() || {};
  if (!snap.exists() || (dados.perfil !== 'personal' && dados.tipo !== 'personal')) {
    await firebaseSignOut(auth);
    throw new Error('Acesso restrito ao personal trainer.');
  }
  return { uid: cred.user.uid, ...snap.data() };
}

export async function logout() {
  await firebaseSignOut(auth);
}
