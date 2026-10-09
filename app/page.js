'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { usePersonal } from '@/lib/AuthContext';
import {
  Users, Dumbbell, DollarSign, CalendarDays, Activity,
  ChevronDown, ChevronRight, Check, Star, ArrowRight,
  Smartphone, BarChart2, BookOpen, Bell, LayoutDashboard, Wallet,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Users,
    title: 'Gestão de alunos',
    desc: 'Cadastre alunos, controle vencimentos, planos e histórico completo em um só lugar.',
  },
  {
    icon: Dumbbell,
    title: 'Treinos personalizados',
    desc: 'Monte programas com biblioteca de exercícios, vídeos e periodização automática de 12 meses.',
  },
  {
    icon: DollarSign,
    title: 'Controle financeiro',
    desc: 'Acompanhe receitas, inadimplentes e vencimentos. Integração com Asaas para cobrança automática.',
  },
  {
    icon: CalendarDays,
    title: 'Agenda inteligente',
    desc: 'Gerencie sessões, trocas de horário, férias e reposições sem conflitos.',
  },
  {
    icon: Activity,
    title: 'Avaliação física',
    desc: 'Pollock 7 dobras, IMC, % gordura e histórico de evolução com gráficos.',
  },
  {
    icon: Smartphone,
    title: 'App para alunos',
    desc: 'Seus alunos veem treinos, vídeos e evoluções direto no celular. iOS e Android.',
  },
];

const PLANOS = [
  {
    id: 'mensal',
    nome: '1 mês',
    preco: 29.90,
    porMes: 29.90,
    desc: 'Ideal para começar sem compromisso.',
    popular: false,
  },
  {
    id: 'trimestral',
    nome: '3 meses',
    preco: 79.90,
    porMes: 26.63,
    de: 89.70,
    desc: 'Economize 11% comparado ao mensal.',
    popular: false,
    badge: '11% OFF',
  },
  {
    id: 'semestral',
    nome: '6 meses',
    preco: 139.90,
    porMes: 23.32,
    de: 179.40,
    desc: 'Economize 22% comparado ao mensal.',
    popular: false,
    badge: '22% OFF',
  },
  {
    id: 'anual',
    nome: '12 meses',
    preco: 219.90,
    porMes: 18.33,
    de: 358.80,
    desc: 'Melhor custo-benefício. Economize 39%.',
    popular: true,
    badge: 'MAIS POPULAR',
  },
];

const FAQS = [
  {
    q: 'Quantos alunos posso ter gratuitamente?',
    a: 'Até 3 alunos ativos sem precisar de assinatura. Para gerenciar mais alunos, escolha um dos planos pagos.',
  },
  {
    q: 'Onde baixo o app?',
    a: 'Na Google Play (Android) e na App Store (iPhone) — os botões estão no topo e no fim desta página. Existe app tanto para você quanto para seus alunos, e o mesmo cadastro funciona no celular e no computador.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim, sem fidelidade. Você cancela a qualquer momento pelo próprio app ou entrando em contato conosco.',
  },
  {
    q: 'Os dados dos meus alunos ficam seguros?',
    a: 'Todos os dados são armazenados no Firebase (Google Cloud), com criptografia em trânsito e em repouso.',
  },
  {
    q: 'Como funciona a cobrança dos alunos?',
    a: 'Pelo painel você gera cobranças via PIX, cartão ou boleto usando integração com o Asaas. O dinheiro cai direto na sua conta.',
  },
];

// O site é a única coisa na bio do Instagram, e quem chega de lá está no
// CELULAR procurando um app. Antes não havia um único link pras lojas — o
// visitante concluía que era só um sistema web (achado pelo dono).
const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.matheuspersonalpro.personalpro';
const IOS_URL  = 'https://apps.apple.com/br/app/personal-pro/id6782193425';

