'use client';

// Página de consultoria online do Matheus — destino do link da bio do Instagram
// (@matheusseupersonal).
//
// POR QUE ELA EXISTE. O link da bio caía num Linktree que só levava ao WhatsApp.
// Cada interessado virava uma conversa, sem preço, sem explicação e sem como se
// cadastrar sozinho — o que limita quantos alunos ele consegue atender.
//
// POR QUE ELA NÃO PARECE UM SITE DE SOFTWARE. A primeira versão foi refeita: o
// Matheus olhou e disse, com razão, que dava pra perceber que era feita por IA.
// O que entregava era o esqueleto genérico — herói centralizado, grade de cards
// com ícone e uma frase cada, passos 01/02/03, sanfona de perguntas — e o fato
// de ele não estar em lugar nenhum dela. Aqui a foto dele abre a página, o
// vermelho é o da marca dele e não o azul do aplicativo, e as seções têm pesos
// diferentes em vez de serem todas do mesmo tamanho.
//
// ESTÁGIO 1: o formulário leva ao WhatsApp dele com tudo preenchido. Já vende.
// ESTÁGIO 2: o botão cria a assinatura no Asaas e o `asaasWebhook` — que já é
// avisado no PAYMENT_CONFIRMED — cria o aluno sozinho.
//
// A venda acontece na WEB de propósito: cobrança dentro do aplicativo pode ser
// enquadrada pela Apple como compra digital, com comissão e risco de recusa.

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  WHATSAPP, PRECO, DEPOIMENTOS, TRANSFORMACOES, NUMEROS,
  PARA_VOCE, RECEBE, INCLUSO, PASSOS, FAQ, GARANTIA, FOTOS_TOPO,
  MINHA_PARTE, SUA_PARTE, ABERTURA_ACORDO, PROTOCOLO_FOTOS,
} from './dados';

// O CPF SAIU DAQUI, e é a única coisa que a página deixou de perguntar sem
// ter deixado de precisar.
//
// O Asaas não emite cobrança sem CPF, isso continua valendo. O que mudou é
// QUANDO ele é pedido: neste primeiro contato o dado não é usado pra nada — a
// pessoa cai no WhatsApp e o Matheus é quem abre a cobrança depois. Pedir
// documento a alguém que chegou do Instagram trinta segundos atrás só afasta.
//
// Quando o estágio 2 entrar (o botão criando a assinatura no Asaas direto), o
// CPF volta — mas na tela de pagamento, onde a pessoa já decidiu e já entende
// por que ele está sendo pedido. O validador de dígito verificador que existia
// aqui está no histórico do git, em `cpfValido`.

