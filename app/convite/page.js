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
import { useEffect, useState } from 'react';

const PLAY = 'https://play.google.com/store/apps/details?id=com.matheuspersonalpro.personalpro';
const APPLE = 'https://apps.apple.com/br/app/personal-pro/id6782193425';

export default function Convite() {
  const [codigo, setCodigo] = useState('');
  const [copiado, setCopiado] = useState(false);

  // Lido no cliente, não no servidor: com export estático não existe servidor
  // pra ler a query — o HTML é o mesmo pra todo mundo e o código só aparece aqui.
  useEffect(() => {
    const bruto = new URLSearchParams(window.location.search).get('codigo') || '';
    setCodigo(bruto.trim().replace(/[\s-]/g, '').toUpperCase());
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
    <main className="min-h-full flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <img src="/logo.png" alt="Personal Pro" className="h-14 mx-auto mb-8" />
          <h1 className="text-3xl font-semibold tracking-tight">
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
            className="mt-8 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-5 text-center transition hover:bg-white/[0.07]"
          >
            <span className="block text-[11px] font-medium tracking-[0.18em] text-white/40">
              CÓDIGO DE CONVITE
            </span>
            <span className="mt-1 block font-mono text-3xl tracking-[0.28em] text-emerald-400">
              {codigo}
            </span>
            <span className="mt-2 block text-xs text-white/40">
              {copiado ? 'Copiado!' : 'Toque para copiar'}
            </span>
          </button>
        ) : (
          // Sem código na URL a página ainda serve: leva pra loja e explica onde
          // conseguir o código. Melhor que uma tela de erro.
          <p className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-5 text-center text-sm text-white/50">
            Peça o código de convite ao seu personal — são 6 caracteres.
          </p>
        )}

        <div className="mt-8 space-y-3">
          <a
            href={PLAY}
            className="block rounded-xl bg-[#3B82F6] px-6 py-4 text-center font-medium transition hover:bg-[#2f74e0]"
          >
            Baixar no Android
          </a>
          <a
            href={APPLE}
            className="block rounded-xl border border-white/15 px-6 py-4 text-center font-medium transition hover:bg-white/5"
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
