'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { usePersonal } from '@/lib/AuthContext';
import { buscarAlunos } from '@/lib/firestore';
import { avaliarAssinatura, ALUNOS_GRATIS } from '@/lib/assinatura';
import { logout } from '@/lib/auth';
import {
  LayoutDashboard, Users, Dumbbell, DollarSign, LogOut,
  ChevronRight, CalendarDays, UserCircle, BookOpen, Video, Activity, CreditCard,
  Lock, AlertTriangle, Menu, X,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard',              icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/alunos',       icon: Users,           label: 'Alunos' },
  { href: '/dashboard/treinos',      icon: Dumbbell,        label: 'Treinos' },
  { href: '/dashboard/biblioteca',   icon: BookOpen,        label: 'Biblioteca' },
  { href: '/dashboard/exercicios',   icon: Video,           label: 'Exercícios' },
  { href: '/dashboard/endurance',    icon: Activity,        label: 'Endurance' },
  { href: '/dashboard/agenda',       icon: CalendarDays,    label: 'Agenda' },
  { href: '/dashboard/financeiro',   icon: DollarSign,      label: 'Financeiro' },
  { href: '/dashboard/assinatura',   icon: CreditCard,      label: 'Assinatura' },
  { href: '/dashboard/perfil',       icon: UserCircle,      label: 'Meu Perfil' },
];

const LABEL_MAP = {
  dashboard: 'Dashboard',
  alunos: 'Alunos',
  treinos: 'Treinos',
  biblioteca: 'Biblioteca',
  exercicios: 'Exercícios',
  endurance: 'Endurance',
  agenda: 'Agenda',
  financeiro: 'Financeiro',
  assinatura: 'Assinatura',
  perfil: 'Meu Perfil',
  novo: 'Novo',
};

const ROTAS_LIVRES = ['/dashboard/assinatura', '/dashboard/perfil'];

