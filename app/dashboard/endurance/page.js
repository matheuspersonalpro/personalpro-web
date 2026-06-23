'use client';
import { useEffect, useState } from 'react';
import {
  buscarAlunos, criarSessaoEndurance, buscarSessoesEndurance,
  deletarSessaoEndurance, definirProvaEndurance,
} from '@/lib/firestore';
import { tiposPorModalidade } from '@/lib/enduranceTreinos';
import { fasePeriodizacao, semanasAteProva } from '@/lib/enduranceTreinos';
import { modelosProntos, modelosSugeridos, semanaSugerida } from '@/lib/enduranceModelos';
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2, Activity,
  BookOpen, Calendar, Target, Zap, Flag,
} from 'lucide-react';
import { useToast } from '@/components/Toast';

// ── Date helpers ──────────────────────────────────────────────────────────────
function getMondayOfWeek(offset = 0) {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
  return new Date(new Date().setDate(diff));
}

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDaysOfWeek(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

const DIAS_LABEL = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const STATUS_COLORS = {
  planejado:  { bg: 'bg-blue-500/15',   text: 'text-blue-400',   label: 'Planejado' },
  realizado:  { bg: 'bg-green-500/15',  text: 'text-green-400',  label: 'Realizado' },
  cancelado:  { bg: 'bg-red-500/15',    text: 'text-red-400',    label: 'Cancelado' },
};

const DIST_OPCOES = {
  corrida:  ['5km', '10km', '21km', '42km'],
  ciclismo: ['criterium', 'granfondo', 'endurance'],
};

const DIST_LABEL = {
  '5km': '5 km', '10km': '10 km', '21km': 'Meia Maratona', '42km': 'Maratona',
  'criterium': 'Critérium', 'granfondo': 'Gran Fondo', 'endurance': 'Endurance',
};

function formatValor(medida, valor) {
  if (!valor) return '';
  if (medida === 'distancia') return `${Number(valor)} km`;
  if (medida === 'duracao') return `${Number(valor)} min`;
  return `${Number(valor)}`;
}

function modeloToSessao(m, data) {
  return {
    data,
    tipo: m.tipo,
    titulo: m.titulo,
    medida: m.medida === 'tempo' ? 'duracao' : 'distancia',
    valor: m.medida === 'tempo'
      ? Math.round(m.valor / 60)
      : +(m.valor / 1000).toFixed(1),
    zona: m.zona || '',
    detalhe: m.detalhe || '',
    status: 'planejado',
  };
}

// ── Modal de sessão manual ─────────────────────────────────────────────────────
function SessaoModal({ data, modalidade, onSalvar, onFechar }) {
  const tipos = tiposPorModalidade(modalidade);
  const [form, setForm] = useState({
    tipo: tipos[0]?.id || '',
    titulo: '',
    medida: 'distancia',
    valor: '',
    zona: '',
    detalhe: '',
    status: 'planejado',
  });
  const [salvando, setSalvando] = useState(false);

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  async function salvar() {
    setSalvando(true);
    try { await onSalvar({ ...form, data }); onFechar(); }
    finally { setSalvando(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-bold text-white">Nova sessão · {data}</h2>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Tipo</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
              {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Título (opcional)</label>
            <input type="text" value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ex: Rodagem progressiva" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Medida</label>
              <select value={form.medida} onChange={e => set('medida', e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
                <option value="distancia">Distância (km)</option>
                <option value="duracao">Duração (min)</option>
                <option value="livre">Livre</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">
                {form.medida === 'distancia' ? 'Km' : form.medida === 'duracao' ? 'Minutos' : 'Valor'}
              </label>
              <input type="number" step="0.1" value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="—" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Zona (opcional)</label>
            <select value={form.zona} onChange={e => set('zona', e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
              <option value="">Sem zona</option>
              {['Z1','Z2','Z3','Z4','Z5'].map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Observações / Ritmo alvo</label>
            <textarea value={form.detalhe} onChange={e => set('detalhe', e.target.value)} rows={3} className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all resize-none" placeholder="Descreva o treino, pace alvo, séries..." />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
              <option value="planejado">Planejado</option>
              <option value="realizado">Realizado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-xl border border-white/[0.08] text-[13px] text-white/50 hover:text-white hover:border-white/15 transition-all">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white disabled:opacity-40 transition-all shadow-lg shadow-blue-900/30">
            {salvando ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Adicionar modelo ao plano ──────────────────────────────────────────
function ModalAdicionarModelo({ modelo, alunos, modalidade, onSalvar, onFechar }) {
  const [alunoId, setAlunoId] = useState('');
  const [data, setData] = useState(toISO(new Date()));
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();

  async function salvar() {
    if (!alunoId) { toast('Selecione um aluno.', 'error'); return; }
    setSalvando(true);
    try {
      await onSalvar(alunoId, modalidade, modeloToSessao(modelo, data));
      toast('Sessão adicionada ao plano.');
      onFechar();
    } catch { toast('Erro ao adicionar sessão.', 'error'); }
    finally { setSalvando(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-[15px] font-bold text-white">Adicionar ao plano</h2>
            <p className="text-[12px] text-white/40 mt-0.5 truncate max-w-[260px]">{modelo.titulo}</p>
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Aluno</label>
            <select value={alunoId} onChange={e => setAlunoId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
              <option value="">Selecione um aluno...</option>
              {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Data</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all" />
          </div>
          {modelo.detalhe && (
            <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] p-3">
              <p className="text-[11px] text-white/50 leading-relaxed">{modelo.detalhe}</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-xl border border-white/[0.08] text-[13px] text-white/50 hover:text-white hover:border-white/15 transition-all">Cancelar</button>
          <button onClick={salvar} disabled={salvando || !alunoId} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white disabled:opacity-40 transition-all shadow-lg shadow-blue-900/30">
            {salvando ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Configurar prova ───────────────────────────────────────────────────
function ModalConfigProva({ aluno, modalidade, onSalvar, onFechar }) {
  const [dataProva, setDataProva]         = useState(aluno?.enduranceProfile?.[modalidade]?.dataProva || '');
  const [distanciaProva, setDistancia]    = useState(aluno?.enduranceProfile?.[modalidade]?.distanciaProva || '');
  const [salvando, setSalvando]           = useState(false);
  const toast = useToast();

  async function salvar() {
    setSalvando(true);
    try {
      await onSalvar(dataProva || null, distanciaProva || null);
      toast('Prova configurada.');
      onFechar();
    } catch { toast('Erro ao salvar.', 'error'); }
    finally { setSalvando(false); }
  }

  async function limpar() {
    setSalvando(true);
    try {
      await onSalvar(null, null);
      toast('Prova removida.');
      onFechar();
    } catch { toast('Erro ao limpar.', 'error'); }
    finally { setSalvando(false); }
  }

  const opts = DIST_OPCOES[modalidade] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-[15px] font-bold text-white">Configurar prova</h2>
            <p className="text-[12px] text-white/40 mt-0.5">{aluno?.nome} · {modalidade}</p>
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Distância / Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {opts.map(d => (
                <button key={d} onClick={() => setDistancia(d === distanciaProva ? '' : d)}
                  className={`px-3 py-2 rounded-xl text-[12px] font-semibold transition-all border ${
                    distanciaProva === d
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-white/[0.04] text-white/60 border-white/[0.08] hover:border-blue-500/30 hover:text-white'
                  }`}>
                  {DIST_LABEL[d] || d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Data da prova</label>
            <input type="date" value={dataProva} onChange={e => setDataProva(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between gap-2">
          {(aluno?.enduranceProfile?.[modalidade]?.dataProva) && (
            <button onClick={limpar} disabled={salvando} className="px-4 py-2 rounded-xl border border-red-500/20 text-[12px] text-red-400/70 hover:text-red-400 hover:border-red-500/40 disabled:opacity-40 transition-all">
              Remover prova
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button onClick={onFechar} className="px-4 py-2 rounded-xl border border-white/[0.08] text-[13px] text-white/50 hover:text-white hover:border-white/15 transition-all">Cancelar</button>
            <button onClick={salvar} disabled={salvando || !distanciaProva || !dataProva}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white disabled:opacity-40 transition-all shadow-lg shadow-blue-900/30">
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EndurancePage() {
  const toast = useToast();
  const [alunos,       setAlunos]       = useState([]);
  const [alunoId,      setAlunoId]      = useState('');
  const [modalidade,   setModalidade]   = useState('corrida');
  const [weekOffset,   setWeekOffset]   = useState(0);
  const [sessoes,      setSessoes]      = useState([]);
  const [carregando,   setCarregando]   = useState(false);
  const [montando,     setMontando]     = useState(false);
  const [modal,        setModal]        = useState(null);
  const [aba,          setAba]          = useState('plano');
  const [modeloSel,    setModeloSel]    = useState(null);
  const [showProva,    setShowProva]    = useState(false);

  const aluno = alunos.find(a => a.id === alunoId) || null;
  const perfil = aluno?.enduranceProfile?.[modalidade] || {};
  const { dataProva, distanciaProva } = perfil;
  const semRest = semanasAteProva(dataProva);
  const fase = fasePeriodizacao(semRest, distanciaProva);

  const monday = getMondayOfWeek(weekOffset);
  const days = getDaysOfWeek(monday);

  useEffect(() => { buscarAlunos().then(setAlunos); }, []);

  useEffect(() => {
    if (!alunoId) { setSessoes([]); return; }
    setCarregando(true);
    buscarSessoesEndurance(alunoId, modalidade)
      .then(setSessoes)
      .finally(() => setCarregando(false));
  }, [alunoId, modalidade]);

  async function adicionarSessao(dados) {
    await criarSessaoEndurance(alunoId, modalidade, dados);
    const novas = await buscarSessoesEndurance(alunoId, modalidade);
    setSessoes(novas);
    toast('Sessão adicionada.');
  }

  async function excluirSessao(id) {
    await deletarSessaoEndurance(id);
    setSessoes(s => s.filter(x => x.id !== id));
    toast('Sessão removida.');
  }

  async function salvarProva(dp, dist) {
    await definirProvaEndurance(alunoId, modalidade, dp, dist);
    const lista = await buscarAlunos();
    setAlunos(lista);
  }

  async function montarSemana() {
    if (!alunoId) { toast('Selecione um aluno.', 'error'); return; }
    if (!fase) { toast('Configure a prova do aluno primeiro.', 'error'); return; }
    setMontando(true);
    try {
      const sugestoes = semanaSugerida(modalidade, fase.chave, distanciaProva, semRest);
      await Promise.all(
        sugestoes.map((m, i) => {
          if (!m || m.rest) return null;
          const dia = new Date(monday);
          dia.setDate(dia.getDate() + i);
          return criarSessaoEndurance(alunoId, modalidade, modeloToSessao(m, toISO(dia)));
        }).filter(Boolean)
      );
      const novas = await buscarSessoesEndurance(alunoId, modalidade);
      setSessoes(novas);
      toast('Semana montada com sucesso!');
    } catch { toast('Erro ao montar semana.', 'error'); }
    finally { setMontando(false); }
  }

  const sessoesDodia = (iso) => sessoes.filter(s => s.data === iso);
  const tipos = tiposPorModalidade(modalidade);
  const tipoNome = (id) => tipos.find(t => t.id === id)?.nome || id;
  const tipoCor  = (id) => tipos.find(t => t.id === id)?.cor || '#64748b';
  const mesLabel = monday.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const modelosSug = fase ? modelosSugeridos(modalidade, fase.chave, distanciaProva) : [];

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      {modal && (
        <SessaoModal data={modal.data} modalidade={modalidade} onSalvar={adicionarSessao} onFechar={() => setModal(null)} />
      )}
      {modeloSel && (
        <ModalAdicionarModelo modelo={modeloSel} alunos={alunos} modalidade={modalidade} onSalvar={criarSessaoEndurance} onFechar={() => setModeloSel(null)} />
      )}
      {showProva && aluno && (
        <ModalConfigProva aluno={aluno} modalidade={modalidade} onSalvar={salvarProva} onFechar={() => setShowProva(false)} />
      )}

      <div className="mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Activity size={20} className="text-blue-400" /> Endurance
        </h1>
        <p className="text-[12px] text-white/35 mt-1">Plano de corrida e ciclismo por aluno</p>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select value={alunoId} onChange={e => setAlunoId(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all min-w-[200px]">
          <option value="">Selecione um aluno</option>
          {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>

        <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1">
          {['corrida', 'ciclismo'].map(m => (
            <button key={m} onClick={() => setModalidade(m)}
              className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                modalidade === m ? 'bg-blue-600 text-white shadow' : 'text-white/40 hover:text-white/70'
              }`}>
              {m === 'corrida' ? 'Corrida' : 'Ciclismo'}
            </button>
          ))}
        </div>

        {alunoId && (
          <button onClick={() => setShowProva(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.07] text-[12px] text-white/60 hover:text-white transition-all">
            <Flag size={13} />
            {dataProva ? `Prova: ${DIST_LABEL[distanciaProva] || distanciaProva} · ${new Date(dataProva + 'T00:00:00').toLocaleDateString('pt-BR')}` : 'Configurar prova'}
          </button>
        )}

        {alunoId && dataProva && (
          <div className="ml-auto flex items-center gap-1 rounded-xl bg-white/[0.04] p-1">
            <button onClick={() => setAba('plano')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${aba === 'plano' ? 'bg-blue-600 text-white shadow' : 'text-white/40 hover:text-white/70'}`}>
              <Calendar size={12} /> Plano semanal
            </button>
            <button onClick={() => setAba('modelos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${aba === 'modelos' ? 'bg-blue-600 text-white shadow' : 'text-white/40 hover:text-white/70'}`}>
              <BookOpen size={12} /> Modelos prontos
            </button>
          </div>
        )}
      </div>

      {/* ── Estado vazio: nenhum aluno selecionado ───────────────────────── */}
      {!alunoId && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <Activity size={28} className="text-blue-400/60" />
          </div>
          <h3 className="text-[15px] font-semibold text-white/60 mb-2">Selecione um aluno</h3>
          <p className="text-[12px] text-white/30 max-w-xs">
            Escolha um aluno no seletor acima para visualizar ou criar o plano de corrida e ciclismo.
          </p>
        </div>
      )}

      {/* ── Estado vazio: aluno sem prova configurada ─────────────────────── */}
      {alunoId && !dataProva && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}>
            <Flag size={28} className="text-amber-400/60" />
          </div>
          <h3 className="text-[15px] font-semibold text-white/60 mb-2">Configure a prova do aluno</h3>
          <p className="text-[12px] text-white/30 max-w-xs mb-5">
            Defina a prova e a data alvo para que o plano de periodização seja gerado automaticamente.
          </p>
          <button onClick={() => setShowProva(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 4px 20px rgba(37,99,235,0.25)' }}>
            <Flag size={14} /> Configurar prova
          </button>
        </div>
      )}

      {/* Banner de fase (quando aluno selecionado + prova configurada) */}
      {alunoId && fase && (
        <div className="rounded-2xl ring-1 ring-white/[0.08] p-4 mb-5 flex items-center gap-4"
          style={{ background: fase.cor + '18', borderColor: fase.cor + '40' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: fase.cor + '22' }}>
            <Target size={18} style={{ color: fase.cor }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[12px] font-bold" style={{ color: fase.cor }}>{fase.fase}</span>
              {semRest !== null && semRest > 0 && (
                <span className="text-[11px] text-white/35">
                  · {semRest} semana{semRest !== 1 ? 's' : ''} para a prova
                  {distanciaProva && ` (${DIST_LABEL[distanciaProva] || distanciaProva})`}
                </span>
              )}
              {semRest === 0 && <span className="text-[11px] text-white/35">· Semana da prova!</span>}
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed">{fase.foco}</p>
          </div>
          {modelosSug.length > 0 && (
            <div className="text-right shrink-0">
              <p className="text-[10px] text-white/30 mb-1">Sugeridos para esta fase</p>
              <div className="flex gap-1 flex-wrap justify-end">
                {modelosSug.slice(0, 3).map(m => (
                  <button key={m.id} onClick={() => { setAba('modelos'); setModeloSel(m); }}
                    className="text-[10px] px-2 py-1 rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all">
                    {m.titulo.split(' ').slice(0, 3).join(' ')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      {/* ── Conteúdo das abas: só quando aluno + prova configurados ─────────── */}
      {alunoId && dataProva && aba === 'modelos' ? (() => {
        const modelos = modelosProntos(modalidade);
        const tiposUniq = [...new Set(modelos.map(m => m.tipo))];
        const TIPO_LABELS = {
          regenerativo: 'Regenerativo', rodagem: 'Rodagem', longao: 'Longão',
          tempo: 'Tempo / Limiar', intervalado: 'Intervalado / VO₂máx',
          tiro: 'Tiros / Velocidade', educativos: 'Educativos', fartlek: 'Fartlek',
          subidas: 'Subidas', endurance: 'Endurance', sweet_spot: 'Sweet Spot',
          vo2: 'VO₂máx', forca: 'Força', pico: 'Pico de potência',
        };
        const sugIds = new Set(modelosSug.map(m => m.id));
        return (
          <div className="space-y-8">
            {tiposUniq.map(tipo => (
              <section key={tipo}>
                <h3 className="text-[12px] font-bold text-white/50 uppercase tracking-wider mb-3">{TIPO_LABELS[tipo] || tipo}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {modelos.filter(m => m.tipo === tipo).map(m => {
                    const isKm = m.medida === 'distancia';
                    const valorFmt = isKm ? `${(m.valor / 1000).toFixed(1)} km` : `${Math.round(m.valor / 60)} min`;
                    const isSug = sugIds.has(m.id);
                    return (
                      <div key={m.id} className={`rounded-2xl ring-1 p-4 flex flex-col gap-3 transition-all ${
                        isSug ? 'bg-blue-500/10 ring-blue-500/25' : 'bg-[#0d1b2e] ring-white/[0.06] hover:ring-blue-500/20'
                      }`}>
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-[13px] font-semibold text-white/85 leading-snug">{m.titulo}</p>
                            <div className="flex gap-1 shrink-0">
                              {isSug && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30">
                                  Sugerido
                                </span>
                              )}
                              {m.zona && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20">
                                  {m.zona}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-[11px] text-white/35">{valorFmt}</p>
                          {m.detalhe && <p className="text-[11px] text-white/40 mt-2 leading-relaxed line-clamp-3">{m.detalhe}</p>}
                          {m.ref && <p className="text-[10px] text-white/20 mt-1.5 italic">{m.ref}</p>}
                        </div>
                        <button onClick={() => setModeloSel(m)}
                          className="mt-auto w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 border border-blue-500/20 hover:border-transparent text-[12px] font-semibold text-blue-400 hover:text-white transition-all">
                          <Plus size={12} /> Adicionar ao plano
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        );
      })() : (alunoId && dataProva) ? (
        <>
          {/* Navegação semana */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekOffset(o => o - 1)} className="p-2 rounded-xl hover:bg-white/[0.06] text-white/40 hover:text-white transition-all"><ChevronLeft size={16} /></button>
              <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 rounded-xl text-[12px] text-white/50 hover:text-white hover:bg-white/[0.06] transition-all">Hoje</button>
              <button onClick={() => setWeekOffset(o => o + 1)} className="p-2 rounded-xl hover:bg-white/[0.06] text-white/40 hover:text-white transition-all"><ChevronRight size={16} /></button>
              <span className="text-[13px] text-white/50 capitalize ml-1">{mesLabel}</span>
            </div>

            {/* Montar semana */}
            {fase && (
              <button onClick={montarSemana} disabled={montando}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 hover:border-transparent text-[12px] font-semibold text-blue-400 hover:text-white disabled:opacity-40 transition-all">
                <Zap size={13} />
                {montando ? 'Montando...' : 'Montar semana'}
              </button>
            )}
          </div>

          {/* Grid semanal */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, i) => {
              const iso = toISO(day);
              const isHoje = iso === toISO(new Date());
              const daysSessoes = sessoesDodia(iso);
              return (
                <div key={iso} className={`rounded-2xl bg-[#0d1b2e] ring-1 flex flex-col min-h-[140px] overflow-hidden ${isHoje ? 'ring-blue-500/40' : 'ring-white/[0.06]'}`}>
                  <div className={`px-3 py-2 border-b flex items-center justify-between ${isHoje ? 'border-blue-500/20 bg-blue-500/5' : 'border-white/[0.05]'}`}>
                    <div>
                      <p className={`text-[10px] font-semibold uppercase tracking-wider ${isHoje ? 'text-blue-400' : 'text-white/30'}`}>{DIAS_LABEL[i]}</p>
                      <p className={`text-[14px] font-bold leading-tight ${isHoje ? 'text-blue-300' : 'text-white/60'}`}>{day.getDate()}</p>
                    </div>
                    <button onClick={() => setModal({ data: iso })}
                      className="w-6 h-6 rounded-lg bg-white/[0.05] hover:bg-blue-500/20 flex items-center justify-center text-white/30 hover:text-blue-400 transition-all">
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
                    {carregando ? (
                      <div className="flex justify-center pt-3"><div className="w-4 h-4 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin" /></div>
                    ) : daysSessoes.map(s => {
                      const st = STATUS_COLORS[s.status] || STATUS_COLORS.planejado;
                      return (
                        <div key={s.id} className="rounded-xl bg-white/[0.04] ring-1 ring-white/[0.05] p-2 group">
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tipoCor(s.tipo) }} />
                                <p className="text-[11px] font-semibold text-white/80 truncate">{s.titulo || tipoNome(s.tipo)}</p>
                              </div>
                              {s.valor && <p className="text-[10px] text-white/40 ml-2.5">{formatValor(s.medida, s.valor)}</p>}
                              <span className={`inline-flex mt-1 ml-2.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
                            </div>
                            <button onClick={() => excluirSessao(s.id)}
                              className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all shrink-0">
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
