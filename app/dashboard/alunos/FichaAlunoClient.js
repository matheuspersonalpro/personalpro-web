'use client';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  buscarAluno, buscarTreinos, atualizarAluno, excluirAluno,
  buscarAvaliacoes, excluirAvaliacao, buscarHistoricoDoAluno,
  atribuirProgramaMuscular, removerProgramaMuscular, listarProgramas,
  buscarFotosEvolucao, uploadFotoEvolucao, salvarFotosEvolucao, deletarSessaoFotos,
  buscarPresencasDoAluno, registrarPresenca,
} from '@/lib/firestore';
import {
  ChevronLeft, Pencil, Save, X, User, CreditCard, Dumbbell,
  Phone, Mail, Calendar, Plus, ArrowUpRight, ClipboardList, Trash2,
  TrendingUp, Weight, Camera, CalendarDays, CheckCircle2, XCircle,
  ChevronRight, ChevronDown, Play,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useToast } from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';
import { METODOS } from '@/lib/treinoData';

// Card de treino só-leitura (visualização igual ao mobile): expande mostrando
// exercícios com séries, método e vídeo. O botão "Editar" leva ao editor.
function TreinoCard({ treino }) {
  const [open, setOpen] = useState(false);
  const exs = treino.exercicios || [];
  return (
    <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
      <div className="flex items-center gap-2 p-4">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Dumbbell size={16} className="text-blue-400" strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white/80 truncate">{treino.nome}</p>
            <p className="text-[11px] text-white/30">{exs.length} exercício{exs.length !== 1 ? 's' : ''}</p>
          </div>
          <ChevronDown size={16} className={`text-white/25 transition-transform shrink-0 ${open ? '' : '-rotate-90'}`} />
        </button>
        <Link href={`/dashboard/treinos?id=${treino.id}`}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] font-semibold text-white/50 hover:text-white transition-all shrink-0">
          <Pencil size={11} /> Editar
        </Link>
      </div>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-white/[0.04] pt-3">
          {exs.length === 0 ? (
            <p className="text-[12px] text-white/25 text-center py-4">Sem exercícios neste treino.</p>
          ) : exs.map((ex, i) => {
            const sets   = ex.series || [];
            const n      = sets.length;
            const reps   = [...new Set(sets.map(s => s.reps).filter(Boolean))].join(' / ');
            const pausa  = sets[0]?.pausa || ex.pausa || '';
            const metodo = ex.metodo ? METODOS[ex.metodo] : null;
            return (
              <div key={i} className="rounded-xl bg-white/[0.03] ring-1 ring-white/[0.05] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white/85">{ex.nome}</p>
                    {ex.grupo && <p className="text-[10px] text-white/30">{ex.grupo}</p>}
                  </div>
                  {ex.metodo && (
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                      style={metodo ? { background: metodo.cor + '22', color: metodo.cor } : { background: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}>
                      {ex.metodo}
                    </span>
                  )}
                </div>
                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-white/45">
                  <span><span className="text-white/30">Séries:</span> {n}{reps ? ` × ${reps}` : ''}</span>
                  {pausa && <span><span className="text-white/30">Descanso:</span> {pausa}</span>}
                  {ex.videoUrl && (
                    <a href={ex.videoUrl} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-400/80 hover:text-blue-400 transition-colors">
                      <Play size={11} /> Ver vídeo
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, field, form, setForm, editing, type = 'text', icon: Icon }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">{label}</label>
      {editing ? (
        <input
          type={type}
          value={form[field] || ''}
          onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.07] transition-all"
        />
      ) : (
        <div className="flex items-center gap-2">
          {Icon && <Icon size={13} className="text-white/25 shrink-0" />}
          <p className="text-[13px] text-white/70 font-medium">
            {value || form[field] || <span className="text-white/25 font-normal">Não informado</span>}
          </p>
        </div>
      )}
    </div>
  );
}

function SelectField({ label, field, form, setForm, editing, options }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">{label}</label>
      {editing ? (
        <select
          value={form[field] || ''}
          onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <p className="text-[13px] text-white/70 font-medium">
          {options.find(o => o.value === form[field])?.label || <span className="text-white/25 font-normal">Não informado</span>}
        </p>
      )}
    </div>
  );
}

// Lê as métricas de uma avaliação criada no APP (estrutura: tipoAvaliacao, peso topo,
// resultado.percGordura / resultado.massaMagra). Mantém fallback p/ avaliações antigas do site (medidas.*).
function metricasAvaliacao(av) {
  const r = av?.resultado || {};
  const m = av?.medidas || {};
  const num = v => (v === '' || v == null ? null : parseFloat(String(v).replace(',', '.')));
  return {
    peso:        num(av?.peso ?? m.peso),
    percGordura: num(r.percGordura ?? m.bf),
    massaMagra:  num(r.massaMagra ?? m.mm),
  };
}

const LABEL_TIPO_AVAL = {
  pollock7: 'Pollock 7 dobras',
  pollock3: 'Pollock 3 dobras',
  inbody: 'InBody',
  circunferencias: 'Circunferências',
};

function CardAvaliacao({ av, onExcluir }) {
  const [aberto, setAberto] = useState(false);
  const data = av.criadoEm?.seconds
    ? new Date(av.criadoEm.seconds * 1000).toLocaleDateString('pt-BR')
    : '—';
  const tipo = LABEL_TIPO_AVAL[av.tipoAvaliacao] || 'Avaliação';
  const m = metricasAvaliacao(av);
  const itens = [
    m.peso != null        ? { label: 'Peso (kg)',   val: m.peso.toFixed(1) }        : null,
    m.percGordura != null ? { label: '% Gordura',   val: m.percGordura.toFixed(1) } : null,
    m.massaMagra != null  ? { label: 'Massa magra', val: m.massaMagra.toFixed(1) }  : null,
  ].filter(Boolean);

  return (
    <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
      <div onClick={() => setAberto(o => !o)} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors cursor-pointer select-none">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center">
            <ClipboardList size={15} className="text-green-400" />
          </div>
          <div className="text-left">
            <p className="text-[13px] font-semibold text-white/80">{tipo} · {data}</p>
            <p className="text-[11px] text-white/30">{itens.length} métrica{itens.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={e => { e.stopPropagation(); onExcluir(av.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all">
            <Trash2 size={13} />
          </button>
          <ArrowUpRight size={14} className={`text-white/20 transition-transform ${aberto ? 'rotate-90' : ''}`} />
        </div>
      </div>
      {aberto && itens.length > 0 && (
        <div className="px-4 pb-4 grid grid-cols-3 gap-2 border-t border-white/[0.04] pt-3">
          {itens.map(it => (
            <div key={it.label} className="rounded-xl bg-white/[0.03] px-3 py-2">
              <p className="text-[10px] text-white/30 mb-0.5">{it.label}</p>
              <p className="text-[14px] font-bold text-white">{it.val}</p>
            </div>
          ))}
        </div>
      )}
      {aberto && av.observacoes && (
        <div className="px-4 pb-4">
          <p className="text-[12px] text-white/40 italic">"{av.observacoes}"</p>
        </div>
      )}
    </div>
  );
}

// ── Atribuir Programa Modal ───────────────────────────────────────────────────
function AtribuirProgramaModal({ aluno, onSalvo, onFechar }) {
  const toast = useToast();
  const [programas, setProgramas] = useState([]);
  const [programaId, setProgramaId] = useState('');
  const [mes, setMes] = useState(1);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    listarProgramas().then(lista => {
      setProgramas(lista);
      if (lista.length > 0) setProgramaId(lista[0].id);
    });
  }, []);

  async function atribuir() {
    if (!programaId) return;
    setSalvando(true);
    try {
      await atribuirProgramaMuscular(aluno, programaId, mes);
      toast('Programa atribuído com sucesso.');
      onSalvo();
    } catch { toast('Erro ao atribuir programa.', 'error'); }
    finally { setSalvando(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-bold text-white">Atribuir programa muscular</h2>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Programa</label>
            <select value={programaId} onChange={e => setProgramaId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
              {programas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            {programaId && programas.find(p => p.id === programaId)?.desc && (
              <p className="text-[11px] text-white/30 mt-1.5 leading-relaxed">
                {programas.find(p => p.id === programaId).desc}
              </p>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Mês inicial (1–12)</label>
            <input type="number" min={1} max={12} value={mes} onChange={e => setMes(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all" />
          </div>
          <p className="text-[11px] text-amber-400/70 leading-relaxed">
            Atenção: os treinos de programa existentes deste aluno serão substituídos.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-xl border border-white/[0.08] text-[13px] text-white/50 hover:text-white hover:border-white/15 transition-all">
            Cancelar
          </button>
          <button onClick={atribuir} disabled={salvando || !programaId}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-[13px] font-semibold text-white disabled:opacity-40 transition-all shadow-lg shadow-sky-900/30">
            {salvando ? 'Atribuindo...' : 'Atribuir'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Fotos de evolução Tab ─────────────────────────────────────────────────────
const POSICOES = [
  { key: 'frente',  label: 'Frente' },
  { key: 'costas',  label: 'Costas' },
  { key: 'lateral', label: 'Lateral' },
];

function ComparacaoModal({ sessA, sessB, onFechar }) {
  const fmtData = sess => sess?.criadoEm?.seconds
    ? new Date(sess.criadoEm.seconds * 1000).toLocaleDateString('pt-BR')
    : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-4xl rounded-2xl bg-[#0a1425] ring-1 ring-white/[0.08] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <h2 className="text-[15px] font-bold text-white flex items-center gap-2">
            <Camera size={15} className="text-blue-400" />
            Comparação
          </h2>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {/* Cabeçalhos */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            {[sessA, sessB].map((sess, i) => (
              <div key={i} className={`rounded-xl px-4 py-2.5 text-center ring-1 ${i === 0 ? 'bg-blue-500/10 ring-blue-500/20' : 'bg-blue-500/10 ring-blue-500/20'}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: i === 0 ? '#60a5fa' : '#c084fc' }}>
                  {i === 0 ? 'ANTES' : 'DEPOIS'}
                </p>
                <p className="text-[13px] font-bold text-white">{fmtData(sess)}</p>
              </div>
            ))}
          </div>

          {/* Fotos por posição */}
          {POSICOES.map(({ key, label }) => {
            const fotoA = sessA?.fotos?.[key];
            const fotoB = sessB?.fotos?.[key];
            if (!fotoA && !fotoB) return null;
            return (
              <div key={key} className="mb-5">
                <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mb-3">{label}</p>
                <div className="grid grid-cols-2 gap-4">
                  {[fotoA, fotoB].map((foto, i) => (
                    <div key={i} className="rounded-2xl overflow-hidden bg-white/[0.03] ring-1 ring-white/[0.06] flex items-center justify-center" style={{ minHeight: 220 }}>
                      {foto
                        ? <img src={foto} alt={label} className="w-full object-contain max-h-80" />
                        : <p className="text-[12px] text-white/20 p-8 text-center">Sem foto nesta sessão</p>
                      }
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FotosTab({ alunoId }) {
  const toast = useToast();
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [files, setFiles] = useState({ frente: null, costas: null, lateral: null });
  const [previews, setPreviews] = useState({ frente: null, costas: null, lateral: null });
  const [salvando, setSalvando] = useState(false);
  const [comparando, setComparando] = useState(false);
  const [selecionadas, setSelecionadas] = useState([]);
  const [verComparacao, setVerComparacao] = useState(false);
  const refs = { frente: useRef(), costas: useRef(), lateral: useRef() };

  useEffect(() => {
    buscarFotosEvolucao(alunoId)
      .then(setHistorico)
      .finally(() => setCarregando(false));
  }, [alunoId]);

  function handleFile(posicao, file) {
    if (!file) return;
    setFiles(f => ({ ...f, [posicao]: file }));
    setPreviews(p => ({ ...p, [posicao]: URL.createObjectURL(file) }));
  }

  async function salvarFotos() {
    const posComFile = POSICOES.filter(p => files[p.key]);
    if (posComFile.length === 0) { toast('Selecione ao menos uma foto.', 'error'); return; }
    setSalvando(true);
    try {
      const fotosUrls = {};
      for (const { key } of posComFile) {
        fotosUrls[key] = await uploadFotoEvolucao(alunoId, files[key], key);
      }
      await salvarFotosEvolucao(alunoId, fotosUrls);
      toast('Fotos salvas com sucesso.');
      setFiles({ frente: null, costas: null, lateral: null });
      setPreviews({ frente: null, costas: null, lateral: null });
      buscarFotosEvolucao(alunoId).then(setHistorico);
    } catch { toast('Erro ao salvar fotos.', 'error'); }
    finally { setSalvando(false); }
  }

  async function excluirSessao(sessaoId) {
    await deletarSessaoFotos(sessaoId);
    setHistorico(h => h.filter(s => s.id !== sessaoId));
    toast('Sessão excluída.');
  }

  function toggleSelecao(sessId) {
    setSelecionadas(prev => {
      if (prev.includes(sessId)) return prev.filter(id => id !== sessId);
      if (prev.length >= 2) return [prev[1], sessId];
      return [...prev, sessId];
    });
  }

  const sessA = historico.find(s => s.id === selecionadas[0]);
  const sessB = historico.find(s => s.id === selecionadas[1]);

  return (
    <div className="space-y-5">
      {verComparacao && sessA && sessB && (
        <ComparacaoModal sessA={sessA} sessB={sessB} onFechar={() => setVerComparacao(false)} />
      )}

      {/* Nova sessão (só mostra fora do modo comparação) */}
      {!comparando && (
        <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-5">
          <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-4">Nova sessão de fotos</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {POSICOES.map(({ key, label }) => (
              <div key={key} className="flex flex-col items-center gap-2">
                <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">{label}</p>
                <input ref={refs[key]} type="file" accept="image/*" className="hidden"
                  onChange={e => handleFile(key, e.target.files[0])} />
                <button onClick={() => refs[key].current.click()}
                  className="w-24 h-32 rounded-xl border-2 border-dashed border-white/[0.10] hover:border-blue-500/40 bg-white/[0.02] hover:bg-blue-500/5 transition-all overflow-hidden flex items-center justify-center">
                  {previews[key]
                    ? <img src={previews[key]} alt={label} className="w-full h-full object-cover" />
                    : <Camera size={20} className="text-white/20" />}
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={salvarFotos} disabled={salvando}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[12px] font-semibold text-white disabled:opacity-40 transition-all">
              {salvando ? 'Salvando...' : 'Salvar fotos'}
            </button>
          </div>
        </div>
      )}

      {/* Histórico */}
      <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">
            {comparando ? `Histórico — selecione 2 sessões (${selecionadas.length}/2)` : 'Histórico'}
          </p>
          <div className="flex items-center gap-2">
            {comparando && selecionadas.length === 2 && (
              <button onClick={() => setVerComparacao(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-[12px] font-semibold text-white transition-all">
                Ver comparação
              </button>
            )}
            {historico.length >= 2 && (
              <button
                onClick={() => { setComparando(v => !v); setSelecionadas([]); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all ${
                  comparando
                    ? 'bg-white/[0.08] text-white/60 hover:bg-white/[0.12]'
                    : 'border border-white/[0.10] text-white/40 hover:text-white hover:border-white/20'
                }`}>
                {comparando ? 'Cancelar' : 'Comparar'}
              </button>
            )}
          </div>
        </div>

        {carregando ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : historico.length === 0 ? (
          <div className="text-center py-10">
            <Camera size={24} className="text-white/15 mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-[13px] text-white/30">Nenhuma foto registrada ainda.</p>
            <p className="text-[11px] text-white/20 mt-1">Fotos enviadas pelo app mobile aparecem aqui.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {historico.map((sess, idx) => {
              const data = sess.criadoEm?.seconds
                ? new Date(sess.criadoEm.seconds * 1000).toLocaleDateString('pt-BR')
                : '—';
              const fotos = sess.fotos || {};
              const selecionada = selecionadas.includes(sess.id);
              const ordemSel = selecionadas.indexOf(sess.id);

              return (
                <div key={sess.id}
                  onClick={() => comparando && toggleSelecao(sess.id)}
                  className={`flex items-center gap-4 p-4 transition-all ${
                    comparando
                      ? selecionada
                        ? ordemSel === 0
                          ? 'bg-blue-500/10 ring-inset ring-1 ring-blue-500/30 cursor-pointer'
                          : 'bg-blue-500/10 ring-inset ring-1 ring-blue-500/30 cursor-pointer'
                        : 'hover:bg-white/[0.03] cursor-pointer'
                      : ''
                  }`}>
                  {/* Indicador de seleção */}
                  {comparando && (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-[12px] ring-2 transition-all ${
                      selecionada && ordemSel === 0 ? 'bg-blue-500 ring-blue-500/50 text-white' :
                      selecionada && ordemSel === 1 ? 'bg-blue-500 ring-blue-500/50 text-white' :
                      'ring-white/[0.12] text-white/20 bg-transparent'
                    }`}>
                      {selecionada ? (ordemSel === 0 ? 'A' : 'B') : (idx + 1)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-[12px] font-semibold text-white/60">{data}</p>
                      {selecionada && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ordemSel === 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {ordemSel === 0 ? 'ANTES' : 'DEPOIS'}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {POSICOES.map(({ key, label }) => fotos[key] ? (
                        <div key={key} className="flex flex-col items-center gap-1">
                          <img src={fotos[key]} alt={label} className="w-20 h-28 object-cover rounded-xl" />
                          <p className="text-[9px] text-white/25 uppercase">{label}</p>
                        </div>
                      ) : null)}
                    </div>
                  </div>

                  {!comparando && (
                    <button onClick={e => { e.stopPropagation(); excluirSessao(sess.id); }}
                      className="p-2 rounded-xl hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all shrink-0">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function FrequenciaTab({ alunoId }) {
  const toast = useToast();
  const hoje = new Date();
  const [mes, setMes]     = useState(hoje.getMonth());
  const [ano, setAno]     = useState(hoje.getFullYear());
  const [presencas, setPresencas] = useState({});
  const [loading, setLoading]     = useState(true);
  const [salvando, setSalvando]   = useState(null);

  useEffect(() => {
    setLoading(true);
    buscarPresencasDoAluno(alunoId)
      .then(lista => {
        const map = {};
        lista.forEach(p => { map[p.data] = p.presente; });
        setPresencas(map);
      })
      .finally(() => setLoading(false));
  }, [alunoId]);

  function navMes(dir) {
    let nm = mes + dir, na = ano;
    if (nm < 0) { nm = 11; na--; }
    if (nm > 11) { nm = 0; na++; }
    setMes(nm); setAno(na);
  }

  async function togglePresenca(dataStr) {
    const atual = presencas[dataStr];
    const novoVal = atual === true ? false : atual === false ? null : true;
    setSalvando(dataStr);
    try {
      if (novoVal === null) {
        setPresencas(p => { const c = { ...p }; delete c[dataStr]; return c; });
      } else {
        await registrarPresenca(alunoId, dataStr, novoVal);
        setPresencas(p => ({ ...p, [dataStr]: novoVal }));
      }
    } catch { toast('Erro ao registrar presença.', 'error'); }
    finally { setSalvando(null); }
  }

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes   = new Date(ano, mes + 1, 0).getDate();

  const celulas = [];
  for (let i = 0; i < primeiroDia; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d);

  const mesStr = `${ano}-${String(mes + 1).padStart(2, '0')}`;
  const doMes  = Object.entries(presencas).filter(([k]) => k.startsWith(mesStr));
  const totalP = doMes.filter(([, v]) => v === true).length;
  const totalF = doMes.filter(([, v]) => v === false).length;
  const pct    = totalP + totalF > 0 ? Math.round(totalP / (totalP + totalF) * 100) : null;

  return (
    <div className="space-y-5">
      {/* Header do calendário */}
      <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-5">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navMes(-1)} className="w-8 h-8 rounded-xl hover:bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white transition-all">
            <ChevronLeft size={16} />
          </button>
          <div className="text-center">
            <p className="text-[15px] font-bold text-white">{MESES_PT[mes]} {ano}</p>
            {pct !== null && (
              <p className="text-[11px] text-white/35 mt-0.5">
                <span className="text-emerald-400 font-semibold">{totalP}✓</span>
                {' · '}
                <span className="text-red-400 font-semibold">{totalF}✗</span>
                {' · '}
                <span className="text-white/50">{pct}% de presença</span>
              </p>
            )}
          </div>
          <button onClick={() => navMes(1)} className="w-8 h-8 rounded-xl hover:bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white transition-all">
            <ChevronRight size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Cabeçalho dos dias */}
            <div className="grid grid-cols-7 mb-2">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="text-center text-[10px] font-semibold text-white/25 uppercase py-1">{d}</div>
              ))}
            </div>
            {/* Grade */}
            <div className="grid grid-cols-7 gap-1">
              {celulas.map((dia, i) => {
                if (!dia) return <div key={`empty-${i}`} />;
                const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                const estado  = presencas[dataStr];
                const isFuturo = new Date(ano, mes, dia) > hoje;
                const isSalvando = salvando === dataStr;
                return (
                  <button key={dia} onClick={() => !isFuturo && !isSalvando && togglePresenca(dataStr)}
                    disabled={isFuturo || isSalvando}
                    title={estado === true ? 'Presente — clique para falta' : estado === false ? 'Faltou — clique para remover' : 'Sem registro — clique para presença'}
                    className={`relative aspect-square rounded-xl flex items-center justify-center text-[12px] font-semibold transition-all ${
                      isFuturo    ? 'opacity-25 cursor-not-allowed text-white/25' :
                      estado === true  ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30 hover:bg-emerald-500/30' :
                      estado === false ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/20 hover:bg-red-500/30' :
                      'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white'
                    }`}>
                    {isSalvando
                      ? <div className="w-3 h-3 border border-white/40 border-t-transparent rounded-full animate-spin" />
                      : dia}
                    {estado === true  && <CheckCircle2 size={8} className="absolute top-1 right-1 text-emerald-400" />}
                    {estado === false && <XCircle size={8} className="absolute top-1 right-1 text-red-400" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-1.5 text-[11px] text-white/40">
          <div className="w-3 h-3 rounded-sm bg-emerald-500/25 ring-1 ring-emerald-500/30" />
          Presente
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-white/40">
          <div className="w-3 h-3 rounded-sm bg-red-500/25 ring-1 ring-red-500/20" />
          Faltou
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-white/40">
          <div className="w-3 h-3 rounded-sm bg-white/[0.04]" />
          Sem registro
        </div>
        <p className="text-[11px] text-white/25 ml-auto">Clique nos dias para registrar</p>
      </div>
    </div>
  );
}

export default function FichaAluno() {
  const searchParams = useSearchParams();
  const id           = searchParams.get('id');
  const router       = useRouter();
  const toast        = useToast();

  const [aluno,     setAluno]     = useState(null);
  const [treinos,   setTreinos]   = useState([]);
  const [avaliacoes,setAvaliacoes]= useState([]);
  const [historico, setHistorico] = useState([]);
  const [histLoaded,setHistLoaded]= useState(false);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState(false);
  const [form,      setForm]      = useState({});
  const [saving,    setSaving]    = useState(false);
  const [aba,       setAba]       = useState('dados');
  const [atribuirPrograma, setAtribuirPrograma] = useState(false);
  const [confirmExcluirId, setConfirmExcluirId] = useState(null);
  const [confirmAluno, setConfirmAluno] = useState(false);
  const [confirmRemoverPrograma, setConfirmRemoverPrograma] = useState(false);

  const carregar = () => Promise.all([
    buscarAluno(id),
    buscarTreinos(id),
    buscarAvaliacoes(id),
  ]).then(([a, t, av]) => {
    setAluno(a); setForm(a || {}); setTreinos(t); setAvaliacoes(av);
  }).finally(() => setLoading(false));

  useEffect(() => { if (id) carregar(); }, [id]);

  async function removerProgramaAtual() {
    try {
      await removerProgramaMuscular(aluno);
      setConfirmRemoverPrograma(false);
      toast('Programa removido.');
      carregar();
    } catch { toast('Erro ao remover programa.', 'error'); }
  }

  async function salvar() {
    setSaving(true);
    try {
      const { id: _, ...dados } = form;
      await atualizarAluno(id, dados);
      setAluno(form);
      setEditing(false);
      toast('Dados atualizados com sucesso.');
    } catch { toast('Erro ao salvar alterações.', 'error'); }
    finally { setSaving(false); }
  }

  async function excluirAv(avalId) {
    await excluirAvaliacao(avalId);
    setAvaliacoes(prev => prev.filter(a => a.id !== avalId));
    setConfirmExcluirId(null);
    toast('Avaliação excluída.');
  }

  async function excluirAlunoConfirmado() {
    await excluirAluno(id);
    toast('Aluno excluído.');
    router.push('/dashboard/alunos');
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!aluno) return <div className="p-8 text-white/35">Aluno não encontrado.</div>;

  const hoje = new Date();
  let statusVenc = 'ok';
  if (aluno.vencimento) {
    const [d, m, y] = aluno.vencimento.split('/');
    const diff = Math.ceil((new Date(+y, m - 1, +d) - hoje) / 86400000);
    if (diff < 0) statusVenc = 'vencido';
    else if (diff <= 7) statusVenc = 'vencendo';
  }

  return (
    <div className="px-4 pt-5 pb-6 md:p-8 max-w-5xl mx-auto w-full">
      {atribuirPrograma && (
        <AtribuirProgramaModal
          aluno={aluno}
          onSalvo={() => { setAtribuirPrograma(false); carregar(); }}
          onFechar={() => setAtribuirPrograma(false)}
        />
      )}
      <ConfirmModal
        open={!!confirmExcluirId}
        title="Excluir avaliação"
        message="Esta avaliação será removida permanentemente."
        onConfirm={() => excluirAv(confirmExcluirId)}
        onCancel={() => setConfirmExcluirId(null)}
      />
      <ConfirmModal
        open={confirmAluno}
        title={`Excluir ${aluno.nome}?`}
        message="Todos os dados deste aluno serão removidos permanentemente. Esta ação não pode ser desfeita."
        onConfirm={excluirAlunoConfirmado}
        onCancel={() => setConfirmAluno(false)}
      />
      <ConfirmModal
        open={confirmRemoverPrograma}
        title="Remover programa?"
        message="Os treinos gerados automaticamente pelo programa serão apagados (treinos manuais permanecem)."
        onConfirm={removerProgramaAtual}
        onCancel={() => setConfirmRemoverPrograma(false)}
      />

      <button onClick={() => router.push('/dashboard/alunos/')}
        className="inline-flex items-center gap-1.5 text-[12px] text-white/35 hover:text-white/70 transition-colors mb-6">
        <ChevronLeft size={14} /> Alunos
      </button>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/25 to-sky-500/25 flex items-center justify-center text-xl font-bold text-blue-400 ring-1 ring-blue-500/20">
            {aluno.nome?.[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">{aluno.nome}</h1>
            <div className="flex items-center gap-2 mt-1">
              {aluno.email && <p className="text-[12px] text-white/40">{aluno.email}</p>}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ${
                statusVenc === 'vencido'  ? 'bg-red-500/15 text-red-400 ring-red-500/20' :
                statusVenc === 'vencendo' ? 'bg-amber-500/15 text-amber-400 ring-amber-500/20' :
                'bg-green-500/15 text-green-400 ring-green-500/20'
              }`}>
                {statusVenc === 'vencido' ? 'Vencido' : statusVenc === 'vencendo' ? 'Vence em breve' : 'Ativo'}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ${
                aluno.tipoServico === 'online'
                  ? 'bg-blue-500/15 text-blue-400 ring-blue-500/20'
                  : 'bg-blue-500/15 text-blue-400 ring-blue-500/20'
              }`}>
                {aluno.tipoServico === 'online' ? 'Online' : 'Presencial'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setConfirmAluno(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-500/20 text-[12px] text-red-400/60 hover:text-red-400 hover:border-red-500/40 transition-all">
            <Trash2 size={13} /> Excluir
          </button>
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setForm(aluno); }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.08] text-[12px] text-white/50 hover:text-white hover:border-white/15 transition-all">
                <X size={13} /> Cancelar
              </button>
              <button onClick={salvar} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[12px] font-semibold text-white disabled:opacity-40 transition-all shadow-lg shadow-blue-900/30">
                <Save size={13} /> {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.08] text-[12px] text-white/50 hover:text-white hover:border-white/15 transition-all">
              <Pencil size={13} /> Editar
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-white/[0.05] mb-6 overflow-x-auto">
        {[
          { key: 'dados',      label: 'Dados pessoais',   icon: User },
          { key: 'plano',      label: 'Plano',            icon: CreditCard },
          { key: 'treinos',    label: 'Treinos',          icon: Dumbbell },
          { key: 'avaliacoes', label: 'Avaliações',       icon: ClipboardList },
          { key: 'evolucao',   label: 'Evolução',         icon: TrendingUp },
          { key: 'frequencia', label: 'Frequência',       icon: CalendarDays },
          { key: 'cargas',     label: 'Cargas',           icon: Weight },
          { key: 'fotos',      label: 'Fotos',            icon: Camera },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => {
            setAba(key);
            if (key === 'cargas' && !histLoaded) {
              buscarHistoricoDoAluno(id).then(h => { setHistorico(h); setHistLoaded(true); });
            }
          }}
            className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-all whitespace-nowrap ${
              aba === key ? 'border-blue-500 text-blue-400' : 'border-transparent text-white/35 hover:text-white/60'
            }`}>
            <Icon size={13} />
            {label}
            {key === 'avaliacoes' && avaliacoes.length > 0 && (
              <span className="ml-1 bg-white/[0.07] text-white/40 text-[10px] px-1.5 py-0.5 rounded-full">{avaliacoes.length}</span>
            )}
          </button>
        ))}
      </div>

      {aba === 'dados' && (
        <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <Field label="Nome completo" field="nome" form={form} setForm={setForm} editing={editing} icon={User} />
            <Field label="E-mail" field="email" form={form} setForm={setForm} editing={editing} icon={Mail} />
            <Field label="Telefone" field="telefone" form={form} setForm={setForm} editing={editing} icon={Phone} />
            <Field label="Data de nascimento" field="dataNascimento" form={form} setForm={setForm} editing={editing} icon={Calendar} />
            <SelectField label="Tipo de serviço" field="tipoServico" form={form} setForm={setForm} editing={editing}
              options={[{ value: 'presencial', label: 'Presencial' }, { value: 'online', label: 'Online' }]} />
            <Field label="Observações" field="observacoes" form={form} setForm={setForm} editing={editing} />
          </div>
        </div>
      )}

      {aba === 'plano' && (
        <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <Field label="Plano" field="plano" form={form} setForm={setForm} editing={editing} />
            <Field label="Frequência semanal" field="frequencia" form={form} setForm={setForm} editing={editing} type="number" />
            <Field label="Vencimento (DD/MM/AAAA)" field="vencimento" form={form} setForm={setForm} editing={editing} />
            <Field label="Valor mensal (R$)" field="valor" form={form} setForm={setForm} editing={editing} type="number" />
          </div>
        </div>
      )}

      {aba === 'treinos' && (
        <div className="space-y-3">
          <div className="flex justify-end gap-2">
            <button onClick={() => setAtribuirPrograma(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-[12px] font-semibold text-sky-300 hover:text-sky-200 transition-all">
              <Dumbbell size={13} /> Atribuir programa
            </button>
            {aluno?.programaMuscular && (
              <button onClick={() => setConfirmRemoverPrograma(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-[12px] font-semibold text-red-300 hover:text-red-200 transition-all">
                <Trash2 size={13} /> Remover programa
              </button>
            )}
            <Link href={`/dashboard/treinos?id=novo&alunoId=${id}`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[12px] font-semibold text-white transition-all shadow-lg shadow-blue-900/30">
              <Plus size={13} /> Novo treino
            </Link>
          </div>
          {treinos.length === 0 ? (
            <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-12 text-center">
              <Dumbbell size={28} className="text-white/15 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-[13px] text-white/30">Nenhum treino cadastrado para este aluno.</p>
            </div>
          ) : (
            treinos.map(t => <TreinoCard key={t.id} treino={t} />)
          )}
        </div>
      )}

      {aba === 'avaliacoes' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl bg-blue-500/[0.07] ring-1 ring-blue-500/20 px-4 py-2.5">
            <ClipboardList size={14} className="text-blue-400 shrink-0" />
            <p className="text-[12px] text-blue-300/80">
              As avaliações físicas são feitas pelo <strong>app PersonalPro</strong> (Pollock, InBody, etc.). Aqui você acompanha o histórico.
            </p>
          </div>
          {avaliacoes.length === 0 ? (
            <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-12 text-center">
              <ClipboardList size={28} className="text-white/15 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-[13px] text-white/30">Nenhuma avaliação registrada ainda.</p>
            </div>
          ) : (
            avaliacoes.map(av => (
              <CardAvaliacao key={av.id} av={av} onExcluir={id => setConfirmExcluirId(id)} />
            ))
          )}
        </div>
      )}

      {aba === 'evolucao' && (() => {
        if (avaliacoes.length === 0) {
          return (
            <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-12 text-center">
              <TrendingUp size={28} className="text-white/15 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-[13px] text-white/30">Nenhuma avaliação registrada para mostrar a evolução.</p>
            </div>
          );
        }

        // Ordena cronologicamente (mais antigas primeiro) para o gráfico
        const sorted = [...avaliacoes]
          .sort((a, b) => (a.criadoEm?.seconds || 0) - (b.criadoEm?.seconds || 0));

        const chartData = sorted.map(av => {
          const d = av.criadoEm?.seconds
            ? new Date(av.criadoEm.seconds * 1000)
            : null;
          const label = d
            ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
            : '—';
          return {
            data: label,
            Peso: metricasAvaliacao(av).peso ?? undefined,
            '%Gordura': metricasAvaliacao(av).percGordura ?? undefined,
            'Massa Magra': metricasAvaliacao(av).massaMagra ?? undefined,
          };
        });

        // Mini-tabela últimas 5
        const ultimas5 = [...avaliacoes].slice(0, 5);

        return (
          <div className="space-y-6">
            {/* Gráfico */}
            <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-6">
              <p className="text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-5">Evolução ao longo do tempo</p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: -16 }}>
                  <XAxis dataKey="data" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#0d1b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12, color: '#fff' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', paddingTop: 12 }} />
                  <Line type="monotone" dataKey="Peso" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} connectNulls />
                  <Line type="monotone" dataKey="%Gordura" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: '#f97316' }} connectNulls />
                  <Line type="monotone" dataKey="Massa Magra" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Tabela últimas 5 */}
            <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.05]">
                <p className="text-[12px] font-semibold text-white/40 uppercase tracking-wider">Últimas avaliações</p>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {['Data', 'Peso (kg)', 'Delta', '% Gord.', 'Delta', 'M. Magra', 'Delta'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-white/25 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ultimas5.map((av, i) => {
                    const prev = ultimas5[i + 1];
                    const fmt = v => v != null && v !== '' ? parseFloat(v).toFixed(1) : '—';
                    const delta = (curr, prevV) => {
                      if (curr == null || curr === '' || prevV == null || prevV === '') return null;
                      const d = parseFloat(curr) - parseFloat(prevV);
                      return d;
                    };
                    const DeltaBadge = ({ val, inverted }) => {
                      if (val === null) return <span className="text-white/20">—</span>;
                      const pos = inverted ? val < 0 : val > 0;
                      const neg = inverted ? val > 0 : val < 0;
                      return (
                        <span className={`text-[11px] font-semibold ${pos ? 'text-green-400' : neg ? 'text-red-400' : 'text-white/30'}`}>
                          {val > 0 ? '+' : ''}{val.toFixed(1)}
                        </span>
                      );
                    };
                    const data = av.criadoEm?.seconds
                      ? new Date(av.criadoEm.seconds * 1000).toLocaleDateString('pt-BR')
                      : '—';
                    const mAv   = metricasAvaliacao(av);
                    const mPrev = prev ? metricasAvaliacao(prev) : {};
                    return (
                      <tr key={av.id} className={`border-b border-white/[0.03] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                        <td className="px-4 py-3 text-[12px] text-white/50">{data}</td>
                        <td className="px-4 py-3 text-[13px] font-semibold text-white/80">{fmt(mAv.peso)}</td>
                        <td className="px-4 py-3"><DeltaBadge val={delta(mAv.peso, mPrev.peso)} inverted={false} /></td>
                        <td className="px-4 py-3 text-[13px] font-semibold text-white/80">{fmt(mAv.percGordura)}</td>
                        <td className="px-4 py-3"><DeltaBadge val={delta(mAv.percGordura, mPrev.percGordura)} inverted={true} /></td>
                        <td className="px-4 py-3 text-[13px] font-semibold text-white/80">{fmt(mAv.massaMagra)}</td>
                        <td className="px-4 py-3"><DeltaBadge val={delta(mAv.massaMagra, mPrev.massaMagra)} inverted={false} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        );
      })()}

      {aba === 'frequencia' && <FrequenciaTab alunoId={id} />}

      {aba === 'fotos' && <FotosTab alunoId={id} />}

      {aba === 'cargas' && (() => {
        if (!histLoaded) {
          return (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          );
        }
        if (historico.length === 0) {
          return (
            <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-12 text-center">
              <Weight size={28} className="text-white/15 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-[13px] text-white/30">Nenhum histórico de cargas registrado ainda.</p>
            </div>
          );
        }

        // Agrupa por exercício
        const porExercicio = {};
        historico.forEach(h => {
          const nome = h.exercicioNome || h.nome || 'Sem nome';
          if (!porExercicio[nome]) porExercicio[nome] = [];
          porExercicio[nome].push(h);
        });

        return (
          <div className="space-y-2">
            {Object.entries(porExercicio).map(([nome, entradas]) => (
              <AcordiaoCarga key={nome} nome={nome} entradas={entradas} />
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// Agrupa séries CONSECUTIVAS com reps+carga iguais num só chip ("3× 15-20 ·
// 13,75kg") — evita repetir o mesmo valor 3x quando o aluno usou a mesma
// carga em todas as séries (o caso mais comum). Séries diferentes entre si
// (drop-set, pirâmide) continuam aparecendo separadas.
function agruparSeries(series) {
  const grupos = [];
  for (const s of series) {
    const reps = s.reps || '';
    const carga = s.carga ?? s.peso ?? '';
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.reps === reps && ultimo.carga === carga) ultimo.qtd++;
    else grupos.push({ reps, carga, qtd: 1 });
  }
  return grupos;
}

function AcordiaoCarga({ nome, entradas }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
      <button onClick={() => setAberto(o => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Weight size={14} className="text-sky-400" />
          </div>
          <div className="text-left">
            <p className="text-[13px] font-semibold text-white/80">{nome}</p>
            <p className="text-[11px] text-white/30">{entradas.length} registro{entradas.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <ArrowUpRight size={14} className={`text-white/20 transition-transform ${aberto ? 'rotate-90' : ''}`} />
      </button>
      {aberto && (
        <div className="border-t border-white/[0.04] divide-y divide-white/[0.03]">
          {entradas.map((h, i) => {
            const data = h.timestamp?.seconds
              ? new Date(h.timestamp.seconds * 1000).toLocaleDateString('pt-BR')
              : '—';
            const series = h.series || [];
            return (
              <div key={h.id || i} className="px-4 py-3 flex items-start gap-4">
                <div className="shrink-0 w-20">
                  <p className="text-[11px] text-white/35">{data}</p>
                  {h.treinoNome && <p className="text-[10px] text-white/20 mt-0.5 truncate">{h.treinoNome}</p>}
                </div>
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {series.length > 0 ? agruparSeries(series).map((g, gi) => (
                    <span key={gi} className="text-[11px] px-2 py-1 rounded-lg bg-white/[0.05] text-white/55 font-mono">
                      {g.qtd > 1 ? `${g.qtd}× ` : ''}{g.reps ? `${g.reps}x` : ''}{g.carga ? ` ${g.carga}kg` : ''}
                    </span>
                  )) : (
                    <span className="text-[11px] text-white/25">Sem séries registradas</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