export default function Treine() {
  // Quatro campos, e nenhum deles assusta. Eram sete: saíram CPF, nascimento e
  // sexo. Nada disso é necessário pra começar uma conversa, e cada campo a mais
  // num formulário é gente que desiste no meio.
  const [form, setForm] = useState({
    nome: '', whatsapp: '', email: '', modalidade: 'musculacao',
  });
  const [erro, setErro] = useState('');

  // Qual foto do topo está aparecendo. Era animação de CSS puro, sem estado
  // nenhum, e virou React quando o Matheus pediu a seta: pra seta clicar de
  // verdade, alguém precisa saber em qual foto estamos.
  const [foto, setFoto] = useState(0);

  useEffect(() => {
    // Quem liga "reduzir movimento" no sistema não recebe troca automática —
    // é gente que passa mal com animação. As setas continuam funcionando.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // O `foto` na lista de dependências é de propósito: cada troca reinicia a
    // contagem. Sem isso, clicar na seta faltando meio segundo pro tempo
    // acabar mostraria a foto escolhida por um piscar só.
    const t = setTimeout(() => setFoto((i) => (i + 1) % FOTOS_TOPO.length), 5000);
    return () => clearTimeout(t);
  }, [foto]);

  const trocarFoto = (passo) =>
    setFoto((i) => (i + passo + FOTOS_TOPO.length) % FOTOS_TOPO.length);

  const campo = (k, transforma) => (e) => {
    const v = transforma ? transforma(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    if (erro) setErro('');
  };

  function enviar(e) {
    e.preventDefault();

    // Validar antes de sair da página: mandar o interessado pro WhatsApp com
    // dado faltando desperdiça o contato e obriga a perguntar de novo.
    const faltando = [];
    if (!form.nome.trim()) faltando.push('nome');
    if (!form.whatsapp.trim()) faltando.push('WhatsApp');
    if (faltando.length) return setErro(`Falta preencher: ${faltando.join(', ')}.`);

    // O e-mail é opcional aqui — só é conferido se a pessoa escreveu algo.
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return setErro('Confira o e-mail — parece que faltou alguma coisa.');
    }

    const modalidade = {
      musculacao: 'Só musculação',
      corrida: 'Musculação + corrida',
      ciclismo: 'Musculação + ciclismo',
    }[form.modalidade];

    const msg = [
      'Olá Matheus! Quero começar a consultoria online.',
      '',
      `Nome: ${form.nome.trim()}`,
      `WhatsApp: ${form.whatsapp.trim()}`,
      form.email.trim() ? `E-mail: ${form.email.trim()}` : null,
      `Quero: ${modalidade}`,
    ].filter(Boolean).join('\n');

    window.location.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
  }

  const input =
    'w-full border-b border-white/15 bg-transparent px-0 py-3 text-lg text-white ' +
    'placeholder-white/25 outline-none transition focus:border-[#E5484D]';
  const label = 'mb-1 block text-[13px] font-medium uppercase tracking-wider text-white/45';

  return (
    <main className="pb-24">

      {/* ── ABERTURA ──────────────────────────────────────────────────────────
          A foto dele abre a página. É o que nenhum gerador de página tem, e é o
          que mais rápido separa isto de um site montado por template.

          São três, alternando: academia, ciclismo e corrida. Isso não é enfeite
          — a página promete corrida e ciclismo junto da musculação, e essa é a
          promessa mais fácil de duvidar. As fotos respondem sem precisar
          escrever nada: ele corre prova com número de peito e pedala.

          NO CELULAR A FOTO FICAVA ATRÁS DO TEXTO, e o Matheus reclamou com
          razão. Pra o título ficar legível por cima dela, o escurecido embaixo
          precisava ser quase opaco — e aí a foto que justifica a seção inteira
          virava um fundo escuro que ninguém enxerga. Duas coisas disputando o
          mesmo espaço, as duas saindo perdendo.

          Agora empilha: foto inteira em cima, texto embaixo em fundo limpo. O
          telefone tem altura de sobra pros dois, e não precisa mais de
          escurecido nenhum. No computador continuam lado a lado — lá existe
          largura, que é o que o celular não tem. Uma pilha de fotos só, e a
          ordem das colunas troca no lg. */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-6 pb-14 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-20">

          <div className="relative aspect-[3/4] w-full lg:order-2">
            {FOTOS_TOPO.map((f, i) => (
              <div
                key={f.src}
                aria-hidden={i !== foto}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  i === foto ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <Image
                  src={f.src} alt={i === foto ? f.alt : ''}
                  fill priority={i === 0} sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover"
                  style={{ objectPosition: f.posLg }}
                />
              </div>
            ))}
          </div>

          <div className="lg:order-1">
            <p className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#E5484D]">
              <span aria-hidden className="h-px w-8 bg-[#E5484D]" />
              Consultoria online
            </p>

            {/* O título era "Treino montado pro seu caso. / Não pra qualquer
                um.", com a última linha desbotada em cinza. O Matheus olhou e
                disse que tinha cara de IA, e tinha mesmo: desbotar a última
                linha é o truque mais copiado que existe, e a frase dizia uma
                coisa que qualquer consultoria diria igual.

                Agora são três frases curtas que descrevem o trabalho de
                verdade, na ordem em que ele acontece — e a terceira é a que
                separa isto de comprar uma planilha, então é ela que fica em
                vermelho. Personalização todo mundo promete; continuar mexendo
                depois é o que quase ninguém faz. */}
            <h1 className="mt-5 text-[2.9rem] font-bold leading-[1.05] tracking-[-0.02em] sm:text-[3.6rem] xl:text-[4.25rem]">
              Eu monto.
              <br />
              Você treina.
              <br />
              <span className="text-[#E5484D]">A gente ajusta.</span>
            </h1>

            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/70">
              Musculação, corrida e ciclismo, com alguém do outro lado olhando
              o que você faz — não um arquivo que você baixa e nunca mais abre.
            </p>

            <a href="#comecar"
              className="mt-8 inline-flex w-fit items-center bg-[#E5484D] px-8 py-4 text-lg font-bold text-white transition hover:bg-[#d63c41]">
              Quero começar
            </a>

            {/* As objeções que aparecem primeiro, respondidas antes de serem
                feitas. Custa uma linha e tira o ar de slogan solto.

                O preço saiu daqui: com um plano só ele fazia sentido, mas com a
                escada de planos que vem aí um número solto no topo não diz de
                qual plano está falando. A caixa de preço, mais abaixo, é o
                lugar onde ele tem contexto. */}
            <p className="mt-5 text-sm text-white/45">
              Sem fidelidade · Cancela quando quiser · WhatsApp direto comigo
            </p>

            {/* Setas e bolinhas. Sem isso ninguém descobre que existem outras
                duas fotos: quem lê o topo em três segundos e desce nunca vê a
                troca acontecer, e a prova de que ele corre e pedala se perde.

                As bolinhas dizem QUANTAS são, que é a informação que a seta
                sozinha não passa. E as duas coisas clicam de verdade — seta de
                enfeite, que só sinaliza, irrita mais do que ajuda. */}
            <div className="mt-8 flex items-center gap-3">
              <button type="button" onClick={() => trocarFoto(-1)}
                aria-label="Foto anterior"
                className="flex h-10 w-10 items-center justify-center border border-white/25 pb-0.5 text-xl leading-none text-white/70 transition hover:border-white/60 hover:text-white">
                ‹
              </button>
              <button type="button" onClick={() => trocarFoto(1)}
                aria-label="Próxima foto"
                className="flex h-10 w-10 items-center justify-center border border-white/25 pb-0.5 text-xl leading-none text-white/70 transition hover:border-white/60 hover:text-white">
                ›
              </button>

              <div className="ml-2 flex items-center gap-2">
                {FOTOS_TOPO.map((f, i) => (
                  <button key={f.src} type="button" onClick={() => setFoto(i)}
                    aria-label={f.alt}
                    aria-current={i === foto}
                    className={`h-1.5 rounded-full transition-all ${
                      i === foto ? 'w-7 bg-[#E5484D]' : 'w-1.5 bg-white/30 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-6">

        {/* Números — só aparecem quando ele confirmar. Enquanto vazios, a faixa
            não existe: número inventado em página de venda se descobre. */}
        {NUMEROS.length > 0 && (
          <section className="flex flex-wrap gap-x-14 gap-y-6 border-b border-white/10 py-10">
            {NUMEROS.map(({ n, oq }) => (
              <div key={oq}>
                <p className="text-4xl font-bold tracking-tight">{n}</p>
                <p className="mt-1 text-sm text-white/50">{oq}</p>
              </div>
            ))}
          </section>
        )}

        {/* ── PRA QUEM É ──────────────────────────────────────────────────────
            A pessoa para numa das linhas e, dali em diante, está lendo sobre
            ela mesma. É a seção que mais trabalha na página inteira. */}
        <section className="pt-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Isso aqui é pra você que…
          </h2>
          <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {PARA_VOCE.map((linha) => (
              <li key={linha} className="flex gap-4 py-5 text-lg leading-snug text-white/80">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E5484D]" />
                {linha}
              </li>
            ))}
          </ul>
        </section>

        {/* ── O QUE RECEBE ────────────────────────────────────────────────────
            Era um parágrafo por item, e o Matheus tinha razão em reclamar:
            quem chega do Instagram passa o olho, não lê. Virou etiqueta,
            título curto e uma linha só — o item inteiro cabe num relance.

            Duas colunas no computador porque oito itens empilhados viram uma
            rolagem longa demais antes de chegar no preço. */}
        <section className="pt-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">O que você recebe</h2>
          <div className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2">
            {RECEBE.map(({ tag, t, d }) => (
              <div key={t}>
                <span className="inline-block border border-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/50">
                  {tag}
                </span>
                <h3 className="mt-3 text-lg font-bold leading-snug">{t}</h3>
                <p className="mt-1.5 leading-relaxed text-white/60">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── TRANSFORMAÇÕES ──────────────────────────────────────────────────
            Passa sozinha, da esquerda pra direita.

            Era pra arrastar com o dedo, e no computador simplesmente não
            arrastava: rolagem horizontal de navegador não responde a arrastar
            com o mouse, só a trackpad ou Shift+roda. Quem entrava pelo
            computador via três fotos paradas com um convite pra arrastar que
            não funcionava.

            Mesma mecânica do carrossel de depoimentos: a lista é renderizada
            DUAS vezes e o trilho anda exatamente metade da própria largura
            mais um vão, então a emenda é invisível e o giro é infinito.

            Pausa ao passar o mouse, e aqui isso não é conforto — é o que
            devolve a função da seção. A pessoa para justamente pra comparar os
            dois lados, e uma foto que desliza sozinha some no meio disso. */}
        {TRANSFORMACOES.length > 0 && (
          <section className="pt-20">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Corpos transformados
            </h2>

            <div className="fila mt-8 overflow-hidden">
              <div className="fila-trilho flex w-max gap-5">
                {[...TRANSFORMACOES, ...TRANSFORMACOES].map((t, n) => (
                  <figure
                    key={n}
                    aria-hidden={n >= TRANSFORMACOES.length}
                    className="w-[260px] shrink-0 sm:w-[300px]"
                  >
                    <div className="grid grid-cols-2 gap-0.5">
                      {[['Antes', t.antes], ['Depois', t.depois]].map(([rotulo, src]) => (
                        <div key={rotulo} className="relative aspect-[9/16] overflow-hidden">
                          <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                          <span className={`absolute left-0 top-0 px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
                            rotulo === 'Depois' ? 'bg-[#E5484D] text-white' : 'bg-black/70 text-white/80'
                          }`}>
                            {rotulo}
                          </span>
                        </div>
                      ))}
                    </div>
                    <figcaption className="mt-3">
                      <p className="font-semibold">{t.quem}</p>
                      {t.resultado && (
                        <p className="text-sm font-semibold text-[#E5484D]">{t.resultado}</p>
                      )}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>

            <style jsx>{`
              .fila-trilho {
                /* Mais devagar que o dos depoimentos: aqui a pessoa está
                   comparando duas imagens, não lendo uma frase. */
                animation: corre 34s linear infinite;
              }
              .fila:hover .fila-trilho {
                animation-play-state: paused;
              }
              /* Quem pediu menos movimento no sistema recebe a versão que
                 rola, em vez de ficar preso na primeira transformação. */
              @media (prefers-reduced-motion: reduce) {
                .fila { overflow-x: auto; }
                .fila-trilho { animation: none; }
              }
              @keyframes corre {
                /* Metade do trilho mais um vão: é onde a segunda cópia cai
                   exatamente sobre o ponto de partida da primeira. */
                from { transform: translateX(calc(-50% - 0.625rem)); }
                to   { transform: translateX(0); }
              }
            `}</style>
          </section>
        )}

        {/* ── DEPOIMENTOS ─────────────────────────────────────────────────────
            Carrossel que desliza sozinho da esquerda pra direita, sem
            biblioteca: a lista é renderizada DUAS vezes lado a lado e o trilho
            anda exatamente metade da própria largura. Quando a animação
            reinicia, a segunda cópia está no lugar em que a primeira começou,
            então o corte é invisível e o giro é infinito.

            `aria-hidden` na segunda cópia pra quem usa leitor de tela não
            ouvir cada depoimento duas vezes. Pausa ao passar o mouse, senão
            não dá pra terminar de ler um que interessou.

            A seção só existe quando houver depoimento REAL em DEPOIMENTOS —
            escrito pela pessoa, com autorização dela. */}
        {DEPOIMENTOS.length > 0 && (
          <section className="pt-20">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Quem já treina comigo
            </h2>

            <div className="carrossel mt-8 overflow-hidden">
              <div className="carrossel-trilho flex w-max gap-5">
                {[...DEPOIMENTOS, ...DEPOIMENTOS].map((d, i) => (
                  <figure
                    key={i}
                    aria-hidden={i >= DEPOIMENTOS.length}
                    className="flex w-[290px] shrink-0 flex-col border border-white/12 bg-white/[0.03] p-6 sm:w-[340px]"
                  >
                    <p className="flex-1 leading-relaxed text-white/85">{d.texto}</p>
                    <figcaption className="mt-5 border-t border-white/10 pt-4">
                      <p className="font-semibold">{d.quem}</p>
                      {d.detalhe && (
                        <p className="text-sm text-white/45">{d.detalhe}</p>
                      )}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>

            <style jsx>{`
              .carrossel-trilho {
                /* 26s por volta com 8 depoimentos: rápido o bastante pra não
                   parecer travado, lento o bastante pra dar tempo de ler. */
                animation: desliza 26s linear infinite;
              }
              .carrossel:hover .carrossel-trilho {
                animation-play-state: paused;
              }
              /* Quem pediu menos movimento no sistema não recebe carrossel
                 animado — o conteúdo continua ali, só parado. */
              @media (prefers-reduced-motion: reduce) {
                .carrossel { overflow-x: auto; }
                .carrossel-trilho { animation: none; }
              }
              @keyframes desliza {
                from { transform: translateX(calc(-50% - 0.625rem)); }
                to   { transform: translateX(0); }
              }
            `}</style>
          </section>
        )}

        {/* ── COMO FUNCIONA ───────────────────────────────────────────────────
            Linha do tempo, e não uma lista numerada.

            A diferença não é enfeite: a pergunta que quem está decidindo tem e
            não faz em voz alta é "quando eu começo a treinar". Uma lista 1-2-3
            mostra a ordem mas esconde o tempo; aqui o "quando" vem na frente de
            cada etapa, e o traço vertical mostra que uma leva à outra.

            A última etapa é a dos 90 dias, de propósito: ela liga esta seção à
            garantia, que aparece logo depois do preço. */}
        <section className="pt-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Como funciona</h2>

          <ol className="mt-10">
            {PASSOS.map(({ quando, t, d }, i) => (
              <li key={t} className="relative flex gap-6 pb-9 last:pb-0">
                {/* O traço que liga uma etapa na outra. Não desce da última,
                    senão a linha do tempo parece continuar pra fora da seção. */}
                {i < PASSOS.length - 1 && (
                  <span aria-hidden className="absolute left-[5px] top-4 h-full w-px bg-white/15" />
                )}
                <span aria-hidden className="relative mt-[7px] h-2.5 w-2.5 shrink-0 rounded-full bg-[#E5484D]" />

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#E5484D]">
                    {quando}
                  </p>
                  <h3 className="mt-1.5 text-xl font-bold leading-snug">{t}</h3>
                  <p className="mt-1.5 leading-relaxed text-white/65">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── O ACORDO ────────────────────────────────────────────────────────
            Duas colunas, e a DELE vem primeiro.

            Esta seção era "O que eu preciso de você": quatro exigências ao
            aluno, nenhuma obrigação dele, tudo antes da pessoa pagar. O texto
            já tinha sido reescrito duas vezes e continuava incomodando, porque
            o problema não era o texto — era a estrutura, que é de contrato de
            academia.

            Publicar as próprias obrigações ANTES de listar as do outro é o que
            separa quem está seguro do que entrega de quem só cobra. E não custa
            nada de novo aqui: tudo na coluna dele já estava prometido em algum
            canto da página, só nunca tinha aparecido junto.

            Vem antes do preço de propósito. Quem descobre a exigência das fotos
            depois de pagar trava e não manda, e aí o acompanhamento morre — que
            é justamente o que ele está vendendo. */}
        <section className="pt-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">O nosso acordo</h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/70">
            {ABERTURA_ACORDO}
          </p>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {[
              { titulo: 'O que eu me comprometo', itens: MINHA_PARTE, minha: true },
              { titulo: 'O que eu preciso de você', itens: SUA_PARTE, minha: false },
            ].map(({ titulo, itens, minha }) => (
              <div
                key={titulo}
                className={`border p-7 ${
                  minha
                    ? 'border-[#E5484D]/40 bg-[#E5484D]/[0.05]'
                    : 'border-white/15 bg-white/[0.02]'
                }`}
              >
                <h3 className={`text-sm font-semibold uppercase tracking-[0.14em] ${
                  minha ? 'text-[#E5484D]' : 'text-white/45'
                }`}>
                  {titulo}
                </h3>

                <ul className="mt-7 space-y-7">
                  {itens.map(({ t, d, extra }, i) => (
                    <li key={t}>
                      <h4 className="text-lg font-bold leading-snug">{t}</h4>
                      <p className="mt-1.5 leading-relaxed text-white/65">{d}</p>
                      {extra && (
                        <p className="mt-1.5 leading-relaxed text-white/40">{extra}</p>
                      )}

                      {/* O protocolo mora dentro do compromisso a que pertence:
                          quem clica aqui é quem acabou de ler que vai precisar
                          mandar foto. Fica atrás do clique porque posição de
                          braço e tipo de roupa é informação de quem JÁ
                          contratou — quem está decidindo lê aquilo e pensa
                          "que trabalheira". */}
                      {!minha && i === 0 && (
                        <details className="group mt-4 border-l-2 border-white/15 pl-5">
                          <summary className="cursor-pointer list-none text-sm font-semibold text-white/70 transition marker:hidden hover:text-white">
                            <span aria-hidden className="mr-2 inline-block text-[#E5484D] transition group-open:rotate-90">›</span>
                            Como tirar as fotos
                          </summary>
                          <dl className="mt-4 space-y-2.5 text-sm">
                            {PROTOCOLO_FOTOS.angulos.map(([nome, como]) => (
                              <div key={nome} className="leading-relaxed text-white/60">
                                <dt className="inline font-semibold text-white/85">{nome} · </dt>
                                <dd className="inline">{como}</dd>
                              </div>
                            ))}
                          </dl>
                          <p className="mt-4 text-sm leading-relaxed text-white/60">
                            {PROTOCOLO_FOTOS.roupa}
                          </p>
                        </details>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── PREÇO ───────────────────────────────────────────────────────────
            A frase antes do número existe porque a objeção real não é o valor,
            é o que a pessoa acha que está pagando. Quem lê "aplicativo" compara
            com mensalidade de aplicativo e acha caro; quem entende que está
            contratando alguém compara com personal, e aí o número é barato. */}
        <section className="pt-20">
          <p className="mb-6 max-w-xl text-xl leading-relaxed text-white/80">
            Você não está assinando um aplicativo. Está contratando alguém que
            olha o seu treino, vê a sua carga subir e mexe no que precisa mexer.
            O aplicativo é só por onde isso chega até você.
          </p>
          <div className="border border-[#E5484D]/40 bg-[#E5484D]/[0.06] p-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#E5484D]">
              Plano mensal
            </p>
            <p className="mt-3 text-5xl font-bold tracking-tight">
              {PRECO}<span className="text-2xl font-normal text-white/40">/mês</span>
            </p>
            <p className="mt-5 text-lg leading-relaxed text-white/75">
              Sem fidelidade. Cancela quando quiser, sem multa e sem justificar.
              Musculação com corrida ou ciclismo inclusos — não é pacote separado.
            </p>

            {/* A conferência do que entra. Na seção de cima a pessoa estava
                conhecendo; aqui ela está decidindo, e quem decide quer ver
                tudo junto num lugar só. */}
            <ul className="mt-7 space-y-2.5 border-t border-white/10 pt-7">
              {INCLUSO.map((item) => (
                <li key={item} className="flex gap-3 leading-snug text-white/80">
                  <span aria-hidden className="font-bold text-[#E5484D]">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <a href="#comecar"
              className="mt-7 inline-flex w-fit items-center bg-[#E5484D] px-8 py-4 text-lg font-bold text-white transition hover:bg-[#d63c41]">
              Quero começar
            </a>
          </div>
        </section>

        {/* ── GARANTIA ──────────────────────────────────────
            Logo depois do preço, que é onde a dúvida aparece. Ela é atrelada
            aos 90 dias porque é quando chegam as segundas fotos — a única data
            em que existe medida dos dois lados pra comparar. */}
        <section className="pt-16">
          <div className="border-l-2 border-white/25 pl-6">
            <h2 className="text-2xl font-bold tracking-tight">{GARANTIA.titulo}</h2>
            <p className="mt-3 text-lg leading-relaxed text-white/70">{GARANTIA.texto}</p>
          </div>
        </section>

        {/* ── FORMULÁRIO ──────────────────────────────────────────────────────*/}
        <section id="comecar" className="scroll-mt-6 pt-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Começar</h2>
          <p className="mt-3 text-lg text-white/60">
            Preenche aqui que eu te mando o passo a passo. Leva um minuto.
          </p>

          <form onSubmit={enviar} className="mt-10 space-y-7" noValidate>
            <div>
              <label className={label} htmlFor="nome">Nome completo</label>
              <input id="nome" className={input} value={form.nome}
                onChange={campo('nome')} autoComplete="name" />
            </div>

            <div>
              <label className={label} htmlFor="whatsapp">WhatsApp</label>
              <input id="whatsapp" type="tel" inputMode="tel" className={input}
                value={form.whatsapp} onChange={campo('whatsapp')} autoComplete="tel"
                placeholder="(00) 00000-0000" />
            </div>

            <div>
              <label className={label} htmlFor="email">
                E-mail <span className="normal-case tracking-normal text-white/30">(opcional)</span>
              </label>
              <input id="email" type="email" inputMode="email" className={input}
                value={form.email} onChange={campo('email')} autoComplete="email"
                placeholder="seu@email.com" />
            </div>

            <div>
              <label className={label} htmlFor="modalidade">Quero treinar</label>
              <select id="modalidade" className={input} value={form.modalidade}
                onChange={campo('modalidade')}>
                <option value="musculacao">Só musculação</option>
                <option value="corrida">Musculação + corrida</option>
                <option value="ciclismo">Musculação + ciclismo</option>
              </select>
            </div>

            {erro && (
              <p role="alert" className="border-l-2 border-[#E5484D] bg-[#E5484D]/10 px-4 py-3 text-sm text-white">
                {erro}
              </p>
            )}

            <button type="submit"
              className="w-full bg-[#E5484D] px-8 py-5 text-lg font-bold text-white transition hover:bg-[#d63c41]">
              Continuar
            </button>
            <p className="text-center text-xs text-white/35">
              Você vai pro meu WhatsApp com os seus dados já preenchidos.
            </p>
          </form>
        </section>

        {/* ── DÚVIDAS ─────────────────────────────────────────────────────────*/}
        <section className="pt-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Dúvidas</h2>
          <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {FAQ.map(({ q, r }) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold marker:hidden">
                  {q}
                  <span aria-hidden className="shrink-0 text-white/30 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-white/65">{r}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="mt-20 border-t border-white/10 pt-8 text-sm text-white/35">
          <p className="font-medium text-white/55">Matheus Wruck Barbosa · Personal Trainer</p>
          <p className="mt-1">
            O treino é entregue pelo aplicativo PersonalPro, para Android e iPhone.
          </p>
        </footer>

      </div>
    </main>
  );
}
