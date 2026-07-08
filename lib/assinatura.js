'use client';
import { httpsCallable } from 'firebase/functions';
import { functions, auth } from './firebase';

export const ALUNOS_GRATIS = 3;
export const CARENCIA_DIAS = 7;

export const PLANOS = [
  { id: 'mensal',     meses: 1,  preco: 29.90,  porMes: 29.90 },
  { id: 'trimestral', meses: 3,  preco: 79.90,  porMes: 26.63, de: 89.70,  desconto: '11% OFF' },
  { id: 'semestral',  meses: 6,  preco: 139.90, porMes: 23.32, de: 179.40, desconto: '22% OFF' },
  { id: 'anual',      meses: 12, preco: 219.90, porMes: 18.33, de: 358.80, desconto: '39% OFF', popular: true },
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

export async function criarCheckoutAssinatura(planoId, cpf) {
  await assertAuth();
  const res = await httpsCallable(functions, 'criarCheckout')({ planoId, cpf });
  return res.data;
}

// "Já paguei": consulta o Asaas na hora e libera o acesso se já foi pago
// (não depende só do webhook). @returns {{ status: string }}
export async function verificarPagamentoAssinatura() {
  await assertAuth();
  const res = await httpsCallable(functions, 'verificarPagamento')();
  return res.data;
}
