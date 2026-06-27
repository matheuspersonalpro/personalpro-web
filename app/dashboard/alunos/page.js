'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { buscarAlunos, criarAluno } from '@/lib/firestore';
import { Search, ArrowUpRight, Clock, XCircle, CheckCircle2, Filter, Plus, X, User } from 'lucide-react';
import FichaAluno from './FichaAlunoClient';
import { useToast } from '@/components/Toast';

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

function NovoAlunoModal({ onSalvo, onFechar }) {
  const toast = useToast();
  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', dataNascimento: '',
    tipoServico: 'presencial', plano: '', frequencia: '', vencimento: '', valorMensal: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim()) { toast('Nome é obrigatório.', 'error'); return; }
    setSaving(true);
    try {
      await criarAluno(form);
      toast('Aluno cadastrado com sucesso!');
      onSalvo();
    } catch { toast('Erro ao cadastrar aluno.', 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-xl rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-bold text-white">Novo Aluno</h2>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={salvar} className="overflow-y-auto">
          <div className="p-6 space-y-4">
            <p className="text-[11px] font-semibold text-white/25 uppercase tracking-wider">Identificação</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: 'nome',       label: 'Nome completo *', type: 'text',  col: 2 },
                { k: 'email',      label: 'E-mail',          type: 'email', col: 1 },
                { k: 'telefone',   label: 'Telefone',        type: 'tel',   col: 1 },
                { k: 'dataNascimento', label: 'Nascimento',  type: 'text',  col: 1, placeholder: 'DD/MM/AAAA' },
              ].map(({ k, label, type, col, placeholder }) => (
                <div key={k} className={col === 2 ? 'col-span-2' : ''}>
                  <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">{label}</label>
                  <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={placeholder}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all placeholder-white/20" />
                </div>
              ))}
              <div>
                <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Tipo de serviço</label>
                <select value={form.tipoServico} onChange={e => set('tipoServico', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
                  <option value="presencial">Presencial</option>
                  <option value="online">Online</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] font-semibold text-white/25 uppercase tracking-wider pt-2">Plano</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: 'plano',       label: 'Nome do plano',        type: 'text',   col: 2 },
                { k: 'frequencia',  label: 'Frequência semanal',   type: 'number', col: 1 },
                { k: 'vencimento',  label: 'Vencimento',           type: 'text',   col: 1, placeholder: 'DD/MM/AAAA' },
                { k: 'valorMensal', label: 'Valor mensal (R$)',    type: 'number', col: 1 },
              ].map(({ k, label, type, col, placeholder }) => (
                <div key={k} className={col === 2 ? 'col-span-2' : ''}>
                  <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">{label}</label>
                  <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={placeholder}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all placeholder-white/20" />
                </div>
              ))}
            </div>
          </div>
          <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2">
            <button type="button" onClick={onFechar} className="px-4 py-2 rounded-xl border border-white/[0.08] text-[13px] text-white/50 hover:text-white hover:border-white/15 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white disabled:opacity-40 transition-all shadow-lg shadow-blue-900/30">
              {saving ? 'Salvando...' : 'Cadastrar aluno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AlunosPage() {
  const searchParams = useSearchParams();
  const alunoId      = searchParams.get('id');
  const toast        = useToast();

  const [alunos,   setAlunos]   = useState([]);
  const [busca,    setBusca]    = useState('');
  const [filtro,   setFiltro]   = useState('todos');
  const [loading,  setLoading]  = useState(true);
  const [novoModal,setNovoModal]= useState(false);

  const carregar = () => buscarAlunos().then(setAlunos).finally(() => setLoading(false));
  useEffect(() => { if (!alunoId) carregar(); }, [alunoId]);

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
    <div className="px-4 pt-5 pb-6 md:p-8 max-w-6xl mx-auto w-full">
      {novoModal && (
        <NovoAlunoModal
          onSalvo={() => { setNovoModal(false); carregar(); }}
          onFechar={() => setNovoModal(false)}
        />
      )}

      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">Alunos</h1>
          <p className="text-[12px] text-white/35 mt-0.5">{alunos.length} aluno{alunos.length !== 1 ? 's' : ''} cadastrado{alunos.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setNovoModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white transition-all shadow-lg shadow-blue-900/30">
          <Plus size={14} /> Novo aluno
        </button>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-1 bg-white/[0.04] rounded-xl p-1">
          {[
            { key: 'todos',        label: 'Todos' },
            { key: 'ativos',       label: 'Ativos' },
            { key: 'vencendo',     label: 'Vencendo' },
            { key: 'inadimplentes',label: 'Inadimplentes' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFiltro(key)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                filtro === key ? 'bg-white/[0.08] text-white shadow-sm' : 'text-white/40 hover:text-white/70'
              }`}>
              {label}
              <span className={`ml-1.5 text-[10px] ${filtro === key ? 'text-white/60' : 'text-white/25'}`}>{counts[key]}</span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar aluno..."
            className="pl-8 pr-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.07] text-white placeholder-white/25 text-[13px] focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all w-52" />
        </div>
      </div>

      <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.05] bg-white/[0.01]">
              <th className="text-left px-6 py-3.5 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Nome</th>
              <th className="hidden md:table-cell text-left px-6 py-3.5 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Plano</th>
              <th className="hidden lg:table-cell text-left px-6 py-3.5 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Frequência</th>
              <th className="hidden md:table-cell text-left px-6 py-3.5 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Serviço</th>
              <th className="text-left px-6 py-3.5 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Vencimento</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filtrados.map((a, i) => (
              <tr key={a.id}
                className={`border-b border-white/[0.03] last:border-0 hover:bg-white/[0.025] transition-colors group ${i % 2 === 1 ? 'bg-white/[0.01]' : ''}`}>
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
                <td className="hidden md:table-cell px-6 py-3.5 text-[12px] text-white/40">{a.plano || '—'}</td>
                <td className="hidden lg:table-cell px-6 py-3.5 text-[12px] text-white/40">{a.frequencia ? `${a.frequencia}×/sem` : '—'}</td>
                <td className="hidden md:table-cell px-6 py-3.5"><Badge tipo={a.tipoServico || 'presencial'} /></td>
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
                  <User size={28} className="text-white/10 mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-[13px] text-white/25">
                    {busca ? 'Nenhum aluno encontrado.' : 'Nenhum aluno cadastrado ainda.'}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
