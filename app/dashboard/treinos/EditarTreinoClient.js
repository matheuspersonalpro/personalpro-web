'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import Link from 'next/link';
import { buscarTreino, buscarAlunos, salvarTreino, buscarExercicios } from '@/lib/firestore';
import { ChevronLeft, Save, Search, Plus, X, Dumbbell, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/components/Toast';

const GRUPOS = ['Peito','Costas','Ombro','Bíceps','Tríceps','Pernas','Glúteos','Abdômen','Panturrilha','Cardio'];

function ExCard({ ex, idx, onChange, onRemove }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        <GripVertical size={14} className="text-white/15 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white/80 truncate">{ex.nome}</p>
          {ex.grupo && <p className="text-[10px] text-white/30">{ex.grupo}</p>}
        </div>
        <button onClick={() => setOpen(v => !v)} className="w-6 h-6 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white transition-all">
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        <button onClick={() => onRemove(idx)} className="w-6 h-6 rounded-lg hover:bg-red-500/15 flex items-center justify-center text-white/20 hover:text-red-400 transition-all">
          <X size={13} />
        </button>
      </div>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.04] pt-3">
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Séries', field: 'series', type: 'number', placeholder: '3' },
              { label: 'Repetições', field: 'reps', type: 'text', placeholder: '12' },
              { label: 'Carga', field: 'carga', type: 'text', placeholder: '—' },
              { label: 'Descanso', field: 'descanso', type: 'text', placeholder: '60s' },
            ].map(({ label, field, type, placeholder }) => (
              <div key={field}>
                <label className="block text-[9px] font-semibold text-white/25 uppercase tracking-wider mb-1.5">{label}</label>
                <input type={type} value={ex[field] || ''} onChange={e => onChange(idx, field, e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-2.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-[12px] placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-all" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-[9px] font-semibold text-white/25 uppercase tracking-wider mb-1.5">Observações</label>
            <input value={ex.obs || ''} onChange={e => onChange(idx, 'obs', e.target.value)}
              placeholder="Cadência, técnica especial..."
              className="w-full px-2.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-[12px] placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-all" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditarTreino() {
  const searchParams    = useSearchParams();
  const id              = searchParams.get('id');
  const router          = useRouter();
  const toast           = useToast();
  const isNovo          = id === 'novo';

  const [form, setForm]         = useState({ nome: '', alunoId: '', exercicios: [] });
  const [alunos, setAlunos]     = useState([]);
  const [bib, setBib]           = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [erroNome, setErroNome] = useState(false);
  const [buscaEx, setBuscaEx]   = useState('');
  const [grupoFiltro, setGrupo] = useState('');

  useEffect(() => {
    if (!id) return;
    const alunoIdParam = searchParams.get('alunoId') || '';
    Promise.all([buscarAlunos(), buscarExercicios(), isNovo ? null : buscarTreino(id)])
      .then(([a, ex, treino]) => {
        setAlunos(a);
        setBib(ex);
        if (!isNovo && treino) {
          setForm(treino);
        } else {
          setForm(f => ({ ...f, alunoId: alunoIdParam }));
        }
      })
      .finally(() => setLoading(false));
  }, [id, isNovo]);

  function addEx(ex) {
    setForm(f => ({
      ...f,
      exercicios: [...(f.exercicios || []), {
        id: ex.id, nome: ex.nome, grupo: ex.grupo || '',
        series: 3, reps: '12', carga: '', descanso: '60s', obs: '',
      }],
    }));
  }

  function updateEx(idx, field, val) {
    setForm(f => {
      const exs = [...f.exercicios];
      exs[idx] = { ...exs[idx], [field]: val };
      return { ...f, exercicios: exs };
    });
  }

  function removeEx(idx) {
    setForm(f => ({ ...f, exercicios: f.exercicios.filter((_, i) => i !== idx) }));
  }

  async function salvar() {
    if (!form.nome.trim()) { setErroNome(true); return; }
    setErroNome(false);
    setSaving(true);
    try {
      await salvarTreino(isNovo ? form : { ...form, id });
      toast('Treino salvo com sucesso.');
      router.push(form.alunoId ? `/dashboard/alunos?id=${form.alunoId}` : '/dashboard/treinos');
    } catch { toast('Erro ao salvar treino.', 'error'); }
    finally { setSaving(false); }
  }

  const exFiltrados = bib.filter(e =>
    (!grupoFiltro || e.grupo === grupoFiltro) &&
    e.nome?.toLowerCase().includes(buscaEx.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/[0.05] shrink-0 bg-[#080f1d]">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/treinos" className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/35 hover:text-white transition-all">
            <ChevronLeft size={16} />
          </Link>
          <div>
            <input
              value={form.nome}
              onChange={e => { setErroNome(false); setForm(f => ({ ...f, nome: e.target.value })); }}
              placeholder="Nome do treino..."
              className={`text-[18px] font-bold text-white bg-transparent focus:outline-none placeholder-white/20 w-80 ${erroNome ? 'placeholder-red-400' : ''}`}
              style={erroNome ? { borderBottom: '1px solid rgba(239,68,68,0.6)' } : {}}
            />
            {erroNome && <p className="text-[10px] text-red-400 mt-0.5">Dê um nome ao treino</p>}
            {form.alunoId && (
              <p className="text-[11px] text-white/35">
                {alunos.find(a => a.id === form.alunoId)?.nome}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={form.alunoId} onChange={e => setForm(f => ({ ...f, alunoId: e.target.value }))}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white/60 text-[12px] focus:outline-none focus:border-blue-500/50 transition-all">
            <option value="">Sem aluno</option>
            {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
          <button onClick={salvar} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[12px] font-semibold text-white disabled:opacity-40 transition-all shadow-lg shadow-blue-900/30">
            <Save size={13} /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl space-y-2.5">
            {(form.exercicios || []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.08] p-12 text-center">
                <Dumbbell size={28} className="text-white/15 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-[13px] text-white/25">Selecione exercícios da biblioteca ao lado</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">
                    {form.exercicios.length} exercício{form.exercicios.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {form.exercicios.map((ex, idx) => (
                  <ExCard key={idx} ex={ex} idx={idx} onChange={updateEx} onRemove={removeEx} />
                ))}
              </>
            )}
          </div>
        </div>

        <div className="w-72 shrink-0 border-l border-white/[0.05] flex flex-col bg-[#0a1628]">
          <div className="p-4 border-b border-white/[0.05] shrink-0">
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">Biblioteca</p>
            <div className="relative mb-2">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
              <input value={buscaEx} onChange={e => setBuscaEx(e.target.value)} placeholder="Buscar exercício..."
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.07] text-white placeholder-white/20 text-[12px] focus:outline-none focus:border-blue-500/50 transition-all" />
            </div>
            <select value={grupoFiltro} onChange={e => setGrupo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#111f38] border border-white/[0.07] text-white/60 text-[12px] focus:outline-none transition-all">
              <option value="">Todos os grupos</option>
              {GRUPOS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {exFiltrados.map(ex => {
              const jaAdicionado = form.exercicios?.some(e => e.id === ex.id);
              return (
                <button key={ex.id} onClick={() => !jaAdicionado && addEx(ex)}
                  disabled={jaAdicionado}
                  className={`w-full text-left px-3 py-2.5 rounded-lg mb-0.5 transition-all group ${
                    jaAdicionado
                      ? 'opacity-40 cursor-default'
                      : 'hover:bg-white/[0.06] cursor-pointer'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-[12px] text-white/70 group-hover:text-white transition-colors truncate">{ex.nome}</p>
                      {ex.grupo && <p className="text-[10px] text-white/30">{ex.grupo}</p>}
                    </div>
                    {!jaAdicionado && (
                      <Plus size={13} className="text-white/20 group-hover:text-blue-400 transition-colors shrink-0 ml-2" />
                    )}
                  </div>
                </button>
              );
            })}
            {exFiltrados.length === 0 && (
              <p className="text-[12px] text-white/20 text-center py-8">Nenhum exercício encontrado.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
