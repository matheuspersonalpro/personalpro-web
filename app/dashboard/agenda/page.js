'use client';
import { useEffect, useState } from 'react';
import { buscarSessoes, buscarAlunos, criarSessao, atualizarSessao, excluirSessao } from '@/lib/firestore';
import {
  Plus, X, ChevronLeft, ChevronRight, Calendar, Clock,
  CheckCircle2, XCircle, AlertCircle, Trash2, Pencil,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const STATUS_MAP = {
  agendado:  { label: 'Agendado',  cls: 'bg-blue-500/15 text-blue-400 ring-blue-500/20',   icon: Clock },
  realizado: { label: 'Realizado', cls: 'bg-green-500/15 text-green-400 ring-green-500/20', icon: CheckCircle2 },
  faltou:    { label: 'Faltou',    cls: 'bg-red-500/15 text-red-400 ring-red-500/20',       icon: XCircle },
  cancelado: { label: 'Cancelado', cls: 'bg-white/[0.05] text-white/30 ring-white/[0.08]', icon: AlertCircle },
};

function isoWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function semanaLabel(seg) {
  const fim = new Date(seg);
  fim.setDate(fim.getDate() + 6);
  const fmt = d => `${d.getDate()}/${d.getMonth() + 1}`;
  return `${fmt(seg)} – ${fmt(fim)}`;
}

function getMondayOfWeek(offset = 0) {
  const hoje = new Date();
  const dow = hoje.getDay();
  const seg = new Date(hoje);
  seg.setDate(hoje.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  seg.setHours(0, 0, 0, 0);
  return seg;
}

function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function SessaoModal({ sessao, alunos, onSalvo, onFechar }) {
  const toast = useToast();
  const [form, setForm] = useState({
    alunoId: sessao?.alunoId || '',
    data:    sessao?.data    || toISO(new Date()),
    horario: sessao?.horario || '',
    tipo:    sessao?.tipo    || 'normal',
    status:  sessao?.status  || 'agendado',
    observacoes: sessao?.observacoes || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function salvar(e) {
    e.preventDefault();
    if (!form.alunoId) { toast('Selecione um aluno.', 'error'); return; }
    if (!form.data)    { toast('Informe a data.', 'error'); return; }
    setSaving(true);
    try {
      if (sessao?.id) await atualizarSessao(sessao.id, form);
      else await criarSessao(form);
      toast(sessao?.id ? 'Sessão atualizada.' : 'Sessão agendada.');
      onSalvo();
    } catch { toast('Erro ao salvar sessão.', 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-bold text-white">{sessao?.id ? 'Editar sessão' : 'Nova sessão'}</h2>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={salvar} className="p-6 space-y-4">
          {[
            { k: 'alunoId', label: 'Aluno *', type: 'select', opts: alunos.map(a => ({ value: a.id, label: a.nome })) },
          ].map(({ k, label, type, opts }) => (
            <div key={k}>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">{label}</label>
              <select value={form[k]} onChange={e => set(k, e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
                <option value="">Selecione...</option>
                {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Data *</label>
              <input type="date" value={form.data} onChange={e => set('data', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Horário</label>
              <input type="time" value={form.horario} onChange={e => set('horario', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Tipo</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
                <option value="normal">Normal</option>
                <option value="avaliacao">Avaliação</option>
                <option value="reposicao">Reposição</option>
                <option value="experimental">Experimental</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
                {Object.entries(STATUS_MAP).map(([v, { label }]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Observações</label>
            <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all resize-none"
              placeholder="Observações opcionais..." />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onFechar} className="px-4 py-2 rounded-xl border border-white/[0.08] text-[13px] text-white/50 hover:text-white hover:border-white/15 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white disabled:opacity-40 transition-all shadow-lg shadow-blue-900/30">
              {saving ? 'Salvando...' : (sessao?.id ? 'Atualizar' : 'Agendar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AgendaPage() {
  const toast = useToast();
  const [sessoes,    setSessoes]    = useState([]);
  const [alunos,     setAlunos]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [modal,      setModal]      = useState(null); // null | { sessao?, diaISO? }
  const [confirmId,  setConfirmId]  = useState(null);

  const carregar = () =>
    Promise.all([buscarSessoes(), buscarAlunos()])
      .then(([s, a]) => { setSessoes(s); setAlunos(a); })
      .finally(() => setLoading(false));

  useEffect(() => { carregar(); }, []);

  const seg = getMondayOfWeek(weekOffset);
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(seg);
    d.setDate(seg.getDate() + i);
    return d;
  });

  const hojeISO = toISO(new Date());

  function nomeAluno(id) {
    return alunos.find(a => a.id === id)?.nome || '—';
  }

  function sessoesNoDia(iso) {
    return sessoes
      .filter(s => s.data === iso)
      .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));
  }

  async function excluir() {
    await excluirSessao(confirmId);
    setSessoes(prev => prev.filter(s => s.id !== confirmId));
    setConfirmId(null);
    toast('Sessão removida.');
  }

  const totalSemana   = diasSemana.reduce((t, d) => t + sessoesNoDia(toISO(d)).length, 0);
  const realizadosSem = diasSemana.reduce((t, d) =>
    t + sessoesNoDia(toISO(d)).filter(s => s.status === 'realizado').length, 0);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      {modal && (
        <SessaoModal
          sessao={modal.sessao}
          alunos={alunos}
          onSalvo={() => { setModal(null); carregar(); }}
          onFechar={() => setModal(null)}
        />
      )}
      <ConfirmModal
        open={!!confirmId}
        title="Excluir sessão"
        message="Esta sessão será removida permanentemente."
        onConfirm={excluir}
        onCancel={() => setConfirmId(null)}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">Agenda</h1>
          <p className="text-[12px] text-white/35 mt-0.5">
            Semana de {semanaLabel(seg)} · {totalSemana} sessão{totalSemana !== 1 ? 'ões' : ''} · {realizadosSem} realizada{realizadosSem !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/[0.04] rounded-xl p-1">
            <button onClick={() => setWeekOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-white/[0.08] text-white/40 hover:text-white transition-all">
              <ChevronLeft size={15} />
            </button>
            <button onClick={() => setWeekOffset(0)} className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-all ${weekOffset === 0 ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/70'}`}>
              Hoje
            </button>
            <button onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-white/[0.08] text-white/40 hover:text-white transition-all">
              <ChevronRight size={15} />
            </button>
          </div>
          <button onClick={() => setModal({ sessao: null })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white transition-all shadow-lg shadow-blue-900/30">
            <Plus size={14} /> Nova sessão
          </button>
        </div>
      </div>

      {/* Grade semanal */}
      <div className="grid grid-cols-7 gap-2">
        {diasSemana.map(dia => {
          const iso      = toISO(dia);
          const ehHoje   = iso === hojeISO;
          const sessoesDia = sessoesNoDia(iso);

          return (
            <div key={iso} className={`rounded-2xl flex flex-col min-h-[180px] ring-1 transition-all ${
              ehHoje ? 'ring-blue-500/30 bg-blue-500/[0.04]' : 'ring-white/[0.05] bg-[#0d1b2e]'
            }`}>
              {/* Cabeçalho do dia */}
              <div className={`flex items-center justify-between px-3 py-2.5 border-b ${ehHoje ? 'border-blue-500/20' : 'border-white/[0.05]'}`}>
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${ehHoje ? 'text-blue-400' : 'text-white/30'}`}>
                    {DIAS[dia.getDay()]}
                  </p>
                  <p className={`text-[18px] font-bold leading-tight ${ehHoje ? 'text-blue-400' : 'text-white/60'}`}>
                    {dia.getDate()}
                  </p>
                </div>
                <button
                  onClick={() => setModal({ sessao: { data: iso } })}
                  className="w-6 h-6 rounded-lg hover:bg-white/[0.08] text-white/20 hover:text-white/60 transition-all flex items-center justify-center">
                  <Plus size={12} />
                </button>
              </div>

              {/* Sessões */}
              <div className="flex-1 p-2 space-y-1.5">
                {sessoesDia.map(s => {
                  const st = STATUS_MAP[s.status] || STATUS_MAP.agendado;
                  const Icon = st.icon;
                  return (
                    <div key={s.id}
                      className={`rounded-xl px-2.5 py-2 ring-1 cursor-pointer hover:brightness-110 transition-all group relative ${st.cls}`}
                      onClick={() => setModal({ sessao: s })}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icon size={10} strokeWidth={2} />
                        {s.horario && <span className="text-[10px] font-semibold opacity-70">{s.horario}</span>}
                      </div>
                      <p className="text-[11px] font-semibold leading-tight truncate">{nomeAluno(s.alunoId)}</p>
                      {s.tipo !== 'normal' && (
                        <p className="text-[9px] opacity-50 mt-0.5 capitalize">{s.tipo}</p>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmId(s.id); }}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded hover:bg-black/20 transition-all">
                        <X size={8} />
                      </button>
                    </div>
                  );
                })}
                {sessoesDia.length === 0 && (
                  <p className="text-[10px] text-white/15 text-center mt-4">—</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lista do dia de hoje */}
      {sessoesNoDia(hojeISO).length > 0 && (
        <div className="mt-6">
          <h2 className="text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-3">Hoje</h2>
          <div className="space-y-2">
            {sessoesNoDia(hojeISO).map(s => {
              const st = STATUS_MAP[s.status] || STATUS_MAP.agendado;
              const Icon = st.icon;
              return (
                <div key={s.id} className="flex items-center gap-4 p-4 rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] hover:ring-white/[0.10] transition-all group">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ring-1 ${st.cls}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-white/80">{nomeAluno(s.alunoId)}</p>
                    <p className="text-[11px] text-white/30">
                      {s.horario || 'Sem horário'} · {st.label}{s.tipo !== 'normal' ? ` · ${s.tipo}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setModal({ sessao: s })} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white transition-all">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setConfirmId(s.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
