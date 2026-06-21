'use client';
import { useEffect, useState } from 'react';
import {
  buscarAlunos, criarSessaoEndurance, buscarSessoesEndurance,
  deletarSessaoEndurance,
} from '@/lib/firestore';
import { tiposPorModalidade } from '@/lib/enduranceTreinos';
import { modelosProntos } from '@/lib/enduranceModelos';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Activity, BookOpen, Calendar } from 'lucide-react';
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

// ── Status badge colors ───────────────────────────────────────────────────────
const STATUS_COLORS = {
  planejado:  { bg: 'bg-blue-500/15',   text: 'text-blue-400',   label: 'Planejado' },
  realizado:  { bg: 'bg-green-500/15',  text: 'text-green-400',  label: 'Realizado' },
  cancelado:  { bg: 'bg-red-500/15',    text: 'text-red-400',    label: 'Cancelado' },
};

function formatValor(medida, valor) {
  if (!valor) return '';
  if (medida === 'distancia') return `${Number(valor)} km`;
  if (medida === 'duracao') return `${Number(valor)} min`;
  return `${Number(valor)}`;
}

// ── Modal de sessão ───────────────────────────────────────────────────────────
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

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function salvar() {
    setSalvando(true);
    try {
      await onSalvar({ ...form, data });
      onFechar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-bold text-white">Nova sessão · {data}</h2>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto p-6 space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Tipo</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
              {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          {/* Título */}
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Título (opcional)</label>
            <input type="text" value={form.titulo} onChange={e => set('titulo', e.target.value)}
              placeholder="Ex: Rodagem progressiva"
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all" />
          </div>
          {/* Medida + Valor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Medida</label>
              <select value={form.medida} onChange={e => set('medida', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
                <option value="distancia">Distância (km)</option>
                <option value="duracao">Duração (min)</option>
                <option value="livre">Livre</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">
                {form.medida === 'distancia' ? 'Km' : form.medida === 'duracao' ? 'Minutos' : 'Valor'}
              </label>
              <input type="number" step="0.1" value={form.valor} onChange={e => set('valor', e.target.value)}
                placeholder="—"
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all" />
            </div>
          </div>
          {/* Zona */}
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Zona (opcional)</label>
            <select value={form.zona} onChange={e => set('zona', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
              <option value="">Sem zona</option>
              {['Z1','Z2','Z3','Z4','Z5'].map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          {/* Detalhe */}
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Observações / Ritmo alvo</label>
            <textarea value={form.detalhe} onChange={e => set('detalhe', e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all resize-none"
              placeholder="Descreva o treino, pace alvo, séries..." />
          </div>
          {/* Status */}
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
              <option value="planejado">Planejado</option>
              <option value="realizado">Realizado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-xl border border-white/[0.08] text-[13px] text-white/50 hover:text-white hover:border-white/15 transition-all">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white disabled:opacity-40 transition-all shadow-lg shadow-blue-900/30">
            {salvando ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Adicionar modelo ao plano ─────────────────────────────────────────
function ModalAdicionarModelo({ modelo, alunos, modalidade, onSalvar, onFechar }) {
  const [alunoId, setAlunoId] = useState('');
  const [data, setData] = useState(toISO(new Date()));
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();

  async function salvar() {
    if (!alunoId) { toast('Selecione um aluno.', 'error'); return; }
    if (!data) { toast('Selecione uma data.', 'error'); return; }
    setSalvando(true);
    try {
      await onSalvar(alunoId, modalidade, {
        data,
        tipo: modelo.tipo,
        titulo: modelo.titulo,
        medida: modelo.medida === 'tempo' ? 'duracao' : 'distancia',
        valor: modelo.medida === 'tempo'
          ? Math.round(modelo.valor / 60)
          : +(modelo.valor / 1000).toFixed(1),
        zona: modelo.zona || '',
        detalhe: modelo.detalhe || '',
        status: 'planejado',
      });
      toast('Sessão adicionada ao plano.');
      onFechar();
    } catch { toast('Erro ao adicionar sessão.', 'error'); }
    finally { setSalvando(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-[15px] font-bold text-white">Adicionar ao plano</h2>
            <p className="text-[12px] text-white/40 mt-0.5 truncate max-w-[260px]">{modelo.titulo}</p>
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Aluno</label>
            <select value={alunoId} onChange={e => setAlunoId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
              <option value="">Selecione um aluno...</option>
              {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Data</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all" />
          </div>
          {modelo.detalhe && (
            <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] p-3">
              <p className="text-[11px] text-white/50 leading-relaxed">{modelo.detalhe}</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2">
          <button onClick={onFechar}
            className="px-4 py-2 rounded-xl border border-white/[0.08] text-[13px] text-white/50 hover:text-white hover:border-white/15 transition-all">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando || !alunoId}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white disabled:opacity-40 transition-all shadow-lg shadow-blue-900/30">
            {salvando ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EndurancePage() {
  const toast = useToast();
  const [alunos, setAlunos] = useState([]);
  const [alunoId, setAlunoId] = useState('');
  const [modalidade, setModalidade] = useState('corrida');
  const [weekOffset, setWeekOffset] = useState(0);
  const [sessoes, setSessoes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [modal, setModal] = useState(null); // { data: 'YYYY-MM-DD' }
  const [aba, setAba] = useState('plano'); // 'plano' | 'modelos'
  const [modeloSelecionado, setModeloSelecionado] = useState(null);

  const monday = getMondayOfWeek(weekOffset);
  const days = getDaysOfWeek(monday);

  useEffect(() => {
    buscarAlunos().then(setAlunos);
  }, []);

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

  const sessoesDodia = (iso) => sessoes.filter(s => s.data === iso);

  const tipos = tiposPorModalidade(modalidade);
  const tipoNome = (id) => tipos.find(t => t.id === id)?.nome || id;
  const tipoCor = (id) => tipos.find(t => t.id === id)?.cor || '#64748b';

  const mesLabel = monday.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      {modal && (
        <SessaoModal
          data={modal.data}
          modalidade={modalidade}
          onSalvar={adicionarSessao}
          onFechar={() => setModal(null)}
        />
      )}
      {modeloSelecionado && (
        <ModalAdicionarModelo
          modelo={modeloSelecionado}
          alunos={alunos}
          modalidade={modalidade}
          onSalvar={criarSessaoEndurance}
          onFechar={() => setModeloSelecionado(null)}
        />
      )}

      <div className="mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Activity size={20} className="text-blue-400" /> Endurance
        </h1>
        <p className="text-[12px] text-white/35 mt-1">Plano de corrida e ciclismo por aluno</p>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        {/* Seletor de aluno */}
        <select
          value={alunoId}
          onChange={e => setAlunoId(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all min-w-[200px]">
          <option value="">Selecione um aluno</option>
          {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>

        {/* Seletor de modalidade */}
        <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1">
          {['corrida', 'ciclismo'].map(m => (
            <button key={m} onClick={() => setModalidade(m)}
              className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all capitalize ${
                modalidade === m
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-white/40 hover:text-white/70'
              }`}>
              {m === 'corrida' ? 'Corrida' : 'Ciclismo'}
            </button>
          ))}
        </div>

        {/* Tab switcher */}
        <div className="ml-auto flex items-center gap-1 rounded-xl bg-white/[0.04] p-1">
          <button onClick={() => setAba('plano')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
              aba === 'plano' ? 'bg-blue-600 text-white shadow' : 'text-white/40 hover:text-white/70'
            }`}>
            <Calendar size={12} /> Plano semanal
          </button>
          <button onClick={() => setAba('modelos')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
              aba === 'modelos' ? 'bg-blue-600 text-white shadow' : 'text-white/40 hover:text-white/70'
            }`}>
            <BookOpen size={12} /> Modelos prontos
          </button>
        </div>
      </div>

      {aba === 'modelos' ? (
        /* Aba modelos prontos */
        (() => {
          const modelos = modelosProntos(modalidade);
          const tipos = [...new Set(modelos.map(m => m.tipo))];
          const TIPO_LABELS = {
            regenerativo: 'Regenerativo', rodagem: 'Rodagem', longao: 'Longão',
            tempo: 'Tempo / Limiar', intervalado: 'Intervalado / VO₂máx',
            tiro: 'Tiros / Velocidade', educativos: 'Educativos',
            endurance: 'Endurance', sweet_spot: 'Sweet Spot', vo2: 'VO₂máx',
            forca: 'Força', pico: 'Pico de potência',
          };
          return (
            <div className="space-y-8">
              {tipos.map(tipo => (
                <section key={tipo}>
                  <h3 className="text-[12px] font-bold text-white/50 uppercase tracking-wider mb-3">
                    {TIPO_LABELS[tipo] || tipo}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {modelos.filter(m => m.tipo === tipo).map(m => {
                      const isKm = m.medida === 'distancia';
                      const valorFmt = isKm
                        ? `${(m.valor / 1000).toFixed(1)} km`
                        : `${Math.round(m.valor / 60)} min`;
                      return (
                        <div key={m.id}
                          className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-4 hover:ring-blue-500/20 transition-all flex flex-col gap-3">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-[13px] font-semibold text-white/85 leading-snug">{m.titulo}</p>
                              {m.zona && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20 shrink-0">
                                  {m.zona}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-white/35">{valorFmt}</p>
                            {m.detalhe && (
                              <p className="text-[11px] text-white/40 mt-2 leading-relaxed line-clamp-3">{m.detalhe}</p>
                            )}
                            {m.ref && (
                              <p className="text-[10px] text-white/20 mt-1.5 italic">{m.ref}</p>
                            )}
                          </div>
                          <button onClick={() => setModeloSelecionado(m)}
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
        })()
      ) : !alunoId ? (
        <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-16 text-center">
          <Activity size={32} className="text-white/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[13px] text-white/30">Selecione um aluno para ver o plano</p>
        </div>
      ) : (
        <>
          {/* Navegação semana */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekOffset(o => o - 1)}
                className="p-2 rounded-xl hover:bg-white/[0.06] text-white/40 hover:text-white transition-all">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setWeekOffset(0)}
                className="px-3 py-1.5 rounded-xl text-[12px] text-white/50 hover:text-white hover:bg-white/[0.06] transition-all">
                Hoje
              </button>
              <button onClick={() => setWeekOffset(o => o + 1)}
                className="p-2 rounded-xl hover:bg-white/[0.06] text-white/40 hover:text-white transition-all">
                <ChevronRight size={16} />
              </button>
            </div>
            <span className="text-[13px] text-white/50 capitalize">{mesLabel}</span>
          </div>

          {/* Grid semanal */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, i) => {
              const iso = toISO(day);
              const isHoje = iso === toISO(new Date());
              const daysSessoes = sessoesDodia(iso);
              return (
                <div key={iso} className={`rounded-2xl bg-[#0d1b2e] ring-1 flex flex-col min-h-[140px] overflow-hidden ${
                  isHoje ? 'ring-blue-500/40' : 'ring-white/[0.06]'
                }`}>
                  {/* Cabeçalho do dia */}
                  <div className={`px-3 py-2 border-b flex items-center justify-between ${
                    isHoje ? 'border-blue-500/20 bg-blue-500/5' : 'border-white/[0.05]'
                  }`}>
                    <div>
                      <p className={`text-[10px] font-semibold uppercase tracking-wider ${isHoje ? 'text-blue-400' : 'text-white/30'}`}>
                        {DIAS_LABEL[i]}
                      </p>
                      <p className={`text-[14px] font-bold leading-tight ${isHoje ? 'text-blue-300' : 'text-white/60'}`}>
                        {day.getDate()}
                      </p>
                    </div>
                    <button onClick={() => setModal({ data: iso })}
                      className="w-6 h-6 rounded-lg bg-white/[0.05] hover:bg-blue-500/20 flex items-center justify-center text-white/30 hover:text-blue-400 transition-all">
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Sessões do dia */}
                  <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
                    {carregando ? (
                      <div className="flex justify-center pt-3">
                        <div className="w-4 h-4 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin" />
                      </div>
                    ) : daysSessoes.map(s => {
                      const st = STATUS_COLORS[s.status] || STATUS_COLORS.planejado;
                      return (
                        <div key={s.id} className="rounded-xl bg-white/[0.04] ring-1 ring-white/[0.05] p-2 group">
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tipoCor(s.tipo) }} />
                                <p className="text-[11px] font-semibold text-white/80 truncate">
                                  {s.titulo || tipoNome(s.tipo)}
                                </p>
                              </div>
                              {s.valor && (
                                <p className="text-[10px] text-white/40 ml-2.5">
                                  {formatValor(s.medida, s.valor)}
                                </p>
                              )}
                              <span className={`inline-flex mt-1 ml-2.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                                {st.label}
                              </span>
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
      )}
    </div>
  );
}
