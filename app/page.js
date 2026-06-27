'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { usePersonal } from '@/lib/AuthContext';
import {
  Users, Dumbbell, DollarSign, CalendarDays, Activity,
  ChevronDown, ChevronRight, Check, Star, ArrowRight,
  Smartphone, BarChart2, BookOpen, Bell,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Users,
    title: 'Gestão de alunos',
    desc: 'Cadastre alunos, controle vencimentos, planos e histórico completo em um só lugar.',
    color: 'blue',
  },
  {
    icon: Dumbbell,
    title: 'Treinos personalizados',
    desc: 'Monte programas com biblioteca de exercícios, vídeos e periodização automática de 12 meses.',
    color: 'indigo',
  },
  {
    icon: DollarSign,
    title: 'Controle financeiro',
    desc: 'Acompanhe receitas, inadimplentes e vencimentos. Integração com Asaas para cobrança automática.',
    color: 'green',
  },
  {
    icon: CalendarDays,
    title: 'Agenda inteligente',
    desc: 'Gerencie sessões, trocas de horário, férias e reposições sem conflitos.',
    color: 'purple',
  },
  {
    icon: Activity,
    title: 'Avaliação física',
    desc: 'Pollock 7 dobras, IMC, % gordura e histórico de evolução com gráficos.',
    color: 'amber',
  },
  {
    icon: Smartphone,
    title: 'App para alunos',
    desc: 'Seus alunos veem treinos, vídeos e evoluções direto no celular. iOS e Android.',
    color: 'pink',
  },
];

