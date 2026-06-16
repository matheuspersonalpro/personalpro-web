'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [personal, setPersonal] = useState(undefined); // undefined = carregando

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) { setPersonal(null); return; }
      const snap = await getDoc(doc(db, 'usuarios', user.uid));
      const dados = snap.data() || {};
      if (snap.exists() && (dados.perfil === 'personal' || dados.tipo === 'personal')) {
        setPersonal({ uid: user.uid, ...snap.data() });
      } else {
        setPersonal(null);
      }
    });
  }, []);

  return <AuthContext.Provider value={personal}>{children}</AuthContext.Provider>;
}

export function usePersonal() {
  return useContext(AuthContext);
}
