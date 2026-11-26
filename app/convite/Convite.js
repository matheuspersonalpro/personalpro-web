'use client';

// Página do LINK DE CONVITE do aluno.
//
// POR QUE ELA EXISTE. O convite era um código de 6 caracteres que o personal
// copiava e o aluno digitava. Cada passo perdia gente: erra o caractere, cola
// com espaço, confunde 0 com O, ou desiste. Agora o personal manda um link.
//
// QUEM CAI AQUI. Só quem NÃO tem o app instalado — com o app, o Android e o iOS
// interceptam o link e abrem direto na tela de cadastro, com o código já
// preenchido. Sem o app, o link com código vai direto pro formulário web
// "crie sua senha" (lib/linkPessoal.js, antes desta página montar). Ela só
// aparece com código pra quem pediu (&app=1) ou se o encaminhamento não rodou:
// mostra o botão do formulário, o código e as lojas.
//
// POR QUE O CÓDIGO VEM NA QUERY e não no caminho (`/convite/ABC123`): o site é
// export estático, e caminho dinâmico exigiria uma página gerada na build — os
// códigos não são conhecidos ali.
import { useEffect, useState } from 'react';
import { PAGINAS } from '@/lib/idioma';
import { formularioDoCodigo } from '@/lib/linkPessoal';
import TrocaIdioma from '@/components/legal/TrocaIdioma';

// A mesma página em espanhol (/es/invitacion/, 29/10/2026). Quem chega no
// /convite/ com o navegador em espanhol é levado pra lá com o ?codigo= junto
// (lib/idioma.js).
const TEXTOS = {
  'pt-BR': {
    titulo: 'Seu personal te convidou',
    sub: 'Baixe o Personal X e entre com o código abaixo. Seus treinos, avaliações e agenda ficam todos aqui.',
    rotuloCodigo: 'CÓDIGO DE CONVITE',
    copiado: 'Copiado',
    toque: 'Toque para copiar',
    criarConta: 'Criar minha conta pelo site',
    subForm: 'Crie sua conta pelo site em 1 minuto e depois baixe o app. Seus treinos, avaliações e agenda ficam todos aqui.',
    ouApp: 'Ou baixe o app e entre com o código:',
    semCodigo: 'Peça o código de convite ao seu personal — são 6 caracteres.',
    android: 'Baixar no Android',
    iphone: 'Baixar no iPhone',
    jaTem: 'Já tem o app instalado? Abra o Personal X, entre com seu e-mail e digite o código na tela de vínculo.',
  },
  en: {
    titulo: 'Your trainer invited you',
    sub: 'Download Personal X and use the code below. Your workouts, assessments, and schedule, all in one place.',
    rotuloCodigo: 'INVITE CODE',
    copiado: 'Copied',
    criarConta: 'Create my account on the web',
    subForm: 'Create your account on the web in 1 minute, then download the app. Your workouts, assessments, and schedule, all in one place.',
    ouApp: 'Or download the app and use the code:',
    toque: 'Tap to copy',
    semCodigo: 'Ask your trainer for your invite code. It’s 6 characters long.',
    android: 'Download for Android',
    iphone: 'Download for iPhone',
    jaTem: 'Already have the app? Open Personal X, sign in or create an account with your email, and enter your invite code.',
  },
  es: {
    titulo: 'Tu entrenador te invitó',
    sub: 'Descarga Personal X y usa el código de abajo. Tus entrenamientos, evaluaciones y agenda, todo en un solo lugar.',
    rotuloCodigo: 'CÓDIGO DE INVITACIÓN',
    copiado: 'Copiado',
    criarConta: 'Crear mi cuenta en la web',
    subForm: 'Crea tu cuenta en la web en 1 minuto y luego descarga la app. Tus entrenamientos, evaluaciones y agenda, todo en un solo lugar.',
    ouApp: 'O descarga la app y usa el código:',
    toque: 'Toca para copiar',
    semCodigo: 'Pídele a tu entrenador el código de invitación: son 6 caracteres.',
    android: 'Descargar para Android',
    iphone: 'Descargar para iPhone',
    jaTem: '¿Ya tienes la app? Abre Personal X, inicia sesión con tu correo y escribe el código de invitación.',
  },
};

