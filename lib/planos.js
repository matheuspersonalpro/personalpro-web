// Normaliza o NOME DO PLANO para uma das chaves que o resto da conta entende
// (Mensal, Trimestral, Semestral, Anual -- as mesmas de MESES_POR_PLANO em
// lib/financeiro.js, que e copia do app).
//
// Por que existe: no app o plano e uma LISTA FIXA; no site o campo "Nome do plano"
// e texto livre. O codigo antigo do site adivinhava com `includes('3')`, que casa ate
// "Personal 3x na semana" e renovava o aluno por 3 meses. Aqui so reconhece o que
// diz claramente a duracao.
//
// Devolve null quando nao da pra ter certeza. Quem chama NAO deve renovar a data nesse
// caso -- e a mesma regra do app: "melhor nao renovar do que gravar data errada".
export function planoCanonico(nome) {
  const t = String(nome ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // sem acento
    .toLowerCase()
    .trim();
  if (!t) return null;

  // Sem barra invertida de proposito (classes de caractere): o escape se perde facil na passagem por shell.
  const dizMeses = (n) => new RegExp('(^|[^0-9])' + n + '[ ]*(meses|mes|m)([^a-z]|$)').test(t);

  if (/\banual\b/.test(t) || dizMeses(12)) return 'Anual';
  if (/\bsemestral\b/.test(t) || dizMeses(6)) return 'Semestral';
  if (/\btrimestral\b/.test(t) || dizMeses(3)) return 'Trimestral';
  if (/\bmensal\b/.test(t) || dizMeses(1)) return 'Mensal';
  return null;
}
