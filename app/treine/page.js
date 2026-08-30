'use client';

// Página de consultoria online do Matheus — o destino do link da bio do
// Instagram (@matheusseupersonal).
//
// Por que ela existe: hoje o link da bio cai num Linktree que só leva ao
// WhatsApp. Cada interessado vira uma conversa, e isso limita quantos alunos
// ele consegue atender. Aqui a pessoa lê como funciona, vê o preço e se
// cadastra sozinha.
//
// ESTÁGIO 1 (este arquivo): o formulário entrega o lead pronto no WhatsApp dele,
// com todos os dados já preenchidos. Ele manda o link de pagamento e cria a
// ficha. Já vende, e vale publicar hoje.
//
// ESTÁGIO 2 (próximo): o botão passa a criar a assinatura no Asaas e devolver o
// link de pagamento na hora. O webhook `asaasWebhook`, que já é avisado no
// PAYMENT_CONFIRMED, cria o aluno sozinho. Aí ele sai do meio.
//
// A venda acontece na WEB e não dentro do aplicativo de propósito: cobrança
// feita dentro do app pode ser enquadrada pela Apple como compra digital, com
// comissão e risco de recusa na revisão.

import { useState } from 'react';
import {
  Dumbbell, Bike, Footprints, Smartphone, MessageCircle,
  Camera, Check, ArrowRight, Clock, FileText,
} from 'lucide-react';

// WhatsApp do Matheus: (19) 99798-4847. Só dígitos, com o 55 do Brasil na frente
// — é o formato que o wa.me exige.
const WHATSAPP = '5519997984847';

