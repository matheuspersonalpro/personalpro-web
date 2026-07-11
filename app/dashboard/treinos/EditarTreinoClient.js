'use client';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  buscarTreino, buscarAlunos, salvarTreino, buscarExerciciosCustom, criarExercicioCustom,
  buscarVideosExercicios,
} from '@/lib/firestore';
import { BIBLIOTECA, GRUPOS_NOMES, METODOS, PERIODIZACOES } from '@/lib/treinoData';
import {
  ChevronLeft, Save, Search, Plus, X, Dumbbell, GripVertical,
  ChevronDown, ChevronUp, Zap, Play, Layers, Check,
} from 'lucide-react';
import { useToast } from '@/components/Toast';

// ── Monta lista plana de todos os exercícios da BIBLIOTECA ─────────────────
function todosDaBiblioteca() {
  return BIBLIOTECA.flatMap(b => b.exercicios.map(nome => ({ nome, grupo: b.grupo })));
}

function normalizarBusca(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function extrairYoutubeId(url) {
  return (url || '').match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([^&?#/]+)/)?.[1] || null;
}

// ── Agrupamento (Bi-set/Tri-set/Circuito) — mesma lógica do app ────────────
const METODOS_AGRUPAMENTO = { 'Bi-set': 2, 'Tri-set': 3, 'Circuito': 4 };
const GRUPO_COR = {
  'Bi-set':   { cor: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.35)' },
  'Tri-set':  { cor: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.35)' },
  'Circuito': { cor: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.35)' },
};

// Monta grupos consecutivos por grupoId, pra renderização
function buildGrupos(exercicios) {
  const resultado = [];
  let i = 0;
  while (i < exercicios.length) {
    const ex = exercicios[i];
    if (ex.grupoId) {
      const grupo = [];
      const gid = ex.grupoId;
      while (i < exercicios.length && exercicios[i].grupoId === gid) { grupo.push(i); i++; }
      resultado.push({ tipo: 'grupo', indices: grupo, metodo: ex.metodo, grupoId: gid });
    } else {
      resultado.push({ tipo: 'solo', indices: [i] });
      i++;
    }
  }
  return resultado;
}

let _gidSeq = 0;
const novoGrupoId = () => `g_${Date.now().toString(36)}_${_gidSeq++}`;

// Resume o array de séries em "4×10-12  ·  60s" — mesma lógica do app.
function resumirSeries(series) {
  if (!series?.length) return null;
  const qtd = series.length;
  const repsVals = [...new Set(series.map(s => s.reps).filter(v => v && v.trim()))];
  const reps = repsVals.length > 0 ? repsVals[0] : null;
  const carga = series.find(s => s.carga?.trim())?.carga?.trim() || '';
  const pausa = series.find(s => s.pausa?.trim())?.pausa?.trim() || '';
  const partes = [reps ? `${qtd}×${reps}` : `${qtd} séries`];
  if (carga) partes.push(carga);
  if (pausa) partes.push(pausa);
  return partes.join('  ·  ');
}

// ── Card de um exercício no treino ─────────────────────────────────────────
function ExCard({ ex, idx, onChange, onRemove, videoUrl }) {
  const [open, setOpen] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const metodoInfo = ex.metodo ? METODOS[ex.metodo] : null;
  const ytId = extrairYoutubeId(videoUrl);
  const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null;

  // Séries = array de sets {reps, carga, pausa} (mesma estrutura do app).
  // Fallback: migra treinos antigos do site (series como número + reps/descanso planos).
  const series = Array.isArray(ex.series)
    ? ex.series
    : (Number(ex.series) > 0
        ? Array.from({ length: Number(ex.series) }, () => ({ reps: ex.reps || '12', carga: ex.carga || '', pausa: ex.descanso || ex.pausa || '60s' }))
        : []);
  const setSet    = (sIdx, campo, val) => onChange(idx, 'series', series.map((s, i) => i === sIdx ? { ...s, [campo]: val } : s));
  const addSet    = () => onChange(idx, 'series', [...series, { reps: series[series.length - 1]?.reps || '12', carga: '', pausa: series[series.length - 1]?.pausa || '60s' }]);
  const removeSet = (sIdx) => onChange(idx, 'series', series.filter((_, i) => i !== sIdx));

  return (
    <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] overflow-hidden">
      {/* Player modal */}
      {showPlayer && videoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowPlayer(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
              <p className="text-[13px] font-semibold text-white/80 truncate">{ex.nome}</p>
              <button onClick={() => setShowPlayer(false)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all">
                <X size={15} />
              </button>
            </div>
            <div className="w-full bg-black" style={{ aspectRatio: '16/9' }}>
              {ytId
                ? <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`} title={ex.nome} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                : <video src={videoUrl} controls autoPlay playsInline className="w-full h-full" />
              }
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 px-4 py-3">
        <GripVertical size={14} className="text-white/15 shrink-0 cursor-grab" />
        {/* Thumbnail clicável */}
        {videoUrl ? (
          <button onClick={() => setShowPlayer(true)}
            className="group/v relative w-12 h-8 rounded-lg overflow-hidden bg-white/[0.05] shrink-0 flex items-center justify-center"
            title="Ver vídeo">
            {thumb
              ? <img src={thumb} alt="" className="w-full h-full object-cover" />
              : <Play size={10} className="text-white/30" />
            }
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/v:opacity-100 transition-opacity">
              <Play size={10} className="text-white" fill="currentColor" />
            </div>
          </button>
        ) : null}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white/80 truncate">{ex.nome}</p>
          <div className="flex items-center gap-2">
            {!open && resumirSeries(series) && <p className="text-[10px] text-blue-400/70">{resumirSeries(series)}</p>}
            {ex.grupo && <p className="text-[10px] text-white/30">{ex.grupo}</p>}
            {metodoInfo && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: metodoInfo.cor + '22', color: metodoInfo.cor }}>
                {ex.metodo}
              </span>
            )}
            {!videoUrl && <p className="text-[9px] text-white/15">sem vídeo</p>}
          </div>
        </div>
        <button onClick={() => setOpen(v => !v)}
          className="w-6 h-6 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white transition-all">
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        <button onClick={() => onRemove(idx)}
          className="w-6 h-6 rounded-lg hover:bg-red-500/15 flex items-center justify-center text-white/20 hover:text-red-400 transition-all">
          <X size={13} />
        </button>
      </div>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.04] pt-3">
          {/* Séries = lista de sets (reps / carga / descanso por set) — mesma estrutura do app */}
          <div className="space-y-1.5">
            <div className="grid gap-2 px-0.5" style={{ gridTemplateColumns: '22px 1fr 1fr 1fr 24px' }}>
              <span />
              <label className="text-[9px] font-semibold text-white/25 uppercase tracking-wider">Reps</label>
              <label className="text-[9px] font-semibold text-white/25 uppercase tracking-wider">Carga</label>
              <label className="text-[9px] font-semibold text-white/25 uppercase tracking-wider">Descanso</label>
              <span />
            </div>
            {series.map((s, sIdx) => (
              <div key={sIdx} className="grid gap-2 items-center" style={{ gridTemplateColumns: '22px 1fr 1fr 1fr 24px' }}>
                <span className="text-[11px] text-white/30 text-center">{sIdx + 1}</span>
                <input value={s.reps || ''} onChange={e => setSet(sIdx, 'reps', e.target.value)} placeholder="12"
                  className="w-full px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-[12px] placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-all" />
                <input value={s.carga || ''} onChange={e => setSet(sIdx, 'carga', e.target.value)} placeholder="—"
                  className="w-full px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-[12px] placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-all" />
                <input value={s.pausa || ''} onChange={e => setSet(sIdx, 'pausa', e.target.value)} placeholder="60s"
                  className="w-full px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-[12px] placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-all" />
                <button onClick={() => removeSet(sIdx)} disabled={series.length <= 1}
                  className="w-6 h-6 rounded-lg hover:bg-red-500/15 flex items-center justify-center text-white/20 hover:text-red-400 disabled:opacity-20 transition-all">
                  <X size={12} />
                </button>
              </div>
            ))}
            <button onClick={addSet}
              className="flex items-center gap-1 text-[11px] font-semibold text-blue-400/80 hover:text-blue-400 transition-colors pt-0.5">
              <Plus size={12} /> Adicionar série
            </button>
          </div>
          {/* Método */}
          <div>
            <label className="block text-[9px] font-semibold text-white/25 uppercase tracking-wider mb-1.5">Método</label>
            <select value={ex.metodo || ''} onChange={e => onChange(idx, 'metodo', e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/70 text-[12px] focus:outline-none focus:border-blue-500/50 transition-all">
              <option value="">Padrão</option>
              {Object.keys(METODOS).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function EditarTreino() {
  const searchParams = useSearchParams();
  const id           = searchParams.get('id');
  const router       = useRouter();
  const toast        = useToast();
  const isNovo       = id === 'novo';
  const isTemplate   = searchParams.get('template') === 'true'; // criando um MODELO (Biblioteca)

  const [form,      setForm]      = useState({ nome: '', alunoId: '', diaSemana: '', exercicios: [] });
  const [alunos,    setAlunos]    = useState([]);
  const [exCustom,  setExCustom]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [erroNome,  setErroNome]  = useState(false);
  const [videosMap, setVideosMap] = useState({});

  // Sidebar biblioteca
  const [buscaEx,   setBuscaEx]   = useState('');
  const [grupoFiltro, setGrupo]   = useState('');

  // Novo exercício custom
  const [novoExNome,  setNovoExNome]  = useState('');
  const [novoExGrupo, setNovoExGrupo] = useState('');
  const [criandoEx,   setCriandoEx]   = useState(false);
  const [showNovoEx,  setShowNovoEx]  = useState(false);

  // Mobile: alterna entre painel do treino e biblioteca (no desktop ambos aparecem)
  const [mobileTab, setMobileTab] = useState('treino');

  // Periodização — se marcada, todo exercício novo já entra com as séries do
  // preset (reps/pausa). "Ondulatório" varia a fase conforme a posição no treino.
  const [periodizacao, setPeriodizacao] = useState('');

  // Agrupamento (Bi-set/Tri-set/Circuito) — modo de seleção múltipla
  const [modoAgrupar, setModoAgrupar] = useState(false);
  const [selecionados, setSelecionados] = useState([]); // índices selecionados, em ordem de clique

  useEffect(() => {
    if (!id) return;
    const alunoIdParam = searchParams.get('alunoId') || '';
    Promise.all([buscarAlunos(), buscarExerciciosCustom(), isNovo ? null : buscarTreino(id), buscarVideosExercicios()])
      .then(([a, ec, treino, vids]) => {
        setAlunos(a);
        setExCustom(ec);
        setVideosMap(vids || {});
        if (!isNovo && treino) setForm(treino);
        else setForm(f => ({ ...f, alunoId: alunoIdParam, template: isTemplate }));
      })
      .finally(() => setLoading(false));
  }, [id, isNovo]);

  function addEx(ex) {
    setForm(f => {
      const idx = (f.exercicios || []).length;
      const peri = PERIODIZACOES.find(p => p.id === periodizacao);
      const series = peri ? peri.gerarSeries(idx) : [
        { reps: '12', carga: '', pausa: '60s' },
        { reps: '12', carga: '', pausa: '60s' },
        { reps: '12', carga: '', pausa: '60s' },
      ];
      return {
        ...f,
        exercicios: [...(f.exercicios || []), { nome: ex.nome, grupo: ex.grupo || '', series, metodo: '', grupoId: '' }],
      };
    });
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

  // ── Arrastar pra reordenar (HTML5 drag-and-drop nativo) ──────────────────
  const [dragIdx, setDragIdx] = useState(null);
  function moverEx(de, para) {
    if (de === para) return;
    setForm(f => {
      const exs = [...f.exercicios];
      const [item] = exs.splice(de, 1);
      exs.splice(para, 0, item);
      return { ...f, exercicios: exs };
    });
  }

  // ── Agrupamento (Bi-set/Tri-set/Circuito) ────────────────────────────────
  function toggleSelecionado(idx) {
    setSelecionados(s => s.includes(idx) ? s.filter(i => i !== idx) : [...s, idx]);
  }
  function agruparSelecionados(metodoNome) {
    const qtd = METODOS_AGRUPAMENTO[metodoNome];
    if (selecionados.length !== qtd) return;
    const ordenados = [...selecionados].sort((a, b) => a - b);
    for (let i = 1; i < ordenados.length; i++) {
      if (ordenados[i] !== ordenados[i - 1] + 1) {
        toast('Selecione exercícios consecutivos (um em seguida do outro na lista).', 'error');
        return;
      }
    }
    const gid = novoGrupoId();
    setForm(f => {
      const exs = [...f.exercicios];
      ordenados.forEach(idx => { exs[idx] = { ...exs[idx], grupoId: gid, metodo: metodoNome }; });
      return { ...f, exercicios: exs };
    });
    setSelecionados([]);
    setModoAgrupar(false);
    toast(`${metodoNome} criado.`);
  }
  function desagrupar(grupoId) {
    setForm(f => ({
      ...f,
      exercicios: f.exercicios.map(ex => ex.grupoId === grupoId ? { ...ex, grupoId: '', metodo: '' } : ex),
    }));
  }

  // Aplica a periodização escolhida a TODOS os exercícios já no treino (não só
  // aos próximos que forem adicionados) — senão a troca do chip parece "não
  // fazer nada" quando o treino já tem exercícios.
  function selecionarPeriodizacao(periId) {
    const novoId = periId === periodizacao ? '' : periId;
    setPeriodizacao(novoId);
    const peri = PERIODIZACOES.find(p => p.id === novoId);
    if (!peri || !(form.exercicios || []).length) return;
    setForm(f => ({
      ...f,
      exercicios: f.exercicios.map((ex, idx) => ({ ...ex, series: peri.gerarSeries(idx) })),
    }));
  }

  async function criarExercicio() {
    if (!novoExNome.trim()) return;
    setCriandoEx(true);
    try {
      await criarExercicioCustom({ nome: novoExNome.trim(), grupo: novoExGrupo });
      const ec = await buscarExerciciosCustom();
      setExCustom(ec);
      setNovoExNome(''); setNovoExGrupo(''); setShowNovoEx(false);
      toast('Exercício criado.');
    } catch { toast('Erro ao criar exercício.', 'error'); }
    finally { setCriandoEx(false); }
  }

  async function salvar() {
    if (!form.nome.trim()) { setErroNome(true); return; }
    setErroNome(false);
    setSaving(true);
    try {
      await salvarTreino(isNovo ? form : { ...form, id });
      toast(form.template ? 'Modelo salvo na biblioteca.' : 'Treino salvo com sucesso.');
      router.push(
        form.template ? '/dashboard/biblioteca/'
          : form.alunoId ? `/dashboard/alunos/?id=${form.alunoId}`
          : '/dashboard/treinos/'
      );
    } catch { toast('Erro ao salvar treino.', 'error'); }
    finally { setSaving(false); }
  }

  // Monta lista unificada: BIBLIOTECA + exerciciosCustom, sem duplicatas por nome
  const bibBase = todosDaBiblioteca();
  const customNomes = new Set(exCustom.map(e => e.nome.toLowerCase()));
  const bibCompleta = [
    ...bibBase.filter(e => !customNomes.has(e.nome.toLowerCase())),
    ...exCustom.map(e => ({ nome: e.nome, grupo: e.grupo || 'Custom', custom: true })),
  ];

  const filtradosGrupo = grupoFiltro ? bibCompleta.filter(e => e.grupo === grupoFiltro) : bibCompleta;
  const exFiltrados = buscaEx
    ? filtradosGrupo.filter(e => normalizarBusca(e.nome).includes(normalizarBusca(buscaEx)))
    : filtradosGrupo;

  const jaNoTreino = new Set((form.exercicios || []).map(e => e.nome.toLowerCase()));

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col h-full">

      {/* ── Barra superior ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 md:px-8 py-3 md:py-4 border-b border-white/[0.05] shrink-0 bg-[#080f1d]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/treinos/')}
            className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/35 hover:text-white transition-all">
            <ChevronLeft size={16} />
          </button>
          <div>
            <input
              value={form.nome}
              onChange={e => { setErroNome(false); setForm(f => ({ ...f, nome: e.target.value })); }}
              placeholder={form.template ? 'Nome do modelo...' : 'Nome do treino...'}
              className={`text-[18px] font-bold text-white bg-transparent focus:outline-none placeholder-white/20 w-72 ${erroNome ? 'placeholder-red-400' : ''}`}
              style={erroNome ? { borderBottom: '1px solid rgba(239,68,68,0.6)' } : {}}
            />
            {erroNome && <p className="text-[10px] text-red-400 mt-0.5">Dê um nome ao treino</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Aluno — modelos da biblioteca não têm aluno vinculado */}
          {!form.template && (
            <select value={form.alunoId || ''} onChange={e => setForm(f => ({ ...f, alunoId: e.target.value }))}
              className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white/60 text-[12px] focus:outline-none focus:border-blue-500/50 transition-all">
              <option value="">Sem aluno</option>
              {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          )}

          <button onClick={salvar} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[12px] font-semibold text-white disabled:opacity-40 transition-all shadow-lg shadow-blue-900/30">
            <Save size={13} /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* ── Abas (somente mobile) ────────────────────────────────────── */}
      <div className="md:hidden flex shrink-0 border-b border-white/[0.05] bg-[#080f1d]">
        {[
          { id: 'treino',     label: `Treino${form.exercicios?.length ? ` (${form.exercicios.length})` : ''}` },
          { id: 'biblioteca', label: 'Biblioteca' },
        ].map(t => (
          <button key={t.id} onClick={() => setMobileTab(t.id)}
            className={`flex-1 py-3 text-[12px] font-semibold transition-all ${
              mobileTab === t.id
                ? 'text-blue-400 border-b-2 border-blue-500'
                : 'text-white/35 border-b-2 border-transparent'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 min-h-0">

        {/* ── Lista de exercícios do treino ─────────────────────────── */}
        <div className={`${mobileTab === 'treino' ? 'block' : 'hidden'} md:block flex-1 overflow-y-auto p-4 md:p-6`}>
          <div className="max-w-2xl space-y-2.5">
            {/* Periodização — aplica ao adicionar exercícios novos */}
            <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Layers size={12} className="text-blue-400/70" />
                <p className="text-[10px] font-semibold text-white/35 uppercase tracking-wider">Periodização</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => selecionarPeriodizacao('')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                    !periodizacao ? 'bg-white/[0.08] text-white border-white/20' : 'bg-transparent text-white/35 border-white/[0.08] hover:text-white/60'
                  }`}>Padrão</button>
                {PERIODIZACOES.map(p => (
                  <button key={p.id} onClick={() => selecionarPeriodizacao(p.id)}
                    title={p.info}
                    style={periodizacao === p.id ? { background: p.corBg, color: p.cor, borderColor: p.cor } : {}}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                      periodizacao === p.id ? '' : 'bg-transparent text-white/35 border-white/[0.08] hover:text-white/60'
                    }`}>{p.nome}</button>
                ))}
              </div>
              {periodizacao && (
                <p className="text-[10px] text-white/30 mt-2">
                  {PERIODIZACOES.find(p => p.id === periodizacao)?.descricao} — aplicado a todos os exercícios do treino
                </p>
              )}
            </div>

            {(form.exercicios || []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.08] p-14 text-center">
                <Dumbbell size={28} className="text-white/15 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-[13px] text-white/25">Selecione exercícios da biblioteca à direita</p>
                <p className="text-[11px] text-white/15 mt-1">Você pode buscar por nome ou filtrar por grupo muscular</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">
                    {form.exercicios.length} exercício{form.exercicios.length !== 1 ? 's' : ''}
                  </p>
                  <button onClick={() => { setModoAgrupar(v => !v); setSelecionados([]); }}
                    className={`flex items-center gap-1 text-[11px] font-semibold transition-colors ${modoAgrupar ? 'text-blue-400' : 'text-white/30 hover:text-white/60'}`}>
                    <Layers size={12} /> {modoAgrupar ? 'Cancelar' : 'Agrupar (bi/tri-set)'}
                  </button>
                </div>

                {modoAgrupar && (
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-[10px] text-white/30">{selecionados.length} selecionado{selecionados.length !== 1 ? 's' : ''} — escolha consecutivos:</span>
                    {Object.entries(METODOS_AGRUPAMENTO).map(([nome, qtd]) => (
                      <button key={nome} disabled={selecionados.length !== qtd} onClick={() => agruparSelecionados(nome)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-blue-500/12 text-blue-400 hover:bg-blue-500/20 disabled:opacity-25 disabled:cursor-not-allowed transition-all">
                        {nome} ({qtd})
                      </button>
                    ))}
                  </div>
                )}

                {buildGrupos(form.exercicios).map(item => {
                  if (item.tipo === 'solo') {
                    const idx = item.indices[0];
                    const ex = form.exercicios[idx];
                    return (
                      <div key={idx} draggable={!modoAgrupar}
                        onDragStart={() => setDragIdx(idx)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => { if (dragIdx !== null) moverEx(dragIdx, idx); setDragIdx(null); }}
                        onDragEnd={() => setDragIdx(null)}
                        className={`flex items-start gap-2 transition-opacity ${dragIdx === idx ? 'opacity-40' : ''}`}>
                        {modoAgrupar && (
                          <button onClick={() => toggleSelecionado(idx)}
                            className={`mt-3.5 w-5 h-5 rounded-md border shrink-0 flex items-center justify-center transition-all ${
                              selecionados.includes(idx) ? 'bg-blue-600 border-blue-500' : 'border-white/20 hover:border-white/40'
                            }`}>
                            {selecionados.includes(idx) && <Check size={12} className="text-white" />}
                          </button>
                        )}
                        <div className="flex-1 min-w-0">
                          <ExCard ex={ex} idx={idx} onChange={updateEx} onRemove={removeEx}
                            videoUrl={ex.videoUrl || videosMap[ex.nome]?.videoUrl || null} />
                        </div>
                      </div>
                    );
                  }
                  const gc = GRUPO_COR[item.metodo] || GRUPO_COR['Bi-set'];
                  return (
                    <div key={item.grupoId} className="rounded-xl p-2 space-y-2" style={{ background: gc.bg, border: `1px solid ${gc.border}` }}>
                      <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: gc.cor }}>
                          {item.metodo} · {item.indices.length} exercícios sem descanso entre eles
                        </span>
                        <button onClick={() => desagrupar(item.grupoId)}
                          className="text-[10px] text-white/30 hover:text-white/60 transition-colors">Desagrupar</button>
                      </div>
                      {item.indices.map(idx => {
                        const ex = form.exercicios[idx];
                        return (
                          <div key={idx} draggable={!modoAgrupar}
                            onDragStart={() => setDragIdx(idx)}
                            onDragOver={e => e.preventDefault()}
                            onDrop={() => { if (dragIdx !== null) moverEx(dragIdx, idx); setDragIdx(null); }}
                            onDragEnd={() => setDragIdx(null)}
                            className={dragIdx === idx ? 'opacity-40' : ''}>
                            <ExCard ex={ex} idx={idx} onChange={updateEx} onRemove={removeEx}
                              videoUrl={ex.videoUrl || videosMap[ex.nome]?.videoUrl || null} />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* ── Sidebar: biblioteca ───────────────────────────────────── */}
        <div className={`${mobileTab === 'biblioteca' ? 'flex' : 'hidden'} md:flex w-full md:w-[280px] shrink-0 border-l-0 md:border-l border-white/[0.05] flex-col bg-[#0a1628]`}>

          {/* Busca e filtro */}
          <div className="p-3 border-b border-white/[0.05] shrink-0 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold text-white/35 uppercase tracking-wider">Biblioteca</p>
              <button onClick={() => setShowNovoEx(v => !v)}
                className="flex items-center gap-1 text-[10px] text-blue-400/70 hover:text-blue-400 transition-colors">
                <Plus size={11} /> Novo
              </button>
            </div>

            {showNovoEx && (
              <div className="rounded-xl bg-white/[0.04] p-2.5 space-y-2 border border-white/[0.06]">
                <input value={novoExNome} onChange={e => setNovoExNome(e.target.value)}
                  placeholder="Nome do exercício..."
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.07] text-white text-[12px] placeholder-white/20 focus:outline-none focus:border-blue-500/50" />
                <select value={novoExGrupo} onChange={e => setNovoExGrupo(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/60 text-[12px] focus:outline-none">
                  <option value="">Grupo muscular</option>
                  {GRUPOS_NOMES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <button onClick={criarExercicio} disabled={criandoEx || !novoExNome.trim()}
                  className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-[11px] font-semibold text-white disabled:opacity-40 transition-all">
                  {criandoEx ? 'Criando...' : 'Criar exercício'}
                </button>
              </div>
            )}

            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
              <input value={buscaEx} onChange={e => setBuscaEx(e.target.value)}
                placeholder="Buscar exercício..."
                className="w-full pl-7 pr-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.07] text-white placeholder-white/20 text-[12px] focus:outline-none focus:border-blue-500/50 transition-all" />
            </div>
            <select value={grupoFiltro} onChange={e => setGrupo(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/50 text-[12px] focus:outline-none transition-all">
              <option value="">Todos os grupos</option>
              {GRUPOS_NOMES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {/* Lista de exercícios */}
          <div className="flex-1 overflow-y-auto">
            {exFiltrados.length === 0 && (
              <p className="text-[12px] text-white/20 text-center py-8">Nenhum exercício encontrado.</p>
            )}
            {(!grupoFiltro && !buscaEx
              ? BIBLIOTECA
              : [{ grupo: grupoFiltro || 'Resultado', exercicios: exFiltrados.map(e => e.nome) }]
            ).map(bloco => {
              const itens = buscaEx
                ? exFiltrados
                : bibCompleta.filter(e => e.grupo === bloco.grupo);
              if (!buscaEx && itens.length === 0) return null;
              return (
                <div key={bloco.grupo}>
                  {!buscaEx && (
                    <p className="px-3 pt-3 pb-1 text-[9px] font-bold text-white/25 uppercase tracking-widest sticky top-0 bg-[#0a1628]">
                      {bloco.grupo}
                    </p>
                  )}
                  {(buscaEx ? exFiltrados : itens).map(ex => {
                    const jaAdicionado = jaNoTreino.has(ex.nome.toLowerCase());
                    return (
                      <button key={ex.nome} onClick={() => !jaAdicionado && addEx(ex)}
                        disabled={jaAdicionado}
                        className={`w-full text-left px-3 py-2 transition-all group ${
                          jaAdicionado ? 'opacity-30 cursor-default' : 'hover:bg-white/[0.05] cursor-pointer'
                        }`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[12px] text-white/65 group-hover:text-white transition-colors truncate leading-tight">{ex.nome}</p>
                            {buscaEx && ex.grupo && (
                              <p className="text-[10px] text-white/25">{ex.grupo}</p>
                            )}
                          </div>
                          {!jaAdicionado && (
                            <Plus size={12} className="text-white/20 group-hover:text-blue-400 transition-colors shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
