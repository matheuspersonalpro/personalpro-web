'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [personal, setPersonal] = useState(undefined); // undefined = carregando

  useEffect(() => {
    let unsubSnap = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubSnap) { unsubSnap(); unsubSnap = null; }
      if (!user) { setPersonal(null); return; }

      // onSnapshot garante que assinatura atualiza em tempo real (sem precisar recarregar a página)
      unsubSnap = onSnapshot(doc(db, 'usuarios', user.uid), (snap) => {
        const dados = snap.data() || {};
        if (snap.exists() && (dados.perfil === 'personal' || dados.tipo === 'personal')) {
          setPersonal({ uid: user.uid, ...dados });
        } else {
          setPersonal(null);
        }
      });
    });

    return () => {
      unsubAuth();
      if (unsubSnap) unsubSnap();
    };
  }, []);

  return <AuthContext.Provider value={personal}>{children}</AuthContext.Provider>;
}

export function usePersonal() {
  return useContext(AuthContext);
}
