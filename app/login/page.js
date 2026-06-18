'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginPersonal } from '@/lib/auth';
import { usePersonal } from '@/lib/AuthContext';
import Image from 'next/image';
import { Lock, Mail, Eye, EyeOff, AlertCircle, ChevronRight } from 'lucide-react';

const FEATURES = [
  { label: 'Dashboard completo', desc: 'Visão em tempo real de alunos, receitas e vencimentos' },
  { label: 'Gestão de treinos', desc: 'Monte e distribua treinos com biblioteca de exercícios' },
  { label: 'Controle financeiro', desc: 'Acompanhe pagamentos e analise a receita mensal' },
  { label: 'Sincronizado com o app', desc: 'Dados compartilhados entre web e celular em tempo real' },
];

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [senha, setSenha]       = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro]         = useState('');
  const [loading, setLoading]   = useState(false);
  const personal = usePersonal();
  const router   = useRouter();

  useEffect(() => { if (personal) router.replace('/dashboard'); }, [personal, router]);

  async function handleLogin(e) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      await loginPersonal(email, senha);
      router.replace('/dashboard');
    } catch (err) {
      setErro(err.message.includes('Acesso restrito') ? err.message : 'E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full flex">

      {/* ── Painel esquerdo ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-[460px] shrink-0 relative overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #0b1a35 0%, #0d1f42 55%, #091628 100%)' }}>

        {/* Decoração de fundo */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-40 -right-20 w-96 h-96 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.04 }} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        {/* Conteúdo — logo no topo, conteúdo+footer na base */}
        <div className="relative z-10 flex flex-col justify-between p-12 flex-1">
          {/* Logo */}
          <div>
            <Image src="/logo.png" alt="PersonalPro" width={160} height={48} style={{ objectFit: 'contain', height: 48, width: 'auto' }} priority />
          </div>

          {/* Headline + Features + Footer — bloco base */}
          <div>
            <div className="mb-10">
              <p className="text-[11px] font-semibold text-blue-400/70 uppercase tracking-widest mb-4">
                Plataforma web para personal trainers
              </p>
              <h2 className="text-[32px] font-bold text-white leading-tight tracking-tight mb-5">
                Gerencie seu negócio<br />com clareza.
              </h2>
              <p className="text-[14px] text-white/45 leading-relaxed max-w-xs">
                Todos os seus alunos, treinos e finanças centralizados — sincronizados com o app mobile.
              </p>
            </div>

            <div className="space-y-4 mb-10">
              {FEATURES.map(({ label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)' }}>
                    <ChevronRight size={10} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white/80 leading-none mb-1">{label}</p>
                    <p className="text-[11px] text-white/35 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              © 2026 PersonalPro · Todos os direitos reservados
            </p>
          </div>
        </div>
      </div>

      {/* ── Painel direito — formulário ──────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 relative"
        style={{ background: '#080f1d' }}>

        {/* Fundo sutil */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.03]"
            style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
        </div>

        <div className="relative w-full max-w-[380px]">
          {/* Logo mobile */}
          <div className="lg:hidden mb-10">
            <Image src="/logo.png" alt="PersonalPro" width={140} height={42} style={{ objectFit: 'contain', height: 42, width: 'auto' }} priority />
          </div>

          {/* Cabeçalho do form */}
          <div className="mb-8">
            <h1 className="text-[26px] font-bold text-white tracking-tight mb-2">Entrar na plataforma</h1>
            <p className="text-[13px] text-white/35">Acesso restrito a personal trainers cadastrados.</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2">
                E-mail
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className="w-full pl-9 pr-4 py-3 rounded-xl text-[13px] text-white placeholder-white/20 focus:outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.04)'; }}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type={verSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-3 rounded-xl text-[13px] text-white placeholder-white/20 focus:outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.04)'; }}
                />
                <button
                  type="button"
                  onClick={() => setVerSenha(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
                >
                  {verSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {erro && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-[12px] text-red-300 leading-relaxed">{erro}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-[14px] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all mt-1"
              style={{
                background: loading ? '#2563eb' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                boxShadow: '0 4px 24px rgba(37,99,235,0.25)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
