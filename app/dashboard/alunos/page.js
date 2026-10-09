'use client';
import { calcStatus, baseAvaliacao, infoAvaliacao } from '@/lib/statusAluno';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { buscarAlunos, criarAluno } from '@/lib/firestore';
import { Search, ArrowUpRight, Clock, XCircle, CheckCircle2, Filter, Plus, X, User, MessageCircle, ClipboardList } from 'lucide-react';
import FichaAluno from './FichaAlunoClient';
import { useToast } from '@/components/Toast';
import { usePersonal } from '@/lib/AuthContext';
import { ALUNOS_GRATIS, avaliarAssinatura } from '@/lib/assinatura';

function Badge({ tipo }) {
  const map = {
    online:     'bg-accent/15 text-accent ring-accent/20',
    presencial: 'bg-accent/15 text-accent ring-accent/20',
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
    tipoServico: 'presencial', plano: '', frequencia: '', vencimento: '', valor: '',
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
      <div className="w-full max-w-xl rounded-[22px] bg-[#141619] ring-1 ring-white/[0.08] overflow-hidden flex flex-col max-h-[90vh]">
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
                    className="w-full px-3 py-2.5 rounded-[14px] bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-accent/60 transition-all placeholder-white/20" />
                </div>
              ))}
              <div>
                <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Tipo de serviço</label>
                <select value={form.tipoServico} onChange={e => set('tipoServico', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[14px] bg-white/[0.04] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-accent/60 transition-all">
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
                { k: 'valor',       label: 'Valor mensal (R$)',    type: 'number', col: 1 },
              ].map(({ k, label, type, col, placeholder }) => (
                <div key={k} className={col === 2 ? 'col-span-2' : ''}>
                  <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">{label}</label>
                  <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={placeholder}
                    className="w-full px-3 py-2.5 rounded-[14px] bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-accent/60 transition-all placeholder-white/20" />
                </div>
              ))}
            </div>
          </div>
          <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2">
            <button type="button" onClick={onFechar} className="px-4 py-2 rounded-[14px] border border-white/[0.08] text-[13px] text-white/50 hover:text-white hover:border-white/15 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-[14px] bg-accent hover:bg-accent-hover text-[13px] font-semibold text-on-accent disabled:opacity-40 transition-all shadow-lg shadow-black/30">
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
  const router       = useRouter();
  const personal     = usePersonal();

  const [alunos,   setAlunos]   = useState([]);
  const [busca,    setBusca]    = useState('');
  // Lê o filtro inicial da URL (?filtro=vencendo|inadimplentes) — os cards do
  // dashboard linkam pra cá com esse parâmetro; sem isso a página sempre
  // abria em "todos", ignorando de onde o personal veio.
  // Os cards do Início linkam com ?filtro=vencendo|inadimplentes e valem pra TODOS os alunos,
  // então nesse caso o segmento abre em "Todos". Sem parâmetro abre em Personal, como o app.
  const filtroUrl = searchParams.get('filtro');
  const [seg,      setSeg]      = useState(filtroUrl ? 'todos' : 'presencial');
  const [statusF,  setStatusF]  = useState(filtroUrl === 'vencendo' ? 'vencendo' : filtroUrl === 'inadimplentes' ? 'pendente' : 'todos');
  const [loading,  setLoading]  = useState(true);
  const [novoModal,setNovoModal]= useState(false);

  const carregar = () => buscarAlunos().then(setAlunos).finally(() => setLoading(false));
  useEffect(() => { if (!alunoId) carregar(); }, [alunoId]);

  if (alunoId) return <FichaAluno />;

  const hoje = new Date();

  // Mesmas regras da lista do app: segmento (Personal / Consultoria / Inativos) e, por cima,
  // o filtro de status com o MESMO calcStatus do Início e dos chips.
  const noSegmento = (a) => {
    if (seg === 'inativos')   return a.ativo === false;
    if (seg === 'presencial') return a.ativo !== false && a.tipoServico !== 'online';
    if (seg === 'online')     return a.ativo !== false && a.tipoServico === 'online';
    return true;
  };
  const doSegmento = alunos
    .filter(noSegmento)
    .filter(a => !busca.trim() || (a.nome || '').toLowerCase().includes(busca.toLowerCase()) || (a.telefone || '').includes(busca));
  const contSeg = {
    todos: alunos.length,
    presencial: alunos.filter(a => a.ativo !== false && a.tipoServico !== 'online').length,
    online: alunos.filter(a => a.ativo !== false && a.tipoServico === 'online').length,
    inativos: alunos.filter(a => a.ativo === false).length,
  };
  const contStatus = { todos: doSegmento.length, vencendo: 0, pendente: 0 };
  doSegmento.forEach(a => { const st = calcStatus(a); if (st === 'vencendo') contStatus.vencendo++; else if (st === 'pendente') contStatus.pendente++; });
  const statusAlvo = seg === 'inativos' || statusF === 'todos' ? null : statusF;
  const filtrados = (statusAlvo ? doSegmento.filter(a => calcStatus(a) === statusAlvo) : doSegmento)
    .sort((x, y) => (x.nome || '').localeCompare(y.nome || '', 'pt-BR'));

  const STATUS_CHIP = {
    ativo:    { label: 'Ativo',    cls: 'bg-white/[0.07] text-white/60' },
    vencendo: { label: 'Vencendo', cls: 'bg-amber-500/15 text-amber-400' },
    pendente: { label: 'Atrasado', cls: 'bg-red-500/15 text-red-400' },
  };
  const iniciaisDe = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  const resumoAgenda = (a) => {
    const dias = (a.agendaSemanal?.length ? a.agendaSemanal.map(e => e.dia) : (a.dias || [])).join(', ');
    return [dias, a.horario].filter(Boolean).join(' ') || 'Sem horário';
  };
  const telWpp = (t) => { const d = String(t || '').replace(/\D/g, ''); return d ? (d.length <= 11 ? '55' + d : d) : ''; };

  // Bloqueio do plano grátis: ao clicar em "Novo aluno" já no limite (3) sem
  // assinatura liberada, manda pra tela de assinatura em vez de criar o 4º.
  const alunosAtivos  = alunos.filter(a => a.ativo !== false).length;
  const bloqueadoNovo = personal && personal.admin !== true
    && alunosAtivos >= ALUNOS_GRATIS
    && !avaliarAssinatura(personal.assinatura).liberado;

  function novoAluno() {
    if (bloqueadoNovo) {
      toast(`Plano grátis: até ${ALUNOS_GRATIS} alunos. Assine para adicionar mais.`, 'error');
      router.push('/dashboard/assinatura');
      return;
    }
    setNovoModal(true);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
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
          <h1 className="text-[22px] font-semibold text-white tracking-tight font-display">Alunos</h1>
          <p className="text-[12px] text-white/35 mt-0.5">{alunos.length} aluno{alunos.length !== 1 ? 's' : ''} cadastrado{alunos.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={novoAluno}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-accent hover:bg-accent-hover text-[13px] font-semibold text-on-accent transition-all shadow-lg shadow-black/30">
          <Plus size={14} /> Novo aluno
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex items-center gap-1 bg-white/[0.04] rounded-[14px] p-1">
          {[
            { key: 'presencial', label: 'Personal' },
            { key: 'online',     label: 'Consultoria' },
            { key: 'inativos',   label: 'Inativos' },
            { key: 'todos',      label: 'Todos' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setSeg(key)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${seg === key ? 'bg-white/[0.08] text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}>
              {label}<span className={`ml-1.5 text-[10px] ${seg === key ? 'text-accent' : 'text-white/25'}`}>{contSeg[key]}</span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Pesquisar por nome ou telefone"
            className="pl-8 pr-4 py-2 w-64 rounded-[14px] bg-white/[0.05] border border-white/[0.07] text-white placeholder-white/25 text-[13px] focus:outline-none focus:border-accent/50 transition-all" />
        </div>
      </div>
      {seg !== 'inativos' && (
        <div className="flex items-center gap-1 bg-white/[0.04] rounded-[14px] p-1 w-fit mb-5">
          {[
            { key: 'todos',    label: 'Todos' },
            { key: 'vencendo', label: 'Vencendo' },
            { key: 'pendente', label: 'Atrasados' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setStatusF(key)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${statusF === key ? 'bg-white/[0.08] text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}>
              {label}<span className={`ml-1.5 text-[10px] ${statusF === key ? 'text-accent' : 'text-white/25'}`}>{contStatus[key]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="rounded-[22px] bg-[#141619] ring-1 ring-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
        {filtrados.map(a => {
          const st = calcStatus(a);
          const chip = STATUS_CHIP[st] || STATUS_CHIP.ativo;
          const ehOnline = a.tipoServico === 'online';
          const infoAv = infoAvaliacao(baseAvaliacao(a));
          const mostrarAv = infoAv.status === 'vencendo' || infoAv.status === 'vencida' || infoAv.status === 'sem';
          const corAv = infoAv.status === 'vencida' ? 'text-red-400' : infoAv.status === 'vencendo' ? 'text-amber-400' : 'text-white/35';
          const textoAv = infoAv.status === 'sem' ? (ehOnline ? 'Sem fotos' : 'Sem avaliação')
            : infoAv.status === 'vencida' ? `${ehOnline ? 'Fotos atrasadas' : 'Avaliação atrasada'} ${infoAv.dias}d`
            : ehOnline ? `Fotos em ${infoAv.dias} dia${infoAv.dias !== 1 ? 's' : ''}` : `Avaliar em ${infoAv.dias} dia${infoAv.dias !== 1 ? 's' : ''}`;
          const wpp = telWpp(a.telefone);
          return (
            <div key={a.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.025] transition-colors">
              <Link href={`/dashboard/alunos?id=${a.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                <div className="relative w-11 h-11 rounded-full bg-surface-2 flex items-center justify-center text-[13px] font-display font-semibold text-ink shrink-0 overflow-hidden">
                  {a.fotoPerfil ? <img src={a.fotoPerfil} alt="" className="w-full h-full object-cover" /> : iniciaisDe(a.nome)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold text-white/85 truncate">{a.nome}</p>
                    {ehOnline && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/12 text-accent">Online</span>}
                  </div>
                  <p className="text-[12px] text-white/40 truncate">{a.objetivo || 'Sem objetivo'} · {ehOnline ? 'Online' : resumoAgenda(a)}</p>
                  {mostrarAv && (
                    <p className={`flex items-center gap-1 text-[11px] mt-0.5 ${corAv}`}><ClipboardList size={11} />{textoAv}</p>
                  )}
                </div>
              </Link>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${a.ativo === false ? 'bg-white/[0.05] text-white/40' : chip.cls}`}>{a.ativo === false ? 'Inativo' : chip.label}</span>
              {wpp && (
                <a href={`https://wa.me/${wpp}`} target="_blank" rel="noopener noreferrer" title="Abrir conversa no WhatsApp"
                  className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-white/55 hover:text-white transition-all shrink-0"><MessageCircle size={16} /></a>
              )}
            </div>
          );
        })}
        {filtrados.length === 0 && (
          <div className="px-6 py-16 text-center">
            <User size={28} className="text-white/10 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-[13px] text-white/25">{busca ? 'Nenhum aluno encontrado.' : alunos.length === 0 ? 'Nenhum aluno cadastrado ainda.' : 'Nenhum aluno neste filtro.'}</p>
            {!busca && alunos.length === 0 && (
              <button onClick={novoAluno}
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-[14px] bg-accent hover:bg-accent-hover text-[12px] font-semibold text-on-accent transition-all">
                <Plus size={13} /> Novo aluno
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
