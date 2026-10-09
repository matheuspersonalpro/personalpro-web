// Status dinâmico do aluno (plano e avaliação física).
// Extraído de AlunosPersonal para evitar duplicação com FinanceiroPersonal.

export function calcStatus(alunoOuVenc) {
  const ehObjeto = alunoOuVenc && typeof alunoOuVenc === 'object';
  if (ehObjeto && alunoOuVenc.cobrancaAutomatica) {
    return alunoOuVenc.pagamentoVencido ? 'pendente' : 'ativo';
  }
  const vencimento = ehObjeto ? alunoOuVenc.vencimento : alunoOuVenc;
  if (!vencimento) return 'ativo';
  const [d, m, a] = (vencimento || '').split('/').map(Number);
  if (!d || !m || !a) return 'ativo';
  const venc = new Date(a, m - 1, d);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diff = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return 'pendente';
  if (diff <= 7) return 'vencendo';
  return 'ativo';
}

// Consultoria é avaliada por fotos: os 90 dias contam da última sessão de fotos
// (gravada pelo servidor), nunca de uma avaliação física antiga de quando o
// aluno era presencial.
export function baseAvaliacao(aluno) {
  return aluno?.tipoServico === 'online' ? aluno?.ultimasFotos : aluno?.ultimaAvaliacao;
}

export function infoAvaliacao(ultimaAvaliacao) {
  if (!ultimaAvaliacao) return { status: 'sem', dias: null };
  const data    = ultimaAvaliacao?.toDate?.() ?? new Date(ultimaAvaliacao);
  const proxima = new Date(data);
  proxima.setDate(proxima.getDate() + 90);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dias = Math.ceil((proxima - hoje) / (1000 * 60 * 60 * 24));
  if (dias < 0)  return { status: 'vencida',  dias: Math.abs(dias) };
  if (dias <= 7) return { status: 'vencendo', dias };
  return { status: 'ok', dias };
}
