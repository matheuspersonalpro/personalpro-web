'use client';
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import ConfirmModal from './ConfirmModal';

/**
 * Confirmação com promessa — substitui o window.confirm() nativo (aquele
 * popup branco do navegador, que quebra o tema escuro e ainda mostra os
 * "\n" crus na tela) pelo ConfirmModal do app, sem precisar de um estado +
 * um modal em cada tela.
 *
 * Uso:
 *   const confirm = useConfirm();
 *   if (!await confirm({ title: 'Excluir?', message: '...' })) return;
 */
const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [estado, setEstado] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((opts) => {
    setEstado(typeof opts === 'string' ? { title: opts } : (opts || {}));
    return new Promise((resolve) => { resolverRef.current = resolve; });
  }, []);

  const fechar = (resultado) => {
    setEstado(null);
    resolverRef.current?.(resultado);
    resolverRef.current = null;
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmModal
        open={!!estado}
        title={estado?.title}
        message={estado?.message}
        confirmLabel={estado?.confirmLabel}
        danger={estado?.danger !== false}
        onConfirm={() => fechar(true)}
        onCancel={() => fechar(false)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
