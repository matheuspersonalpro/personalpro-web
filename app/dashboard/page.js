'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { buscarAlunos, buscarPagamentos } from '@/lib/firestore';
import { usePersonal } from '@/lib/AuthContext';
import { Users, TrendingUp, AlertTriangle, Clock, ArrowUpRight, CheckCircle2, XCircle } from 'lucide-react';

function KpiCard({ icon: Icon, label, value, sub, accent }) {
  const theme = {
    blue:  { wrap: 'ring-blue-500/12',  icon: 'bg-blue-500/12 text-blue-400' },
    green: { wrap: 'ring-green-500/12', icon: 'bg-green-500/12 text-green-400' },
    amber: { wrap: 'ring-amber-500/12', icon: 'bg-amber-500/12 text-amber-400' },
    red:   { wrap: 'ring-red-500/12',   icon: 'bg-red-500/12 text-red-400' },
  };
  const t = theme[accent] || theme.blue;
  return (
    <div className={`rounded-2xl bg-[#0d1b2e] ring-1 ${t.wrap} p-6`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-5 ${t.icon}`}>
        <Icon size={18} strokeWidth={1.8} />
      </div>
      <p className="text-[32px] font-bold text-white tracking-tight leading-none mb-2">{value}</p>
      <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest">{label}</p>
      {sub && <p className="text-[11px] text-white/25 mt-1.5 truncate">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const personal = usePersonal();
  const [alunos, setAlunos]       = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.allSettled([buscarAlunos(), buscarPagamentos()])
      .then(([ra, rp]) => {
        if (ra.status === 'fulfilled') setAlunos(ra.value);
        if (rp.status === 'fulfilled') setPagamentos(rp.value);
      })
      .finally(() => setLoading(false));
  }, []);

  const hoje = new Date();
  const mesStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  const ativos        = alunos.filter(a => a.status !== 'inativo');
  const inadimplentes = alunos.filter(a => {
    if (!a.vencimento) return false;
    const [d, m, y] = a.vencimento.split('/');
    return new Date(+y, m - 1, +d) < hoje;
  });
  const vencendo = alunos.filter(a => {
    if (!a.vencimento) return false;
    const [d, m, y] = a.vencimento.split('/');
    const diff = (new Date(+y, m - 1, +d) - hoje) / 86400000;
    return diff >= 0 && diff <= 7;
  });
  const receitaMes = pagamentos
    .filter(p => (p.data || '').startsWith(mesStr))
    .reduce((s, p) => s + Number(p.valor || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 border-blue-500/60 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const hora = hoje.getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const nome = personal?.nome?.split(' ')[0] || personal?.displayName?.split(' ')[0] || '';

  return (
    <div className="px-8 pt-10 pb-10 max-w-[1100px] mx-auto w-full">

      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-[11px] font-medium text-white/25 uppercase tracking-widest mb-2">
            {hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="text-[30px] font-bold text-white tracking-tight leading-none">
            {saudacao}{nome ? `, ${nome}` : ''}.
          </h1>
        </div>
        <Link href="/dashboard/alunos"
          className="flex items-center gap-1.5 text-[12px] font-medium text-white/35 hover:text-white transition-colors">
          Ver todos os alunos <ArrowUpRight size={13} />
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <KpiCard icon={Users}         label="Alunos ativos"    value={ativos.length}       accent="blue" />
        <KpiCard icon={TrendingUp}    label="Receita do mês"
          value={`R$ ${receitaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} accent="green" />
        <KpiCard icon={Clock}         label="Vencem em 7 dias" value={vencendo.length}
          sub={vencendo.map(a => a.nome?.split(' ')[0]).join(', ') || undefined} accent="amber" />
        <KpiCard icon={AlertTriangle} label="Inadimplentes"    value={inadimplentes.length} accent="red" />
      </div>

      {/* Corpo */}
      <div className="grid grid-cols-3 gap-4">

        {/* Tabela alunos — 2 colunas */}
        <div className="col-span-2 rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
            <span className="text-[12px] font-semibold text-white/60 uppercase tracking-wider">Alunos</span>
            <Link href="/dashboard/alunos"
              className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors">
              Ver todos <ArrowUpRight size={11} />
            </Link>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {['Nome','Plano','Serviço','Vencimento'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-white/20 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alunos.slice(0, 8).map(a => {
                const vencido = (() => {
                  if (!a.vencimento) return false;
                  const [d, m, y] = a.vencimento.split('/');
                  return new Date(+y, m - 1, +d) < hoje;
                })();
                return (
                  <tr key={a.id} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.025] transition-colors group">
                    <td className="px-5 py-3.5">
                      <Link href={`/dashboard/alunos?id=${a.id}`} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center text-[11px] font-bold text-blue-400 shrink-0">
                          {a.nome?.[0]}
                        </div>
                        <span className="text-[13px] font-medium text-white/75 group-hover:text-white transition-colors">{a.nome}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-white/35">{a.plano || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ${
                        a.tipoServico === 'online'
                          ? 'bg-purple-500/12 text-purple-400 ring-purple-500/20'
                          : 'bg-blue-500/12 text-blue-400 ring-blue-500/20'
                      }`}>
                        {a.tipoServico === 'online' ? 'Online' : 'Presencial'}
                      </span>
                    </td>
                    <td className={`px-5 py-3.5 text-[12px] font-medium ${vencido ? 'text-red-400' : 'text-white/35'}`}>
                      {a.vencimento || '—'}
                    </td>
                  </tr>
                );
              })}
              {alunos.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-[13px] text-white/20">
                    Nenhum aluno cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Painéis laterais */}
        <div className="space-y-4">
          {/* Vencimentos */}
          <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.05]">
              <span className="text-[12px] font-semibold text-white/60 uppercase tracking-wider">Vencendo em breve</span>
            </div>
            <div className="p-3">
              {vencendo.length === 0 ? (
                <div className="flex items-center gap-2 px-2 py-3">
                  <CheckCircle2 size={13} className="text-green-500/40 shrink-0" />
                  <span className="text-[12px] text-white/25">Nenhum vencimento próximo</span>
                </div>
              ) : vencendo.map(a => {
                const [d, m, y] = a.vencimento.split('/');
                const diff = Math.ceil((new Date(+y, m - 1, +d) - hoje) / 86400000);
                return (
                  <Link key={a.id} href={`/dashboard/alunos?id=${a.id}`}
                    className="flex items-center justify-between px-2 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center text-[10px] font-bold text-amber-400">
                        {a.nome?.[0]}
                      </div>
                      <span className="text-[12px] text-white/65 group-hover:text-white transition-colors">{a.nome?.split(' ')[0]}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-amber-400">
                      {diff === 0 ? 'hoje' : `${diff}d`}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Inadimplentes */}
          <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-2">
              {inadimplentes.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
              <span className="text-[12px] font-semibold text-white/60 uppercase tracking-wider">Inadimplentes</span>
            </div>
            <div className="p-3">
              {inadimplentes.length === 0 ? (
                <div className="flex items-center gap-2 px-2 py-3">
                  <CheckCircle2 size={13} className="text-green-500/40 shrink-0" />
                  <span className="text-[12px] text-white/25">Nenhum inadimplente</span>
                </div>
              ) : inadimplentes.slice(0, 5).map(a => (
                <Link key={a.id} href={`/dashboard/alunos?id=${a.id}`}
                  className="flex items-center justify-between px-2 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-red-500/12 flex items-center justify-center text-[10px] font-bold text-red-400">
                      {a.nome?.[0]}
                    </div>
                    <span className="text-[12px] text-white/65 group-hover:text-white transition-colors">{a.nome?.split(' ')[0]}</span>
                  </div>
                  <span className="text-[11px] text-red-400">{a.vencimento}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
