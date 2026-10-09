'use client';
// Relatório mensal de evolução do aluno: a Cloud Function `relatorioMensalAluno` calcula os números
// e escreve a abertura (a mesma que o app chama). O site só desenha.
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

/** Devolve { texto, dados, vazio?, semTexto?, cache? }. `vazio` e `semTexto` NÃO são erro. */
export async function gerarRelatorioMensalAluno(alunoId, anoMes = null, forcar = false) {
  const fn = httpsCallable(functions, 'relatorioMensalAluno');
  const res = await fn({ alunoId, anoMes, forcar });
  return res.data;
}