function BotoesLoja({ className = '' }) {
  const base = 'flex items-center justify-center gap-2.5 px-5 py-3 rounded-[22px] bg-white/[0.06] ring-1 ring-white/[0.12] hover:bg-white/[0.10] hover:ring-white/25 transition-all';
  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
      <a href={PLAY_URL} target="_blank" rel="noopener noreferrer" className={base}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path fill="#34d399" d="M3.6 1.8 13.5 12 3.6 22.2A2 2 0 0 1 3 20.8V3.2c0-.53.23-1.02.6-1.4Z" />
          <path fill="#C6F432" d="M16.4 8.9 5.6 2.6 4.9 2.2l10 10Z" />
          <path fill="#fbbf24" d="M16.4 15.1 14.9 12l5.4-3.1c1 .6 1 2.6 0 3.2Z" />
          <path fill="#fb7185" d="M4.9 21.8 14.9 12l1.5 3.1-10.8 6.3Z" />
        </svg>
        <span className="text-left">
          <span className="block text-[10px] text-white/40 leading-none">Baixe no</span>
          <span className="block text-[14px] font-bold text-white leading-tight">Google Play</span>
        </span>
      </a>
      <a href={IOS_URL} target="_blank" rel="noopener noreferrer" className={base}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="text-white" aria-hidden="true">
          <path d="M16.4 12.8c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.6.9-.7 0-1.9-.8-3.1-.8-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.1 1.2 9.4.8 1.1 1.7 2.4 3 2.3 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.1.8 1.3 0 2.1-1.1 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.6-1-2.6-3.9ZM14.2 5.6c.7-.8 1.1-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4Z" />
        </svg>
        <span className="text-left">
          <span className="block text-[10px] text-white/40 leading-none">Baixe na</span>
          <span className="block text-[14px] font-bold text-white leading-tight">App Store</span>
        </span>
      </a>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06] last:border-0">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-5 text-left gap-4">
        <span className="text-[15px] font-semibold text-white/85">{q}</span>
        <ChevronDown size={16} className={`text-white/30 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="text-[14px] text-white/50 leading-relaxed pb-5">{a}</p>
      )}
    </div>
  );
}

export default function LandingPage() {
  const personal = usePersonal();
  const router   = useRouter();

  useEffect(() => {
    if (personal) router.replace('/dashboard');
  }, [personal, router]);

  return (
    <div className="min-h-full bg-bg text-white">

      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.05]"
        style={{ background: 'rgba(10,11,13,0.85)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Image src="/logo.png" alt="PersonalPro" width={130} height={36} style={{ objectFit: 'contain', height: 32, width: 'auto' }} priority />
          <div className="flex items-center gap-3">
            <Link href="/login"
              className="text-[13px] font-medium text-white/50 hover:text-white transition-colors px-3 py-2">
              Entrar
            </Link>
            {/* A barra é fixa e acompanha a rolagem toda — era o botão mais
                visível da página e mandava pro login web, contradizendo o
                produto, que é um app de celular. */}
            <a href="#baixar"
              className="flex items-center gap-1.5 px-4 py-2 rounded-[14px] bg-accent hover:bg-accent-hover text-[13px] font-semibold text-on-accent transition-all shadow-lg shadow-black/30">
              Baixar app <ArrowRight size={13} />
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 ring-1 ring-accent/20 text-[12px] font-semibold text-accent mb-6">
              <Star size={11} fill="currentColor" /> O app mais completo para personal trainers
            </div>
            <h1 className="text-[40px] md:text-[56px] font-semibold tracking-tight leading-[1.1] mb-6 font-display">
              <span>
                Gerencie seus alunos
              </span>
              <br />
              <span className="text-accent">do jeito certo.</span>
            </h1>
            <p className="text-[16px] text-white/45 leading-relaxed mb-8 max-w-md mx-auto md:mx-0">
              Treinos, agenda, financeiro e avaliações em um único app. Para você focar no que importa — transformar vidas.
            </p>
            {/* Baixar o app é a ação PRINCIPAL: o produto é um app de celular,
                e a maior parte de quem chega vem da bio do Instagram, no
                telefone. O login web fica como caminho secundário — serve pra
                quem já é cliente e quer usar no computador. */}
            <BotoesLoja className="justify-center md:justify-start mb-4" />
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center md:justify-start">
              <p className="text-[12px] text-white/30">Grátis até 3 alunos · Sem cartão</p>
              <span className="hidden sm:block text-white/15">·</span>
              <Link href="/login"
                className="text-[12px] font-medium text-accent hover:text-accent-pale transition-colors">
                ou acesse pelo computador
              </Link>
            </div>
          </div>

          {/* Celular: o Inicio do personal, como esta no app depois do redesign
              Grafite & Lima (proxima sessao em destaque, recebido x previsto e a
              lista de acao). Antes mostrava a grade de 4 blocos coloridos do app
              antigo -- a pagina prometia uma tela que o app nao tem mais. */}
          <div className="shrink-0 relative">
            <div className="w-[250px] md:w-[290px] rounded-[44px] bg-black p-2 ring-1 ring-white/10 shadow-2xl shadow-black/50">
              <div className="rounded-[36px] overflow-hidden bg-bg">
                <div className="h-7 flex items-center justify-center">
                  <div className="w-16 h-1.5 rounded-full bg-white/10" />
                </div>
                <div className="px-4 pb-4 space-y-3.5">
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <p className="text-[10px] text-ink-3 uppercase tracking-[0.12em] font-semibold">Boa tarde</p>
                      <p className="text-[19px] text-ink font-display font-semibold leading-tight">Matheus</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center text-[12px] font-display font-semibold text-ink">M</div>
                  </div>

                  <div className="rounded-[22px] p-4 space-y-2.5"
                    style={{ background: 'radial-gradient(120% 90% at 100% 0%, rgba(198,244,50,0.16), transparent 60%), #141619' }}>
                    <p className="text-[9.5px] text-ink-3 uppercase tracking-[0.12em] font-semibold">Próxima sessão</p>
                    <div className="flex items-end justify-between">
                      <p className="text-[34px] leading-none font-display font-semibold text-accent">09:30</p>
                      <span className="text-[10.5px] font-semibold px-2.5 py-1.5 rounded-full bg-accent/15 text-accent">em 25 min</span>
                    </div>
                    <p className="text-[12px] text-ink-2">João Pedro · Hipertrofia</p>
                  </div>

                  <div className="rounded-[18px] bg-surface p-3.5 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <p className="text-[9.5px] text-ink-3 uppercase tracking-[0.12em] font-semibold">Recebido no mês</p>
                      <p className="text-[10.5px] text-ink-3">de R$ 3.100</p>
                    </div>
                    <p className="text-[24px] leading-none font-display font-semibold text-ink">R$ 2.400</p>
                    <div className="h-1 rounded-full bg-surface-2 overflow-hidden">
                      <div className="h-full w-[77%] rounded-full bg-accent" />
                    </div>
                  </div>

                  <div className="divide-y divide-white/[0.06]">
                    {[
                      { nome: 'Carla M.', info: 'atrasada há 3 dias', chip: 'Cobrar', tom: 'text-danger bg-danger/15' },
                      { nome: 'Ana Silva', info: 'vence amanhã', chip: 'Lembrar', tom: 'text-warn bg-warn/15' },
                    ].map(l => (
                      <div key={l.nome} className="flex items-center gap-3 py-2.5">
                        <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-[10px] font-display font-semibold text-ink shrink-0">
                          {l.nome.split(' ').map(x => x[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-ink leading-tight">{l.nome}</p>
                          <p className="text-[10.5px] text-ink-3">{l.info}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-full ${l.tom}`}>{l.chip}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-around border-t border-white/[0.06] px-2 pt-2.5 pb-3.5">
                  {[
                    { icone: LayoutDashboard, nome: 'Início', ativo: true },
                    { icone: CalendarDays, nome: 'Agenda' },
                    { icone: BookOpen, nome: 'Treinos' },
                    { icone: Users, nome: 'Alunos' },
                    { icone: Wallet, nome: 'Finanças' },
                  ].map(t => (
                    <div key={t.nome} className={`flex flex-col items-center gap-1 text-[9px] font-semibold ${t.ativo ? 'text-accent' : 'text-ink-3'}`}>
                      <t.icone size={17} />
                      {t.nome}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Brilho */}
            <div className="absolute -inset-8 -z-10 rounded-full opacity-[0.10]"
              style={{ background: 'radial-gradient(circle, #C6F432 0%, transparent 70%)' }} />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-20 md:py-24">
        <div className="text-center mb-14">
          <p className="text-[12px] font-semibold text-accent uppercase tracking-widest mb-3">Funcionalidades</p>
          <h2 className="text-[32px] md:text-[40px] font-semibold tracking-tight font-display">
            <span>
              Tudo que você precisa
            </span>
          </h2>
          <p className="text-[15px] text-white/35 mt-3 max-w-md mx-auto">Uma plataforma completa para você gerenciar sua carreira como personal trainer.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(f => {
            return (
              <div key={f.title} className="rounded-[22px] bg-surface ring-1 ring-white/[0.04] p-6 hover:ring-white/[0.10] transition-all">
                <f.icon size={22} className="text-accent mb-4" />
                <h3 className="text-[15px] font-bold text-white mb-2">{f.title}</h3>
                <p className="text-[13px] text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* PRICING */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-20 md:py-24">
        <div className="text-center mb-14">
          <p className="text-[12px] font-semibold text-accent uppercase tracking-widest mb-3">Planos</p>
          <h2 className="text-[32px] md:text-[40px] font-semibold tracking-tight font-display">
            <span>
              Invista na sua carreira
            </span>
          </h2>
          <p className="text-[15px] text-white/35 mt-3">Comece grátis. Assine quando quiser crescer.</p>
        </div>

        {/* Grátis */}
        <div className="rounded-[22px] bg-surface ring-1 ring-white/[0.04] p-6 flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-[14px] bg-white/[0.05] flex items-center justify-center">
              <Users size={18} className="text-white/40" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[15px] font-bold text-white">Plano Gratuito</p>
              <p className="text-[13px] text-white/35">Até 3 alunos ativos · Para sempre</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-[22px] font-semibold text-white/50 font-display">R$ 0</p>
            <Link href="/login"
              className="px-5 py-2.5 rounded-[14px] border border-white/[0.12] text-[13px] font-semibold text-white/60 hover:text-white hover:border-white/25 transition-all">
              Começar grátis
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANOS.map(p => (
            <div key={p.id} className={`relative rounded-[22px] p-6 flex flex-col transition-all ${p.popular ? 'bg-accent shadow-2xl shadow-black/40 pt-8' : 'bg-surface ring-1 ring-white/[0.04] hover:ring-white/[0.12]'}`}>
              {p.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${p.popular ? 'bg-on-accent text-accent' : 'bg-accent/15 text-accent ring-1 ring-accent/25'}`}>
                  {p.badge}
                </div>
              )}
              <p className={`text-[13px] font-semibold mb-1 ${p.popular ? 'text-on-accent/70' : 'text-white/50'}`}>{p.nome}</p>
              <div className="flex items-end gap-1 mb-1">
                <p className={`text-[32px] font-black leading-none ${p.popular ? 'text-on-accent' : 'text-white'}`}>
                  R$ {p.porMes.toFixed(2).replace('.', ',')}
                </p>
              </div>
              <p className={`text-[11px] mb-1 ${p.popular ? 'text-on-accent/60' : 'text-white/30'}`}>/mês</p>
              {p.de && <p className={`text-[11px] line-through mb-3 ${p.popular ? 'text-on-accent/50' : 'text-white/20'}`}>de R$ {p.de.toFixed(2).replace('.', ',')}</p>}
              <p className={`text-[12px] leading-relaxed mb-5 flex-1 ${p.popular ? 'text-on-accent/70' : 'text-white/35'}`}>{p.desc}</p>
              <Link href="/login"
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-[14px] text-[13px] font-bold transition-all ${p.popular ? 'bg-on-accent text-accent hover:bg-black' : 'bg-surface-2 text-ink hover:bg-white/[0.12]'}`}>
                Assinar <ChevronRight size={13} />
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-[12px] text-white/25 mt-6">Todos os planos incluem alunos ilimitados e acesso completo a todas as funcionalidades.</p>
      </section>

      {/* CTA BANNER */}
      <section id="baixar" className="max-w-6xl mx-auto px-4 md:px-8 py-10 scroll-mt-20">
        <div className="rounded-3xl overflow-hidden relative px-8 py-12 md:px-14 md:py-16 text-center"
          style={{ background: 'radial-gradient(120% 90% at 100% 0%, rgba(198,244,50,0.16), transparent 60%), #141619' }}>
          <div className="relative z-10">
            <h2 className="text-[28px] md:text-[38px] font-semibold tracking-tight mb-4 font-display">
              Pronto para ser o melhor<br />personal do Brasil?
            </h2>
            <p className="text-[15px] text-white/45 mb-8 max-w-md mx-auto">
              Junte-se a personais que já usam o PersonalPro para organizar e fazer crescer sua carreira.
            </p>
            <BotoesLoja className="justify-center" />
            <Link href="/login"
              className="inline-block mt-5 text-[13px] font-medium text-white/40 hover:text-white/70 transition-colors">
              ou criar conta pelo computador
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 md:px-8 py-20 md:py-24">
        <div className="text-center mb-12">
          <p className="text-[12px] font-semibold text-accent uppercase tracking-widest mb-3">Dúvidas</p>
          <h2 className="text-[32px] md:text-[38px] font-semibold tracking-tight font-display">
            <span>
              Perguntas frequentes
            </span>
          </h2>
        </div>
        <div className="rounded-[22px] bg-surface ring-1 ring-white/[0.04] px-6 divide-y divide-white/[0.06]">
          {FAQS.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.05] py-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Image src="/logo.png" alt="PersonalPro" width={110} height={32} style={{ objectFit: 'contain', height: 28, width: 'auto', opacity: 0.6 }} />
          <p className="text-[12px] text-white/20">© {new Date().getFullYear()} PersonalPro · Todos os direitos reservados</p>
          <div className="flex items-center gap-4">
            <a href={PLAY_URL} target="_blank" rel="noopener noreferrer" className="text-[12px] text-white/30 hover:text-white/60 transition-colors">Google Play</a>
            <a href={IOS_URL} target="_blank" rel="noopener noreferrer" className="text-[12px] text-white/30 hover:text-white/60 transition-colors">App Store</a>
            <Link href="/login" className="text-[12px] text-white/30 hover:text-white/60 transition-colors">Entrar</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