// O Asaas não cria cliente sem CPF — `criarCheckout` já rejeita o que não tiver
// 11 dígitos. Validar os dígitos verificadores AQUI evita o pior caso: a pessoa
// digita errado, segue confiante, e só descobre quando a cobrança falha do
// outro lado, depois de já ter se comprometido.
function cpfValido(bruto) {
  const c = String(bruto || '').replace(/\D/g, '');
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;   // 111.111.111-11 e afins passam na conta

  const digito = (ate) => {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(c[i]) * (ate + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digito(9) === Number(c[9]) && digito(10) === Number(c[10]);
}

// Máscara conforme digita: 000.000.000-00
function mascaraCpf(v) {
  const c = String(v || '').replace(/\D/g, '').slice(0, 11);
  return c
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

const INCLUSO = [
  { icon: Dumbbell, t: 'Programa de musculação', d: 'Montado para o seu objetivo, os dias que você tem e a estrutura onde você treina.' },
  { icon: Smartphone, t: 'Treino no aplicativo', d: 'Com vídeo de cada exercício, séries, carga e descanso. Você abre e executa.' },
  { icon: Footprints, t: 'Corrida ou ciclismo', d: 'Planilha periodizada, semana por semana, sem custo a mais. Se você quiser.' },
  { icon: Clock, t: 'Resposta em 24 horas', d: 'Todos os dias, inclusive fim de semana.' },
  { icon: FileText, t: 'PDF do treino', d: 'Se preferir levar impresso para a academia.' },
];

const PASSOS = [
  { n: '01', t: 'Você preenche seus dados', d: 'Leva um minuto. Nome, contato e algumas perguntas sobre você.' },
  { n: '02', t: 'Recebe o acesso ao aplicativo', d: 'E responde a avaliação inicial: objetivo, rotina, histórico e saúde.' },
  { n: '03', t: 'Eu monto o seu programa', d: 'Em cima do que você respondeu. Não é treino pronto de prateleira.' },
  { n: '04', t: 'Você treina e eu acompanho', d: 'Você registra a carga, eu vejo a evolução e ajusto ao longo do caminho.' },
];

const FAQ = [
  {
    q: 'Preciso de academia?',
    r: 'Não necessariamente. O programa é montado com o que você tem — academia completa, academia simples, ou halteres em casa. Você me diz na avaliação inicial.',
  },
  {
    q: 'Tem fidelidade?',
    r: 'Não. É mensal, você cancela quando quiser, sem multa e sem precisar justificar. O acesso vale até o fim do mês já pago e a cobrança do mês seguinte não acontece.',
  },
  {
    q: 'A corrida e o ciclismo custam à parte?',
    r: 'Não. Se você quiser, a planilha entra junto, periodizada, pelo mesmo valor.',
  },
  {
    q: 'Em quanto tempo você responde?',
    r: 'Em até 24 horas, todos os dias da semana.',
  },
  {
    q: 'Sou iniciante. Serve pra mim?',
    r: 'Serve. O ponto de partida é o seu, não o de outra pessoa — quem nunca treinou começa diferente de quem treina há cinco anos.',
  },
  {
    q: 'E as fotos, são obrigatórias?',
    r: 'São como eu acompanho a sua evolução à distância. Sem elas, o ajuste vira chute. Você manda no primeiro dia e a cada 90 dias, e elas ficam guardadas na sua conta dentro do aplicativo — visíveis só para você e para mim.',
  },
];

export default function Treine() {
  const [form, setForm] = useState({
    nome: '', email: '', cpf: '', whatsapp: '', nascimento: '', sexo: '', modalidade: 'musculacao',
  });
  const [erro, setErro] = useState('');

  const campo = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (erro) setErro('');
  };

  function enviar(e) {
    e.preventDefault();

    // Validação antes de sair da página: mandar o interessado pro WhatsApp com
    // dado faltando desperdiça o contato e obriga a perguntar de novo.
    const faltando = [];
    if (!form.nome.trim()) faltando.push('nome');
    if (!form.email.trim()) faltando.push('e-mail');
    if (!form.whatsapp.trim()) faltando.push('WhatsApp');
    if (!form.cpf.trim()) faltando.push('CPF');
    if (!form.sexo) faltando.push('sexo');
    if (faltando.length) {
      setErro(`Falta preencher: ${faltando.join(', ')}.`);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setErro('Confira o e-mail — ele é o seu acesso ao aplicativo.');
      return;
    }
    // O CPF é exigência do Asaas para emitir a cobrança, não curiosidade.
    if (!cpfValido(form.cpf)) {
      setErro('Confira o CPF — ele é necessário para emitir a cobrança.');
      return;
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
      // O <input type="date"> entrega ISO (1990-05-12). Vira 12/05/1990 porque
      // quem lê isso é gente, no WhatsApp, não um sistema.
      form.nascimento
        ? `Nascimento: ${form.nascimento.split('-').reverse().join('/')}`
        : null,
      `Sexo: ${form.sexo}`,
      `Quero: ${modalidade}`,
    ].filter(Boolean).join('\n');

    window.location.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
  }

  const inputCls =
    'w-full rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-white placeholder-white/35 ' +
    'outline-none transition focus:border-blue-500 focus:bg-white/8';
  const labelCls = 'mb-1.5 block text-sm font-medium text-white/70';

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24">

      {/* Abertura: quem é, o que é, e pra quem serve — nessa ordem. */}
      <header className="pt-16 pb-4 sm:pt-24">
        <p className="text-sm font-medium tracking-wide text-blue-400">
          Consultoria online
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          Treine comigo, de onde você estiver
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">
          Musculação, corrida e ciclismo. Um programa montado para o seu objetivo, os
          dias que você tem e o lugar onde você treina — não um treino pronto que
          serve para qualquer um.
        </p>

        <a
          href="#comecar"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white transition hover:bg-blue-500"
        >
          Quero começar <ArrowRight size={18} />
        </a>
      </header>

      {/* O que está incluso */}
      <section className="mt-20">
        <h2 className="text-2xl font-semibold tracking-tight">O que você recebe</h2>
        <div className="mt-6 grid gap-3">
          {INCLUSO.map(({ icon: Icon, t, d }) => (
            <div key={t} className="flex gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/12">
                <Icon size={19} className="text-blue-400" />
              </div>
              <div>
                <p className="font-semibold">{t}</p>
                <p className="mt-1 text-sm leading-relaxed text-white/60">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section className="mt-20">
        <h2 className="text-2xl font-semibold tracking-tight">Como funciona</h2>
        <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/8">
          {PASSOS.map(({ n, t, d }) => (
            <div key={n} className="flex gap-4 bg-[#0b1424] p-5">
              <span className="mt-0.5 font-mono text-sm text-white/30">{n}</span>
              <div>
                <p className="font-semibold">{t}</p>
                <p className="mt-1 text-sm leading-relaxed text-white/60">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* O compromisso das fotos — dito ANTES do pagamento, de propósito.
          Se a pessoa descobre isso depois de pagar, ela trava e não manda. */}
      <section className="mt-20">
        <h2 className="text-2xl font-semibold tracking-tight">O que eu preciso de você</h2>
        <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-6">
          <div className="flex items-center gap-3">
            <Camera size={20} className="text-blue-400" />
            <p className="font-semibold">Fotos no primeiro dia e a cada 90 dias</p>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            É assim que eu acompanho a sua evolução à distância. São três ângulos:
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-white/70">
            <li className="flex gap-2.5"><Check size={16} className="mt-0.5 shrink-0 text-blue-400" /><span><b className="text-white">Frontal</b> — de frente, corpo relaxado.</span></li>
            <li className="flex gap-2.5"><Check size={16} className="mt-0.5 shrink-0 text-blue-400" /><span><b className="text-white">Lateral</b> — mulheres com os braços erguidos à frente; homens com os braços estendidos ao lado do corpo.</span></li>
            <li className="flex gap-2.5"><Check size={16} className="mt-0.5 shrink-0 text-blue-400" /><span><b className="text-white">Posterior</b> — de costas, mesma posição para todos.</span></li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            De preferência com roupa de piscina, que é o que mostra melhor a
            composição corporal. Se você não se sentir à vontade, top e shorts para
            mulheres e shorts para homens resolvem.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            As fotos ficam guardadas na sua conta dentro do aplicativo, visíveis
            apenas para você e para mim, e servem só para comparar a sua evolução.
          </p>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
            <p className="font-semibold">Registrar a carga</p>
            <p className="mt-1 text-sm leading-relaxed text-white/60">
              É o que me mostra se o estímulo está certo. Leva dois segundos por
              exercício, dentro do aplicativo.
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
            <p className="font-semibold">Avisar quando doer</p>
            <p className="mt-1 text-sm leading-relaxed text-white/60">
              No dia em que doer, não na semana seguinte. Ajustar cedo evita parar
              depois.
            </p>
          </div>
        </div>
      </section>

      {/* Preço */}
      <section className="mt-20">
        <div className="rounded-2xl border border-blue-500/25 bg-blue-500/[0.07] p-7">
          <p className="text-sm font-medium text-blue-300">Plano mensal</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight">
            R$ 149,90<span className="text-xl font-normal text-white/50">/mês</span>
          </p>
          <p className="mt-4 text-white/70">
            Sem fidelidade. Cancele quando quiser, sem multa e sem justificativa.
            Musculação com corrida ou ciclismo inclusos, se você quiser.
          </p>
        </div>
      </section>

      {/* Formulário */}
      <section id="comecar" className="mt-20 scroll-mt-8">
        <h2 className="text-2xl font-semibold tracking-tight">Começar</h2>
        <p className="mt-2 text-white/60">
          Preencha abaixo e eu te mando o passo a passo. Leva um minuto.
        </p>

        <form onSubmit={enviar} className="mt-6 grid gap-4" noValidate>
          <div>
            <label className={labelCls} htmlFor="nome">Nome completo</label>
            <input id="nome" className={inputCls} value={form.nome} onChange={campo('nome')} autoComplete="name" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="email">E-mail</label>
              <input id="email" type="email" inputMode="email" className={inputCls}
                value={form.email} onChange={campo('email')} autoComplete="email"
                placeholder="seu@email.com" />
            </div>
            <div>
              <label className={labelCls} htmlFor="whatsapp">WhatsApp</label>
              <input id="whatsapp" type="tel" inputMode="tel" className={inputCls}
                value={form.whatsapp} onChange={campo('whatsapp')} autoComplete="tel"
                placeholder="(00) 00000-0000" />
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="cpf">CPF</label>
            <input
              id="cpf" inputMode="numeric" className={inputCls}
              value={form.cpf}
              onChange={(e) => {
                setForm((f) => ({ ...f, cpf: mascaraCpf(e.target.value) }));
                if (erro) setErro('');
              }}
              placeholder="000.000.000-00"
            />
            <p className="mt-1.5 text-xs text-white/40">
              Necessário para emitir a cobrança.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="nascimento">Data de nascimento</label>
              <input id="nascimento" type="date" className={inputCls}
                value={form.nascimento} onChange={campo('nascimento')} />
            </div>
            <div>
              <label className={labelCls} htmlFor="sexo">Sexo</label>
              <select id="sexo" className={inputCls} value={form.sexo} onChange={campo('sexo')}>
                <option value="">Selecione</option>
                <option value="Feminino">Feminino</option>
                <option value="Masculino">Masculino</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="modalidade">O que você quer treinar</label>
            <select id="modalidade" className={inputCls} value={form.modalidade} onChange={campo('modalidade')}>
              <option value="musculacao">Só musculação</option>
              <option value="corrida">Musculação + corrida</option>
              <option value="ciclismo">Musculação + ciclismo</option>
            </select>
          </div>

          {erro && (
            <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {erro}
            </p>
          )}

          <button
            type="submit"
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-blue-500"
          >
            <MessageCircle size={20} /> Continuar
          </button>
          <p className="text-center text-xs text-white/40">
            Você vai ser levado ao WhatsApp com os seus dados já preenchidos.
          </p>
        </form>
      </section>

      {/* Dúvidas */}
      <section className="mt-20">
        <h2 className="text-2xl font-semibold tracking-tight">Dúvidas</h2>
        <div className="mt-6 grid gap-3">
          {FAQ.map(({ q, r }) => (
            <details key={q} className="group rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <summary className="cursor-pointer list-none font-semibold marker:hidden">
                {q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-white/65">{r}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="mt-20 border-t border-white/8 pt-8 text-sm text-white/40">
        <p>Matheus Wruck Barbosa · Personal Trainer</p>
        <p className="mt-1">
          O treino é entregue pelo aplicativo PersonalPro, disponível para Android e iPhone.
        </p>
      </footer>

    </main>
  );
}
