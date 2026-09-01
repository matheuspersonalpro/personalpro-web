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
  WHATSAPP, PLANOS, VALE_PARA_TODOS, DEPOIMENTOS, TRANSFORMACOES, NUMEROS,
  PARA_VOCE, RECEBE, PASSOS, FAQ, GARANTIA, FOTOS_TOPO, TELAS_APP, CREF,
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

  // Dedo segurando a fila de transformações.
  //
  // O :hover resolve isso no computador, mas no celular ele MENTE: o toque
  // aplica hover e o estado gruda, então a fila pausava e nunca mais voltava.
  // Tirei o hover do toque e aí ela deixou de pausar — o Matheus queria as
  // duas coisas: segurar pausa, soltar volta.
  //
  // Evento de toque de verdade faz exatamente isso, e funciona em qualquer
  // aparelho, sem depender de o navegador fingir um ponteiro.
  const [filaParada, setFilaParada] = useState(false);

  // Qual tela do aplicativo está aparecendo. Eram três celulares parados lado
  // a lado, e o Matheus pediu que elas mudassem.
  //
  // Um celular só em vez de três: alternando, cada tela aparece grande o
  // bastante pra dar pra LER o que está escrito nela — que é o ponto de
  // mostrar o produto. Três miniaturas provam que o aplicativo existe e não
  // provam mais nada.
  const [tela, setTela] = useState(0);

  useEffect(() => {
    if (TELAS_APP.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // 6 segundos: é o tempo de correr o olho por uma tela de celular inteira.
    const t = setTimeout(() => setTela((i) => (i + 1) % TELAS_APP.length), 6000);
    return () => clearTimeout(t);
  }, [tela]);

  // Qual depoimento está na tela. Era uma esteira rolando sem parar, e o
  // Matheus comparou com as duas páginas de referência: elas TROCAM de cartão,
  // uma por vez, com bolinhas embaixo.
  //
  // Ele tem razão e o motivo é visual: esteira contínua deixa sempre um cartão
  // cortado em cada ponta, e meio depoimento na borda parece defeito. Um por
  // vez, inteiro e centralizado, é o que dá acabamento.
  const [dep, setDep] = useState(0);

  // Quantos depoimentos cabem numa página: 3 no computador, 2 no tablet, 1 no
  // celular. Precisa ser estado, e não só CSS, porque o NÚMERO DE BOLINHAS
  // depende disso -- com 8 depoimentos são 3 páginas no computador e 8 no
  // celular. Só CSS acertaria a largura dos cartões e erraria as bolinhas.
  const [porPagina, setPorPagina] = useState(3);

  useEffect(() => {
    // Os limites são os pontos de quebra do Tailwind (sm=640, lg=1024) porque
    // é o CSS que manda na largura — se divergirem, a contagem de bolinhas
    // deixa de bater com o que está na tela.
    const medir = () => {
      const l = window.innerWidth;
      setPorPagina(l >= 1024 ? 3 : l >= 640 ? 2 : 1);
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  const paginasDep = Math.ceil(DEPOIMENTOS.length / porPagina);

  // Girar a tela pode deixar a página atual fora do intervalo (estava na 7 de
  // 8 no celular, virou o computador com 3 páginas). Sem isso, o trilho
  // desliza pra um lugar vazio e a seção fica em branco.
  useEffect(() => {
    setDep((i) => Math.min(i, Math.max(0, paginasDep - 1)));
  }, [paginasDep]);

  useEffect(() => {
    if (paginasDep < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // 8 segundos por página: com três cartões na tela é mais texto pra ler do
    // que era com um só. `dep` nas dependências reinicia a contagem a cada
    // troca, então clicar numa bolinha dá o tempo cheio naquela página.
    const t = setTimeout(() => setDep((i) => (i + 1) % paginasDep), 8000);
    return () => clearTimeout(t);
  }, [dep, paginasDep]);

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

        {/* ── AS TELAS DO APLICATIVO ──────────────────────────────────────────
            Desliza pro lado, igual aos depoimentos e às transformações. Era
            um esmaecer no lugar, e destoava: a página tem um jeito só de
            trocar conteúdo, e três jeitos diferentes fazem parecer remendo.

            A MOLDURA É 9:19.5, e não a proporção do print. Os prints têm
            560x2036 (uma tela de app que ROLA, achatada num arquivo só), e
            usar essa proporção fazia um celular impossivelmente estreito e
            comprido, que no telefone não cabia na tela. Agora a moldura tem
            proporção de aparelho de verdade e mostra o topo da tela, que é
            onde está o que interessa em todas as três.

            A autoria dele NÃO aparece aqui: a frase dizia "é um aplicativo que
            eu fiz" e ele mandou tirar, mesma decisão do Instagram do produto.

            Só aparece quando houver imagem em TELAS_APP. */}
        {TELAS_APP.length > 0 && (
          <section className="pt-20">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              O aplicativo por dentro
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/70">
              Não é planilha em PDF nem grupo de WhatsApp com vídeo solto. É por
              ele que o seu treino chega.
            </p>

            <div className="mt-10 overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${tela * 100}%)` }}
              >
                {TELAS_APP.map((t, i) => (
                  <div
                    key={t.src}
                    aria-hidden={i !== tela}
                    className="grid w-full shrink-0 items-center gap-8 sm:grid-cols-[auto_1fr]"
                  >
                    <div className="mx-auto w-[220px] rounded-[2rem] border-[6px] border-white/15 bg-black shadow-2xl sm:mx-0 sm:w-[240px]">
                      <img
                        src={t.src}
                        alt={t.titulo}
                        loading={i === 0 ? undefined : "lazy"}
                        // A moldura usa a proporcao REAL dos prints (560x1100 em
                        // media), e nao 9/19.5 de aparelho: com 9/19.5 o cover
                        // escalava pela altura e cortava as LATERAIS -- comeu o "S"
                        // de "SEU TREINO" e de "SUA SEMANA" na tela de corrida.
                        //
                        // E object-contain, nao cover: as tres tem proporcao um
                        // pouco diferente entre si (0,493 a 0,530), e contain
                        // garante que nenhuma perca nada. A sobra fica preta,
                        // invisivel dentro da moldura preta.
                        className="aspect-[560/1100] w-full rounded-[1.6rem] object-contain"
                      />
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold leading-snug">{t.titulo}</h3>
                      <p className="mt-3 max-w-md text-lg leading-relaxed text-white/65">{t.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {TELAS_APP.length > 1 && (
              <div className="mt-7 flex items-center gap-2">
                {TELAS_APP.map((t, i) => (
                  <button
                    key={t.src}
                    type="button"
                    onClick={() => setTela(i)}
                    aria-label={t.titulo}
                    aria-current={i === tela}
                    className={`h-1.5 rounded-full transition-all ${
                      i === tela ? "w-7 bg-[#E5484D]" : "w-1.5 bg-white/30 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            )}
          </section>
        )}

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

            <div
              className={`fila mt-8 overflow-hidden ${filaParada ? "fila-parada" : ""}`}
              onTouchStart={() => setFilaParada(true)}
              onTouchEnd={() => setFilaParada(false)}
              onTouchCancel={() => setFilaParada(false)}
            >
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
              /* Pausar tem DOIS caminhos, um pra cada tipo de aparelho.

                 No computador é o mouse em cima. A media query é obrigatória:
                 no celular o navegador aplica :hover no toque e o estado GRUDA,
                 então sem ela a fila pausava no primeiro toque e nunca mais
                 voltava a andar.

                 No celular é o dedo segurando, via evento de toque de verdade
                 (a classe .fila-parada). Solta, volta a andar. */
              @media (hover: hover) and (pointer: fine) {
                .fila:hover .fila-trilho {
                  animation-play-state: paused;
                }
              }
              .fila-parada .fila-trilho {
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
            Três por página no computador, dois no tablet, um no celular. As
            bolinhas trocam a PÁGINA inteira, não um cartão.

            Foi esteira contínua antes, e o Matheus apontou o defeito: sempre
            sobrava meio cartão cortado em cada ponta. Depois virou um por vez,
            e aí a seção ficou ocupando muita altura pra pouca informação.
            Este é o formato das duas páginas de referência.

            O ESPAÇAMENTO É POR DENTRO DO CARTÃO (px-2.5), e não `gap` no
            trilho. Com gap, três cartões não somam exatamente 100% da largura
            e a conta do deslize erra alguns pixels por página -- um desalinho
            que se acumula e fica visível na última. */}
        {DEPOIMENTOS.length > 0 && (
          <section className="pt-20">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Quem já treina comigo
            </h2>

            <div className="-mx-2.5 mt-8 overflow-hidden">
              <div
                // Altura uniforme de novo, a pedido do Matheus: "eu quero
                // padrao". O vao que existia antes nao vinha da altura igual em
                // si -- vinha da DIFERENCA de tamanho entre os textos. Com todos
                // calibrados pra ocupar as mesmas linhas, esticar nao cria buraco.
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${dep * 100}%)` }}
              >
                {DEPOIMENTOS.map((d, i) => (
                  <div
                    key={i}
                    // A LARGURA VEM DO CSS, não do JavaScript. Vinha de
                    // `porPagina`, que só é medido depois que a página carrega —
                    // e como o valor inicial é 3, num celular a primeira imagem
                    // aparecia com três cartões de 116px, ilegíveis, até o
                    // efeito rodar. Com classe do Tailwind já nasce certo.
                    //
                    // O JavaScript continua sabendo quantos cabem, mas só pra
                    // contar bolinha e girar a página: se ele errar por um
                    // instante, erra o número de bolinhas, não o layout.
                    className="w-full shrink-0 px-2.5 sm:w-1/2 lg:w-1/3"
                    aria-hidden={Math.floor(i / porPagina) !== dep}
                  >
                    <figure className="flex h-full flex-col border border-white/12 bg-white/[0.03] p-6">
                      <span aria-hidden className="text-2xl leading-none text-[#E5484D]">&ldquo;</span>

                      {/* Título e subtítulo, sempre os dois.
                          O corte era automático, no primeiro ponto final — e
                          quem mandou o depoimento numa frase só ficava sem
                          subtítulo, com o cartão visivelmente diferente dos
                          vizinhos. Agora as duas partes vêm definidas uma a uma
                          em dados.js, e nenhum cartão sai torto. */}
                      <p className="mt-2 text-lg font-semibold leading-snug text-white">
                        {d.frase}
                      </p>
                      {/* flex-1 empurra a legenda pro rodapé, o que alinha o
                          nome de todos os cartões da linha. Só funciona bem
                          porque os textos têm tamanho parecido — se voltarem a
                          divergir, volta o vão. */}
                      <p className="mt-2.5 flex-1 text-sm leading-relaxed text-white/60">
                        {d.resto}
                      </p>

                      <figcaption className="mt-5 border-t border-white/10 pt-4">
                        <p className="text-sm font-semibold leading-tight">{d.quem}</p>
                        {d.detalhe && (
                          <p className="text-xs text-white/45">{d.detalhe}</p>
                        )}
                      </figcaption>
                    </figure>
                  </div>
                ))}
              </div>
            </div>

            {paginasDep > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                {Array.from({ length: paginasDep }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDep(i)}
                    aria-label={`Página ${i + 1} de ${paginasDep}`}
                    aria-current={i === dep}
                    className={`h-1.5 rounded-full transition-all ${
                      i === dep ? "w-7 bg-[#E5484D]" : "w-1.5 bg-white/30 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            )}
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
                          {/* Foto no lugar de lista de instruções: "de frente,
                          corpo relaxado" não responde a dúvida real, que é
                          "está certo assim?". A cabeça do aluno que serviu de
                          modelo está pixelizada nas três. */}
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {PROTOCOLO_FOTOS.modelo.map((m) => (
                          <figure key={m.rotulo}>
                            <img
                              src={m.src}
                              alt={`Exemplo de foto ${m.rotulo.toLowerCase()}`}
                              loading="lazy"
                              className="w-full rounded border border-white/10"
                            />
                            <figcaption className="mt-1.5">
                              <span className="block text-xs font-semibold text-white/85">{m.rotulo}</span>
                              <span className="block text-[11px] leading-snug text-white/45">{m.nota}</span>
                            </figcaption>
                          </figure>
                        ))}
                      </div>

                      <p className="mt-4 text-sm leading-relaxed text-white/60">
                        {PROTOCOLO_FOTOS.roupa}                      </p>
                        </details>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── PLANOS ──────────────────────────────────────────────────────────
            Três, e a escada é por ATENÇÃO, não por conteúdo. O porquê está em
            dados.js, junto dos planos.

            A frase antes dos preços existe porque a objeção real não é o valor,
            é o que a pessoa acha que está pagando: quem lê "aplicativo" compara
            com mensalidade de aplicativo e acha caro; quem entende que está
            contratando alguém compara com personal, e aí o número é barato.

            Cada plano diz "tudo do anterior, mais" em vez de repetir a lista
            inteira. Três listas quase idênticas lado a lado obrigam a pessoa a
            caçar a diferença — e o que ela quer saber é exatamente isso, o que
            muda de um pro outro. */}
        <section className="pt-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Planos</h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/80">
            Você não está assinando um aplicativo. Está contratando alguém que
            olha o seu treino, vê a sua carga subir e mexe no que precisa mexer.
            O aplicativo é só por onde isso chega até você.
          </p>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {PLANOS.map(({ nome, preco, resumo, destaque, herda, itens }) => (
              <div
                key={nome}
                className={`flex flex-col border p-7 ${
                  destaque
                    ? 'border-[#E5484D] bg-[#E5484D]/[0.07]'
                    : 'border-white/15 bg-white/[0.02]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-bold">{nome}</h3>
                  {destaque && (
                    <span className="shrink-0 bg-[#E5484D] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                      {destaque}
                    </span>
                  )}
                </div>

                <p className="mt-4 text-3xl font-bold tracking-tight">
                  {preco}
                  <span className="text-base font-normal text-white/40">/mês</span>
                </p>

                <p className="mt-3 leading-relaxed text-white/60">{resumo}</p>

                {herda && (
                  <p className="mt-6 border-t border-white/10 pt-5 text-sm font-semibold text-white/75">
                    Tudo do {herda}, mais:
                  </p>
                )}

                <ul className={`space-y-2.5 ${herda ? 'mt-4' : 'mt-6 border-t border-white/10 pt-6'}`}>
                  {itens.map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm leading-snug text-white/75">
                      <span aria-hidden className="font-bold text-[#E5484D]">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>

                <a href="#comecar"
                  className={`mt-7 block px-6 py-3.5 text-center font-bold transition ${
                    destaque
                      ? 'bg-[#E5484D] text-white hover:bg-[#d63c41]'
                      : 'border border-white/25 text-white hover:border-white/60'
                  }`}>
                  Quero o {nome}
                </a>
              </div>
            ))}
          </div>

          {/* Vale pros três, então fica fora dos cards: repetir em cada um
              gastaria três vezes o espaço pra dizer a mesma coisa. */}
          <ul className="mt-6 flex flex-wrap gap-x-7 gap-y-2">
            {VALE_PARA_TODOS.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-white/50">
                <span aria-hidden className="text-[#E5484D]">✓</span>
                {item}
              </li>
            ))}
          </ul>
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

        {/* ── FORMULÁRIO ──────────────────────────────────────────────────────
            Última seção da página, DEPOIS das dúvidas.

            Estava antes do FAQ, e assim a página terminava numa sanfona de
            perguntas, sem nada pra fazer. Quem lê as dúvidas até o fim é
            justamente quem está mais perto de decidir -- e chegava no fim sem
            botão nenhum, tendo que rolar de volta.

            Agora a última coisa que a pessoa vê é o campo de nome. */}
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

        <footer className="mt-20 border-t border-white/10 pt-8 text-sm text-white/35">
          <p className="font-medium text-white/55">Matheus Wruck Barbosa · {CREF}</p>
          <p className="mt-1">
            O treino é entregue pelo aplicativo PersonalPro, para Android e iPhone.
          </p>
        </footer>

      </div>
    </main>
  );
}