const PLAY = 'https://play.google.com/store/apps/details?id=com.matheuspersonalpro.personalpro';
const APPLE = 'https://apps.apple.com/br/app/personal-pro/id6782193425';

export default function Convite({ idioma = 'pt-BR' }) {
  const t = TEXTOS[idioma];
  const [codigo, setCodigo] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [formulario, setFormulario] = useState('');

  // Lido no cliente, não no servidor: com export estático não existe servidor
  // pra ler a query — o HTML é o mesmo pra todo mundo e o código só aparece aqui.
  useEffect(() => {
    const bruto = new URLSearchParams(window.location.search).get('codigo') || '';
    const c = bruto.trim().replace(/[\s-]/g, '').toUpperCase();
    setCodigo(c);
    // Com código, esta página só aparece pra quem pediu (&app=1) ou se o
    // encaminhamento automático não rodou: o formulário continua a um toque.
    if (c) setFormulario(formularioDoCodigo(window.location.search));
  }, []);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Navegador sem permissão de área de transferência (iOS em contexto não
      // seguro, por exemplo). O código está na tela, dá pra selecionar à mão.
    }
  };

  return (
    <main lang={idioma} className="relative min-h-full flex items-center justify-center px-5 py-16">
      <TrocaIdioma atual={idioma} caminhos={PAGINAS.convite} className="absolute right-4 top-4" />
      <div className="w-full max-w-md">
        <div className="text-center">
          <img src="/marca/personal-x-empilhado.svg" alt="Personal X" width={110} height={80} className="h-20 w-auto mx-auto mb-8" />
          <h1 className="text-3xl font-semibold tracking-tight font-display">
            {t.titulo}
          </h1>
          <p className="mt-3 text-white/60 leading-relaxed">
            {formulario ? t.subForm : t.sub}
          </p>
        </div>

        {formulario && (
          <a
            href={formulario}
            className="mt-8 block rounded-[14px] bg-accent px-6 py-4 text-center font-semibold text-on-accent transition hover:bg-accent-hover"
          >
            {t.criarConta}
          </a>
        )}
        {formulario && <p className="mt-8 text-center text-sm text-white/50">{t.ouApp}</p>}

        {codigo ? (
          <button
            onClick={copiar}
            className={`${formulario ? 'mt-3' : 'mt-8'} w-full rounded-[22px] border border-white/10 bg-white/[0.04] px-6 py-5 text-center transition hover:bg-white/[0.07]`}
          >
            <span className="block text-[11px] font-medium tracking-[0.18em] text-white/40">
              {t.rotuloCodigo}
            </span>
            <span className="mt-1 block font-mono text-3xl tracking-[0.28em] text-accent font-display">
              {codigo}
            </span>
            <span className="mt-2 block text-xs text-white/40">
              {copiado ? t.copiado : t.toque}
            </span>
          </button>
        ) : (
          // Sem código na URL a página ainda serve: leva pra loja e explica onde
          // conseguir o código. Melhor que uma tela de erro.
          <p className="mt-8 rounded-[22px] border border-white/10 bg-white/[0.04] px-6 py-5 text-center text-sm text-white/50">
            {t.semCodigo}
          </p>
        )}

        <div className="mt-8 space-y-3">
          <a
            href={PLAY}
            className={formulario
              ? 'block rounded-[14px] border border-white/15 px-6 py-4 text-center font-medium transition hover:bg-white/5'
              : 'block rounded-[14px] bg-accent px-6 py-4 text-center font-semibold text-on-accent transition hover:bg-accent-hover'}
          >
            {t.android}
          </a>
          <a
            href={APPLE}
            className="block rounded-[14px] border border-white/15 px-6 py-4 text-center font-medium transition hover:bg-white/5"
          >
            {t.iphone}
          </a>
        </div>

        <p className="mt-8 text-center text-xs text-white/35 leading-relaxed">
          {t.jaTem}
        </p>
      </div>
    </main>
  );
}