function GatePaywall({ alunosCount, avaliacao }) {
  const msg = avaliacao.estado === 'sem'
    ? `Você tem ${alunosCount} alunos ativos. O plano gratuito inclui até ${ALUNOS_GRATIS}.`
    : `Sua assinatura expirou. Renove para continuar acessando todas as funcionalidades.`;

  return (
    <div className="flex-1 flex items-center justify-center bg-[#080f1d] relative">
      <div className="absolute inset-0 bg-[#080f1d]/80 backdrop-blur-sm" />
      <div className="relative z-10 text-center max-w-sm px-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-5 ring-1 ring-amber-500/20">
          <Lock size={28} className="text-amber-400" strokeWidth={1.5} />
        </div>
        <h2 className="text-[18px] font-bold text-white mb-2">Assinatura necessária</h2>
        <p className="text-[13px] text-white/45 leading-relaxed mb-6">{msg}</p>
        <Link href="/dashboard/assinatura"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white transition-all shadow-lg shadow-blue-900/30">
          <CreditCard size={14} />
          Ver planos e assinar
        </Link>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const personal = usePersonal();
  const router   = useRouter();
  const pathname = usePathname();

  const [alunosCount, setAlunosCount]     = useState(0);
  const [contando, setContando]           = useState(true);
  const [sidebarAberta, setSidebarAberta] = useState(false);

  useEffect(() => {
    if (!personal?.uid) return;
    setContando(true);
    buscarAlunos()
      .then(list => setAlunosCount(list.filter(a => a.ativo !== false).length))
      .finally(() => setContando(false));
  }, [personal?.uid]);

  useEffect(() => {
    if (personal === null) router.replace('/login');
  }, [personal, router]);

  useEffect(() => { setSidebarAberta(false); }, [pathname]);

  if (!personal) {
    return (
      <div className="flex h-full items-center justify-center bg-[#080f1d]">
        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const avaliacao     = avaliarAssinatura(personal.assinatura);
  const estaRotaLivre = ROTAS_LIVRES.some(r => pathname.startsWith(r));
  const gateAtivo     = !contando && alunosCount > ALUNOS_GRATIS && !avaliacao.liberado;
  const mostrarGate   = gateAtivo && !estaRotaLivre;
  const mostrarAlerta = gateAtivo && pathname === '/dashboard';

  const initials = personal.nome
    ? personal.nome.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')
    : (personal.email?.[0] || 'P').toUpperCase();

  const displayName = personal.nome?.split(' ').slice(0, 2).join(' ')
    || personal.email?.split('@')[0]
    || 'Personal';

  const segs = pathname.split('/').filter(Boolean);

  return (
    <div className="flex h-full bg-[#080f1d]">

      {sidebarAberta && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarAberta(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col transition-transform duration-300 ease-in-out md:relative md:z-auto md:w-[220px] md:shrink-0 md:translate-x-0 ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'rgba(8,14,30,0.98)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>

        <div className="flex items-center justify-between px-4 h-14 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <Image src="/logo.png" alt="PersonalPro" width={120} height={36} style={{ objectFit: 'contain', height: 36, width: 'auto' }} priority />
          <button className="md:hidden p-1.5 text-white/40 hover:text-white/80 rounded-lg transition-colors"
            onClick={() => setSidebarAberta(false)}>
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 px-2.5 py-4 overflow-y-auto">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] px-3 mb-3"
            style={{ color: 'rgba(255,255,255,0.2)' }}>
            Navegação
          </p>
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            const bloqueada = gateAtivo && !ROTAS_LIVRES.some(r => href.startsWith(r)) && href !== '/dashboard';
            return (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 mb-0.5 relative"
                style={active ? {
                  background: 'rgba(59,130,246,0.12)',
                  color: '#60a5fa',
                  boxShadow: 'inset 2px 0 0 #3b82f6',
                } : {
                  color: bloqueada ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.4)',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = ''; e.currentTarget.style.color = bloqueada ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.4)'; } }}
              >
                <Icon size={15} strokeWidth={active ? 2.1 : 1.75} />
                {label}
                {bloqueada && <Lock size={10} className="ml-auto text-amber-500/60" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-2.5 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {gateAtivo && (
            <Link href="/dashboard/assinatura"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 mb-2 hover:bg-amber-500/15 transition-all">
              <AlertTriangle size={12} className="text-amber-400 shrink-0" />
              <p className="text-[10px] text-amber-300/80 leading-tight">Assinatura necessária</p>
            </Link>
          )}

          <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl mb-1"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold leading-tight truncate"
                style={{ color: 'rgba(255,255,255,0.85)' }}
                title={personal.nome || personal.email}>
                {displayName}
              </p>
              <p className="text-[10px] leading-tight truncate"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                title={personal.email}>
                {personal.email}
              </p>
            </div>
          </div>

          <button
            onClick={() => logout().then(() => router.replace('/login'))}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] transition-all"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
          >
            <LogOut size={13} strokeWidth={1.75} />
            Sair da conta
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden min-w-0">

        <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-8"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(8,14,30,0.6)',
            backdropFilter: 'blur(12px)',
          }}>
          <div className="flex items-center gap-3 min-w-0">
            <button className="md:hidden -ml-1 p-1.5 text-white/50 hover:text-white/80 rounded-lg transition-colors"
              onClick={() => setSidebarAberta(true)}>
              <Menu size={20} />
            </button>
            <nav className="flex items-center gap-1 text-[12px] min-w-0">
              {segs.map((seg, i) => {
                const isLast = i === segs.length - 1;
                const label = LABEL_MAP[seg] || (seg.length >= 16 ? 'Detalhe' : seg);
                return (
                  <span key={i} className={`flex items-center gap-1 ${!isLast ? 'hidden sm:flex' : ''}`}>
                    {i > 0 && <ChevronRight size={11} className="hidden sm:block" style={{ color: 'rgba(255,255,255,0.15)' }} />}
                    <span className="truncate" style={{ color: isLast ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)', fontWeight: isLast ? 500 : 400 }}>
                      {label}
                    </span>
                  </span>
                );
              })}
            </nav>
          </div>

          {gateAtivo && !estaRotaLivre && (
            <Link href="/dashboard/assinatura"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20 hover:bg-amber-500/15 transition-all text-[11px] text-amber-300/80 shrink-0 ml-2">
              <AlertTriangle size={11} className="text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Assinatura expirada</span>
            </Link>
          )}
        </header>

        {mostrarAlerta && (
          <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/15 px-4 md:px-8 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle size={13} className="text-amber-400 shrink-0" />
              <p className="text-[12px] text-amber-300/80 truncate">
                <strong>{alunosCount}</strong> alunos ativos
                <span className="hidden sm:inline"> — Ative sua assinatura para continuar usando o PersonalPro.</span>
              </p>
            </div>
            <Link href="/dashboard/assinatura"
              className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap">
              Ver planos
            </Link>
          </div>
        )}

        {mostrarGate
          ? <GatePaywall alunosCount={alunosCount} avaliacao={avaliacao} />
          : <main className="flex-1 overflow-y-auto">{children}</main>
        }
      </div>
    </div>
  );
}
