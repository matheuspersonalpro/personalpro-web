'use client';
// Integração com o Asaas — via Cloud Function `asaasOp` (server-side), mesma
// função que o app mobile usa. A chave de API do personal fica só no servidor
// (Firestore usuarios/{uid}.asaasApiKey, lida via Admin SDK); o site nunca
// vê a chave.
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

async function chamarAsaas(op, params = {}) {
  try {
    const fn  = httpsCallable(functions, 'asaasOp');
    const res = await fn({ op, params });
    return res.data;
  } catch (e) {
    throw new Error(e?.message || 'Não foi possível comunicar com o Asaas.');
  }
}

/** Cobranças da assinatura (não do cliente — evita contaminação de assinatura antiga). */
export async function buscarCobrancasAssinatura(subscriptionId) {
  return chamarAsaas('buscarCobrancasAssinatura', { subscriptionId });
}

/** Atualiza a data da próxima cobrança (usado após férias). novaData em DD/MM/AAAA. */
export async function atualizarProximaCobrancaAsaas(subscriptionId, novaData) {
  return chamarAsaas('atualizarProximaCobranca', { subscriptionId, novaData });
}
