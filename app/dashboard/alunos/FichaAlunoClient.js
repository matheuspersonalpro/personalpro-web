'use client';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  buscarAluno, buscarTreinos, atualizarAluno, excluirAluno,
  buscarAvaliacoes, criarAvaliacao, excluirAvaliacao, buscarHistoricoDoAluno,
  atribuirProgramaMuscular, listarProgramas,
  buscarFotosEvolucao, uploadFotoEvolucao, salvarFotosEvolucao, deletarSessaoFotos,
  buscarPresencasDoAluno, registrarPresenca,
} from '@/lib/firestore';
import {
  ChevronLeft, Pencil, Save, X, User, CreditCard, Dumbbell,
  Phone, Mail, Calendar, Plus, ArrowUpRight, ClipboardList, Trash2,
  TrendingUp, Weight, Camera, CalendarDays, CheckCircle2, XCircle,
  ChevronRight, Calculator,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useToast } from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';

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
          className="w-full px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all"
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

const MEDIDAS_CAMPOS = [
  { key: 'peso',   label: 'Peso (kg)' },
  { key: 'altura', label: 'Altura (cm)' },
  { key: 'bf',     label: '% Gordura' },
  { key: 'mm',     label: 'Massa Magra (kg)' },
  { key: 'peito',  label: 'Peitoral (mm)' },
  { key: 'abdom',  label: 'Abdome (mm)' },
  { key: 'coxa',   label: 'Coxa (mm)' },
  { key: 'tricep', label: 'Trícep (mm)' },
  { key: 'axilar', label: 'Axilar (mm)' },
  { key: 'suprai', label: 'Suprailíaca (mm)' },
  { key: 'subesc', label: 'Subescapular (mm)' },
  { key: 'cintura',label: 'Cintura (cm)' },
  { key: 'quadril',label: 'Quadril (cm)' },
  { key: 'braco',  label: 'Braço (cm)' },
  { key: 'coxaC',  label: 'Coxa circunf. (cm)' },
  { key: 'panturr',label: 'Panturrilha (cm)' },
];

// Fórmulas de composição corporal
function calcPollock7(dobras, sexo, idade) {
  const s = Object.values(dobras).reduce((a, v) => a + (parseFloat(v) || 0), 0);
  if (s === 0 || !idade) return null;
  const bd = sexo === 'F'
    ? 1.097 - 0.00046971 * s + 0.00000056 * s * s - 0.00012828 * idade
    : 1.112 - 0.00043499 * s + 0.00000055 * s * s - 0.00028826 * idade;
  return parseFloat(((4.95 / bd - 4.5) * 100).toFixed(1));
}
function calcPollock3(dobras, sexo, idade) {
  const s = Object.values(dobras).reduce((a, v) => a + (parseFloat(v) || 0), 0);
  if (s === 0 || !idade) return null;
  const bd = sexo === 'F'
    ? 1.0994921 - 0.0009929 * s + 0.0000023 * s * s - 0.0001392 * idade
    : 1.10938 - 0.0008267 * s + 0.0000016 * s * s - 0.0002574 * idade;
  return parseFloat(((4.95 / bd - 4.5) * 100).toFixed(1));
}
function calcIdade(nascimento) {
  if (!nascimento) return null;
  const parts = nascimento.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const hoje = new Date();
  const nasc = new Date(+y, +m - 1, +d);
  let age = hoje.getFullYear() - nasc.getFullYear();
  if (hoje < new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate())) age--;
  return age > 0 ? age : null;
}

const PROTOCOLOS = [
  { id: 'completa',    label: 'Avaliação completa' },
  { id: 'pollock7',    label: 'Pollock 7 dobras (%GC automático)' },
  { id: 'pollock3m',   label: 'Pollock 3 dobras — Masculino' },
  { id: 'pollock3f',   label: 'Pollock 3 dobras — Feminino' },
  { id: 'inbody',      label: 'InBody / Bioimpedância' },
  { id: 'circunfer',   label: 'Circunferências' },
];

