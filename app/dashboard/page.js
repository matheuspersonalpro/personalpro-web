'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { buscarAlunos, buscarPagamentos, buscarSessoes, buscarConfigApp, salvarConfigApp } from '@/lib/firestore';
import { usePersonal } from '@/lib/AuthContext';
import { Users, TrendingUp, AlertTriangle, Clock, ArrowUpRight, CheckCircle2, CalendarDays, Cake, MessageCircle, Megaphone, X, Percent, ChevronDown } from 'lucide-react';
import { useToast } from '@/components/Toast';

function KpiCard({ icon: Icon, label, value, sub, accent }) {
  const theme = {
    blue:  { wrap: 'ring-blue-500/12',  icon: 'bg-blue-500/12 text-blue-400' },
    green: { wrap: 'ring-green-500/12', icon: 'bg-green-500/12 text-green-400' },
    amber: { wrap: 'ring-amber-500/12', icon: 'bg-amber-500/12 text-amber-400' },
    red:   { wrap: 'ring-red-500/12',   icon: 'bg-red-500/12 text-red-400' },
  };
  const t = theme[accent] || theme.blue;
  return (
    <div className={`rounded-2xl bg-[#0d1b2e] ring-1 ${t.wrap} p-6`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-5 ${t.icon}`}>
        <Icon size={18} strokeWidth={1.8} />
      </div>
      <p className="text-[32px] font-bold text-white tracking-tight leading-none mb-2">{value}</p>
      <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest">{label}</p>
      {sub && <p className="text-[11px] text-white/25 mt-1.5 truncate">{sub}</p>}
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
  const [alunos,     setAlunos]     = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [sessoes,    setSessoes]    = useState([]);
  const [config,     setConfig]     = useState({});
  const [loading,    setLoading]    = useState(true);

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

    Promise.allSettled([buscarAlunos(), buscarPagamentos(), buscarSessoes(), buscarConfigApp()])
      .then(([ra, rp, rs, rc]) => {
        if (ra.status === 'fulfilled') setAlunos(ra.value);
        if (rp.status === 'fulfilled') setPagamentos(rp.value);
        if (rs.status === 'fulfilled') setSessoes(rs.value);
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
  const mesStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  const ativos        = alunos.filter(a => a.status !== 'inativo');
  const inadimplentes = alunos.filter(a => {
    if (!a.vencimento) return false;
    const [d,m,y] = a.vencimento.split('/');
    return new Date(+y, m-1, +d) < hoje;
  });
  const vencendo = alunos.filter(a => {
    if (!a.vencimento) return false;
    const [d,m,y] = a.vencimento.split('/');
    const diff = (new Date(+y, m-1, +d) - hoje) / 86400000;
    return diff >= 0 && diff <= 7;
  });
  const receitaMes = pagamentos
    .filter(p => (p.data||'').startsWith(mesStr))
    .reduce((s,p) => s + Number(p.valor||0), 0);

  const hojeISO = hoje.toISOString().split('T')[0];
  const sessoesHoje = sessoes.filter(s => s.data === hojeISO)
    .sort((a,b) => (a.horario||'').localeCompare(b.horario||''));
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

  async function aplicarReajuste() {
    const pct = parseFloat(pctReajuste.replace(',','.'));
    if (!pct || pct <= 0) { toast('Informe um percentual válido.', 'error'); return; }
    if (!window.confirm(`Aplicar reajuste de ${pct}% em TODOS os alunos ativos?`)) return;
    setAplicandoR(true);
    try {
      const { atualizarAluno } = await import('@/lib/firestore');
      for (const a of alunos.filter(a => a.status !== 'inativo' && a.valor)) {
        const novoValor = Math.round(Number(a.valor) * (1 + pct/100) * 100) / 100;
        await atualizarAluno(a.id, { valor: novoValor }).catch(() => {});
      }
      const ano = new Date().getFullYear();
      localStorage.setItem(`reajuste_aviso_${ano}`, '1');
      setReajusteDone(true); setShowReajuste(false);
      toast(`Reajuste de ${pct}% aplicado.`);
    } catch { toast('Erro ao aplicar reajuste.', 'error'); } finally { setAplicandoR(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 border-blue-500/60 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const nome = personal?.nome?.split(' ')[0] || personal?.displayName?.split(' ')[0] || '';

  return (
    <div className="px-8 pt-8 pb-8 max-w-\[1200px\] mx-auto w-full">

      {/* Modal Aviso */}
      {showAviso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold text-white flex items-center gap-2"><Megaphone size={15} className="text-blue-400" /> Aviso para alunos</h2>
              <button onClick={() => setShowAviso(false)} className="p-1.5 text-white/40 hover:text-white"><X size={16} /></button>
            </div>
            <p className="text-[12px] text-white/40 mb-3">Aparece na tela inicial dos alunos no app.</p>
            <textarea value={tempAviso} onChange={e => setTempAviso(e.target.value)} rows={4} placeholder="Ex: Aulas suspensas na semana do carnaval. Retomaremos na segunda-feira após o feriado."
              className="w-full px-3 py-2.5 rounded-xl bg-white/\[0\.04\] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all resize-none mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setShowAviso(false)} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-[13px] text-white/40 hover:text-white transition-all">Cancelar</button>
              <button onClick={publicarAviso} disabled={salvandoAv} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white disabled:opacity-40 transition-all">
                {salvandoAv ? 'Publicando...' : (tempAviso ? 'Publicar' : 'Remover aviso')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reajuste Anual (Dezembro) */}
      {showReajuste && !reajusteDone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-bold text-white flex items-center gap-2"><Percent size={15} className="text-amber-400" /> Reajuste Anual</h2>
              <button onClick={() => setShowReajuste(false)} className="p-1.5 text-white/40 hover:text-white"><X size={16} /></button>
            </div>
            <p className="text-[12px] text-white/40 leading-relaxed mb-4">É dezembro! Hora de revisar os valores. Defina o percentual de reajuste que será aplicado a todos os alunos ativos.</p>
            <div className="relative mb-4">
              <input type="text" value={pctReajuste} onChange={e => setPctReajuste(e.target.value)} placeholder="Ex: 10"
                className="w-full px-4 py-3 rounded-xl bg-white/\[0\.04\] border border-white/[0.08] text-white text-[20px] font-bold text-center focus:outline-none focus:border-blue-500/60 transition-all" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[18px] text-white/40 font-bold">%</span>
            </div>
            <button onClick={aplicarReajuste} disabled={aplicandoR || !pctReajuste} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-bold text-white disabled:opacity-40 transition-all mb-2">
              {aplicandoR ? 'Aplicando...' : `Aplicar a ${alunos.filter(a => a.status !== 'inativo' && a.valor).length} alunos`}
            </button>
            <button onClick={() => { const ano = new Date().getFullYear(); localStorage.setItem(`reajuste_aviso_${ano}`,'1'); setShowReajuste(false); setReajusteDone(true); }}
              className="w-full py-2 text-[11px] text-white/30 hover:text-white/60 transition-all">Já fiz o reajuste, não mostrar mais</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-[11px] font-medium text-white/25 uppercase tracking-widest mb-2">
            {hoje.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
          <h1 className="text-[30px] font-bold text-white tracking-tight leading-none">
            {saudacao}{nome ? `, ${nome}` : ''}.
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setTempAviso(textoAviso); setShowAviso(true); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all ${textoAviso ? 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/25' : 'text-white/35 hover:text-white ring-1 ring-white/[0.08]'}`}>
            <Megaphone size={13} /> {textoAviso ? 'Aviso ativo' : 'Avisar alunos'}
          </button>
          {new Date().getMonth() === 11 && !reajusteDone && (
            <button onClick={() => setShowReajuste(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-amber-400 ring-1 ring-amber-500/25 bg-amber-500/[0.08] transition-all">
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
        <div className="flex items-start gap-3 px-4 py-3 mb-6 rounded-2xl bg-blue-500/[0.07] ring-1 ring-blue-500/15">
          <Megaphone size={14} className="text-blue-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider mb-0.5">Aviso ativo</p>
            <p className="text-[12px] text-white/50">{textoAviso}</p>
          </div>
          <button onClick={() => { setTempAviso(textoAviso); setShowAviso(true); }} className="text-[11px] text-blue-400/60 hover:text-blue-400 transition-colors shrink-0">Editar</button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <KpiCard icon={Users}         label="Alunos ativos"    value={ativos.length}       accent="blue" />
        <KpiCard icon={TrendingUp}    label="Receita do mês"
          value={`R$ ${receitaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} accent="green" />
        <KpiCard icon={Clock}         label="Vencem em 7 dias" value={vencendo.length}
          sub={vencendo.map(a => a.nome?.split(' ')[0]).join(', ') || undefined} accent="amber" />
        <KpiCard icon={AlertTriangle} label="Inadimplentes"    value={inadimplentes.length} accent="red" />
      </div>

      {/* Corpo */}
      <div className="grid grid-cols-3 gap-4">
        {/* Tabela alunos — 2 colunas */}
        <div className="col-span-2 rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
            <span className="text-[12px] font-semibold text-white/60 uppercase tracking-wider">Alunos</span>
            <Link href="/dashboard/alunos" className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors">
              Ver todos <ArrowUpRight size={11} />
            </Link>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {['Nome','Plano','Serviço','Vencimento'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-white/20 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alunos.slice(0, 8).map(a => {
                const vencido = (() => {
                  if (!a.vencimento) return false;
                  const [d,m,y] = a.vencimento.split('/');
                  return new Date(+y, m-1, +d) < hoje;
                })();
                return (
                  <tr key={a.id} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.025] transition-colors group">
                    <td className="px-5 py-3.5">
                      <Link href={`/dashboard/alunos?id=${a.id}`} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center text-[11px] font-bold text-blue-400 shrink-0">
                          {a.nome?.[0]}
                        </div>
                        <span className="text-[13px] font-medium text-white/75 group-hover:text-white transition-colors">{a.nome}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-white/35">{a.plano || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ${a.tipoServico === 'online' ? 'bg-purple-500/12 text-purple-400 ring-purple-500/20' : 'bg-blue-500/12 text-blue-400 ring-blue-500/20'}`}>
                        {a.tipoServico === 'online' ? 'Online' : 'Presencial'}
                      </span>
                    </td>
                    <td className={`px-5 py-3.5 text-[12px] font-medium ${vencido ? 'text-red-400' : 'text-white/35'}`}>{a.vencimento || '—'}</td>
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
          <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays size={13} className="text-blue-400" />
                <span className="text-[12px] font-semibold text-white/60 uppercase tracking-wider">Agenda de hoje</span>
              </div>
              <Link href="/dashboard/agenda" className="text-[10px] text-white/25 hover:text-white/50 transition-colors">ver agenda →</Link>
            </div>
            <div className="p-3">
              {sessoesHoje.length === 0 ? (
                <div className="px-2 py-3 text-center"><p className="text-[12px] text-white/20">Nenhuma sessão hoje</p></div>
              ) : sessoesHoje.slice(0, 5).map(s => {
                const aluno = alunosMap[s.alunoId];
                const statusCls = { agendado:'bg-blue-500/12 text-blue-400', realizado:'bg-green-500/12 text-green-400', faltou:'bg-red-500/12 text-red-400', cancelado:'bg-white/[0.06] text-white/30' };
                return (
                  <div key={s.id} className="flex items-center gap-2.5 px-2 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                    <span className="text-[11px] font-semibold text-white/40 w-11 shrink-0">{s.horario || '—'}</span>
                    <div className="w-6 h-6 rounded-full bg-blue-500/12 flex items-center justify-center text-[10px] font-bold text-blue-400 shrink-0">
                      {(aluno?.nome || s.alunoId || '?')[0]}
                    </div>
                    <span className="text-[12px] text-white/65 flex-1 truncate">{aluno?.nome?.split(' ')[0] || '—'}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusCls[s.status] || statusCls.agendado}`}>{s.status || 'agendado'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Aniversariantes 7 dias */}
          {aniversariantes.length > 0 && (
            <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-amber-500/15 overflow-hidden">
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
                          className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all shrink-0"
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

          {/* Vencimentos */}
          <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.05]">
              <span className="text-[12px] font-semibold text-white/60 uppercase tracking-wider">Vencendo em breve</span>
            </div>
            <div className="p-3">
              {vencendo.length === 0 ? (
                <div className="flex items-center gap-2 px-2 py-3">
                  <CheckCircle2 size={13} className="text-green-500/40 shrink-0" />
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
          <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-2">
              {inadimplentes.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
              <span className="text-[12px] font-semibold text-white/60 uppercase tracking-wider">Inadimplentes</span>
            </div>
            <div className="p-3">
              {inadimplentes.length === 0 ? (
                <div className="flex items-center gap-2 px-2 py-3">
                  <CheckCircle2 size={13} className="text-green-500/40 shrink-0" />
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
