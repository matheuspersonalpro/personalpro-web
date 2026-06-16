'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { usePersonal } from '@/lib/AuthContext';
import { logout } from '@/lib/auth';
import {
  LayoutDashboard, Users, Dumbbell, DollarSign, LogOut,
  Activity, ChevronRight,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard',            icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/alunos',     icon: Users,           label: 'Alunos' },
  { href: '/dashboard/treinos',    icon: Dumbbell,        label: 'Treinos' },
  { href: '/dashboard/financeiro', icon: DollarSign,      label: 'Financeiro' },
];

const LABEL_MAP = {
  dashboard: 'Dashboard',
  alunos: 'Alunos',
  treinos: 'Treinos',
  financeiro: 'Financeiro',
  novo: 'Novo',
};

export default function DashboardLayout({ children }) {
  const personal = usePersonal();
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (personal === null) router.replace('/login');
  }, [personal, router]);

  if (!personal) {
    return (
      <div className="flex h-full items-center justify-center bg-[#080f1d]">
        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = personal.nome
    ? personal.nome.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')
    : (personal.email?.[0] || 'P').toUpperCase();

  const displayName = personal.nome?.split(' ').slice(0, 2).join(' ')
    || personal.email?.split('@')[0]
    || 'Personal';

  const segs = pathname.split('/').filter(Boolean);

  return (
    <div className="flex h-full bg-[#080f1d]">

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className="w-[220px] shrink-0 flex flex-col"
        style={{ background: 'rgba(8,14,30,0.98)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>

        {/* Marca */}
        <div className="flex items-center gap-2.5 px-5 py-0 h-14 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #4f46e5)', boxShadow: '0 2px 8px rgba(59,130,246,0.4)' }}>
            <Activity size={13} className="text-white" />
          </div>
          <span className="font-bold text-[14px] text-white tracking-tight">PersonalPro</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-4 overflow-y-auto">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] px-3 mb-3"
            style={{ color: 'rgba(255,255,255,0.2)' }}>
            Navegação
          </p>
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 mb-0.5 relative"
                style={active ? {
                  background: 'rgba(59,130,246,0.12)',
                  color: '#60a5fa',
                  boxShadow: 'inset 2px 0 0 #3b82f6',
                } : {
                  color: 'rgba(255,255,255,0.4)',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; } }}
              >
                <Icon size={15} strokeWidth={active ? 2.1 : 1.75} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Perfil + sair */}
        <div className="p-2.5 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Card do perfil */}
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

          {/* Botão sair */}
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

      {/* ── Conteúdo ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-14 shrink-0 flex items-center justify-between px-8"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(8,14,30,0.6)',
            backdropFilter: 'blur(12px)',
          }}>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-[12px]">
            {segs.map((seg, i) => {
              const isLast = i === segs.length - 1;
              const label = LABEL_MAP[seg] || (seg.length >= 16 ? 'Detalhe' : seg);
              return (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight size={11} style={{ color: 'rgba(255,255,255,0.15)' }} />}
                  <span style={{ color: isLast ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)', fontWeight: isLast ? 500 : 400 }}>
                    {label}
                  </span>
                </span>
              );
            })}
          </nav>
        </header>

        {/* Página */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