const CAMPOS_PROTOCOLO = {
  completa:  MEDIDAS_CAMPOS,
  pollock7:  [
    { key: 'peito',  label: 'Peitoral (mm)' },
    { key: 'axilar', label: 'Axilar média (mm)' },
    { key: 'subesc', label: 'Subescapular (mm)' },
    { key: 'tricep', label: 'Trícep (mm)' },
    { key: 'suprai', label: 'Suprailíaca (mm)' },
    { key: 'abdom',  label: 'Abdome (mm)' },
    { key: 'coxa',   label: 'Coxa (mm)' },
  ],
  pollock3m: [
    { key: 'peito', label: 'Peitoral (mm)' },
    { key: 'abdom', label: 'Abdome (mm)' },
    { key: 'coxa',  label: 'Coxa (mm)' },
  ],
  pollock3f: [
    { key: 'tricep', label: 'Trícep (mm)' },
    { key: 'suprai', label: 'Suprailíaca (mm)' },
    { key: 'coxa',   label: 'Coxa (mm)' },
  ],
  inbody: [
    { key: 'peso',   label: 'Peso (kg)' },
    { key: 'bf',     label: '% Gordura' },
    { key: 'mm',     label: 'Massa Magra (kg)' },
    { key: 'altura', label: 'Altura (cm)' },
  ],
  circunfer: [
    { key: 'peso',    label: 'Peso (kg)' },
    { key: 'altura',  label: 'Altura (cm)' },
    { key: 'cintura', label: 'Cintura (cm)' },
    { key: 'quadril', label: 'Quadril (cm)' },
    { key: 'braco',   label: 'Braço (cm)' },
    { key: 'coxaC',   label: 'Coxa circunf. (cm)' },
    { key: 'panturr', label: 'Panturrilha (cm)' },
  ],
};

