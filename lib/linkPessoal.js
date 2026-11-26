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
// ?codigo= (link aberto do personal, com ou sem &servico=) vai pro MESMO
// formulário (26/11/2026): a mensagem do WhatsApp promete "toque no link,
// preencha seus dados e crie sua senha. Depois é só baixar o app", e esta
// página dizia o contrário (baixe o app e digite o código). A query inteira
// vai junto, então o &servico= chega no formulário. Sem servico, o formulário
// pergunta "Como você treina".
//
// Continuam nesta página: ?relogio= (Garmin), #time= (convite de time por
// e-mail, aluno que já tem conta), código em formato inválido, e quem pede a
// página do código de propósito com &app=1 (prefere baixar o app primeiro e
// digitar o código lá). Sem JavaScript também fica aqui (as lojas aparecem).
export const ENTRAR_WEB = 'https://personalpro-1d4bc.web.app/entrar/';

// Token: 32 bytes em base64url (43 caracteres). Aceita qualquer coisa não
// vazia no formato base64url: quem valida de verdade é o servidor, e um token
// estranho ainda deve cair na tela "Link inválido, peça outro" do formulário,
// não na página do código.
const TOKEN = /^[A-Za-z0-9_-]+$/;
// Código do convite depois de normalizado: o mesmo formato que o servidor
// aceita (functions/entrada.js, personalDoCodigo).
const CODIGO = /^[A-Z0-9]{4,12}$/;

/** Endereço do formulário web pra este link, ou null se fica nesta página. */
export function destinoLinkPessoal(search, hash) {
  const s = String(search || '');
  const h = String(hash || '');
  const t = new URLSearchParams(h.replace(/^#/, '')).get('t') || '';
  if (TOKEN.test(t)) return ENTRAR_WEB + s + h;
  const q = new URLSearchParams(s);
  const c = (q.get('codigo') || '').trim().replace(/[\s-]/g, '').toUpperCase();
  if (CODIGO.test(c) && q.get('app') !== '1') return ENTRAR_WEB + s + h;
  return null;
}

/** Link do formulário pra um código (botão "Criar minha conta" da página). */
export function formularioDoCodigo(search) {
  const q = new URLSearchParams(String(search || ''));
  q.delete('app');
  const s = q.toString();
  return ENTRAR_WEB + (s ? '?' + s : '');
}

// Script inline (vai no HTML estático e roda ANTES da página montar e antes da
// sugestão de idioma): location.replace, pra o botão Voltar não cair aqui de novo.
export function scriptEncaminharLinkPessoal() {
  return `(function(){try{
var s=location.search||'',h=location.hash||'',t=new URLSearchParams(h.replace(/^#/,'')).get('t')||'';
var q=new URLSearchParams(s),c=(q.get('codigo')||'').trim().replace(/[\\s-]/g,'').toUpperCase();
if(!${TOKEN.toString()}.test(t)&&!(${CODIGO.toString()}.test(c)&&q.get('app')!=='1'))return;
location.replace(${JSON.stringify(ENTRAR_WEB)}+s+h);
}catch(e){}})();`;
}
