'use client';

// Página do LINK DE CONVITE do aluno.
//
// POR QUE ELA EXISTE. O convite era um código de 6 caracteres que o personal
// copiava e o aluno digitava. Cada passo perdia gente: erra o caractere, cola
// com espaço, confunde 0 com O, ou desiste. Agora o personal manda um link.
//
// QUEM CAI AQUI. Só quem NÃO tem o app instalado — com o app, o Android e o iOS
// interceptam o link e abrem direto na tela de cadastro, com o código já
// preenchido. Então esta página tem uma tarefa só: levar essa pessoa pra loja
// certa sem perder o código no caminho.
//
// POR QUE O CÓDIGO VEM NA QUERY e não no caminho (`/convite/ABC123`): o site é
// export estático, e caminho dinâmico exigiria uma página gerada na build — os
// códigos não são conhecidos ali.
//
// RELÓGIO GARMIN (?relogio=K7M4Q2). O app PersonalPro no relógio (Connect IQ)
// manda pro celular a notificação "abrir página" com este endereço. Com o app
// instalado, o link abre o app direto no "o relógio mostra este código?". Se o
// sistema abrir o navegador em vez do app (o Garmin Connect às vezes abre a
// página por dentro), esta página NÃO pode mostrar o convite do personal:
// mostra o código e um botão que abre o app pelo esquema próprio.
import { useEffect, useState } from 'react';

const PLAY = 'https://play.google.com/store/apps/details?id=com.matheuspersonalpro.personalpro';
const APPLE = 'https://apps.apple.com/br/app/personal-pro/id6782193425';
// O mesmo alfabeto do código do relógio (sem 0/O, 1/I).
const CODIGO_RELOGIO = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

function Relogio({ codigo }) {
  const abrirApp = `personalpro://convite?relogio=${codigo}`;
  return (
    <main className="min-h-full flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <img src="/logo.png" alt="Personal Pro" className="h-14 mx-auto mb-8" />
          <h1 className="text-3xl font-semibold tracking-tight font-display">
            Conectar seu relógio Garmin
          </h1>
          <p className="mt-3 text-white/60 leading-relaxed">
            Abra o Personal Pro e confira se o relógio mostra este código.
          </p>
        </div>

        <div className="mt-8 w-full rounded-[22px] border border-white/10 bg-white/[0.04] px-6 py-5 text-center">
          <span className="block text-[11px] font-medium tracking-[0.18em] text-white/40">
            CÓDIGO DO RELÓGIO
          </span>
          <span className="mt-1 block font-mono text-3xl tracking-[0.28em] text-accent font-display">
            {codigo.slice(0, 3)} {codigo.slice(3)}
          </span>
        </div>

        <div className="mt-8 space-y-3">
          <a
            href={abrirApp}
            className="block rounded-[14px] bg-accent px-6 py-4 text-center font-semibold text-on-accent transition hover:bg-accent-hover"
          >
            Abrir o Personal Pro
          </a>
        </div>

        <p className="mt-8 text-center text-xs text-white/35 leading-relaxed">
          Ainda não tem o app?{' '}
          <a href={PLAY} className="underline">Android</a>
          {' · '}
          <a href={APPLE} className="underline">iPhone</a>
        </p>
      </div>
    </main>
  );
}

export default function Convite() {
  const [codigo, setCodigo] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [relogio, setRelogio] = useState('');

  // Lido no cliente, não no servidor: com export estático não existe servidor
  // pra ler a query — o HTML é o mesmo pra todo mundo e o código só aparece aqui.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const bruto = q.get('codigo') || '';
    setCodigo(bruto.trim().replace(/[\s-]/g, '').toUpperCase());
    const r = (q.get('relogio') || '').trim().toUpperCase();
    if (CODIGO_RELOGIO.test(r)) setRelogio(r);
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

  if (relogio) return <Relogio codigo={relogio} />;

  return (
    <main className="min-h-full flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <img src="/logo.png" alt="Personal Pro" className="h-14 mx-auto mb-8" />
          <h1 className="text-3xl font-semibold tracking-tight font-display">
            Seu personal te convidou
          </h1>
          <p className="mt-3 text-white/60 leading-relaxed">
            Baixe o Personal Pro e entre com o código abaixo. Seus treinos,
            avaliações e agenda ficam todos aqui.
          </p>
        </div>

        {codigo ? (
          <button
            onClick={copiar}
            className="mt-8 w-full rounded-[22px] border border-white/10 bg-white/[0.04] px-6 py-5 text-center transition hover:bg-white/[0.07]"
          >
            <span className="block text-[11px] font-medium tracking-[0.18em] text-white/40">
              CÓDIGO DE CONVITE
            </span>
            <span className="mt-1 block font-mono text-3xl tracking-[0.28em] text-accent font-display">
              {codigo}
            </span>
            <span className="mt-2 block text-xs text-white/40">
              {copiado ? 'Copiado!' : 'Toque para copiar'}
            </span>
          </button>
        ) : (
          // Sem código na URL a página ainda serve: leva pra loja e explica onde
          // conseguir o código. Melhor que uma tela de erro.
          <p className="mt-8 rounded-[22px] border border-white/10 bg-white/[0.04] px-6 py-5 text-center text-sm text-white/50">
            Peça o código de convite ao seu personal — são 6 caracteres.
          </p>
        )}

        <div className="mt-8 space-y-3">
          <a
            href={PLAY}
            className="block rounded-[14px] bg-accent px-6 py-4 text-center font-semibold text-on-accent transition hover:bg-accent-hover"
          >
            Baixar no Android
          </a>
          <a
            href={APPLE}
            className="block rounded-[14px] border border-white/15 px-6 py-4 text-center font-medium transition hover:bg-white/5"
          >
            Baixar no iPhone
          </a>
        </div>

        <p className="mt-8 text-center text-xs text-white/35 leading-relaxed">
          Já tem o app instalado? Abra o Personal Pro, entre com seu e-mail e
          digite o código na tela de vínculo.
        </p>
      </div>
    </main>
  );
}