function NovaAvaliacaoModal({ alunoId, aluno, onSalvo, onFechar }) {
  const toast = useToast();
  const [protocolo, setProtocolo] = useState('completa');
  const [sexo, setSexo]   = useState(aluno?.sexo || 'M');
  const [medidas, setMedidas] = useState({});
  const [obs, setObs]     = useState('');
  const [saving, setSaving] = useState(false);

  const idade = calcIdade(aluno?.nascimento);
  const ehPollock = protocolo === 'pollock7' || protocolo === 'pollock3m' || protocolo === 'pollock3f';

  const gcCalc = (() => {
    if (!ehPollock) return null;
    const dobras = {};
    (CAMPOS_PROTOCOLO[protocolo] || []).forEach(({ key }) => { if (medidas[key]) dobras[key] = medidas[key]; });
    if (protocolo === 'pollock7') return calcPollock7(dobras, sexo, idade);
    return calcPollock3(dobras, protocolo === 'pollock3f' ? 'F' : 'M', idade);
  })();

  async function salvar() {
    setSaving(true);
    try {
      const medidasFinais = { ...medidas };
      if (gcCalc !== null) medidasFinais.bf = String(gcCalc);
      await criarAvaliacao({ alunoId, medidas: medidasFinais, observacoes: obs, protocolo });
      toast('Avaliação registrada.');
      onSalvo();
    } catch { toast('Erro ao salvar avaliação.', 'error'); }
    finally { setSaving(false); }
  }

  const campos = CAMPOS_PROTOCOLO[protocolo] || MEDIDAS_CAMPOS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-2xl rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-bold text-white">Nova Avaliação</h2>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto p-6 space-y-5">
          {/* Seletor de protocolo */}
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Protocolo</label>
            <select value={protocolo} onChange={e => { setProtocolo(e.target.value); setMedidas({}); }}
              className="w-full px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
              {PROTOCOLOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>

          {/* Sexo (apenas para Pollock) */}
          {ehPollock && (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Sexo biológico</label>
                <div className="flex gap-2">
                  {[{ v: 'M', l: 'Masculino' }, { v: 'F', l: 'Feminino' }].map(({ v, l }) => (
                    <button key={v} onClick={() => setSexo(v)} type="button"
                      className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all ${sexo === v ? 'bg-blue-600 text-white' : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.07]'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Idade</label>
                <div className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[13px] text-white/60">
                  {idade ? `${idade} anos` : <span className="text-amber-400/70">Informe nascimento no cadastro</span>}
                </div>
              </div>
            </div>
          )}

          {/* Campos do protocolo */}
          <div className="grid grid-cols-3 gap-3">
            {campos.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">{label}</label>
                <input type="number" step="0.1"
                  value={medidas[key] || ''}
                  onChange={e => setMedidas(m => ({ ...m, [key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all"
                  placeholder="—" />
              </div>
            ))}
          </div>

          {/* Resultado Pollock em tempo real */}
          {ehPollock && (
            <div className={`flex items-center gap-3 rounded-xl p-4 ${gcCalc !== null ? 'bg-emerald-500/10 ring-1 ring-emerald-500/20' : 'bg-white/[0.04] ring-1 ring-white/[0.06]'}`}>
              <Calculator size={18} className={gcCalc !== null ? 'text-emerald-400' : 'text-white/25'} />
              <div>
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">% Gordura calculado</p>
                <p className={`text-[20px] font-bold ${gcCalc !== null ? 'text-emerald-400' : 'text-white/25'}`}>
                  {gcCalc !== null ? `${gcCalc}%` : '—'}
                </p>
                {gcCalc !== null && <p className="text-[10px] text-white/30">Será salvo automaticamente em % Gordura</p>}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Observações</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all resize-none"
              placeholder="Observações da avaliação..." />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-xl border border-white/[0.08] text-[13px] text-white/50 hover:text-white hover:border-white/15 transition-all">
            Cancelar
          </button>
          <button onClick={salvar} disabled={saving} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white disabled:opacity-40 transition-all shadow-lg shadow-blue-900/30">
            {saving ? 'Salvando...' : 'Salvar avaliação'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CardAvaliacao({ av, onExcluir }) {
  const [aberto, setAberto] = useState(false);
  const data = av.criadoEm?.seconds
    ? new Date(av.criadoEm.seconds * 1000).toLocaleDateString('pt-BR')
    : '—';

  const campos = Object.entries(av.medidas || {}).filter(([, v]) => v !== '' && v != null);

  return (
    <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
      <div onClick={() => setAberto(o => !o)} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors cursor-pointer select-none">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center">
            <ClipboardList size={15} className="text-green-400" />
          </div>
          <div className="text-left">
            <p className="text-[13px] font-semibold text-white/80">Avaliação · {data}</p>
            <p className="text-[11px] text-white/30">{campos.length} métricas registradas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={e => { e.stopPropagation(); onExcluir(av.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all">
            <Trash2 size={13} />
          </button>
          <ArrowUpRight size={14} className={`text-white/20 transition-transform ${aberto ? 'rotate-90' : ''}`} />
        </div>
      </div>
      {aberto && campos.length > 0 && (
        <div className="px-4 pb-4 grid grid-cols-3 gap-2 border-t border-white/[0.04] pt-3">
          {campos.map(([key, val]) => {
            const campo = MEDIDAS_CAMPOS.find(c => c.key === key);
            return (
              <div key={key} className="rounded-xl bg-white/[0.03] px-3 py-2">
                <p className="text-[10px] text-white/30 mb-0.5">{campo?.label || key}</p>
                <p className="text-[14px] font-bold text-white">{val}</p>
              </div>
            );
          })}
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
              className="w-full px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
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
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[13px] font-semibold text-white disabled:opacity-40 transition-all shadow-lg shadow-indigo-900/30">
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

function FotosTab({ alunoId }) {
  const toast = useToast();
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [files, setFiles] = useState({ frente: null, costas: null, lateral: null });
  const [previews, setPreviews] = useState({ frente: null, costas: null, lateral: null });
  const [salvando, setSalvando] = useState(false);
  const refs = { frente: useRef(), costas: useRef(), lateral: useRef() };

  useEffect(() => {
    buscarFotosEvolucao(alunoId)
      .then(setHistorico)
      .finally(() => setCarregando(false));
  }, [alunoId]);

  function handleFile(posicao, file) {
    if (!file) return;
    setFiles(f => ({ ...f, [posicao]: file }));
    const url = URL.createObjectURL(file);
    setPreviews(p => ({ ...p, [posicao]: url }));
  }

  async function salvarFotos() {
    const posComFile = POSICOES.filter(p => files[p.key]);
    if (posComFile.length === 0) { toast('Selecione ao menos uma foto.', 'error'); return; }
    setSalvando(true);
    try {
      const fotosUrls = {};
      for (const { key } of posComFile) {
        const url = await uploadFotoEvolucao(alunoId, files[key], key);
        fotosUrls[key] = url;
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

  return (
    <div className="space-y-6">
      {/* Nova sessão */}
      <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-6">
        <p className="text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-4">Nova sessão de fotos</p>
        <div className="grid grid-cols-3 gap-4">
          {POSICOES.map(({ key, label }) => (
            <div key={key} className="flex flex-col items-center gap-2">
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">{label}</p>
              <input ref={refs[key]} type="file" accept="image/*" className="hidden"
                onChange={e => handleFile(key, e.target.files[0])} />
              <button onClick={() => refs[key].current.click()}
                className="w-24 h-32 rounded-xl border-2 border-dashed border-white/[0.10] hover:border-blue-500/40 bg-white/[0.02] hover:bg-blue-500/5 transition-all overflow-hidden flex items-center justify-center">
                {previews[key] ? (
                  <img src={previews[key]} alt={label} className="w-full h-full object-cover" />
                ) : (
                  <Camera size={20} className="text-white/20" />
                )}
              </button>
              {files[key] && (
                <p className="text-[10px] text-white/30 truncate max-w-[96px]">{files[key].name}</p>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={salvarFotos} disabled={salvando}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[12px] font-semibold text-white disabled:opacity-40 transition-all shadow-lg shadow-blue-900/30">
            {salvando ? 'Salvando...' : 'Salvar fotos'}
          </button>
        </div>
      </div>

      {/* Histórico */}
      <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-6">
        <p className="text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-4">Histórico</p>
        {carregando ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : historico.length === 0 ? (
          <div className="text-center py-8">
            <Camera size={24} className="text-white/15 mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-[13px] text-white/30">Nenhuma foto registrada ainda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {historico.map(sess => {
              const data = sess.criadoEm?.seconds
                ? new Date(sess.criadoEm.seconds * 1000).toLocaleDateString('pt-BR')
                : '—';
              const fotos = sess.fotos || {};
              return (
                <div key={sess.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.05]">
                  <div className="flex-1">
                    <p className="text-[12px] font-semibold text-white/60 mb-2">{data}</p>
                    <div className="flex gap-2">
                      {POSICOES.map(({ key, label }) => fotos[key] ? (
                        <div key={key} className="flex flex-col items-center gap-1">
                          <img src={fotos[key]} alt={label} className="w-24 h-32 object-cover rounded-xl" />
                          <p className="text-[9px] text-white/25 uppercase">{label}</p>
                        </div>
                      ) : null)}
                    </div>
                  </div>
                  <button onClick={() => excluirSessao(sess.id)}
                    className="p-2 rounded-xl hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all shrink-0">
                    <Trash2 size={14} />
                  </button>
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
  const [novaAval,  setNovaAval]  = useState(false);
  const [atribuirPrograma, setAtribuirPrograma] = useState(false);
  const [confirmExcluirId, setConfirmExcluirId] = useState(null);
  const [confirmAluno, setConfirmAluno] = useState(false);

  const carregar = () => Promise.all([
    buscarAluno(id),
    buscarTreinos(id),
    buscarAvaliacoes(id),
  ]).then(([a, t, av]) => {
    setAluno(a); setForm(a || {}); setTreinos(t); setAvaliacoes(av);
  }).finally(() => setLoading(false));

  useEffect(() => { if (id) carregar(); }, [id]);

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
    <div className="p-8 max-w-5xl mx-auto w-full">
      {novaAval && (
        <NovaAvaliacaoModal
          alunoId={id}
          aluno={aluno}
          onSalvo={() => { setNovaAval(false); buscarAvaliacoes(id).then(setAvaliacoes); }}
          onFechar={() => setNovaAval(false)}
        />
      )}
      {atribuirPrograma && (
        <AtribuirProgramaModal
          aluno={aluno}
          onSalvo={() => { setAtribuirPrograma(false); buscarTreinos(id).then(setTreinos); }}
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

      <Link href="/dashboard/alunos"
        className="inline-flex items-center gap-1.5 text-[12px] text-white/35 hover:text-white/70 transition-colors mb-6">
        <ChevronLeft size={14} /> Alunos
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/25 to-indigo-500/25 flex items-center justify-center text-xl font-bold text-blue-400 ring-1 ring-blue-500/20">
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
                  ? 'bg-purple-500/15 text-purple-400 ring-purple-500/20'
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
            <Field label="Data de nascimento" field="nascimento" form={form} setForm={setForm} editing={editing} icon={Calendar} />
            <SelectField label="Tipo de serviço" field="tipoServico" form={form} setForm={setForm} editing={editing}
              options={[{ value: 'presencial', label: 'Presencial' }, { value: 'online', label: 'Online' }]} />
            <Field label="Observações" field="obs" form={form} setForm={setForm} editing={editing} />
          </div>
        </div>
      )}

      {aba === 'plano' && (
        <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <Field label="Plano" field="plano" form={form} setForm={setForm} editing={editing} />
            <Field label="Frequência semanal" field="frequencia" form={form} setForm={setForm} editing={editing} type="number" />
            <Field label="Vencimento (DD/MM/AAAA)" field="vencimento" form={form} setForm={setForm} editing={editing} />
            <Field label="Valor mensal (R$)" field="valorMensal" form={form} setForm={setForm} editing={editing} type="number" />
          </div>
        </div>
      )}

      {aba === 'treinos' && (
        <div className="space-y-3">
          <div className="flex justify-end gap-2">
            <button onClick={() => setAtribuirPrograma(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-[12px] font-semibold text-indigo-300 hover:text-indigo-200 transition-all">
              <Dumbbell size={13} /> Atribuir programa
            </button>
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
            treinos.map(t => (
              <Link key={t.id} href={`/dashboard/treinos?id=${t.id}`}
                className="flex items-center justify-between p-4 rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] hover:ring-white/[0.10] hover:bg-[#101f38] transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Dumbbell size={16} className="text-blue-400" strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white/80 group-hover:text-white transition-colors">{t.nome}</p>
                    <p className="text-[11px] text-white/30">{t.exercicios?.length || 0} exercícios</p>
                  </div>
                </div>
                <ArrowUpRight size={15} className="text-white/20 group-hover:text-white/50 transition-colors" />
              </Link>
            ))
          )}
        </div>
      )}

      {aba === 'avaliacoes' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setNovaAval(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-[12px] font-semibold text-white transition-all shadow-lg shadow-green-900/20">
              <Plus size={13} /> Nova avaliação
            </button>
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
            Peso: av.medidas?.peso ? parseFloat(av.medidas.peso) : undefined,
            '%Gordura': av.medidas?.bf ? parseFloat(av.medidas.bf) : undefined,
            'Massa Magra': av.medidas?.mm ? parseFloat(av.medidas.mm) : undefined,
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
              <table className="w-full">
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
                    return (
                      <tr key={av.id} className={`border-b border-white/[0.03] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                        <td className="px-4 py-3 text-[12px] text-white/50">{data}</td>
                        <td className="px-4 py-3 text-[13px] font-semibold text-white/80">{fmt(av.medidas?.peso)}</td>
                        <td className="px-4 py-3"><DeltaBadge val={delta(av.medidas?.peso, prev?.medidas?.peso)} inverted={false} /></td>
                        <td className="px-4 py-3 text-[13px] font-semibold text-white/80">{fmt(av.medidas?.bf)}</td>
                        <td className="px-4 py-3"><DeltaBadge val={delta(av.medidas?.bf, prev?.medidas?.bf)} inverted={true} /></td>
                        <td className="px-4 py-3 text-[13px] font-semibold text-white/80">{fmt(av.medidas?.mm)}</td>
                        <td className="px-4 py-3"><DeltaBadge val={delta(av.medidas?.mm, prev?.medidas?.mm)} inverted={false} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

function AcordiaoCarga({ nome, entradas }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
      <button onClick={() => setAberto(o => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Weight size={14} className="text-indigo-400" />
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
                  {series.length > 0 ? series.map((s, si) => (
                    <span key={si} className="text-[11px] px-2 py-1 rounded-lg bg-white/[0.05] text-white/55 font-mono">
                      {s.reps ? `${s.reps}x` : ''}{s.carga ? ` ${s.carga}kg` : (s.peso ? ` ${s.peso}kg` : '')}
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