const PLANOS = [
  {
    id: 'mensal',
    nome: '1 mês',
    preco: 34.90,
    porMes: 34.90,
    desc: 'Ideal para começar sem compromisso.',
    popular: false,
  },
  {
    id: 'trimestral',
    nome: '3 meses',
    preco: 99.90,
    porMes: 33.30,
    de: 104.70,
    desc: 'Economize 5% comparado ao mensal.',
    popular: false,
    badge: '5% OFF',
  },
  {
    id: 'semestral',
    nome: '6 meses',
    preco: 188.90,
    porMes: 31.48,
    de: 209.40,
    desc: 'Economize 10% comparado ao mensal.',
    popular: false,
    badge: '10% OFF',
  },
  {
    id: 'anual',
    nome: '12 meses',
    preco: 355.90,
    porMes: 29.66,
    de: 418.80,
    desc: 'Melhor custo-benefício. 4 meses grátis.',
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
    q: 'O app funciona no iPhone e Android?',
    a: 'Sim. Existe um app nativo para iOS (App Store) e Android (Google Play) tanto para personais quanto para alunos.',
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

const ACCENT = {
  blue:   { bg: 'bg-blue-500/10',   text: 'text-blue-400',   ring: 'ring-blue-500/20' },
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', ring: 'ring-indigo-500/20' },
  green:  { bg: 'bg-green-500/10',  text: 'text-green-400',  ring: 'ring-green-500/20' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', ring: 'ring-purple-500/20' },
  amber:  { bg: 'bg-amber-500/10',  text: 'text-amber-400',  ring: 'ring-amber-500/20' },
  pink:   { bg: 'bg-pink-500/10',   text: 'text-pink-400',   ring: 'ring-pink-500/20' },
};

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
    <div className="min-h-full bg-[#060c1a] text-white">

      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.05]"
        style={{ background: 'rgba(6,12,26,0.85)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Image src="/logo.png" alt="PersonalPro" width={130} height={36} style={{ objectFit: 'contain', height: 32, width: 'auto' }} priority />
          <div className="flex items-center gap-3">
            <Link href="/login"
              className="text-[13px] font-medium text-white/50 hover:text-white transition-colors px-3 py-2">
              Entrar
            </Link>
            <Link href="/login"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white transition-all shadow-lg shadow-blue-900/30">
              Começar grátis <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 ring-1 ring-blue-500/20 text-[12px] font-semibold text-blue-400 mb-6">
              <Star size={11} fill="currentColor" /> O app mais completo para personal trainers
            </div>
            <h1 className="text-[40px] md:text-[56px] font-black tracking-tight leading-[1.1] mb-6">
              <span style={{ background: 'linear-gradient(135deg, #fff 30%, rgba(255,255,255,0.6))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Gerencie seus alunos
              </span>
              <br />
              <span className="text-blue-400">do jeito certo.</span>
            </h1>
            <p className="text-[16px] text-white/45 leading-relaxed mb-8 max-w-md mx-auto md:mx-0">
              Treinos, agenda, financeiro e avaliações em um único app. Para você focar no que importa — transformar vidas.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center md:justify-start">
              <Link href="/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-[15px] font-bold text-white transition-all shadow-xl shadow-blue-900/40">
                Começar grátis <ArrowRight size={15} />
              </Link>
              <p className="text-[12px] text-white/30">Grátis até 3 alunos · Sem cartão</p>
            </div>
          </div>

          {/* Phone mockup */}
          <div className="shrink-0 relative">
            <div className="w-[240px] md:w-[280px] rounded-[44px] overflow-hidden ring-1 ring-white/10 shadow-2xl shadow-blue-900/30"
              style={{ background: 'linear-gradient(145deg, #0d1b2e, #080f1d)', border: '8px solid #1a2a42' }}>
              <div className="h-7 flex items-center justify-center">
                <div className="w-20 h-1.5 rounded-full bg-white/10" />
              </div>
              <div className="px-4 pb-6 space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">Boa tarde</p>
                    <p className="text-[15px] font-black text-white">Matheus</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-[11px] font-bold text-blue-400">M</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Alunos', value: '12', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { label: 'Receita', value: 'R$2.4k', color: 'text-green-400', bg: 'bg-green-500/10' },
                    { label: 'Vencendo', value: '3', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                    { label: 'Em dia', value: '9', color: 'text-purple-400', bg: 'bg-purple-500/10' },
                  ].map(c => (
                    <div key={c.label} className={`${c.bg} rounded-2xl p-3`}>
                      <p className={`text-[18px] font-black ${c.color}`}>{c.value}</p>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">{c.label}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl bg-white/[0.04] p-3 space-y-2">
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">Hoje</p>
                  {['08:00 · Ana Silva', '09:30 · João Pedro', '11:00 · Carla M.'].map(s => (
                    <div key={s} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                      <p className="text-[11px] text-white/60">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Glow */}
            <div className="absolute -inset-8 -z-10 rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-20 md:py-24">
        <div className="text-center mb-14">
          <p className="text-[12px] font-semibold text-blue-400 uppercase tracking-widest mb-3">Funcionalidades</p>
          <h2 className="text-[32px] md:text-[40px] font-black tracking-tight">
            <span style={{ background: 'linear-gradient(135deg, #fff, rgba(255,255,255,0.6))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Tudo que você precisa
            </span>
          </h2>
          <p className="text-[15px] text-white/35 mt-3 max-w-md mx-auto">Uma plataforma completa para você gerenciar sua carreira como personal trainer.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(f => {
            const a = ACCENT[f.color];
            return (
              <div key={f.title} className="rounded-2xl bg-[#0a1628] ring-1 ring-white/[0.06] p-6 hover:ring-white/[0.12] transition-all">
                <div className={`w-10 h-10 rounded-xl ${a.bg} ring-1 ${a.ring} flex items-center justify-center mb-4`}>
                  <f.icon size={18} className={a.text} strokeWidth={1.8} />
                </div>
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
          <p className="text-[12px] font-semibold text-blue-400 uppercase tracking-widest mb-3">Planos</p>
          <h2 className="text-[32px] md:text-[40px] font-black tracking-tight">
            <span style={{ background: 'linear-gradient(135deg, #fff, rgba(255,255,255,0.6))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Invista na sua carreira
            </span>
          </h2>
          <p className="text-[15px] text-white/35 mt-3">Comece grátis. Assine quando quiser crescer.</p>
        </div>

        {/* Grátis */}
        <div className="rounded-2xl bg-[#0a1628] ring-1 ring-white/[0.06] p-6 flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
              <Users size={18} className="text-white/40" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[15px] font-bold text-white">Plano Gratuito</p>
              <p className="text-[13px] text-white/35">Até 3 alunos ativos · Para sempre</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-[22px] font-black text-white/50">R$ 0</p>
            <Link href="/login"
              className="px-5 py-2.5 rounded-xl border border-white/[0.12] text-[13px] font-semibold text-white/60 hover:text-white hover:border-white/25 transition-all">
              Começar grátis
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANOS.map(p => (
            <div key={p.id} className={`relative rounded-2xl p-6 flex flex-col transition-all ${p.popular ? 'bg-blue-600 ring-2 ring-blue-400/50 shadow-2xl shadow-blue-900/40 pt-8' : 'bg-[#0a1628] ring-1 ring-white/[0.06] hover:ring-white/[0.12]'}`}>
              {p.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${p.popular ? 'bg-white text-blue-600' : 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'}`}>
                  {p.badge}
                </div>
              )}
              <p className={`text-[13px] font-semibold mb-1 ${p.popular ? 'text-blue-100' : 'text-white/50'}`}>{p.nome}</p>
              <div className="flex items-end gap-1 mb-1">
                <p className={`text-[32px] font-black leading-none ${p.popular ? 'text-white' : 'text-white'}`}>
                  R$ {p.porMes.toFixed(2).replace('.', ',')}
                </p>
              </div>
              <p className={`text-[11px] mb-1 ${p.popular ? 'text-blue-200' : 'text-white/30'}`}>/mês</p>
              {p.de && <p className={`text-[11px] line-through mb-3 ${p.popular ? 'text-blue-200/60' : 'text-white/20'}`}>de R$ {p.de.toFixed(2).replace('.', ',')}</p>}
              <p className={`text-[12px] leading-relaxed mb-5 flex-1 ${p.popular ? 'text-blue-100/80' : 'text-white/35'}`}>{p.desc}</p>
              <Link href="/login"
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${p.popular ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 ring-1 ring-blue-500/30'}`}>
                Assinar <ChevronRight size={13} />
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-[12px] text-white/25 mt-6">Todos os planos incluem alunos ilimitados e acesso completo a todas as funcionalidades.</p>
      </section>

      {/* CTA BANNER */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        <div className="rounded-3xl overflow-hidden relative px-8 py-12 md:px-14 md:py-16 text-center"
          style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f1f3d 50%, #1a1040 100%)' }}>
          <div className="absolute inset-0 opacity-30"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, #3b82f6 0%, transparent 60%)' }} />
          <div className="relative z-10">
            <h2 className="text-[28px] md:text-[38px] font-black tracking-tight mb-4">
              Pronto para ser o melhor<br />personal do Brasil?
            </h2>
            <p className="text-[15px] text-white/45 mb-8 max-w-md mx-auto">
              Junte-se a personais que já usam o PersonalPro para organizar e fazer crescer sua carreira.
            </p>
            <Link href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-[15px] font-bold text-white transition-all shadow-xl shadow-blue-900/40">
              Criar conta grátis <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 md:px-8 py-20 md:py-24">
        <div className="text-center mb-12">
          <p className="text-[12px] font-semibold text-blue-400 uppercase tracking-widest mb-3">Dúvidas</p>
          <h2 className="text-[32px] md:text-[38px] font-black tracking-tight">
            <span style={{ background: 'linear-gradient(135deg, #fff, rgba(255,255,255,0.6))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Perguntas frequentes
            </span>
          </h2>
        </div>
        <div className="rounded-2xl bg-[#0a1628] ring-1 ring-white/[0.06] px-6 divide-y divide-white/[0.06]">
          {FAQS.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.05] py-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Image src="/logo.png" alt="PersonalPro" width={110} height={32} style={{ objectFit: 'contain', height: 28, width: 'auto', opacity: 0.6 }} />
          <p className="text-[12px] text-white/20">© {new Date().getFullYear()} PersonalPro · Todos os direitos reservados</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-[12px] text-white/30 hover:text-white/60 transition-colors">Entrar</Link>
            <Link href="/login" className="text-[12px] text-white/30 hover:text-white/60 transition-colors">Criar conta</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
