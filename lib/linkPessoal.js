// LINK PESSOAL do aluno ("crie sua senha"): https://personalpro.app.br/convite/#t=<token>.
//
// O personal cadastra o aluno e o servidor monta esse link (PersonalPro,
// functions/conviteSenhaRegras.js). Com o app instalado, o iOS/Android abre o
// app direto na tela "Crie sua senha". SEM o app, o navegador cai AQUI — e
// esta página mostrava só "baixe o app e digite o código", sem código nenhum:
// o aluno baixava, tocava "Criar conta" e o app pedia um código de convite que
// ele não tinha (15/11/2026). O #t= se perdia.
//
// O formulário web que sabe usar o token é o hosting/politica/entrar/ do
// PersonalPro (Firebase Hosting): o aluno vê o personal, confere os dados já
// preenchidos e cria a senha. Então: com #t= no endereço, vai pra lá na hora,
// com a mesma query e o mesmo fragmento. O token fica no FRAGMENTO de ponta a
// ponta (o navegador não manda pra servidor nem põe no Referer).
//
// Só o #t= é encaminhado. ?codigo= (link aberto), ?relogio= (Garmin) e #time=
// (convite de time por e-mail, aluno que já tem conta) continuam nesta página.
export const ENTRAR_WEB = 'https://personalpro-1d4bc.web.app/entrar/';

// Token: 32 bytes em base64url (43 caracteres). Aceita qualquer coisa não
// vazia no formato base64url: quem valida de verdade é o servidor, e um token
// estranho ainda deve cair na tela "Link inválido, peça outro" do formulário,
// não na página do código.
const TOKEN = /^[A-Za-z0-9_-]+$/;

/** Endereço do formulário web pra este link, ou null se não é link pessoal. */
export function destinoLinkPessoal(search, hash) {
  const t = new URLSearchParams(String(hash || '').replace(/^#/, '')).get('t') || '';
  if (!TOKEN.test(t)) return null;
  return ENTRAR_WEB + String(search || '') + String(hash || '');
}

// Script inline (vai no HTML estático e roda ANTES da página montar e antes da
// sugestão de idioma): location.replace, pra o botão Voltar não cair aqui de novo.
export function scriptEncaminharLinkPessoal() {
  return `(function(){try{
var h=location.hash||'',t=new URLSearchParams(h.replace(/^#/,'')).get('t')||'';
if(!${TOKEN.toString()}.test(t))return;
location.replace(${JSON.stringify(ENTRAR_WEB)}+(location.search||'')+h);
}catch(e){}})();`;
}
