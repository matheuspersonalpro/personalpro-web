'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  buscarSessoes, buscarAlunos, criarSessao, atualizarSessao, excluirSessao,
  buscarPresencasDia, registrarPresenca,
  buscarFeriasPendentes, atualizarStatusFerias, aprovarFeriasEEstenderPlano, atualizarAluno,
  criarSlotLivre, buscarSlotsLivres, deletarSlotLivre, buscarSolicitacoesReposicao,
  criarTrocaHorario, buscarTrocasHorario, deletarTrocaHorario,
  buscarConfigApp, salvarConfigApp,
} from '@/lib/firestore';
import {
  Plus, X, ChevronLeft, ChevronRight, Check, ArrowLeftRight, Umbrella,
  Clock, CheckCircle2, XCircle, AlertCircle, Trash2, ExternalLink,
  Calendar, RefreshCcw,
} from 'lucide-react';
import { useToast } from '@/components/Toast';

const DIAS_LABEL  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_CURTO  = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const HORARIOS    = Array.from({ length: 17 }, (_, i) => `${String(i + 5).padStart(2,'0')}:00`);
const DIAS_OPCOES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const STATUS_MAP  = {
  agendado:  { label:'Agendado',  cls:'bg-blue-500/15 text-blue-400 ring-blue-500/20',   icon:Clock },
  realizado: { label:'Realizado', cls:'bg-green-500/15 text-green-400 ring-green-500/20', icon:CheckCircle2 },
  faltou:    { label:'Faltou',    cls:'bg-red-500/15 text-red-400 ring-red-500/20',       icon:XCircle },
  cancelado: { label:'Cancelado', cls:'bg-white/[0.05] text-white/30 ring-white/[0.08]', icon:AlertCircle },
};

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getMondayOfWeek(offset = 0) {
  const hoje = new Date();
  const dow  = hoje.getDay();
  const seg  = new Date(hoje);
  seg.setDate(hoje.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  seg.setHours(0,0,0,0);
  return seg;
}
function semanaLabel(seg) {
  const fim = new Date(seg); fim.setDate(fim.getDate() + 5);
  return `${seg.getDate()}/${seg.getMonth()+1} – ${fim.getDate()}/${fim.getMonth()+1}`;
}
function getMondayISO(date = new Date()) {
  const d = new Date(date); const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1)); d.setHours(0,0,0,0);
  return toISO(d);
}

