'use client';
import { httpsCallable } from 'firebase/functions';
import { functions, auth } from './firebase';

export const ALUNOS_GRATIS = 3;
export const CARENCIA_DIAS = 7;

export const PLANOS = [
  { id: 'mensal',     meses: 1,  preco: 34.90,  porMes: 34.90 },
  { id: 'trimestral', meses: 3,  preco: 99.90,  porMes: 33.30, de: 104.70, desconto: '5% OFF' },
  { id: 'semestral',  meses: 6,  preco: 188.90, porMes: 31.48, de: 209.40, desconto: '10% OFF' },
  { id: 'anual',      meses: 12, preco: 355.90, porMes: 29.66, de: 418.80, desconto: '15% OFF', popular: true },
];

export const LABEL_PLANO = {
  mensal: '1 mês', trimestral: '3 meses', semestral: '6 meses', anual: '12 meses',
};

export function fmtBRL(v) {
  return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');
}

export function avaliarAssinatura(assinatura, hoje = new Date()) {
  if (!assinatura || !assinatura.status) {
    return { estado: 'sem', liberado: false, diasRestantes: 0, validade: null };
  }
  const validade = assinatura.validade ? new Date(assinatura.validade) : null;
  const dias = validade ? Math.ceil((validade.getTime() - hoje.getTime()) / 86400000) : -9999;
  const cancelada = assinatura.status === 'cancelada';

  if (!cancelada && (assinatura.status === 'trial' || assinatura.status === 'ativa') && dias >= 0) {
    return { estado: assinatura.status, liberado: true, diasRestantes: dias, validade };
  }
  if (!cancelada && dias < 0 && dias >= -CARENCIA_DIAS) {
    return { estado: 'pendente', liberado: true, diasRestantes: CARENCIA_DIAS + dias, validade };
  }
  return { estado: 'bloqueada', liberado: false, diasRestantes: 0, validade };
}

async function assertAuth() {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Saia e entre novamente.');
  await user.getIdToken(true);
}

export async function iniciarTrialAssinatura() {
  await assertAuth();
  const res = await httpsCallable(functions, 'iniciarTrial')();
  return res.data;
}

export async function criarCheckoutAssinatura(planoId) {
  await assertAuth();
  const res = await httpsCallable(functions, 'criarCheckout')({ planoId });
  return res.data;
}
