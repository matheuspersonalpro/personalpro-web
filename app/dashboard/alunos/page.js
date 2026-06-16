'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { buscarAlunos } from '@/lib/firestore';
import { Search, ArrowUpRight, Clock, XCircle, CheckCircle2, Filter } from 'lucide-react';
import FichaAluno from './FichaAlunoClient';

function Badge({ tipo }) {
  const map = {
    online:     'bg-purple-500/15 text-purple-400 ring-purple-500/20',
    presencial: 'bg-blue-500/15 text-blue-400 ring-blue-500/20',
  };
  const cls = map[tipo] || map.presencial;
  return (
    <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ${cls}`}>
      {tipo === 'online' ? 'Online' : 'Presencial'}
    </span>
  );
}

function VencimentoCell({ vencimento }) {
  if (!vencimento) return <span className="text-white/25 text-[12px]">—</span>;
  const [d, m, y] = vencimento.split('/');
  const hoje = new Date();
  const data = new Date(+y, m - 1, +d);
  const diff = Math.ceil((data - hoje) / 86400000);
  if (diff < 0) return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-red-400">
      <XCircle size={12} /> Vencido · {vencimento}
    </span>
  );
  if (diff <= 7) return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-400">
      <Clock size={12} /> {diff === 0 ? 'Hoje' : `${diff}d`} · {vencimento}
    </span>
  );
  return <span className="text-[12px] text-white/45">{vencimento}</span>;
}

export default function AlunosPage() {
  const searchParams = useSearchParams();
  const alunoId      = searchParams.get('id');

  const [alunos, setAlunos]   = useState([]);
  const [busca, setBusca]     = useState('');
  const [filtro, setFiltro]   = useState('todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (alunoId) return;
    buscarAlunos().then(setAlunos).finally(() => setLoading(false));
  }, [alunoId]);

  if (alunoId) return <FichaAluno />;

  const hoje = new Date();

  function classificar(a) {
    if (!a.vencimento) return 'sem-data';
    const [d, m, y] = a.vencimento.split('/');
    const diff = Math.ceil((new Date(+y, m - 1, +d) - hoje) / 86400000);
    if (diff < 0) return 'inadimplente';
    if (diff <= 7) return 'vencendo';
    return 'ativo';
  }

  const filtrados = alunos
    .filter(a => a.nome?.toLowerCase().includes(busca.toLowerCase()))
    .filter(a => {
      if (filtro === 'todos') return true;
      if (filtro === 'vencendo') return classificar(a) === 'vencendo';
      if (filtro === 'inadimplentes') return classificar(a) === 'inadimplente';
      return classificar(a) === 'ativo';
    });

  const counts = {
    todos: alunos.length,
    ativos: alunos.filter(a => classificar(a) === 'ativo').length,
    vencendo: alunos.filter(a => classificar(a) === 'vencendo').length,
    inadimplentes: alunos.filter(a => classificar(a) === 'inadimplente').length,
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">Alunos</h1>
          <p className="text-[12px] text-white/35 mt-0.5">{alunos.length} aluno{alunos.length !== 1 ? 's' : ''} cadastrado{alunos.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-1 bg-white/[0.04] rounded-xl p-1">
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'ativos', label: 'Ativos' },
            { key: 'vencendo', label: 'Vencendo' },
            { key: 'inadimplentes', label: 'Inadimplentes' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFiltro(key)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                filtro === key
                  ? 'bg-white/[0.08] text-white shadow-sm'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {label}
              <span className={`ml-1.5 text-[10px] ${filtro === key ? 'text-white/60' : 'text-white/25'}`}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar aluno..."
            className="pl-8 pr-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.07] text-white placeholder-white/25 text-[13px] focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all w-52"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.05] bg-white/[0.01]">
              <th className="text-left px-6 py-3.5 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Nome</th>
              <th className="text-left px-6 py-3.5 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Plano</th>
              <th className="text-left px-6 py-3.5 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Frequência</th>
              <th className="text-left px-6 py-3.5 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Serviço</th>
              <th className="text-left px-6 py-3.5 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Vencimento</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filtrados.map((a, i) => (
              <tr key={a.id}
                className={`border-b border-white/[0.03] last:border-0 hover:bg-white/[0.025] transition-colors group ${i % 2 === 1 ? 'bg-white/[0.01]' : ''}`}
              >
                <td className="px-6 py-3.5">
                  <Link href={`/dashboard/alunos?id=${a.id}`} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center text-[11px] font-bold text-blue-400 shrink-0">
                      {a.nome?.[0]}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-white/80 group-hover:text-white transition-colors">{a.nome}</p>
                      {a.email && <p className="text-[11px] text-white/30">{a.email}</p>}
                    </div>
                  </Link>
                </td>
                <td className="px-6 py-3.5 text-[12px] text-white/40">{a.plano || '—'}</td>
                <td className="px-6 py-3.5 text-[12px] text-white/40">{a.frequencia ? `${a.frequencia}×/sem` : '—'}</td>
                <td className="px-6 py-3.5"><Badge tipo={a.tipoServico || 'presencial'} /></td>
                <td className="px-6 py-3.5"><VencimentoCell vencimento={a.vencimento} /></td>
                <td className="px-6 py-3.5">
                  <Link href={`/dashboard/alunos?id=${a.id}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/[0.08] text-white/40 hover:text-white">
                    <ArrowUpRight size={13} />
                  </Link>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <p className="text-[13px] text-white/25">Nenhum aluno encontrado.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
