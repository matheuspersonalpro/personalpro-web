'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { buscarAlunos, buscarPagamentos, buscarSessoes, buscarConfigApp, salvarConfigApp, buscarFeriasPorStatus, atualizarStatusFerias, aprovarFeriasEEstenderPlano } from '@/lib/firestore';
import { usePersonal } from '@/lib/AuthContext';
import { Users, TrendingUp, AlertTriangle, Clock, ArrowUpRight, CheckCircle2, CalendarDays, Cake, MessageCircle, Megaphone, X, Percent, ChevronDown, Umbrella } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { valorNum, valorMensalAsaas, resumoFinanceiro } from '@/lib/financeiro';
import { calcStatus } from '@/lib/statusAluno';
import { alunosDeFeriasNoDia } from '@/lib/presencaAgenda';

const DIAS_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
function minutosDoHorario(h) {
  const m = /^(\d{1,2})\s*[:hH]\s*(\d{2})?/.exec(String(h || '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2] || 0) : null;
}

function KpiCard({ icon: Icon, label, value, sub, accent, href }) {
  const theme = {
    blue:  { wrap: 'ring-white/[0.06]',  icon: 'bg-white/[0.07] text-white/70' },
    green: { wrap: 'ring-accent/12', icon: 'bg-accent/12 text-accent' },
    amber: { wrap: 'ring-amber-500/12', icon: 'bg-amber-500/12 text-amber-400' },
    red:   { wrap: 'ring-red-500/12',   icon: 'bg-red-500/12 text-red-400' },
  };
  const t = theme[accent] || theme.blue;
  const conteudo = (
    <>
      <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center mb-5 ${t.icon}`}>
        <Icon size={18} strokeWidth={1.8} />
      </div>
      <p className="text-[32px] font-semibold text-white tracking-tight leading-none mb-2 font-display">{value}</p>
      <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest">{label}</p>
      {sub && <p className="text-[11px] text-white/25 mt-1.5 truncate">{sub}</p>}
    </>
  );
  // Cards do topo pareciam clicáveis (hover normal de botão) mas não levavam
  // a lugar nenhum — achado pelo dono. Agora, quando há `href`, o card inteiro
  // navega pra tela de alunos já com o filtro certo aplicado.
  if (href) {
    return (
      <Link href={href} className={`block rounded-[22px] bg-[#141619] ring-1 ${t.wrap} p-6 transition-colors hover:bg-[#1B1E23]`}>
        {conteudo}
      </Link>
    );
  }
  return (
    <div className={`rounded-[22px] bg-[#141619] ring-1 ${t.wrap} p-6`}>
      {conteudo}
    </div>
  );
}

function aniversarioInfo(dataNasc) {
  if (!dataNasc) return null;
  const partes = dataNasc.split('/');
  if (partes.length < 2) return null;
  const [dia, mes] = partes.map(Number);
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const ano = hoje.getFullYear();
  let aniv = new Date(ano, mes - 1, dia); aniv.setHours(0,0,0,0);
  if (aniv < hoje) aniv = new Date(ano + 1, mes - 1, dia);
  const diasAte = Math.round((aniv - hoje) / 86400000);
  return { diasAte, hoje: diasAte === 0 };
}

export default function DashboardPage() {
  const personal = usePersonal();
  const toast = useToast();
  const confirm = useConfirm();
  const [alunos,     setAlunos]     = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [sessoes,    setSessoes]    = useState([]);
  const [config,     setConfig]     = useState({});
  const [ferias,     setFerias]     = useState([]);
  const [feriasAprovadas, setFeriasAprovadas] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [aprovandoId, setAprovandoId] = useState(null);

  // Aviso
  const [showAviso,   setShowAviso]   = useState(false);
  const [textoAviso,  setTextoAviso]  = useState('');
  const [tempAviso,   setTempAviso]   = useState('');
  const [salvandoAv,  setSalvandoAv]  = useState(false);

  // Reajuste anual
  const [showReajuste, setShowReajuste] = useState(false);
  const [pctReajuste,  setPctReajuste]  = useState('');
  const [reajusteDone, setReajusteDone] = useState(false);
  const [aplicandoR,   setAplicandoR]   = useState(false);

  useEffect(() => {
    const ano = new Date().getFullYear();
    const done = typeof window !== 'undefined' && localStorage.getItem(`reajuste_aviso_${ano}`) === '1';
    setReajusteDone(done);
    if (new Date().getMonth() === 11 && !done) setShowReajuste(true);

    Promise.allSettled([buscarAlunos(), buscarPagamentos(), buscarSessoes(), buscarConfigApp(), buscarFeriasPorStatus()])
      .then(([ra, rp, rs, rc, rf]) => {
        if (ra.status === 'fulfilled') setAlunos(ra.value);
        if (rp.status === 'fulfilled') setPagamentos(rp.value);
        if (rs.status === 'fulfilled') setSessoes(rs.value);
        if (rf.status === 'fulfilled') { setFerias(rf.value.pendentes); setFeriasAprovadas(rf.value.aprovadas); }
        if (rc.status === 'fulfilled') {
          const cfg = rc.value || {};
          setConfig(cfg);
          const txt = cfg?.aviso?.texto || '';
          setTextoAviso(txt); setTempAviso(txt);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const mesAtual = hoje.getMonth();       // 0-11
  const anoAtual = hoje.getFullYear();

  const ativos        = alunos.filter(a => a.ativo !== false);
  // Mesma regra do status "Atrasado" do app (lib/statusAluno): aluno com cobrança
  // automática só é atrasado se o Asaas marcou vencido; inativo nunca entra.
  const inadimplentes = ativos.filter(a => calcStatus(a) === 'pendente');
  // Aluno com cobrança automática (Asaas) renova sozinho — mostrar ele aqui
  // é alarme falso (achado pelo dono: Paulo aparecia em "vencendo" mesmo já
  // ativo/recorrente, sem precisar de nenhuma ação manual do personal).
  const vencendo = ativos.filter(a => {
    if (!a.vencimento || a.cobrancaAutomatica) return false;
    const [d,m,y] = a.vencimento.split('/');
    const diff = (new Date(+y, m-1, +d) - hoje) / 86400000;
    return diff >= 0 && diff <= 7;
  });

  // Prévia de alunos do painel: ordena por vencimento MAIS PRÓXIMO (vencidos
  // primeiro) — antes era um slice(0, 8) da lista crua, ou seja, 8 alunos em
  // ordem arbitrária, sem utilidade nenhuma. Assim a tabela mostra logo quem
  // precisa de atenção. Sem vencimento (aluno grátis/sem plano) vai pro fim,
  // em ordem alfabética.
  const msVenc = (a) => {
    if (!a.vencimento) return Infinity;
    const [d,m,y] = a.vencimento.split('/');
    return new Date(+y, m-1, +d).getTime();
  };
  const previaAlunos = [...ativos].sort((a, b) => {
    const va = msVenc(a), vb = msVenc(b);
    if (va !== vb) return va - vb;
    return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
  }).slice(0, 8);
  // Pagamentos são salvos como DD/MM/YYYY (mesmo formato lido no Financeiro) —
  // filtra por mês+ano parseando a data BR, não por prefixo YYYY-MM (que nunca
  // casava, deixando a receita do mês sempre zerada no painel).
  // "Recebido" = dinheiro que JÁ caiu na conta no mês; é o mesmo número do Financeiro
  // e do Início do app (antes aqui somava por data de registro e divergia dos dois).
  const receitaMes = resumoFinanceiro(pagamentos, hoje).recebido;

  // hoje.toISOString() é UTC: depois das 21h no Brasil já vira o dia seguinte.
  const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;
  const diaSemanaHoje = DIAS_ABREV[hoje.getDay()];
  const deFeriasHoje = alunosDeFeriasNoDia(feriasAprovadas, hoje);
  // Aulas fixas (dias da semana do aluno) + sessões avulsas/reposições do dia, como a
  // Agenda e o Início do app. Férias aprovadas tiram o aluno do dia.
  const fixasHoje = ativos
    .filter(a => a.tipoServico !== 'online' && Array.isArray(a.dias) && a.dias.includes(diaSemanaHoje) && !deFeriasHoje.has(a.id))
    .map(a => ({
      id: `fixa_${a.id}`, alunoId: a.id, status: null,
      horario: (Array.isArray(a.agendaSemanal) ? a.agendaSemanal.find(e => e.dia === diaSemanaHoje)?.horario : null) || a.horario || '',
    }));
  const avulsasHoje = sessoes.filter(s => s.data === hojeISO && !deFeriasHoje.has(s.alunoId));
  const sessoesHoje = [...fixasHoje, ...avulsasHoje]
    .sort((a, b) => (minutosDoHorario(a.horario) ?? 24 * 60) - (minutosDoHorario(b.horario) ?? 24 * 60));
  const agoraMin = new Date().getHours() * 60 + new Date().getMinutes();
  const proximaId = sessoesHoje.find(s => { const m = minutosDoHorario(s.horario); return m !== null && m >= agoraMin; })?.id;
  const alunosMap = Object.fromEntries(alunos.map(a => [a.id, a]));

  // Aniversariantes próximos 7 dias (usa dataNascimento ou nascimento)
  const aniversariantes = alunos
    .map(a => {
      const nasc = a.dataNascimento || a.nascimento || '';
      const info = aniversarioInfo(nasc);
      if (!info || info.diasAte > 7) return null;
      return { ...a, diasAte: info.diasAte, ehHoje: info.hoje };
    })
    .filter(Boolean)
    .sort((a,b) => a.diasAte - b.diasAte);

  function whatsappMsg(a) {
    const tel = (a.telefone||'').replace(/\D/g,'');
    if (!tel) return null;
    const msg = a.ehHoje
      ? `Feliz aniversário, ${a.nome?.split(' ')[0]}! 🎉🎂`
      : `Oi ${a.nome?.split(' ')[0]}! Seu aniversário é em ${a.diasAte} dia${a.diasAte !== 1 ? 's' : ''}. Parabéns antecipado! 🎂`;
    return `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`;
  }

  async function publicarAviso() {
    setSalvandoAv(true);
    try {
      await salvarConfigApp({ aviso: { texto: tempAviso, publicadoEm: new Date().toLocaleDateString('pt-BR') } });
      setTextoAviso(tempAviso); setConfig(c => ({ ...c, aviso: { texto: tempAviso } }));
      setShowAviso(false);
      toast(tempAviso ? 'Aviso publicado para os alunos.' : 'Aviso removido.');
    } catch { toast('Erro ao publicar aviso.', 'error'); } finally { setSalvandoAv(false); }
  }

  async function aprovarFerias(feria) {
    const aluno = alunos.find(a => a.id === feria.alunoId);
    if (!aluno)            { toast('Aluno não encontrado.', 'error'); return; }
    if (!aluno.vencimento) { toast(`${aluno.nome} sem vencimento cadastrado.`, 'error'); return; }
    const dias = Number(feria.dias || 0);
    if (!dias)             { toast('Sem quantidade de dias na solicitação.', 'error'); return; }
    if (!await confirm({
      title: `Aprovar ${dias} dia${dias !== 1 ? 's' : ''} de férias de ${aluno.nome}?`,
      message: `O plano será estendido a partir de ${aluno.vencimento}.`,
      confirmLabel: 'Aprovar',
      danger: false,
    })) return;
    setAprovandoId(feria.id);
    try {
      const novoVenc = await aprovarFeriasEEstenderPlano(feria.id, feria.alunoId, dias, aluno.vencimento);
      setFerias(f => f.filter(x => x.id !== feria.id));
      toast(`Aprovado. Novo vencimento: ${novoVenc}`);
    } catch (e) {
      toast(e.message || 'Não foi possível aprovar.', 'error');
    } finally {
      setAprovandoId(null);
    }
  }

  async function recusarFerias(feria) {
    setAprovandoId(feria.id);
    try {
      await atualizarStatusFerias(feria.id, 'recusada');
      setFerias(f => f.filter(x => x.id !== feria.id));
      toast('Solicitação recusada.');
    } catch {
      toast('Erro ao recusar.', 'error');
    } finally {
      setAprovandoId(null);
    }
  }

  async function aplicarReajuste() {
    const pct = parseFloat(pctReajuste.replace(',','.'));
    if (!Number.isFinite(pct) || pct < 0.1 || pct > 50) { toast('Digite um percentual entre 0,1% e 50%.', 'error'); return; }
    const previa = alunos
      .filter(x => x.status !== 'inativo' && x.ativo !== false && valorNum(x.valor) > 0)
      .map(x => ({ aluno: x, novo: Math.round(valorNum(x.valor) * (1 + pct / 100) * 100) / 100 }));
    if (previa.some(x => x.novo > 10000 || x.novo <= 0)) { toast('O reajuste geraria um valor fora do limite (R$ 0 a R$ 10.000). Nada foi alterado.', 'error'); return; }
    if (!await confirm({
      title: `Aplicar reajuste de ${pct}% em TODOS os alunos ativos?`,
      message: 'O valor mensal de cada aluno ativo com plano será recalculado. Esta ação não pode ser desfeita em massa.',
      confirmLabel: 'Aplicar reajuste',
    })) return;
    setAplicandoR(true);
    try {
      const { atualizarAluno } = await import('@/lib/firestore');
      const { atualizarValorAssinaturaAsaas } = await import('@/lib/asaas');
      const falhas = [];
      for (const { aluno, novo } of previa) {
        try {
          await atualizarAluno(aluno.id, { valor: novo.toFixed(2).replace('.', ',') });
          if (aluno.asaasSubscriptionId && aluno.cobrancaAutomatica) {
            await atualizarValorAssinaturaAsaas(aluno.asaasSubscriptionId, valorMensalAsaas(novo, aluno.plano), true);
          }
        } catch (e) {
          console.error('Reajuste falhou para', aluno.nome, e);
          falhas.push(aluno.nome);
        }
      }
      // Avisa os alunos (o app faz igual). O reajuste JÁ foi aplicado: se o aviso falhar
      // não desfaz nada, mas o personal precisa saber que ninguém foi avisado.
      let avisoFalhou = false;
      try {
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('@/lib/firebase');
        await httpsCallable(functions, 'notificarAvisoAlunos')({
          texto: `Seu plano será reajustado em ${pct}% (IPCA) a partir do mês que vem. Qualquer dúvida, fale com seu personal.`,
          titulo: '💰 Reajuste do plano',
        });
      } catch (e) { console.error('Aviso do reajuste falhou', e); avisoFalhou = true; }
      const ano = new Date().getFullYear();
      localStorage.setItem(`reajuste_aviso_${ano}`, '1');
      setReajusteDone(true); setShowReajuste(false);
      if (falhas.length) toast(`Reajuste aplicado, mas falhou para: ${falhas.join(', ')}. Confira o valor no Asaas.`, 'error');
      else if (avisoFalhou) toast(`Reajuste de ${pct}% aplicado, mas o aviso aos alunos não saiu. Avise por fora.`, 'error');
      else toast(`Reajuste de ${pct}% aplicado e alunos avisados.`);
    } catch { toast('Erro ao aplicar reajuste.', 'error'); } finally { setAplicandoR(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 border-accent/60 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const nome = config?.nome?.split(' ')[0] || personal?.displayName?.split(' ')[0] || '';

  return (
    <div className="px-4 pt-4 pb-6 md:px-8 md:pt-8 md:pb-8 max-w-[1200px] mx-auto w-full">

      {/* Modal Aviso */}
      {showAviso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-[22px] bg-[#141619] ring-1 ring-white/[0.08] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold text-white flex items-center gap-2"><Megaphone size={15} className="text-accent" /> Aviso para alunos</h2>
              <button onClick={() => setShowAviso(false)} className="p-1.5 text-white/40 hover:text-white"><X size={16} /></button>
            </div>
            <p className="text-[12px] text-white/40 mb-3">Aparece na tela inicial dos alunos no app.</p>
            <textarea value={tempAviso} onChange={e => setTempAviso(e.target.value)} rows={4} placeholder="Ex: Aulas suspensas na semana do carnaval. Retomaremos na segunda-feira após o feriado."
              className="w-full px-3 py-2.5 rounded-[14px] bg-white/[0.04] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-accent/60 transition-all resize-none mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setShowAviso(false)} className="flex-1 py-2.5 rounded-[14px] border border-white/[0.08] text-[13px] text-white/40 hover:text-white transition-all">Cancelar</button>
              <button onClick={publicarAviso} disabled={salvandoAv} className="flex-1 py-2.5 rounded-[14px] bg-accent hover:bg-accent-hover text-[13px] font-semibold text-on-accent disabled:opacity-40 transition-all">
                {salvandoAv ? 'Publicando...' : (tempAviso ? 'Publicar' : 'Remover aviso')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reajuste Anual (Dezembro) */}
      {showReajuste && !reajusteDone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-[22px] bg-[#141619] ring-1 ring-white/[0.08] p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-bold text-white flex items-center gap-2"><Percent size={15} className="text-amber-400" /> Reajuste Anual</h2>
              <button onClick={() => setShowReajuste(false)} className="p-1.5 text-white/40 hover:text-white"><X size={16} /></button>
            </div>
            <p className="text-[12px] text-white/40 leading-relaxed mb-4">É dezembro! Hora de revisar os valores. Defina o percentual de reajuste que será aplicado a todos os alunos ativos.</p>
            <div className="relative mb-4">
              <input type="text" value={pctReajuste} onChange={e => setPctReajuste(e.target.value)} placeholder="Ex: 10"
                onKeyDown={e => { if (e.key === 'Enter' && pctReajuste && !aplicandoR) aplicarReajuste(); }}
                className="w-full px-4 py-3 rounded-[14px] bg-white/[0.04] border border-white/[0.08] text-white text-[20px] font-semibold text-center focus:outline-none focus:border-accent/60 transition-all font-display" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[18px] text-white/40 font-semibold font-display">%</span>
            </div>
            <button onClick={aplicarReajuste} disabled={aplicandoR || !pctReajuste} className="w-full py-3 rounded-[14px] bg-accent hover:bg-accent-hover text-[13px] font-bold text-on-accent disabled:opacity-40 transition-all mb-2">
              {aplicandoR ? 'Aplicando...' : `Aplicar a ${ativos.filter(a => valorNum(a.valor) > 0).length} alunos`}
            </button>
            <button onClick={() => { const ano = new Date().getFullYear(); localStorage.setItem(`reajuste_aviso_${ano}`,'1'); setShowReajuste(false); setReajusteDone(true); }}
              className="w-full py-2 text-[11px] text-white/30 hover:text-white/60 transition-all">Já fiz o reajuste, não mostrar mais</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
        <div>
          <p className="text-[11px] font-medium text-white/25 uppercase tracking-widest mb-2">
            {hoje.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
          <h1 className="text-[32px] md:text-[40px] font-semibold tracking-tight leading-[1.1] font-display">
            <span style={{ background:'linear-gradient(135deg,#fff 20%,rgba(255,255,255,0.55) 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              {saudacao}{nome ? `, ${nome}` : ''}
            </span>
            <span className="text-accent">.</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => { setTempAviso(textoAviso); setShowAviso(true); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-[14px] text-[12px] font-semibold transition-all ${textoAviso ? 'bg-accent/15 text-accent ring-1 ring-accent/25' : 'text-white/35 hover:text-white ring-1 ring-white/[0.08]'}`}>
            <Megaphone size={13} /> {textoAviso ? 'Aviso ativo' : 'Avisar alunos'}
          </button>
          {new Date().getMonth() === 11 && !reajusteDone && (
            <button onClick={() => setShowReajuste(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[14px] text-[12px] font-semibold text-amber-400 ring-1 ring-amber-500/25 bg-amber-500/[0.08] transition-all">
              <Percent size={13} /> Reajuste anual
            </button>
          )}
          <Link href="/dashboard/alunos" className="flex items-center gap-1.5 text-[12px] font-medium text-white/35 hover:text-white transition-colors">
            Ver todos os alunos <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      {/* Aviso ativo banner */}
      {textoAviso && (
        <div className="flex items-start gap-3 px-4 py-3 mb-6 rounded-[22px] bg-accent/[0.07] ring-1 ring-accent/15">
          <Megaphone size={14} className="text-accent shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-accent uppercase tracking-wider mb-0.5">Aviso ativo</p>
            <p className="text-[12px] text-white/50">{textoAviso}</p>
          </div>
          <button onClick={() => { setTempAviso(textoAviso); setShowAviso(true); }} className="text-[11px] text-accent/60 hover:text-accent transition-colors shrink-0">Editar</button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <KpiCard icon={Users}         label="Alunos ativos"    value={ativos.length}       accent="blue"  href="/dashboard/alunos" />
        <KpiCard icon={TrendingUp}    label="Recebido no mês"
          value={`R$ ${receitaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} accent="green" href="/dashboard/financeiro" />
        <KpiCard icon={Clock}         label="Vencem em 7 dias" value={vencendo.length}
          sub={vencendo.map(a => a.nome?.split(' ')[0]).join(', ') || undefined} accent="amber" href="/dashboard/alunos?filtro=vencendo" />
        <KpiCard icon={AlertTriangle} label="Inadimplentes"    value={inadimplentes.length} accent="red"   href="/dashboard/alunos?filtro=inadimplentes" />
      </div>

      {/* Corpo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tabela alunos — 2 colunas */}
        <div className="md:col-span-2 rounded-[22px] bg-[#141619] ring-1 ring-white/[0.06] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
            <span className="text-[12px] font-semibold text-white/60 uppercase tracking-wider">Alunos</span>
            <Link href="/dashboard/alunos" className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors">
              Ver todos <ArrowUpRight size={11} />
            </Link>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/20 uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/20 uppercase tracking-wider hidden sm:table-cell">Plano</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/20 uppercase tracking-wider">Serviço</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/20 uppercase tracking-wider hidden sm:table-cell">Vencimento</th>
              </tr>
            </thead>
            <tbody>
              {previaAlunos.map(a => {
                const vencido = (() => {
                  if (!a.vencimento) return false;
                  const [d,m,y] = a.vencimento.split('/');
                  return new Date(+y, m-1, +d) < hoje;
                })();
                return (
                  <tr key={a.id} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.025] transition-colors group">
                    <td className="px-5 py-3.5">
                      <Link href={`/dashboard/alunos?id=${a.id}`} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center text-[11px] font-display font-semibold text-ink shrink-0">
                          {a.nome?.[0]}
                        </div>
                        <span className="text-[13px] font-medium text-white/75 group-hover:text-white transition-colors">{a.nome}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-[12px] text-white/35 hidden sm:table-cell">{a.plano || '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ${a.tipoServico === 'online' ? 'bg-accent/12 text-accent ring-accent/20' : 'bg-accent/12 text-accent ring-accent/20'}`}>
                        {a.tipoServico === 'online' ? 'Online' : 'Presencial'}
                      </span>
                    </td>
                    <td className={`px-4 py-3.5 text-[12px] font-medium hidden sm:table-cell ${vencido ? 'text-red-400' : 'text-white/35'}`}>{a.vencimento || '—'}</td>
                  </tr>
                );
              })}
              {alunos.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-[13px] text-white/20">Nenhum aluno cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Painéis laterais */}
        <div className="space-y-4">
          {/* Agenda de hoje */}
          <div className="rounded-[22px] bg-[#141619] ring-1 ring-white/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays size={13} className="text-accent" />
                <span className="text-[12px] font-semibold text-white/60 uppercase tracking-wider">Agenda de hoje</span>
              </div>
              <Link href="/dashboard/agenda" className="text-[10px] text-white/25 hover:text-white/50 transition-colors">ver agenda →</Link>
            </div>
            <div className="p-3">
              {sessoesHoje.length === 0 ? (
                <div className="px-2 py-3 text-center"><p className="text-[12px] text-white/20">Nenhuma sessão hoje</p></div>
              ) : sessoesHoje.slice(0, 8).map(s => {
                const aluno = alunosMap[s.alunoId];
                const statusCls = { agendado:'bg-white/[0.08] text-white/70', realizado:'bg-accent/12 text-accent', faltou:'bg-red-500/12 text-red-400', cancelado:'bg-white/[0.06] text-white/30' };
                return (
                  <div key={s.id} className="flex items-center gap-2.5 px-2 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                    <span className="text-[11px] font-semibold text-white/40 w-11 shrink-0">{s.horario || '—'}</span>
                    <div className="w-6 h-6 rounded-full bg-surface-2 flex items-center justify-center text-[10px] font-display font-semibold text-ink shrink-0">
                      {(aluno?.nome || s.alunoId || '?')[0]}
                    </div>
                    <span className="text-[12px] text-white/65 flex-1 truncate">{aluno?.nome?.split(' ')[0] || '—'}</span>
                    {s.id === proximaId
                      ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/12 text-accent">Próxima</span>
                      : s.status
                        ? <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusCls[s.status] || statusCls.agendado}`}>{s.status}</span>
                        : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Aniversariantes 7 dias */}
          {aniversariantes.length > 0 && (
            <div className="rounded-[22px] bg-[#141619] ring-1 ring-amber-500/15 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-2">
                <Cake size={13} className="text-amber-400" />
                <span className="text-[12px] font-semibold text-amber-400/70 uppercase tracking-wider">
                  Aniversários {aniversariantes.some(a => a.ehHoje) ? 'hoje' : 'em breve'}
                </span>
              </div>
              <div className="p-3 space-y-1">
                {aniversariantes.map(a => {
                  const wpp = whatsappMsg(a);
                  return (
                    <div key={a.id} className="flex items-center gap-2.5 px-2 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                      <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center text-[10px] font-bold text-amber-400 shrink-0">
                        {a.nome?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-white/65 truncate">{a.nome?.split(' ')[0]}</p>
                        <p className={`text-[10px] ${a.ehHoje ? 'text-amber-400 font-semibold' : 'text-white/30'}`}>
                          {a.ehHoje ? '🎂 Hoje!' : `em ${a.diasAte} dia${a.diasAte !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                      {wpp && (
                        <a href={wpp} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-all shrink-0"
                          title="Enviar parabéns">
                          <MessageCircle size={13} />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Férias pendentes */}
          {ferias.length > 0 && (
            <div className="rounded-[22px] bg-[#141619] ring-1 ring-amber-500/15 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-2">
                <Umbrella size={13} className="text-amber-400" />
                <span className="text-[12px] font-semibold text-amber-400/70 uppercase tracking-wider">Férias pendentes</span>
              </div>
              <div className="p-3 space-y-2">
                {ferias.map(feria => {
                  const aluno = alunos.find(a => a.id === feria.alunoId);
                  const ocupado = aprovandoId === feria.id;
                  return (
                    <div key={feria.id} className="px-2 py-2.5 rounded-lg bg-white/[0.02]">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center text-[10px] font-bold text-amber-400 shrink-0">
                          {aluno?.nome?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-white/65 truncate">{aluno?.nome || 'Aluno'}</p>
                          <p className="text-[10px] text-white/30">
                            {feria.dataInicio || '—'} a {feria.dataFim || '—'}{feria.dias ? `  ·  ${feria.dias} dias` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => aprovarFerias(feria)} disabled={ocupado}
                          className="flex-1 py-1.5 rounded-lg bg-accent/12 text-accent text-[11px] font-semibold hover:bg-accent/20 disabled:opacity-40 transition-all">
                          {ocupado ? '...' : 'Aprovar'}
                        </button>
                        <button onClick={() => recusarFerias(feria)} disabled={ocupado}
                          className="flex-1 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-[11px] font-semibold hover:bg-red-500/20 disabled:opacity-40 transition-all">
                          {ocupado ? '...' : 'Recusar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vencimentos */}
          <div className="rounded-[22px] bg-[#141619] ring-1 ring-white/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.05]">
              <span className="text-[12px] font-semibold text-white/60 uppercase tracking-wider">Vencendo em breve</span>
            </div>
            <div className="p-3">
              {vencendo.length === 0 ? (
                <div className="flex items-center gap-2 px-2 py-3">
                  <CheckCircle2 size={13} className="text-accent/40 shrink-0" />
                  <span className="text-[12px] text-white/25">Nenhum vencimento próximo</span>
                </div>
              ) : vencendo.map(a => {
                const [d,m,y] = a.vencimento.split('/');
                const diff = Math.ceil((new Date(+y,m-1,+d) - hoje) / 86400000);
                return (
                  <Link key={a.id} href={`/dashboard/alunos?id=${a.id}`}
                    className="flex items-center justify-between px-2 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center text-[10px] font-bold text-amber-400">{a.nome?.[0]}</div>
                      <span className="text-[12px] text-white/65 group-hover:text-white transition-colors">{a.nome?.split(' ')[0]}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-amber-400">{diff === 0 ? 'hoje' : `${diff}d`}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Inadimplentes */}
          <div className="rounded-[22px] bg-[#141619] ring-1 ring-white/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-2">
              {inadimplentes.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
              <span className="text-[12px] font-semibold text-white/60 uppercase tracking-wider">Inadimplentes</span>
            </div>
            <div className="p-3">
              {inadimplentes.length === 0 ? (
                <div className="flex items-center gap-2 px-2 py-3">
                  <CheckCircle2 size={13} className="text-accent/40 shrink-0" />
                  <span className="text-[12px] text-white/25">Nenhum inadimplente</span>
                </div>
              ) : inadimplentes.slice(0, 5).map(a => (
                <Link key={a.id} href={`/dashboard/alunos?id=${a.id}`}
                  className="flex items-center justify-between px-2 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-red-500/12 flex items-center justify-center text-[10px] font-bold text-red-400">{a.nome?.[0]}</div>
                    <span className="text-[12px] text-white/65 group-hover:text-white transition-colors">{a.nome?.split(' ')[0]}</span>
                  </div>
                  <span className="text-[11px] text-red-400">{a.vencimento}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
