'use client';
import { useEffect, useState } from 'react';
import { buscarPagamentos, buscarAlunos, registrarPagamento, excluirPagamento } from '@/lib/firestore';
import { TrendingUp, Plus, X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/components/Toast';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.total), 1);
  return (
    <div className="flex items-end gap-2 h-28 w-full">
      {data.map((item, i) => {
        const pct = max > 0 ? (item.total / max) * 100 : 0;
        const isLast = i === data.length - 1;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
            {item.total > 0 && (
              <span className="text-[10px] text-white/40 group-hover:text-white/70 transition-colors">
                {item.total >= 1000 ? `${(item.total / 1000).toFixed(1)}k` : item.total.toFixed(0)}
              </span>
            )}
            <div className="w-full relative" style={{ height: '80px' }}>
              <div
                className={`absolute bottom-0 w-full rounded-t-md transition-all ${
                  isLast ? 'bg-blue-500' : 'bg-white/[0.08] group-hover:bg-white/[0.12]'
                }`}
                style={{ height: pct > 0 ? `${Math.max(pct, 3)}%` : '2px', opacity: pct === 0 ? 0.3 : 1 }}
              />
            </div>
            <span className={`text-[10px] ${isLast ? 'text-blue-400 font-medium' : 'text-white/30'}`}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function FinanceiroPage() {
  const toast = useToast();
  const [pagamentos, setPagamentos]   = useState([]);
  const [alunos, setAlunos]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [mesIdx, setMesIdx]           = useState(new Date().getMonth());
  const [ano, setAno]                 = useState(new Date().getFullYear());
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState({ alunoId: '', valor: '', data: new Date().toISOString().slice(0, 10), descricao: '' });
  const [saving, setSaving]           = useState(false);
  const [confirmPagId, setConfirmPagId] = useState(null);

  const carregar = () => {
    Promise.all([buscarPagamentos(), buscarAlunos()])
      .then(([p, a]) => { setPagamentos(p); setAlunos(a); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { carregar(); }, []);

  function nomeAluno(alunoId) {
    return alunos.find(a => a.id === alunoId)?.nome || '—';
  }

  const mesStr  = `${ano}-${String(mesIdx + 1).padStart(2, '0')}`;
  const doMes   = pagamentos.filter(p => (p.data || '').startsWith(mesStr));
  const totalMes = doMes.reduce((s, p) => s + Number(p.valor || 0), 0);

  // Últimos 6 meses
  const ultimos6 = Array.from({ length: 6 }, (_, i) => {
    const d   = new Date(ano, mesIdx - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const total = pagamentos.filter(p => (p.data || '').startsWith(key)).reduce((s, p) => s + Number(p.valor || 0), 0);
    return { label: MESES[d.getMonth()], total };
  });

  const totalAno = pagamentos
    .filter(p => (p.data || '').startsWith(String(ano)))
    .reduce((s, p) => s + Number(p.valor || 0), 0);

  async function adicionar(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await registrarPagamento({ ...form, valor: Number(form.valor) });
      setForm({ alunoId: '', valor: '', data: new Date().toISOString().slice(0, 10), descricao: '' });
      setShowForm(false);
      carregar();
      toast('Pagamento registrado com sucesso.');
    } catch { toast('Erro ao registrar pagamento.', 'error'); }
    finally { setSaving(false); }
  }

  async function confirmarDeletePag() {
    if (!confirmPagId) return;
    await excluirPagamento(confirmPagId);
    setConfirmPagId(null);
    carregar();
    toast('Lançamento removido.');
  }

  function navMes(dir) {
    let nm = mesIdx + dir, na = ano;
    if (nm < 0) { nm = 11; na--; }
    if (nm > 11) { nm = 0; na++; }
    setMesIdx(nm); setAno(na);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      {confirmPagId && (
        <ConfirmModal
          title="Excluir lançamento"
          body="Este pagamento será removido permanentemente do histórico financeiro."
          confirmLabel="Excluir"
          onConfirm={confirmarDeletePag}
          onCancel={() => setConfirmPagId(null)}
        />
      )}
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">Financeiro</h1>
          <p className="text-[12px] text-white/35 mt-0.5">{pagamentos.length} lançamentos registrados</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[12px] font-semibold text-white transition-all shadow-lg shadow-blue-900/30">
          <Plus size={13} /> Novo lançamento
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-blue-500/20 p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-semibold text-white/80">Novo lançamento</p>
            <button onClick={() => setShowForm(false)} className="text-white/30 hover:text-white/60 transition-colors">
              <X size={15} />
            </button>
          </div>
          <form onSubmit={adicionar} className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Aluno</label>
              <select value={form.alunoId} onChange={e => setForm(f => ({ ...f, alunoId: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
                <option value="">Selecionar...</option>
                {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Valor (R$)</label>
              <input type="number" required value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                placeholder="0,00"
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] placeholder-white/20 focus:outline-none focus:border-blue-500/60 transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Data</label>
              <input type="date" required value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Descrição</label>
              <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Mensalidade, avulso..."
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] placeholder-white/20 focus:outline-none focus:border-blue-500/60 transition-all" />
            </div>
            <div className="col-span-4 flex justify-end pt-1">
              <button type="submit" disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-[12px] font-semibold text-white disabled:opacity-40 transition-all">
                {saving ? 'Salvando...' : 'Registrar pagamento'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-5">
        {/* KPIs */}
        <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-green-500/15 p-5">
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-3">Receita do mês</p>
          <p className="text-2xl font-bold text-green-400">R$ {totalMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-white/30 mt-1">{doMes.length} lançamento{doMes.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-5">
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-3">Receita no ano</p>
          <p className="text-2xl font-bold text-white">R$ {totalAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-white/30 mt-1">{ano}</p>
        </div>
        <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-5">
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-3">Média mensal</p>
          <p className="text-2xl font-bold text-white">
            R$ {(totalAno / Math.max(mesIdx + 1, 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-white/30 mt-1">Baseado em {mesIdx + 1} mes{mesIdx + 1 !== 1 ? 'es' : ''}</p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-5 mb-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-blue-400" strokeWidth={1.8} />
            <p className="text-[13px] font-semibold text-white/70">Últimos 6 meses</p>
          </div>
        </div>
        <BarChart data={ultimos6} />
      </div>

      {/* Tabela */}
      <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
        {/* Nav mês */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <button onClick={() => navMes(-1)} className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white transition-all">
              <ChevronLeft size={14} />
            </button>
            <span className="text-[13px] font-semibold text-white/80 w-32 text-center">{MESES[mesIdx]} {ano}</span>
            <button onClick={() => navMes(1)} className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white transition-all">
              <ChevronRight size={14} />
            </button>
          </div>
          <span className="text-[13px] font-bold text-green-400">
            R$ {totalMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.04] bg-white/[0.01]">
              <th className="text-left px-5 py-3 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Data</th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Aluno</th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Descrição</th>
              <th className="text-right px-5 py-3 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Valor</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {doMes.map((p, i) => (
              <tr key={p.id} className={`border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors group ${i % 2 === 1 ? 'bg-white/[0.01]' : ''}`}>
                <td className="px-5 py-3.5 text-[12px] text-white/40">{p.data}</td>
                <td className="px-5 py-3.5">
                  <span className="text-[13px] text-white/70">{nomeAluno(p.alunoId)}</span>
                </td>
                <td className="px-5 py-3.5 text-[12px] text-white/40">{p.descricao || '—'}</td>
                <td className="px-5 py-3.5 text-right">
                  <span className="text-[13px] font-semibold text-green-400">
                    R$ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <button onClick={() => setConfirmPagId(p.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-500/15 text-white/20 hover:text-red-400">
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
            {doMes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-14 text-center text-[13px] text-white/25">
                  Nenhum lançamento em {MESES[mesIdx]} {ano}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
