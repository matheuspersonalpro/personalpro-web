'use client';
import { useEffect, useState, useCallback } from 'react';
import { buscarPagamentos, buscarAlunos, registrarPagamento, excluirPagamento, atualizarAluno, buscarConfigApp, salvarConfigApp } from '@/lib/firestore';
import { gerarPixEMV } from '@/lib/pix';
import { TrendingUp, Plus, X, ChevronLeft, ChevronRight, Trash2, DollarSign, Users, CreditCard, Target, Zap, QrCode, ExternalLink, Check, AlertTriangle, Copy } from 'lucide-react';
import { useToast } from '@/components/Toast';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const TIPOS = ['Mensal','Trimestral','Semestral','Anual','Avulso'];
const FORMAS = ['PIX','Dinheiro','Cartão de Crédito','Cartão de Débito','Transferência','Asaas'];

function fmt(v) { return (v||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' }); }
function fmtPct(v) { return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`; }

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.total), 1);
  return (
    <div className="flex items-end gap-2 h-28 w-full">
      {data.map((item, i) => {
        const pct = max > 0 ? (item.total / max) * 100 : 0;
        const isLast = i === data.length - 1;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
            {item.total > 0 && (
              <span className="text-[10px] text-white/40 group-hover:text-white/70 transition-colors">
                {fmt(item.total).replace('R$ ','').replace(',00','')}
              </span>
            )}
            <div className="w-full relative" style={{ height: `${Math.max(pct, 4)}%` }}>
              <div className={`absolute inset-0 rounded-t-lg transition-all ${isLast ? 'bg-blue-500' : 'bg-blue-500/30 group-hover:bg-blue-500/50'}`} />
            </div>
            <span className={`text-[10px] font-medium ${isLast ? 'text-blue-400' : 'text-white/30'}`}>{item.mes}</span>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ presencial, consultoria }) {
  const total = presencial + consultoria;
  if (total === 0) return (
    <div className="flex items-center justify-center h-24 text-[12px] text-white/25">Sem dados</div>
  );
  const pPct = Math.round((presencial / total) * 100);
  const r = 40; const circ = 2 * Math.PI * r;
  const dashP = (pPct / 100) * circ; const dashC = circ - dashP;
  return (
    <div className="flex items-center gap-4">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={r} fill="none" stroke="#34d399" strokeWidth="12"
          strokeDasharray={`${dashC} ${dashP}`} strokeDashoffset={circ * 0.25} />
        <circle cx="45" cy="45" r={r} fill="none" stroke="#60a5fa" strokeWidth="12"
          strokeDasharray={`${dashP} ${dashC}`} strokeDashoffset={circ * 0.25} />
        <text x="45" y="49" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">{pPct}%</text>
      </svg>
      <div className="space-y-2">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-400" /><span className="text-[12px] text-white/60">Presencial <span className="text-white font-semibold">{pPct}%</span></span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-400" /><span className="text-[12px] text-white/60">Consultoria <span className="text-white font-semibold">{100-pPct}%</span></span></div>
      </div>
    </div>
  );
}

function CobrarModal({ aluno, config, onClose, onSalvo, toast }) {
  const [modo, setModo] = useState(null); // 'pix'|'confirmar'|'registrar'
  const [valor, setValor] = useState('');
  const [forma, setForma] = useState('PIX');
  const [salvando, setSalvando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [pixEmv, setPixEmv] = useState('');

  function gerarPix() {
    if (!config?.pixChave) { toast('Configure a chave PIX primeiro na aba Recebimento.', 'error'); return; }
    const v = parseFloat((valor||'0').replace(',','.')) || 0;
    const emv = gerarPixEMV({ chave: config.pixChave, nome: config.pixNome||'Personal', cidade: config.pixCidade||'Brasil', valor: v > 0 ? v : (aluno?.valor||0) });
    setPixEmv(emv);
    setModo('pix');
  }

  async function confirmarRecebimento() {
    setSalvando(true);
    try {
      const v = parseFloat((valor||'0').replace(',','.')) || aluno?.valor || 0;
      await registrarPagamento({ alunoId: aluno.id, alunoNome: aluno.nome, valor: v, forma, data: new Date().toLocaleDateString('pt-BR'), tipo: aluno.plano||aluno.tipo||'Mensal', descricao: `Mensalidade — ${aluno.nome}` });
      // Estender plano
      const tipo = (aluno.plano||aluno.tipo||'').toLowerCase();
      let meses = 1;
      if (tipo.includes('trimest')||tipo.includes('3')) meses = 3;
      else if (tipo.includes('semest')||tipo.includes('6')) meses = 6;
      else if (tipo.includes('anual')||tipo.includes('12')) meses = 12;
      if (aluno.vencimento) {
        const [d,m,a] = aluno.vencimento.split('/').map(Number);
        const novaData = new Date(a, m-1, d); novaData.setMonth(novaData.getMonth() + meses);
        const pad = n => String(n).padStart(2,'0');
        await atualizarAluno(aluno.id, { vencimento: `${pad(novaData.getDate())}/${pad(novaData.getMonth()+1)}/${novaData.getFullYear()}` });
      }
      toast(`Pagamento de ${aluno.nome} confirmado!`);
      onSalvo();
    } catch { toast('Erro ao confirmar pagamento.', 'error'); } finally { setSalvando(false); }
  }

  async function registrarSomente() {
    setSalvando(true);
    try {
      const v = parseFloat((valor||'0').replace(',','.')) || aluno?.valor || 0;
      await registrarPagamento({ alunoId: aluno.id, alunoNome: aluno.nome, valor: v, forma, data: new Date().toLocaleDateString('pt-BR'), tipo: aluno.plano||aluno.tipo||'Mensal', descricao: `Pagamento — ${aluno.nome}` });
      toast('Pagamento registrado.');
      onSalvo();
    } catch { toast('Erro ao registrar.', 'error'); } finally { setSalvando(false); }
  }

  async function copiar(txt) {
    try { await navigator.clipboard.writeText(txt); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch {}
  }

  const qrUrl = pixEmv ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(pixEmv)}&size=180x180&bgcolor=1a2744&color=60a5fa&qzone=1` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-[15px] font-bold text-white">Cobrar aluno</h2>
            <p className="text-[11px] text-white/35">{aluno.nome} · {fmt(aluno.valor)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white"><X size={16} /></button>
        </div>

        {modo === 'pix' ? (
          <div className="p-6 text-center">
            {qrUrl && <img src={qrUrl} alt="QR PIX" className="mx-auto mb-4 rounded-xl ring-1 ring-blue-500/20" width={180} height={180} />}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06] mb-4">
              <p className="flex-1 text-[10px] text-white/50 break-all font-mono text-left">{pixEmv.slice(0,40)}...</p>
              <button onClick={() => copiar(pixEmv)} className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/15 text-blue-400 text-[11px]">
                {copiado ? <Check size={12} /> : <Copy size={12} />} {copiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <button onClick={() => setModo(null)} className="text-[12px] text-white/35 hover:text-white transition-all">← Voltar</button>
          </div>
        ) : modo === 'confirmar' || modo === 'registrar' ? (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Valor (R$)</label>
              <input type="text" value={valor} onChange={e => setValor(e.target.value)} placeholder={fmt(aluno.valor||0)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/\[0\.04\] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Forma de pagamento</label>
              <div className="flex flex-wrap gap-2">
                {FORMAS.map(f => (
                  <button key={f} onClick={() => setForma(f)} className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${forma===f ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30' : 'bg-white/[0.04] text-white/40 hover:text-white'}`}>{f}</button>
                ))}
              </div>
            </div>
            {modo === 'confirmar' && aluno.vencimento && (
              <div className="p-3 rounded-xl bg-blue-500/[0.06] ring-1 ring-blue-500/15">
                <p className="text-[11px] text-blue-400">Plano será renovado automaticamente</p>
                <p className="text-[10px] text-white/35 mt-0.5">Vencimento atual: {aluno.vencimento}</p>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModo(null)} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-[13px] text-white/50 hover:text-white transition-all">Voltar</button>
              <button onClick={modo==='confirmar' ? confirmarRecebimento : registrarSomente} disabled={salvando}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white disabled:opacity-40 transition-all">
                {salvando ? 'Salvando...' : (modo==='confirmar' ? 'Confirmar' : 'Registrar')}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {config?.pixLink && (
              <a href={config.pixLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-white/[0.04] ring-1 ring-white/[0.06] text-left transition-all">
                <ExternalLink size={16} className="text-blue-400 shrink-0" />
                <div><p className="text-[13px] font-semibold text-white">Abrir link de pagamento</p><p className="text-[11px] text-white/35">Compartilhar com o aluno</p></div>
              </a>
            )}
            <button onClick={gerarPix} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-white/[0.04] ring-1 ring-white/[0.06] text-left transition-all">
              <QrCode size={16} className="text-blue-400 shrink-0" />
              <div><p className="text-[13px] font-semibold text-white">Gerar QR Code PIX</p><p className="text-[11px] text-white/35">Pagamento por aproximação</p></div>
            </button>
            <button onClick={() => setModo('confirmar')} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-white/[0.04] ring-1 ring-white/[0.06] text-left transition-all">
              <Check size={16} className="text-green-400 shrink-0" />
              <div><p className="text-[13px] font-semibold text-white">Confirmar recebimento</p><p className="text-[11px] text-white/35">Registra e renova o plano</p></div>
            </button>
            <button onClick={() => setModo('registrar')} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-white/[0.04] ring-1 ring-white/[0.06] text-left transition-all">
              <DollarSign size={16} className="text-white/50 shrink-0" />
              <div><p className="text-[13px] font-semibold text-white">Registrar pagamento</p><p className="text-[11px] text-white/35">Só anota, não renova plano</p></div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FinanceiroPage() {
  const toast = useToast();
  const [aba,        setAba]        = useState('resumo');
  const [pagamentos, setPagamentos] = useState([]);
  const [alunos,     setAlunos]     = useState([]);
  const [config,     setConfig]     = useState({});
  const [loading,    setLoading]    = useState(true);
  const [mesOffset,  setMesOffset]  = useState(0);

  // Meta
  const [meta,     setMeta]     = useState('');
  const [editMeta, setEditMeta] = useState(false);
  const [tempMeta, setTempMeta] = useState('');

  // Config recebimento
  const [editCfg,   setEditCfg]   = useState(false);
  const [cfgForm,   setCfgForm]   = useState({ pixChave:'', pixNome:'', pixCidade:'', pixLink:'' });
  const [salvandoCfg, setSalvandoCfg] = useState(false);

  // Cobrar
  const [cobrando, setCobrando] = useState(null);

  // Formulário novo pagamento (aba resumo)
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ alunoId:'', valor:'', forma:'PIX', tipo:'Mensal', data: new Date().toLocaleDateString('pt-BR'), descricao:'' });
  const [saving, setSaving] = useState(false);

  // Aba alunos: filtro
  const [filtro, setFiltro] = useState('todos');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [p, a, cfg] = await Promise.all([buscarPagamentos(), buscarAlunos(), buscarConfigApp()]);
      setPagamentos(p); setAlunos(a); setConfig(cfg||{});
      setCfgForm({ pixChave: cfg?.pixChave||'', pixNome: cfg?.pixNome||'', pixCidade: cfg?.pixCidade||'', pixLink: cfg?.pixLink||'' });
      const m = typeof window !== 'undefined' ? (localStorage.getItem('finMeta') || '') : '';
      setMeta(m); setTempMeta(m);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Estatísticas ──────────────────────────────────────────────────────────────
  const agora = new Date();
  const mesSel = new Date(agora.getFullYear(), agora.getMonth() + mesOffset, 1);
  const mesAtual = mesSel.getMonth(); const anoAtual = mesSel.getFullYear();

  function somaMes(m, y) {
    return pagamentos.filter(p => {
      const [d, mo, a] = (p.data || '').split('/').map(Number);
      return mo - 1 === m && a === y;
    }).reduce((s, p) => s + (Number(p.valor) || 0), 0);
  }

  const receitaMes    = somaMes(mesAtual, anoAtual);
  const receitaAno    = Array.from({length:12}, (_,i) => somaMes(i, anoAtual)).reduce((s,v) => s+v, 0);
  const mesAnteriorV  = somaMes(mesAtual > 0 ? mesAtual-1 : 11, mesAtual > 0 ? anoAtual : anoAtual-1);
  const variacaoMes   = mesAnteriorV > 0 ? ((receitaMes - mesAnteriorV) / mesAnteriorV * 100) : 0;
  const mediaMensal   = receitaAno / 12;
  const metaNum       = parseFloat((meta||'0').replace(',','.').replace('R$','').replace(/\./g,'').trim()) || 0;
  const metaPct       = metaNum > 0 ? Math.min(100, (receitaMes / metaNum) * 100) : 0;

  // Projeção próximo mês (média 3 meses)
  const prox3 = Array.from({length:3}, (_,i) => {
    const m = mesAtual - i - 1; const a = m < 0 ? anoAtual - 1 : anoAtual;
    return somaMes((m+12)%12, a);
  });
  const projecao = prox3.reduce((s,v)=>s+v,0) / 3;

  // Gráfico 6 meses
  const chart6 = Array.from({length:6}, (_,i) => {
    const m = mesAtual - 5 + i; const a = m < 0 ? anoAtual-1 : anoAtual;
    return { mes: MESES[(m+12)%12], total: somaMes((m+12)%12, a) };
  });

  // Pagamentos do mês
  const pagsMes = pagamentos.filter(p => {
    const [,mo,a] = (p.data||'').split('/').map(Number);
    return mo-1 === mesAtual && a === anoAtual;
  }).sort((a,b) => (b.data||'').localeCompare(a.data||''));

  // Donut
  const presenciais = alunos.filter(a => a.tipoServico !== 'online' && a.ativo !== false);
  const online      = alunos.filter(a => a.tipoServico === 'online'  && a.ativo !== false);
  const recPresencial  = presenciais.reduce((s,a) => s + (Number(a.valor)||0), 0);
  const recConsultoria = online.reduce((s,a) => s + (Number(a.valor)||0), 0);

  // Inadimplentes
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const inadimplentes = alunos.filter(a => {
    if (a.ativo === false) return false;
    if (!a.vencimento) return false;
    const [d,m,an] = a.vencimento.split('/').map(Number);
    const v = new Date(an, m-1, d); v.setHours(0,0,0,0);
    return v < hoje;
  });

  // Vencendo em 7 dias
  const vencendo7 = alunos.filter(a => {
    if (a.ativo === false || !a.vencimento) return false;
    const [d,m,an] = a.vencimento.split('/').map(Number);
    const v = new Date(an,m-1,d); v.setHours(0,0,0,0);
    const diff = (v - hoje) / 86400000;
    return diff >= 0 && diff <= 7;
  });

  async function salvarPagamento(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const aluno = alunos.find(a => a.id === form.alunoId);
      await registrarPagamento({ ...form, valor: parseFloat((form.valor||'0').replace(',','.')), alunoNome: aluno?.nome || '' });
      toast('Pagamento registrado.');
      setShowForm(false); setForm({ alunoId:'', valor:'', forma:'PIX', tipo:'Mensal', data: new Date().toLocaleDateString('pt-BR'), descricao:'' });
      carregar();
    } catch { toast('Erro ao registrar.', 'error'); } finally { setSaving(false); }
  }

  async function deletarPag(id) {
    if (!window.confirm('Excluir este pagamento?')) return;
    try { await excluirPagamento(id); carregar(); } catch {}
  }

  function salvarMeta() {
    localStorage.setItem('finMeta', tempMeta); setMeta(tempMeta); setEditMeta(false);
  }

  async function salvarConfig() {
    setSalvandoCfg(true);
    try { await salvarConfigApp(cfgForm); setConfig(cfgForm); setEditCfg(false); toast('Configuração salva.'); }
    catch { toast('Erro ao salvar.', 'error'); } finally { setSalvandoCfg(false); }
  }

  const alunosFiltrados = alunos.filter(a => {
    if (a.ativo === false) return false;
    if (filtro === 'presencial') return a.tipoServico !== 'online';
    if (filtro === 'online') return a.tipoServico === 'online';
    return true;
  }).sort((a,b) => (a.nome||'').localeCompare(b.nome||''));

  return (
    <div className="px-8 pt-8 pb-8 max-w-\[1200px\] mx-auto w-full">
      {cobrando && <CobrarModal aluno={cobrando} config={config} toast={toast} onClose={() => setCobrando(null)} onSalvo={() => { setCobrando(null); carregar(); }} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-white">Financeiro</h1>
          <p className="text-[12px] text-white/35 mt-0.5">Controle de receitas e cobranças</p>
        </div>
        {aba === 'resumo' && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[12px] font-semibold text-white transition-all shadow-lg shadow-blue-900/30">
            <Plus size={13} /> Registrar
          </button>
        )}
      </div>

      {/* Abas */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] mb-6 w-fit">
        {[['resumo','Resumo'],['alunos','Alunos'],['recebimento','Recebimento']].map(([v,l]) => (
          <button key={v} onClick={() => setAba(v)} className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-all ${aba===v ? 'bg-[#0d1b2e] text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}>{l}</button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      )}

      {/* ── ABA RESUMO ─────────────────────────────────────────────────────────── */}
      {!loading && aba === 'resumo' && (
        <div className="space-y-6">
          {/* Modal registrar pagamento */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)' }}>
              <div className="w-full max-w-md rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                  <h2 className="text-[15px] font-bold text-white">Registrar pagamento</h2>
                  <button onClick={() => setShowForm(false)} className="p-1.5 text-white/40 hover:text-white"><X size={16} /></button>
                </div>
                <form onSubmit={salvarPagamento} className="p-6 space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Aluno</label>
                    <select value={form.alunoId} onChange={e => setForm(f => ({...f, alunoId: e.target.value}))}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/\[0\.04\] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
                      <option value="">Selecione...</option>
                      {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Valor (R$) *</label>
                      <input type="text" required value={form.valor} onChange={e => setForm(f=>({...f, valor:e.target.value}))} placeholder="0,00"
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Data *</label>
                      <input type="date" required value={form.data.split('/').reverse().join('-')} onChange={e => { const [a,m,d]=e.target.value.split('-'); setForm(f=>({...f, data:`${d}/${m}/${a}`})); }}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Forma</label>
                      <select value={form.forma} onChange={e => setForm(f=>({...f, forma:e.target.value}))}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/\[0\.04\] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
                        {FORMAS.map(f => <option key={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Tipo</label>
                      <select value={form.tipo} onChange={e => setForm(f=>({...f, tipo:e.target.value}))}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/\[0\.04\] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
                        {TIPOS.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Descrição</label>
                    <input type="text" value={form.descricao} onChange={e => setForm(f=>({...f, descricao:e.target.value}))}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all" />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-white/[0.08] text-[13px] text-white/50 hover:text-white transition-all">Cancelar</button>
                    <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white disabled:opacity-40 transition-all">
                      {saving ? 'Salvando...' : 'Registrar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label:'Receita do mês', value: fmt(receitaMes), sub: `${variacaoMes >= 0 ? '+' : ''}${variacaoMes.toFixed(1)}% vs. mês anterior`, subColor: variacaoMes >= 0 ? 'text-green-400' : 'text-red-400' },
              { label:'Receita no ano', value: fmt(receitaAno), sub:`${pagamentos.filter(p => { const [,mo,a] = (p.data||'').split('/').map(Number); return a === anoAtual; }).length} pagamentos`, subColor:'text-white/35' },
              { label:'Média mensal', value: fmt(mediaMensal), sub:'Baseado no ano atual', subColor:'text-white/35' },
              { label:'Projeção mês seguinte', value: fmt(projecao), sub:'Média dos últimos 3 meses', subColor:'text-white/35' },
            ].map((k,i) => (
              <div key={i} className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-4">
                <p className="text-[10px] font-semibold text-white/35 uppercase tracking-wider mb-2">{k.label}</p>
                <p className="text-[22px] font-bold text-white leading-none mb-1">{k.value}</p>
                <p className={`text-[11px] ${k.subColor}`}>{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Meta + Gráfico */}
          <div className="grid grid-cols-3 gap-4">
            {/* Meta */}
            <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">Meta do mês</p>
                <button onClick={() => setEditMeta(true)} className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors">Editar</button>
              </div>
              {editMeta ? (
                <div className="space-y-2">
                  <input type="text" value={tempMeta} onChange={e => setTempMeta(e.target.value)} placeholder="Ex: 5000"
                    className="w-full px-3 py-2 rounded-xl bg-white/\[0\.04\] border border-blue-500/30 text-white text-[13px] focus:outline-none transition-all" autoFocus />
                  <div className="flex gap-2">
                    <button onClick={() => setEditMeta(false)} className="flex-1 py-1.5 rounded-lg border border-white/[0.08] text-[12px] text-white/40 hover:text-white transition-all">Cancelar</button>
                    <button onClick={salvarMeta} className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-[12px] font-semibold text-white transition-all">OK</button>
                  </div>
                </div>
              ) : metaNum > 0 ? (
                <>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-[20px] font-bold text-white">{fmt(receitaMes)}</span>
                    <span className="text-[12px] text-white/35 mb-0.5">/ {fmt(metaNum)}</span>
                  </div>
                  <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden mb-1">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-blue-500 transition-all" style={{ width:`${metaPct}%` }} />
                  </div>
                  <p className={`text-[11px] ${metaPct >= 100 ? 'text-green-400' : 'text-white/35'}`}>{metaPct.toFixed(0)}% da meta {metaPct >= 100 ? '🎉' : ''}</p>
                </>
              ) : (
                <p className="text-[12px] text-white/25 mt-2">Clique em Editar para definir uma meta</p>
              )}
            </div>

            {/* Donut */}
            <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-5">
              <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-3">Distribuição</p>
              <DonutChart presencial={recPresencial} consultoria={recConsultoria} />
            </div>

            {/* Inadimplência */}
            <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-5">
              <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-3">Situação dos planos</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-white/60 flex items-center gap-1.5"><AlertTriangle size={12} className="text-red-400" /> Vencidos</span>
                  <span className={`text-[13px] font-bold ${inadimplentes.length > 0 ? 'text-red-400' : 'text-white/40'}`}>{inadimplentes.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-white/60 flex items-center gap-1.5"><AlertTriangle size={12} className="text-amber-400" /> Vencendo em 7d</span>
                  <span className={`text-[13px] font-bold ${vencendo7.length > 0 ? 'text-amber-400' : 'text-white/40'}`}>{vencendo7.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-white/60 flex items-center gap-1.5"><Check size={12} className="text-green-400" /> Em dia</span>
                  <span className="text-[13px] font-bold text-green-400">{alunos.filter(a => a.ativo !== false).length - inadimplentes.length - vencendo7.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico 6 meses */}
          <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-5">
            <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-4">Receita dos últimos 6 meses</p>
            <BarChart data={chart6} />
          </div>

          {/* Lista pagamentos do mês */}
          <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
              <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">
                {MESES[mesAtual]} {anoAtual} · {fmt(receitaMes)}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setMesOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all"><ChevronLeft size={14} /></button>
                {mesOffset !== 0 && <button onClick={() => setMesOffset(0)} className="px-2 py-1 rounded-lg text-[10px] text-blue-400 hover:bg-blue-500/10 transition-all">Hoje</button>}
                <button onClick={() => setMesOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all"><ChevronRight size={14} /></button>
              </div>
            </div>
            {pagsMes.length === 0 ? (
              <p className="text-[12px] text-white/25 text-center py-8">Nenhum pagamento registrado</p>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {pagsMes.map(p => (
                  <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors group">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white">{p.alunoNome || '—'}</p>
                      <p className="text-[11px] text-white/35">{p.data} · {p.forma || '—'}</p>
                    </div>
                    <span className="text-[14px] font-bold text-blue-400">{fmt(Number(p.valor))}</span>
                    <button onClick={() => deletarPag(p.id)} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ABA ALUNOS ─────────────────────────────────────────────────────────── */}
      {!loading && aba === 'alunos' && (
        <div className="space-y-4">
          {/* Filtro */}
          <div className="flex gap-2">
            {[['todos','Todos'],['presencial','Presencial'],['online','Online']].map(([v,l]) => (
              <button key={v} onClick={() => setFiltro(v)} className={`px-4 py-2 rounded-xl text-[12px] font-semibold transition-all ${filtro===v ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30' : 'bg-white/[0.04] text-white/40 hover:text-white'}`}>{l}</button>
            ))}
          </div>

          {/* Inadimplentes destaque */}
          {inadimplentes.length > 0 && filtro !== 'online' && (
            <div className="rounded-2xl bg-red-500/[0.06] ring-1 ring-red-500/15 p-4">
              <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wider mb-2">⚠ Planos vencidos ({inadimplentes.length})</p>
              <div className="space-y-1.5">
                {inadimplentes.map(a => (
                  <div key={a.id} className="flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-semibold text-white">{a.nome}</span>
                      <span className="text-[11px] text-red-400 ml-2">venceu {a.vencimento}</span>
                    </div>
                    <button onClick={() => setCobrando(a)} className="px-3 py-1.5 rounded-xl bg-red-500/15 text-[11px] font-semibold text-red-400 hover:bg-red-500/25 transition-all">Cobrar</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista completa */}
          <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.05]">
              <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">{alunosFiltrados.length} aluno{alunosFiltrados.length !== 1 ? 's' : ''}</p>
            </div>
            {alunosFiltrados.length === 0 ? (
              <p className="text-[12px] text-white/25 text-center py-8">Nenhum aluno</p>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {alunosFiltrados.map(a => {
                  const [d,m,an] = (a.vencimento||'').split('/').map(Number);
                  const venc = a.vencimento ? new Date(an,m-1,d) : null;
                  const diff = venc ? Math.round((venc - hoje) / 86400000) : null;
                  const status = diff === null ? null : diff < 0 ? 'vencido' : diff <= 7 ? 'urgente' : 'ok';
                  return (
                    <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors group">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${status==='vencido' ? 'bg-red-400' : status==='urgente' ? 'bg-amber-400' : status==='ok' ? 'bg-green-400' : 'bg-white/20'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white">{a.nome}</p>
                        <p className="text-[11px] text-white/35">{a.tipoServico === 'online' ? 'Online' : 'Presencial'} · {a.plano || a.tipo || '—'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-bold text-blue-400">{fmt(Number(a.valor)||0)}</p>
                        {a.vencimento && (
                          <p className={`text-[11px] ${status==='vencido' ? 'text-red-400' : status==='urgente' ? 'text-amber-400' : 'text-white/35'}`}>
                            {status==='vencido' ? `venceu ${a.vencimento}` : `vence ${a.vencimento}`}
                          </p>
                        )}
                      </div>
                      <button onClick={() => setCobrando(a)} className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-500/15 text-[11px] font-semibold text-blue-400 hover:bg-blue-500/25 transition-all">
                        <DollarSign size={11} /> Cobrar
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ABA RECEBIMENTO ──────────────────────────────────────────────────────── */}
      {!loading && aba === 'recebimento' && (
        <div className="grid grid-cols-2 gap-4">
          {/* Config PIX */}
          <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <QrCode size={16} className="text-blue-400" />
                <p className="text-[14px] font-bold text-white">PIX</p>
              </div>
              <button onClick={() => setEditCfg(c => !c)} className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors">
                {editCfg ? 'Cancelar' : 'Editar'}
              </button>
            </div>
            {editCfg ? (
              <div className="space-y-3">
                {[['pixChave','Chave PIX (CPF/e-mail/telefone/aleatória)'],['pixNome','Nome do recebedor'],['pixCidade','Cidade'],['pixLink','Link de pagamento (Asaas, Stripe…)']].map(([k,l]) => (
                  <div key={k}>
                    <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1">{l}</label>
                    <input value={cfgForm[k]} onChange={e => setCfgForm(f => ({...f, [k]: e.target.value}))} placeholder={k === 'pixLink' ? 'https://...' : ''}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/\[0\.04\] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all" />
                  </div>
                ))}
                <button onClick={salvarConfig} disabled={salvandoCfg} className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white disabled:opacity-40 transition-all">
                  {salvandoCfg ? 'Salvando...' : 'Salvar configuração'}
                </button>
              </div>
            ) : config.pixChave ? (
              <div className="space-y-3">
                {[['Chave PIX', config.pixChave],['Nome', config.pixNome],['Cidade', config.pixCidade]].filter(([,v]) => v).map(([l,v]) => (
                  <div key={l} className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                    <span className="text-[11px] text-white/35">{l}</span>
                    <span className="text-[12px] font-semibold text-white">{v}</span>
                  </div>
                ))}
                {config.pixLink && (
                  <a href={config.pixLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-500/[0.08] ring-1 ring-blue-500/20 text-blue-400 text-[12px] font-semibold hover:bg-blue-500/15 transition-all">
                    <ExternalLink size={13} /> Abrir link de pagamento
                  </a>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <QrCode size={32} className="text-white/15 mx-auto mb-2" />
                <p className="text-[12px] text-white/30">Configure sua chave PIX para receber cobranças</p>
              </div>
            )}
          </div>

          {/* Asaas */}
          <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-amber-400" />
              <p className="text-[14px] font-bold text-white">Asaas (recorrência automática)</p>
            </div>
            <p className="text-[12px] text-white/40 leading-relaxed mb-4">
              O Asaas automatiza cobranças recorrentes, envia boletos e links de pagamento por WhatsApp, e confirma pagamentos automaticamente. As chaves são gerenciadas no app mobile.
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.05]">
                <Check size={14} className="text-green-400 shrink-0 mt-0.5" />
                <p className="text-[12px] text-white/50">Cobranças automáticas mensais/trimestrais</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.05]">
                <Check size={14} className="text-green-400 shrink-0 mt-0.5" />
                <p className="text-[12px] text-white/50">Link de pagamento por WhatsApp</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.05]">
                <Check size={14} className="text-green-400 shrink-0 mt-0.5" />
                <p className="text-[12px] text-white/50">Confirmação automática no app mobile</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