function SessaoModal({ sessao, alunos, onSalvo, onFechar }) {
  const toast = useToast();
  const [form, setForm] = useState({
    alunoId: sessao?.alunoId || '',
    data: sessao?.data || toISO(new Date()),
    horario: sessao?.horario || '',
    tipo: sessao?.tipo || 'normal',
    status: sessao?.status || 'agendado',
    observacoes: sessao?.observacoes || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  async function salvar(e) {
    e.preventDefault();
    if (!form.alunoId) { toast('Selecione um aluno.', 'error'); return; }
    setSaving(true);
    try {
      if (sessao?.id) await atualizarSessao(sessao.id, form);
      else await criarSessao(form);
      toast(sessao?.id ? 'Sessão atualizada.' : 'Sessão agendada.');
      onSalvo();
    } catch { toast('Erro ao salvar.', 'error'); } finally { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-bold text-white">{sessao?.id ? 'Editar sessão' : 'Nova sessão'}</h2>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all"><X size={16} /></button>
        </div>
        <form onSubmit={salvar} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Aluno *</label>
            <select value={form.alunoId} onChange={e => set('alunoId', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
              <option value="">Selecione...</option>
              {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
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
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
                <option value="normal">Normal</option>
                <option value="avaliacao">Avaliação</option>
                <option value="reposicao">Reposição</option>
                <option value="experimental">Experimental</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
                {Object.entries(STATUS_MAP).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Observações</label>
            <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onFechar} className="px-4 py-2 rounded-xl border border-white/[0.08] text-[13px] text-white/50 hover:text-white transition-all">Cancelar</button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white disabled:opacity-40 transition-all">
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
  const [alunos,        setAlunos]        = useState([]);
  const [sessoes,       setSessoes]       = useState([]);
  const [ferias,        setFerias]        = useState([]);
  const [slots,         setSlots]         = useState([]);
  const [solicitacoes,  setSolicitacoes]  = useState([]);
  const [trocas,        setTrocas]        = useState([]);
  const [presencas,     setPresencas]     = useState({});
  const [loading,       setLoading]       = useState(true);

  // Semana
  const [weekOffset, setWeekOffset] = useState(0);
  const seg = getMondayOfWeek(weekOffset);
  const diasSemana = Array.from({ length: 6 }, (_, i) => { const d = new Date(seg); d.setDate(seg.getDate() + i); return d; });
  const hojeISO = toISO(new Date());
  const [diaSel, setDiaSel] = useState(() => {
    const idx = diasSemana.findIndex(d => toISO(d) === hojeISO);
    return idx >= 0 ? idx : 0;
  });

  // Modais
  const [modal,        setModal]        = useState(null);
  const [modalSlot,    setModalSlot]    = useState(false);
  const [modalTroca,   setModalTroca]   = useState(false);
  const [modalFerias,  setModalFerias]  = useState(false);
  const [modalGoogle,  setModalGoogle]  = useState(false);

  // Slot form
  const [slotTipo,    setSlotTipo]    = useState('recorrente');
  const [slotDia,     setSlotDia]     = useState('Qua');
  const [slotHorario, setSlotHorario] = useState('08:00');
  const [slotData,    setSlotData]    = useState('');
  const [salvandoSlot, setSalvandoSlot] = useState(false);

  // Troca form
  const [trocaAlunoA, setTrocaAlunoA] = useState(null);
  const [trocaAlunoB, setTrocaAlunoB] = useState(null);
  const [trocaSemanaIso, setTrocaSemanaIso] = useState(getMondayISO());
  const [salvandoTroca, setSalvandoTroca] = useState(false);

  // Férias personal
  const [feriasInicio, setFeriasInicio] = useState('');
  const [feriasFim,    setFeriasFim]    = useState('');
  const [aplicandoF,   setAplicandoF]   = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [a, s, f, sl, sol, tr] = await Promise.all([
        buscarAlunos(), buscarSessoes(), buscarFeriasPendentes(),
        buscarSlotsLivres(), buscarSolicitacoesReposicao(), buscarTrocasHorario(),
      ]);
      setAlunos(a); setSessoes(s); setFerias(f);
      setSlots(sl); setSolicitacoes(sol); setTrocas(tr);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Presenças do dia selecionado
  useEffect(() => {
    const iso = toISO(diasSemana[diaSel]);
    buscarPresencasDia(iso).then(lista => {
      const mapa = {}; lista.forEach(p => { mapa[p.alunoId] = p.presente; });
      setPresencas(mapa);
    }).catch(() => {});
  }, [diaSel, weekOffset]);

  const diaAtualISO = toISO(diasSemana[diaSel]);
  const ehHoje = diaAtualISO === hojeISO;

  // Sessões do dia
  const getTrocaAtiva = (alunoId) => trocas.find(t => t.semanaIso === getMondayISO(diasSemana[diaSel]) && (t.alunoA_id === alunoId || t.alunoB_id === alunoId));

  const sessoesNoDia = alunos
    .filter(a => a.tipoServico !== 'online')
    .map(a => {
      const troca = getTrocaAtiva(a.id);
      const diasA = a.agendaSemanal?.length ? a.agendaSemanal.map(e => e.dia) : (a.dias || []);
      const horarioA = a.agendaSemanal?.length ? (a.agendaSemanal.find(e => e.dia === DIAS_LABEL[diasSemana[diaSel].getDay()])?.horario || a.horario || '—') : (a.horario || '—');
      if (troca) {
        const dias = troca.alunoA_id === a.id ? troca.alunoB_dias : troca.alunoA_dias;
        const hor  = troca.alunoA_id === a.id ? troca.alunoB_horario : troca.alunoA_horario;
        return { alunoId: a.id, aluno: a.nome, objetivo: a.objetivo, horario: hor || '—', dias, isTroca: true };
      }
      return { alunoId: a.id, aluno: a.nome, objetivo: a.objetivo, horario: horarioA, dias: diasA, isTroca: false };
    })
    .filter(s => Array.isArray(s.dias) && s.dias.includes(DIAS_LABEL[diasSemana[diaSel].getDay()]))
    .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));

  const sessoesAgendadas = sessoes
    .filter(s => s.data === diaAtualISO)
    .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));

  async function togglePresenca(alunoId, alunoNome) {
    if (!ehHoje) { toast('A presença só pode ser confirmada hoje.', 'error'); return; }
    const novoEstado = !presencas[alunoId];
    setPresencas(p => ({ ...p, [alunoId]: novoEstado }));
    try { await registrarPresenca(alunoId, diaAtualISO, novoEstado); }
    catch { setPresencas(p => ({ ...p, [alunoId]: !novoEstado })); toast('Erro ao registrar presença.', 'error'); }
  }

  async function aprovarFerias(feria) {
    const aluno = alunos.find(a => a.id === feria.alunoId);
    if (!aluno?.vencimento) { toast('Aluno sem vencimento cadastrado.', 'error'); return; }
    if (!window.confirm(`Aprovar ${feria.dias} dia(s) de férias de ${aluno.nome}?\n\nO plano será estendido a partir de ${aluno.vencimento}.`)) return;
    try {
      const novoVenc = await aprovarFeriasEEstenderPlano(feria.id, feria.alunoId, feria.dias, aluno.vencimento);
      toast(`Férias aprovadas — novo vencimento: ${novoVenc}`);
      carregar();
    } catch (e) { toast(e.message || 'Erro ao aprovar.', 'error'); }
  }

  async function recusarFerias(feria) {
    try { await atualizarStatusFerias(feria.id, 'recusada'); carregar(); } catch {}
  }

  async function adicionarSlot() {
    setSalvandoSlot(true);
    try {
      if (slotTipo === 'especifico') {
        if (!slotData) { toast('Selecione a data.', 'error'); return; }
        const diaSemanaLabel = DIAS_LABEL[new Date(slotData + 'T00:00:00').getDay()];
        await criarSlotLivre({ diaSemana: diaSemanaLabel, horario: slotHorario, tipo: 'especifico', data: slotData });
      } else {
        await criarSlotLivre({ diaSemana: slotDia, horario: slotHorario, tipo: 'recorrente' });
      }
      setModalSlot(false); setSlotData(''); setSlotTipo('recorrente'); setSlotHorario('08:00');
      carregar(); toast('Horário adicionado.');
    } catch { toast('Erro ao salvar horário.', 'error'); } finally { setSalvandoSlot(false); }
  }

  async function removerSlot(slot) {
    if (!window.confirm(`Remover ${slot.tipo==='especifico' ? slot.data : slot.diaSemana} às ${slot.horario}?`)) return;
    try { await deletarSlotLivre(slot.id); carregar(); } catch { toast('Erro ao remover.', 'error'); }
  }

  const semanas4 = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i * 7);
    return { iso: getMondayISO(d), label: i === 0 ? 'Esta semana' : `Próxima${i > 1 ? ' '+i+'ª' : ''} semana` };
  });

  async function confirmarTroca() {
    if (!trocaAlunoA || !trocaAlunoB) { toast('Selecione os dois alunos.', 'error'); return; }
    setSalvandoTroca(true);
    try {
      await criarTrocaHorario({
        alunoA_id: trocaAlunoA.id, alunoA_nome: trocaAlunoA.nome, alunoA_dias: trocaAlunoA.dias||[], alunoA_horario: trocaAlunoA.horario||'',
        alunoB_id: trocaAlunoB.id, alunoB_nome: trocaAlunoB.nome, alunoB_dias: trocaAlunoB.dias||[], alunoB_horario: trocaAlunoB.horario||'',
        semanaIso: trocaSemanaIso,
      });
      setModalTroca(false); setTrocaAlunoA(null); setTrocaAlunoB(null);
      carregar(); toast(`Troca criada: ${trocaAlunoA.nome} ↔ ${trocaAlunoB.nome}`);
    } catch { toast('Erro ao criar troca.', 'error'); } finally { setSalvandoTroca(false); }
  }

  async function cancelarTroca(troca) {
    if (!window.confirm(`Cancelar troca entre ${troca.alunoA_nome} ↔ ${troca.alunoB_nome}?`)) return;
    try { await deletarTrocaHorario(troca.id); carregar(); } catch {}
  }

  async function aplicarFeriasPersonal() {
    if (!feriasInicio || !feriasFim) { toast('Selecione o período de férias.', 'error'); return; }
    const toDate = s => { const [d,m,a] = s.split('-').map(Number); return new Date(a,m-1,d); };
    const numDias = Math.round((toDate(feriasFim) - toDate(feriasInicio)) / 86400000) + 1;
    if (numDias <= 0) { toast('Período inválido.', 'error'); return; }
    const presenciais = alunos.filter(a => a.ativo !== false && a.tipoServico !== 'online');
    if (!window.confirm(`Aplicar ${numDias} dia(s) de férias a ${presenciais.length} aluno(s) presencial(is)? Os planos serão estendidos automaticamente.`)) return;
    setAplicandoF(true);
    try {
      const pad = n => String(n).padStart(2,'0');
      const fmt = d => `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
      for (const aluno of presenciais) {
        try {
          let base = aluno.vencimento ? (() => { const [d,m,a] = aluno.vencimento.split('/').map(Number); return new Date(a,m-1,d); })() : new Date();
          base.setDate(base.getDate() + numDias);
          await atualizarAluno(aluno.id, { vencimento: fmt(base) });
        } catch {}
      }
      setModalFerias(false); setFeriasInicio(''); setFeriasFim('');
      carregar(); toast(`Férias aplicadas — ${numDias} dia(s) acrescidos a ${presenciais.length} aluno(s).`);
    } catch { toast('Erro ao aplicar férias.', 'error'); } finally { setAplicandoF(false); }
  }

  function gerarURLGoogleAgenda(a) {
    const pad = n => String(n).padStart(2,'0');
    const DIA_JS = { Dom:0, Seg:1, Ter:2, Qua:3, Qui:4, Sex:5, 'Sáb':6 };
    const DIA_BY = { Dom:'SU', Seg:'MO', Ter:'TU', Qua:'WE', Qui:'TH', Sex:'FR', 'Sáb':'SA' };
    const dias = a.dias || []; const hora = a.horario || '07:00';
    if (!dias.length) return null;
    const [h, m] = (hora).split(':').map(Number);
    const hoje = new Date(); const alvoJS = DIA_JS[dias[0]] ?? 1;
    const diff = (alvoJS - hoje.getDay() + 7) % 7;
    const inicio = new Date(hoje); inicio.setDate(hoje.getDate() + diff); inicio.setHours(h, m, 0, 0);
    const fim = new Date(inicio); fim.setHours(h + 1, m, 0, 0);
    const fmt = d => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    const byday = dias.map(d => DIA_BY[d]).filter(Boolean).join(',');
    const params = [`action=TEMPLATE`, `text=${encodeURIComponent(`Treino — ${a.nome}`)}`, `dates=${fmt(inicio)}/${fmt(fim)}`, `recur=${encodeURIComponent(`RRULE:FREQ=WEEKLY;BYDAY=${byday}`)}`].join('&');
    return `https://calendar.google.com/calendar/render?${params}`;
  }

  const trocasSemanaAtual = trocas.filter(t => t.semanaIso === getMondayISO());

  return (
    <div className="px-8 pt-8 pb-8 max-w-[1200px] mx-auto w-full">

      {/* Modais */}
      {modal && (
        <SessaoModal sessao={modal.sessao} alunos={alunos}
          onSalvo={() => { setModal(null); carregar(); }} onFechar={() => setModal(null)} />
      )}

      {/* Modal Slot Livre */}
      {modalSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold text-white">Novo horário livre</h2>
              <button onClick={() => setModalSlot(false)} className="p-1.5 text-white/40 hover:text-white transition-all"><X size={16} /></button>
            </div>
            <p className="text-[12px] text-white/40 mb-4">Disponível para alunos solicitarem reposição</p>
            <div className="flex gap-2 mb-4">
              {[['recorrente','Recorrente'],['especifico','Data específica']].map(([v,l]) => (
                <button key={v} onClick={() => setSlotTipo(v)} className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all ${slotTipo===v ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30' : 'bg-white/[0.04] text-white/40 hover:text-white'}`}>{l}</button>
              ))}
            </div>
            {slotTipo === 'recorrente' ? (
              <div className="mb-4">
                <p className="text-[11px] text-white/40 mb-2">Dia da semana</p>
                <div className="flex flex-wrap gap-2">
                  {DIAS_OPCOES.map(d => (
                    <button key={d} onClick={() => setSlotDia(d)} className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all ${slotDia===d ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30' : 'bg-white/[0.04] text-white/40 hover:text-white'}`}>{d}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-[11px] text-white/40 mb-2">Data</p>
                <input type="date" value={slotData} onChange={e => setSlotData(e.target.value)} min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all" />
              </div>
            )}
            <p className="text-[11px] text-white/40 mb-2">Horário</p>
            <div className="max-h-40 overflow-y-auto rounded-xl ring-1 ring-white/[0.06] mb-4">
              {HORARIOS.map(h => (
                <button key={h} onClick={() => setSlotHorario(h)} className={`w-full flex items-center justify-between px-4 py-2.5 text-[13px] transition-all ${slotHorario===h ? 'bg-blue-600/20 text-blue-400' : 'text-white/60 hover:bg-white/[0.04]'}`}>
                  {h} {slotHorario===h && <Check size={13} />}
                </button>
              ))}
            </div>
            <button onClick={adicionarSlot} disabled={salvandoSlot} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-bold text-white disabled:opacity-40 transition-all">
              {salvandoSlot ? 'Salvando...' : 'Salvar horário'}
            </button>
          </div>
        </div>
      )}

      {/* Modal Troca de Horários */}
      {modalTroca && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h2 className="text-[15px] font-bold text-white flex items-center gap-2"><ArrowLeftRight size={16} className="text-blue-400" /> Troca de Horário</h2>
              <button onClick={() => setModalTroca(false)} className="p-1.5 text-white/40 hover:text-white transition-all"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4">
              <p className="text-[12px] text-white/40">Os alunos se revezam nos horários apenas na semana selecionada.</p>
              <div>
                <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">Semana</p>
                <div className="flex gap-2 flex-wrap">
                  {semanas4.map(s => (
                    <button key={s.iso} onClick={() => setTrocaSemanaIso(s.iso)} className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${trocaSemanaIso===s.iso ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30' : 'bg-white/[0.04] text-white/40 hover:text-white'}`}>{s.label}</button>
                  ))}
                </div>
              </div>
              {[['A',trocaAlunoA,setTrocaAlunoA],['B',trocaAlunoB,setTrocaAlunoB]].map(([letra,sel,setSel]) => (
                <div key={letra}>
                  <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">Aluno {letra}</p>
                  <div className="max-h-32 overflow-y-auto rounded-xl ring-1 ring-white/[0.06]">
                    {alunos.filter(a => a.tipoServico !== 'online' && a.dias?.length && a.id !== (letra==='B' ? trocaAlunoA?.id : null)).map(a => (
                      <button key={a.id} onClick={() => setSel(a)} className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-all ${sel?.id===a.id ? 'bg-blue-600/20 text-blue-400' : 'text-white/70 hover:bg-white/[0.04]'}`}>
                        <span className="text-[12px] font-semibold">{a.nome}</span>
                        <span className="text-[11px] text-white/35">{(a.dias||[]).join(', ')} · {a.horario}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {trocaAlunoA && trocaAlunoB && (
                <div className="rounded-xl bg-blue-500/[0.08] ring-1 ring-blue-500/20 p-3">
                  <p className="text-[11px] font-semibold text-blue-400 mb-2">Prévia:</p>
                  <p className="text-[12px] text-white/70">{trocaAlunoA.nome} → {(trocaAlunoB.dias||[]).join(', ')} às {trocaAlunoB.horario}</p>
                  <p className="text-[12px] text-white/70 mt-1">{trocaAlunoB.nome} → {(trocaAlunoA.dias||[]).join(', ')} às {trocaAlunoA.horario}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-white/[0.06]">
              <button onClick={confirmarTroca} disabled={salvandoTroca || !trocaAlunoA || !trocaAlunoB} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-bold text-white disabled:opacity-40 transition-all">
                {salvandoTroca ? 'Criando...' : 'Confirmar troca'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Férias Personal */}
      {modalFerias && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold text-white flex items-center gap-2"><Umbrella size={16} className="text-blue-400" /> Minhas Férias</h2>
              <button onClick={() => setModalFerias(false)} className="p-1.5 text-white/40 hover:text-white"><X size={16} /></button>
            </div>
            <p className="text-[12px] text-white/40 mb-4">Os planos de todos os alunos presenciais serão estendidos automaticamente.</p>
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">Período</p>
            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <p className="text-[10px] text-white/30 mb-1">Início</p>
                <input type="date" value={feriasInicio} onChange={e => setFeriasInicio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-white/30 mb-1">Fim</p>
                <input type="date" value={feriasFim} onChange={e => setFeriasFim(e.target.value)} min={feriasInicio}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all" />
              </div>
            </div>
            {feriasInicio && feriasFim && (
              <div className="mb-4 p-3 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06]">
                <p className="text-[12px] text-white/60">{feriasInicio} → {feriasFim} · {Math.round((new Date(feriasFim)-new Date(feriasInicio))/86400000)+1} dias</p>
              </div>
            )}
            <button onClick={aplicarFeriasPersonal} disabled={!feriasInicio || !feriasFim || aplicandoF}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-bold text-white disabled:opacity-40 transition-all">
              {aplicandoF ? 'Aplicando...' : 'Aplicar a todos os alunos'}
            </button>
          </div>
        </div>
      )}

      {/* Modal Google Agenda */}
      {modalGoogle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold text-white flex items-center gap-2"><Calendar size={16} className="text-blue-400" /> Google Agenda</h2>
              <button onClick={() => setModalGoogle(false)} className="p-1.5 text-white/40 hover:text-white"><X size={16} /></button>
            </div>
            <p className="text-[12px] text-white/40 mb-4">Clique num aluno para criar o evento recorrente no Google Calendar.</p>
            <div className="overflow-y-auto space-y-1 flex-1">
              {alunos.filter(a => a.tipoServico !== 'online' && a.dias?.length && a.horario).map(a => {
                const url = gerarURLGoogleAgenda(a);
                return (
                  <a key={a.id} href={url || '#'} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/[0.04] transition-all group">
                    <div>
                      <p className="text-[13px] font-semibold text-white/80 group-hover:text-white">{a.nome}</p>
                      <p className="text-[11px] text-white/35">{(a.dias||[]).join(', ')} · {a.horario}</p>
                    </div>
                    <ExternalLink size={14} className="text-blue-400/60 group-hover:text-blue-400" />
                  </a>
                );
              })}
              {alunos.filter(a => a.tipoServico !== 'online' && a.dias?.length && a.horario).length === 0 && (
                <p className="text-[12px] text-white/30 text-center py-6">Nenhum aluno com dias e horário configurados.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-white">Agenda</h1>
          <p className="text-[12px] text-white/35 mt-0.5">
            Semana {semanaLabel(seg)} · {sessoesAgendadas.length} sessão{sessoesAgendadas.length !== 1 ? 'ões' : ''} agendada{sessoesAgendadas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setModalGoogle(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-blue-400 ring-1 ring-blue-500/20 bg-blue-500/[0.08] hover:bg-blue-500/[0.15] transition-all">
            <Calendar size={13} /> Agenda
          </button>
          <button onClick={() => setModalTroca(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-blue-400 ring-1 ring-blue-500/20 bg-blue-500/[0.08] hover:bg-blue-500/[0.15] transition-all">
            <ArrowLeftRight size={13} /> Trocar
          </button>
          <button onClick={() => setModalFerias(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-blue-400 ring-1 ring-blue-500/20 bg-blue-500/[0.08] hover:bg-blue-500/[0.15] transition-all">
            <Umbrella size={13} /> Férias
          </button>
          <button onClick={() => setModal({ sessao: null })} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[12px] font-semibold text-white transition-all shadow-lg shadow-blue-900/30">
            <Plus size={13} /> Nova sessão
          </button>
        </div>
      </div>

      {/* Trocas ativas */}
      {trocasSemanaAtual.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {trocasSemanaAtual.map(t => (
            <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/[0.08] ring-1 ring-blue-500/20">
              <ArrowLeftRight size={12} className="text-blue-400" />
              <span className="text-[12px] text-blue-400 font-semibold">{t.alunoA_nome} ↔ {t.alunoB_nome}</span>
              <button onClick={() => cancelarTroca(t)} className="ml-1 text-white/25 hover:text-red-400 transition-colors"><X size={12} /></button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-[auto_1fr] gap-6">
        {/* Coluna esquerda — nav semana + dias */}
        <div className="w-[200px]">
          {/* Nav semana */}
          <div className="flex items-center gap-1 mb-4">
            <button onClick={() => setWeekOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all"><ChevronLeft size={15} /></button>
            <button onClick={() => setWeekOffset(0)} className={`flex-1 text-center py-1.5 rounded-lg text-[11px] font-medium transition-all ${weekOffset===0 ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/70'}`}>Hoje</button>
            <button onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all"><ChevronRight size={15} /></button>
          </div>
          {/* Dias */}
          <div className="space-y-1">
            {diasSemana.map((dia, i) => {
              const iso = toISO(dia);
              const ehH = iso === hojeISO;
              const sels = sessoes.filter(s => s.data === iso);
              return (
                <button key={iso} onClick={() => setDiaSel(i)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${diaSel===i ? 'bg-blue-600 text-white' : 'hover:bg-white/[0.04] text-white/60'}`}>
                  <span className={`text-[11px] font-semibold w-8 uppercase tracking-wide ${diaSel===i ? 'text-blue-100' : ehH ? 'text-blue-400' : 'text-white/40'}`}>{DIAS_CURTO[dia.getDay()]}</span>
                  <span className={`text-[16px] font-bold ${diaSel===i ? 'text-white' : ehH ? 'text-blue-400' : 'text-white/80'}`}>{dia.getDate()}</span>
                  {sels.length > 0 && <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${diaSel===i ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-blue-400'}`}>{sels.length}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Coluna direita — sessões do dia */}
        <div>
          {/* Título do dia */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-[15px] font-bold text-white">
                {DIAS_LABEL[diasSemana[diaSel].getDay()]}, {diasSemana[diaSel].getDate()} de {diasSemana[diaSel].toLocaleDateString('pt-BR', { month:'long' })}
              </h2>
              {!ehHoje && (
                <p className="text-[11px] text-amber-400 mt-0.5">⚠ Presença só pode ser confirmada hoje</p>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sessoesNoDia.length === 0 ? (
            <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-8 text-center">
              <p className="text-[13px] text-white/25">Nenhuma sessão neste dia</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessoesNoDia.map(s => {
                const presente = presencas[s.alunoId];
                return (
                  <div key={s.alunoId} className={`flex items-center gap-4 p-4 rounded-2xl ring-1 transition-all ${s.isTroca ? 'ring-blue-500/30 bg-blue-500/[0.04]' : 'ring-white/[0.06] bg-[#0d1b2e]'}`}>
                    <div className={`w-1 self-stretch rounded-full ${presente ? 'bg-green-400' : s.isTroca ? 'bg-blue-500' : 'bg-blue-600'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-white">{s.aluno}</p>
                        {s.isTroca && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">Troca</span>}
                      </div>
                      <p className="text-[11px] text-white/35 mt-0.5">{s.objetivo || 'Presencial'}</p>
                    </div>
                    <span className="text-[15px] font-bold text-blue-400">{s.horario}</span>
                    <button onClick={() => togglePresenca(s.alunoId, s.aluno)} disabled={!ehHoje}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${!ehHoje ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105'} ${presente ? 'bg-green-500/15 ring-1 ring-green-500/30 text-green-400' : 'text-white/25 hover:text-white/60'}`}>
                      {presente ? <CheckCircle2 size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-white/20" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sessões agendadas */}
          {sessoesAgendadas.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-2">Sessões agendadas</p>
              <div className="space-y-1.5">
                {sessoesAgendadas.map(s => {
                  const st = STATUS_MAP[s.status] || STATUS_MAP.agendado;
                  const Icon = st.icon;
                  const nomeAluno = alunos.find(a => a.id === s.alunoId)?.nome || s.alunoId;
                  return (
                    <div key={s.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl ring-1 group cursor-pointer hover:brightness-110 transition-all ${st.cls}`} onClick={() => setModal({ sessao: s })}>
                      <Icon size={14} />
                      <span className="text-[12px] font-semibold">{s.horario || '—'}</span>
                      <span className="text-[12px] flex-1">{nomeAluno}</span>
                      <span className="text-[11px] opacity-60">{st.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Seções inferiores */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        {/* Horários para reposição */}
        <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Horários livres ({slots.length})</p>
            <button onClick={() => setModalSlot(true)} className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-all">
              <Plus size={12} />
            </button>
          </div>
          {slots.length === 0 ? (
            <p className="text-[12px] text-white/25 text-center py-6">Nenhum horário livre</p>
          ) : (
            <div className="p-3 space-y-1.5">
              {slots.map(sl => (
                <div key={sl.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06]">
                  <div className="flex-1">
                    <p className="text-[12px] font-semibold text-white">{sl.tipo==='especifico' ? sl.data : sl.diaSemana} · {sl.horario}</p>
                    <p className="text-[10px] text-white/35">{sl.tipo==='especifico' ? 'Único' : 'Recorrente'}</p>
                  </div>
                  <button onClick={() => removerSlot(sl)} className="text-white/20 hover:text-red-400 transition-colors"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Férias pendentes */}
        <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.05]">
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Férias pendentes ({ferias.length})</p>
          </div>
          {ferias.length === 0 ? (
            <p className="text-[12px] text-white/25 text-center py-6">Nenhuma solicitação</p>
          ) : (
            <div className="p-3 space-y-2">
              {ferias.map(f => {
                const aluno = alunos.find(a => a.id === f.alunoId);
                return (
                  <div key={f.id} className="rounded-xl bg-blue-500/[0.06] ring-1 ring-blue-500/15 p-3">
                    <p className="text-[12px] font-semibold text-white">{aluno?.nome || 'Aluno'}</p>
                    <p className="text-[11px] text-white/40">{f.dataInicio} – {f.dataFim} · {f.dias} dias</p>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => aprovarFerias(f)} className="flex-1 py-1.5 rounded-lg bg-green-500/15 text-[11px] font-semibold text-green-400 hover:bg-green-500/25 transition-all">Aprovar</button>
                      <button onClick={() => recusarFerias(f)} className="flex-1 py-1.5 rounded-lg bg-white/[0.05] text-[11px] font-semibold text-white/50 hover:text-white transition-all">Recusar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reposições confirmadas */}
        <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.05]">
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Reposições ({solicitacoes.length})</p>
          </div>
          {solicitacoes.length === 0 ? (
            <p className="text-[12px] text-white/25 text-center py-6">Nenhuma reposição</p>
          ) : (
            <div className="p-3 space-y-2">
              {solicitacoes.map(sol => (
                <div key={sol.id} className="rounded-xl bg-blue-500/[0.06] ring-1 ring-blue-500/15 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">Confirmado</span>
                  </div>
                  <p className="text-[12px] font-semibold text-white">{sol.alunoNome}</p>
                  <p className="text-[11px] text-blue-400">{sol.diaSemana} às {sol.horario}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
