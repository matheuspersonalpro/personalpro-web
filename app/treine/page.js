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

import { useState } from 'react';
import Image from 'next/image';
import {
  WHATSAPP, PRECO, DEPOIMENTOS, TRANSFORMACOES, NUMEROS,
  PARA_VOCE, RECEBE, PASSOS, FAQ, GARANTIA,
} from './dados';

// O Asaas não cria cliente sem CPF — `criarCheckout` já rejeita o que não tem
// 11 dígitos. Conferir os dígitos verificadores AQUI evita o pior caso: digitar
// errado, seguir confiante, e descobrir quando a cobrança falha do outro lado.
function cpfValido(bruto) {
  const c = String(bruto || '').replace(/\D/g, '');
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;   // 111.111.111-11 passaria na conta

  const digito = (ate) => {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(c[i]) * (ate + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digito(9) === Number(c[9]) && digito(10) === Number(c[10]);
}

const mascaraCpf = (v) =>
  String(v || '').replace(/\D/g, '').slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');

export default function Treine() {
  const [form, setForm] = useState({
    nome: '', email: '', cpf: '', whatsapp: '', nascimento: '', sexo: '', modalidade: 'musculacao',
  });
  const [erro, setErro] = useState('');

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
    if (!form.email.trim()) faltando.push('e-mail');
    if (!form.whatsapp.trim()) faltando.push('WhatsApp');
    if (!form.cpf.trim()) faltando.push('CPF');
    if (!form.sexo) faltando.push('sexo');
    if (faltando.length) return setErro(`Falta preencher: ${faltando.join(', ')}.`);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return setErro('Confira o e-mail — ele vai ser o seu acesso ao aplicativo.');
    }
    if (!cpfValido(form.cpf)) {
      return setErro('Confira o CPF — ele é necessário para emitir a cobrança.');
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
      `E-mail: ${form.email.trim()}`,
      `CPF: ${form.cpf.trim()}`,
      `WhatsApp: ${form.whatsapp.trim()}`,
      // O <input type="date"> entrega ISO. Vira 12/05/1990 porque quem lê é
      // gente, no WhatsApp.
      form.nascimento ? `Nascimento: ${form.nascimento.split('-').reverse().join('/')}` : null,
      `Sexo: ${form.sexo}`,
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

          Ela aparece de dois jeitos porque a foto é vertical: no celular ocupa
          a tela inteira com o texto por cima, e no computador fica ao lado do
          texto. Sem essa separação, a tela larga recorta uma faixa do meio da
          foto e deixa o rosto dele de fora — que é justamente o que a seção
          existe pra mostrar. */}
      <section className="relative overflow-hidden">
        {/* Celular: foto ao fundo, escurecida de baixo pra cima pro texto ficar
            legível sem apagar a imagem. */}
        <div className="absolute inset-0 lg:hidden">
          <Image
            src="/matheus.jpg"
            alt="Matheus Barbosa, personal trainer"
            fill priority sizes="100vw"
            className="object-cover object-[center_12%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080f1d] via-[#080f1d]/85 to-[#080f1d]/20" />
        </div>

        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="flex min-h-[92svh] flex-col justify-end pb-14 lg:min-h-0 lg:py-24">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E5484D]">
              Consultoria online
            </p>
            {/* O tamanho só sobe de novo no xl: entre lg e xl a coluna do texto
                é estreita, e a 6xl a última linha quebra no meio. */}
            <h1 className="mt-4 text-[2.7rem] font-bold leading-[1.02] tracking-tight sm:text-[3.4rem] xl:text-6xl">
              Treino montado
              <br />
              pro seu caso.
              <br />
              <span className="text-white/40">Não pra qualquer um.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/70">
              Musculação, corrida e ciclismo, com acompanhamento de verdade —
              não uma planilha que você baixa e vira as costas.
            </p>
            <a href="#comecar"
              className="mt-8 inline-flex w-fit items-center bg-[#E5484D] px-8 py-4 text-lg font-bold text-white transition hover:bg-[#d63c41]">
              Quero começar
            </a>
          </div>

          {/* Computador: a foto inteira, sem recorte que corte o rosto. */}
          <div className="relative hidden aspect-[3/4] w-full lg:block">
            <Image
              src="/matheus.jpg"
              alt="Matheus Barbosa, personal trainer"
              fill priority sizes="45vw"
              className="object-cover object-top"
            />
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
            Sem ícone e sem card: um título forte e um parágrafo de tamanho
            desigual, que é como texto escrito por gente se parece. */}
        <section className="pt-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">O que você recebe</h2>
          <div className="mt-10 space-y-10">
            {RECEBE.map(({ t, d }) => (
              <div key={t} className="border-l-2 border-[#E5484D] pl-6">
                <h3 className="text-xl font-bold">{t}</h3>
                <p className="mt-2 leading-relaxed text-white/65">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── TRANSFORMAÇÕES ──────────────────────────────────────────────────
            Só aparece com foto autorizada em TRANSFORMACOES. Enquanto a lista
            estiver vazia, a seção inteira não existe.

            O recorte é 9:16 porque é o formato em que as fotos chegam (foto de
            celular, corpo inteiro no espelho). Forçar 3:4 aqui cortaria pé ou
            cabeça justamente na imagem em que o corpo inteiro é o assunto.

            As tarjas ANTES e DEPOIS ficam sobre a imagem porque, sem elas,
            duas fotos lado a lado não dizem qual é qual — e a pessoa que olha
            de relance pode ler a ordem trocada. */}
        {TRANSFORMACOES.length > 0 && (
          <section className="pt-20">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Corpos transformados
            </h2>
            <div className="mt-8 space-y-10">
              {TRANSFORMACOES.map((t) => (
                <figure key={t.quem}>
                  <div className="grid grid-cols-2 gap-1">
                    {[['Antes', t.antes], ['Depois', t.depois]].map(([rotulo, src]) => (
                      <div key={rotulo} className="relative aspect-[9/16] overflow-hidden">
                        <img src={src} alt="" className="h-full w-full object-cover" />
                        <span className={`absolute left-0 top-0 px-3 py-1.5 text-xs font-bold uppercase tracking-widest ${
                          rotulo === 'Depois' ? 'bg-[#E5484D] text-white' : 'bg-black/70 text-white/80'
                        }`}>
                          {rotulo}
                        </span>
                      </div>
                    ))}
                  </div>
                  <figcaption className="mt-4">
                    <p className="font-semibold">{t.quem}</p>
                    <p className="text-sm text-white/55">{t.resultado}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* Depoimentos — mesma regra. */}
        {DEPOIMENTOS.length > 0 && (
          <section className="pt-20">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Quem já treina comigo
            </h2>
            <div className="mt-8 space-y-8">
              {DEPOIMENTOS.map((d) => (
                <blockquote key={d.quem} className="border-l-2 border-white/20 pl-6">
                  <p className="text-lg leading-relaxed text-white/85">{d.texto}</p>
                  <footer className="mt-3 text-sm text-white/50">
                    {d.quem}{d.detalhe ? ` · ${d.detalhe}` : ''}
                  </footer>
                </blockquote>
              ))}
            </div>
          </section>
        )}

        {/* ── COMO FUNCIONA ───────────────────────────────────────────────────
            Sem 01/02/03. A ordem já está clara pela sequência; numerar é
            enfeite quando o texto sozinho resolve. */}
        <section className="pt-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Como funciona</h2>
          <ol className="mt-8 space-y-6">
            {PASSOS.map(({ t, d }, i) => (
              <li key={t} className="flex gap-5">
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/20 text-sm font-semibold text-white/60">
                  {i + 1}
                </span>
                <div>
                  <p className="text-lg font-semibold">{t}</p>
                  <p className="mt-1 leading-relaxed text-white/60">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── O COMPROMISSO ───────────────────────────────────────────────────
            Vem ANTES do preço de propósito. Quem descobre a exigência das fotos
            depois de pagar trava e não manda — e aí o acompanhamento morre. */}
        <section className="pt-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            O que eu preciso de você
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/70">
            Consultoria à distância funciona quando os dois lados fazem a parte
            deles. A minha é montar e ajustar. A sua é esta:
          </p>

          <div className="mt-8 border-y border-white/10 py-8">
            <h3 className="text-xl font-bold">Fotos no primeiro dia e a cada 90</h3>
            <p className="mt-2 leading-relaxed text-white/65">
              É como eu enxergo a sua evolução de longe. Sem elas, o ajuste vira
              chute. São três ângulos:
            </p>
            <dl className="mt-5 space-y-3 text-white/70">
              <div><dt className="inline font-semibold text-white">Frontal · </dt>
                <dd className="inline">de frente, corpo relaxado.</dd></div>
              <div><dt className="inline font-semibold text-white">Lateral · </dt>
                <dd className="inline">mulheres com os braços erguidos à frente; homens com os braços estendidos ao lado do corpo.</dd></div>
              <div><dt className="inline font-semibold text-white">Posterior · </dt>
                <dd className="inline">de costas, mesma posição para todos.</dd></div>
            </dl>
            <p className="mt-5 leading-relaxed text-white/55">
              De preferência com roupa de piscina, que é o que mostra melhor a
              composição corporal. Se você não se sentir à vontade, top e shorts
              para mulheres e shorts para homens resolvem. As fotos ficam
              guardadas na sua conta dentro do aplicativo, visíveis só pra você
              e pra mim.
            </p>
          </div>

          <div className="mt-8 space-y-5">
            <div>
              <p className="text-lg font-semibold">Registrar a carga que você usou</p>
              <p className="mt-1 leading-relaxed text-white/60">
                Leva dois segundos por exercício e é o que me diz se o estímulo
                está certo ou se está na hora de subir.
              </p>
            </div>
            <div>
              <p className="text-lg font-semibold">Avisar no dia em que doer</p>
              <p className="mt-1 leading-relaxed text-white/60">
                Não na semana seguinte. Ajustar cedo evita parar depois.
              </p>
            </div>
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

            <div className="grid gap-7 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="email">E-mail</label>
                <input id="email" type="email" inputMode="email" className={input}
                  value={form.email} onChange={campo('email')} autoComplete="email"
                  placeholder="seu@email.com" />
              </div>
              <div>
                <label className={label} htmlFor="whatsapp">WhatsApp</label>
                <input id="whatsapp" type="tel" inputMode="tel" className={input}
                  value={form.whatsapp} onChange={campo('whatsapp')} autoComplete="tel"
                  placeholder="(00) 00000-0000" />
              </div>
            </div>

            <div className="grid gap-7 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="cpf">CPF</label>
                <input id="cpf" inputMode="numeric" className={input}
                  value={form.cpf} onChange={campo('cpf', mascaraCpf)}
                  placeholder="000.000.000-00" />
                <p className="mt-2 text-xs text-white/35">Para emitir a cobrança.</p>
              </div>
              <div>
                <label className={label} htmlFor="nascimento">Nascimento</label>
                <input id="nascimento" type="date" className={input}
                  value={form.nascimento} onChange={campo('nascimento')} />
              </div>
            </div>

            <div className="grid gap-7 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="sexo">Sexo</label>
                <select id="sexo" className={input} value={form.sexo} onChange={campo('sexo')}>
                  <option value="">Selecione</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Masculino">Masculino</option>
                </select>
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
