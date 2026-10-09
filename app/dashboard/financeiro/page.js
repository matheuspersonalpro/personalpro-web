'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { buscarPagamentos, buscarAlunos, registrarPagamento, excluirPagamento, atualizarAluno, buscarConfigApp, salvarConfigApp, renovarPlanoPorPagamentoAsaas } from '@/lib/firestore';
import { valorNum, proximoVencimento, diaAncoraDe, ultimaPagaAsaas, resumoFinanceiro, mrrAtivos, diasAteVencimento, montarAReceber, previstosManuais, agruparPorMes, somaBruto, somaLiquido, liquidoAsaas } from '@/lib/financeiro';
import { planoCanonico } from '@/lib/planos';
import { calcStatus } from '@/lib/statusAluno';
import { buscarCobrancasAssinatura } from '@/lib/asaas';
import { gerarPixEMV } from '@/lib/pix';
import { TrendingUp, Plus, X, ChevronLeft, ChevronRight, Trash2, DollarSign, Users, CreditCard, Target, Zap, QrCode, ExternalLink, Check, AlertTriangle, Copy, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';

const FATOR_PLANO = { Mensal: 1, Trimestral: 3, Semestral: 6, Anual: 12 };
const MESES_LONGOS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const TIPOS = ['Mensal','Trimestral','Semestral','Anual','Avulso'];
const FORMAS = ['PIX','Dinheiro','Cartão de Crédito','Cartão de Débito','Transferência','Asaas'];

function fmt(v) { return (v||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' }); }
function fmtPct(v) { return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`; }
function fmtDataISO(iso) {
  if (!iso) return null;
  const [a, m, d] = iso.split('-');
  return d && m && a ? `${d}/${m}/${a}` : null;
}

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
              <div className={`absolute inset-0 rounded-t-lg transition-all ${isLast ? 'bg-accent' : 'bg-accent/30 group-hover:bg-accent/50'}`} />
            </div>
            <span className={`text-[10px] font-medium ${isLast ? 'text-accent' : 'text-white/30'}`}>{item.mes}</span>
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
        <circle cx="45" cy="45" r={r} fill="none" stroke="#A3A8B0" strokeWidth="12"
          strokeDasharray={`${dashC} ${dashP}`} strokeDashoffset={circ * 0.25} />
        <circle cx="45" cy="45" r={r} fill="none" stroke="#C6F432" strokeWidth="12"
          strokeDasharray={`${dashP} ${dashC}`} strokeDashoffset={circ * 0.25} />
        <text x="45" y="49" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">{pPct}%</text>
      </svg>
      <div className="space-y-2">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-accent" /><span className="text-[12px] text-white/60">Presencial <span className="text-white font-semibold">{pPct}%</span></span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#A3A8B0]" /><span className="text-[12px] text-white/60">Consultoria <span className="text-white font-semibold">{100-pPct}%</span></span></div>
      </div>
    </div>
  );
}

// Trava de tempo do sync: reabrir a tela dentro de 10 min nao consulta o Asaas de novo.
// Fica no escopo do MODULO de proposito -- sobrevive a navegar entre abas do painel.
const INTERVALO_MIN_SYNC_MS = 10 * 60 * 1000;
let ultimaSyncAsaasTs = 0;

// Aceita "DD/MM/AAAA" e "AAAA-MM-DD". Devolve Date ou null.
function parseDataFlex(str) {
  if (!str) return null;
  const x = String(str).slice(0, 10);
  const nums = x.includes('/') ? x.split('/').map(Number) : x.split('-').map(Number).reverse();
  const [d, m, a] = nums;
  if (!d || !m || !a) return null;
  const dt = new Date(a, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
}

// Renova o plano depois de um pagamento MANUAL (PIX/dinheiro). Mesma conta do app
// (NovoPagamento): parte do vencimento atual se ainda estiver no futuro, senao de hoje;
// gruda no ultimo dia do mes curto (31/01 + 1 mes = 28/02, nao 03/03); preserva o dia
// contratado; e derruba a bandeira de atrasado, senao o aluno fica pago e "Atrasado".
//
// Plano que nao da pra reconhecer NAO renova a data (a mesma regra do app: melhor nao
// renovar do que gravar data errada) -- mas a bandeira cai, porque o pagamento entrou.
// Antes: setMonth a partir da data antiga, mesmo vencida, e adivinhando o plano por
// includes('3') -- que casa ate "Personal 3x na semana".
async function renovarPlanoManual(aluno) {
  const plano = planoCanonico(aluno.plano || aluno.tipo);
  const ancora = diaAncoraDe(aluno);
  const novoVenc = plano ? proximoVencimento(aluno.vencimento, plano, new Date(), ancora) : null;
  await atualizarAluno(aluno.id, {
    ...(novoVenc ? { vencimento: novoVenc } : {}),
    ...(novoVenc && ancora ? { diaVencimento: ancora } : {}),
    pagamentoVencido: false,
  });
  return novoVenc;
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
    const v = valorNum(valor);
    const emv = gerarPixEMV({ chave: config.pixChave, nome: config.pixNome||'Personal', cidade: config.pixCidade||'Brasil', valor: v > 0 ? v : valorNum(aluno?.valor) });
    setPixEmv(emv);
    setModo('pix');
  }

  async function confirmarRecebimento() {
    setSalvando(true);
    try {
      const v = valorNum(valor) || valorNum(aluno?.valor);
      await registrarPagamento({ alunoId: aluno.id, alunoNome: aluno.nome, valor: v, forma, data: new Date().toLocaleDateString('pt-BR'), tipo: aluno.plano||aluno.tipo||'Mensal', descricao: `Mensalidade — ${aluno.nome}` });
      const novoVenc = await renovarPlanoManual(aluno);
      toast(novoVenc
        ? `Pagamento de ${aluno.nome} confirmado! Plano renovado até ${novoVenc}.`
        : `Pagamento de ${aluno.nome} confirmado. O plano "${aluno.plano || aluno.tipo || ''}" não foi reconhecido (use Mensal, Trimestral, Semestral ou Anual), então o vencimento ficou como estava.`);
      onSalvo();
    } catch { toast('Erro ao confirmar pagamento.', 'error'); } finally { setSalvando(false); }
  }

  async function registrarSomente() {
    setSalvando(true);
    try {
      const v = valorNum(valor) || valorNum(aluno?.valor);
      await registrarPagamento({ alunoId: aluno.id, alunoNome: aluno.nome, valor: v, forma, data: new Date().toLocaleDateString('pt-BR'), tipo: aluno.plano||aluno.tipo||'Mensal', descricao: `Pagamento — ${aluno.nome}` });
      toast('Pagamento registrado.');
      onSalvo();
    } catch { toast('Erro ao registrar.', 'error'); } finally { setSalvando(false); }
  }

  async function copiar(txt) {
    try { await navigator.clipboard.writeText(txt); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch {}
  }

  const qrUrl = pixEmv ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(pixEmv)}&size=180x180&bgcolor=ffffff&color=0a0b0d&qzone=1` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-[22px] bg-[#141619] ring-1 ring-white/[0.08] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-[15px] font-bold text-white">Cobrar aluno</h2>
            <p className="text-[11px] text-white/35">{aluno.nome} · {fmt(aluno.valor)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white"><X size={16} /></button>
        </div>

        {modo === 'pix' ? (
          <div className="p-6 text-center">
            {qrUrl && <img src={qrUrl} alt="QR PIX" className="mx-auto mb-4 rounded-[14px] ring-1 ring-accent/20" width={180} height={180} />}
            <div className="flex items-center gap-2 p-3 rounded-[14px] bg-white/[0.04] ring-1 ring-white/[0.06] mb-4">
              <p className="flex-1 text-[10px] text-white/50 break-all font-mono text-left">{pixEmv.slice(0,40)}...</p>
              <button onClick={() => copiar(pixEmv)} className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/15 text-accent text-[11px]">
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
                className="w-full px-3 py-2.5 rounded-[14px] bg-white/[0.04] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-accent/60 transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Forma de pagamento</label>
              <div className="flex flex-wrap gap-2">
                {FORMAS.map(f => (
                  <button key={f} onClick={() => setForma(f)} className={`px-3 py-1.5 rounded-[14px] text-[11px] font-semibold transition-all ${forma===f ? 'bg-accent/20 text-accent ring-1 ring-accent/30' : 'bg-white/[0.04] text-white/40 hover:text-white'}`}>{f}</button>
                ))}
              </div>
            </div>
            {modo === 'confirmar' && aluno.vencimento && (
              <div className="p-3 rounded-[14px] bg-accent/[0.06] ring-1 ring-accent/15">
                <p className="text-[11px] text-accent">Plano será renovado automaticamente</p>
                <p className="text-[10px] text-white/35 mt-0.5">Vencimento atual: {aluno.vencimento}</p>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModo(null)} className="flex-1 py-2.5 rounded-[14px] border border-white/[0.08] text-[13px] text-white/50 hover:text-white transition-all">Voltar</button>
              <button onClick={modo==='confirmar' ? confirmarRecebimento : registrarSomente} disabled={salvando}
                className="flex-1 py-2.5 rounded-[14px] bg-accent hover:bg-accent-hover text-[13px] font-semibold text-on-accent disabled:opacity-40 transition-all">
                {salvando ? 'Salvando...' : (modo==='confirmar' ? 'Confirmar' : 'Registrar')}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {config?.pixLink && (
              <a href={config.pixLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-[14px] hover:bg-white/[0.04] ring-1 ring-white/[0.06] text-left transition-all">
                <ExternalLink size={16} className="text-accent shrink-0" />
                <div><p className="text-[13px] font-semibold text-white">Abrir link de pagamento</p><p className="text-[11px] text-white/35">Compartilhar com o aluno</p></div>
              </a>
            )}
            <button onClick={gerarPix} className="flex items-center gap-3 w-full px-4 py-3 rounded-[14px] hover:bg-white/[0.04] ring-1 ring-white/[0.06] text-left transition-all">
              <QrCode size={16} className="text-accent shrink-0" />
              <div><p className="text-[13px] font-semibold text-white">Gerar QR Code PIX</p><p className="text-[11px] text-white/35">Pagamento por aproximação</p></div>
            </button>
            <button onClick={() => setModo('confirmar')} className="flex items-center gap-3 w-full px-4 py-3 rounded-[14px] hover:bg-white/[0.04] ring-1 ring-white/[0.06] text-left transition-all">
              <Check size={16} className="text-accent shrink-0" />
              <div><p className="text-[13px] font-semibold text-white">Confirmar recebimento</p><p className="text-[11px] text-white/35">Registra e renova o plano</p></div>
            </button>
            <button onClick={() => setModo('registrar')} className="flex items-center gap-3 w-full px-4 py-3 rounded-[14px] hover:bg-white/[0.04] ring-1 ring-white/[0.06] text-left transition-all">
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
  const [confirmPagId, setConfirmPagId] = useState(null);

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
  const [filtro, setFiltro] = useState('presencial');

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

  // ── Sincronização Asaas ──────────────────────────────────────────────────────
  // Espelha screens/personal/FinanceiroPersonal.js (app mobile): busca as
  // cobranças de cada assinatura ativa, guarda o "próximo recebimento" (valor
  // bruto, líquido real e data prevista de crédito) e, se detectar um pagamento
  // novo que ainda não foi registrado aqui, registra e estende o vencimento
  // automaticamente (a assinatura Asaas é sempre mensal, mesmo em planos
  // trimestrais/semestrais — cada pagamento avança exatamente 1 mês).
  const [sincronizando, setSincronizando] = useState(false);

  const sincronizandoRef = useRef(false);

  // Port de FinanceiroPersonal.sincronizarAsaas do app. Cada regra abaixo veio de um
  // incidente real (Talita, Celia, Andre Coral) -- os comentarios explicam. O que
  // estava aqui ANTES era uma versao ingenua, e rodava toda vez que esta tela abria:
  //   - pagas[0] sem ordenar: podia pegar um pagamento antigo, registrar de novo e
  //     empurrar o vencimento um mes a mais;
  //   - addDoc com id aleatorio: o webhook grava asaas_<id>, entao o MESMO pagamento
  //     entrava em dobro;
  //   - setMonth(+1): vencimento dia 29/30/31 pulando mes;
  //   - consultava TODA a carteira a cada abertura.
  const sincronizarAsaas = useCallback(async ({ forcar = false } = {}) => {
    if (sincronizandoRef.current) return;
    // A trava de TEMPO vem antes: e ela que corta o ciclo de reabertura da tela.
    if (!forcar && Date.now() - ultimaSyncAsaasTs < INTERVALO_MIN_SYNC_MS) return;
    ultimaSyncAsaasTs = Date.now();
    sincronizandoRef.current = true;
    setSincronizando(true);
    const falhas = [];
    try {
      const listaAlunos = await buscarAlunos();
      // So quem tem cobranca relevante AGORA: nunca sincronizado, credito previsto na
      // janela de -7 a +7 dias, ou marcado como vencido. Consultar a carteira inteira a
      // cada abertura era gasto a toa.
      const AGORA = Date.now();
      const JANELA = 7 * 24 * 60 * 60 * 1000;
      const precisaOlhar = (a) => {
        if (a.pagamentoVencido) return true;
        const pr = a.proximoRecebimento;
        if (!pr || !pr.dataCredito) return true;
        const d = parseDataFlex(pr.dataCredito);
        if (!d) return true;
        return Math.abs(d.getTime() - AGORA) <= JANELA;
      };
      // Exige asaasSubscriptionId (nao so customerId): so quem tem assinatura ATIVA agora.
      const comAsaas = listaAlunos
        .filter(a => a.asaasSubscriptionId && a.cobrancaAutomatica)
        .filter(a => forcar || precisaOlhar(a));
      if (!comAsaas.length) return;
      let houveMudanca = false;

      for (const aluno of comAsaas) {
        try {
          // Por ASSINATURA, nao por cliente: cobranca residual de assinatura antiga ou
          // cancelada nao contamina os dados da ativa.
          const cobr = await buscarCobrancasAssinatura(aluno.asaasSubscriptionId);
          const lista = cobr?.data || [];
          const patch = {};

          // Proximo recebimento. PENDING e sempre a proxima cobranca de verdade e vence
          // QUALQUER CONFIRMED antiga: comparar as duas por dueDate pegava a mais velha
          // ja paga e escondia reagendamentos feitos no painel do Asaas (ferias). So cai
          // pra CONFIRMED recente (ainda em transito de credito) se nao houver PENDING.
          const limiteAntigo = new Date(); limiteAntigo.setDate(limiteAntigo.getDate() - 40);
          const pendente = lista
            .filter(c => c.status === 'PENDING')
            .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0))[0];
          const confirmadaRecente = lista
            .filter(c => c.status === 'CONFIRMED' && new Date(c.dueDate || 0) >= limiteAntigo)
            .sort((a, b) => new Date(b.dueDate || 0) - new Date(a.dueDate || 0))[0];
          const aCaminho = pendente || confirmadaRecente;
          const proximoRecebimento = aCaminho ? {
            valor:       aCaminho.value ?? null,
            netValue:    aCaminho.netValue ?? null,
            dataCredito: aCaminho.estimatedCreditDate || aCaminho.creditDate || null,
            dueDate:     aCaminho.dueDate || null,
            status:      aCaminho.status || null,
            billingType: aCaminho.billingType || null,
          } : null;
          if (JSON.stringify(aluno.proximoRecebimento || null) !== JSON.stringify(proximoRecebimento)) {
            patch.proximoRecebimento = proximoRecebimento;
          }

          // Cobranca VENCIDA ganha da PENDING: a assinatura segue gerando a do mes
          // seguinte, e espelhar so a PENDING jogava o vencimento pra frente de quem nao
          // pagou -- o aluno nunca era bloqueado (caso do Andre Coral).
          const vencida = lista
            .filter(c => c.status === 'OVERDUE')
            .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0))[0];
          if (vencida && aluno.pagamentoVencido !== true) patch.pagamentoVencido = true;
          const alvoVenc = vencida || pendente;
          if (alvoVenc?.dueDate) {
            const [ano, mes, dia] = String(alvoVenc.dueDate).split('-');
            if (ano && mes && dia) {
              const vencAsaas = `${dia}/${mes}/${ano}`;
              if (vencAsaas !== aluno.vencimento) patch.vencimento = vencAsaas;
            }
          }

          // Renovacao quando entra pagamento novo. A do ciclo mais recente, pelo
          // VENCIMENTO (ultimaPagaAsaas): por paymentDate a cobranca do mes passado no
          // cartao passava na frente e era registrada de novo.
          const ultima = ultimaPagaAsaas(lista);
          const dataUltima = ultima && (ultima.paymentDate || ultima.confirmedDate);
          if (ultima && dataUltima && aluno.ultimoPagamentoAsaasId !== ultima.id) {
            // Transacao: le ultimoPagamentoAsaasId na hora de gravar e so cria o
            // pagamento se ainda nao foi processado (fecha a corrida entre duas abas, ou
            // site + app abertos juntos).
            const gravou = await renovarPlanoPorPagamentoAsaas(aluno.id, aluno.nome, ultima, patch);
            if (gravou) houveMudanca = true;
            // Pagar um mes nao quita OUTRO que continua vencido.
            if (gravou && vencida) {
              const [ano, mes, dia] = String(vencida.dueDate).split('-');
              await atualizarAluno(aluno.id, { pagamentoVencido: true, vencimento: `${dia}/${mes}/${ano}` });
            }
          } else if (Object.keys(patch).length) {
            await atualizarAluno(aluno.id, patch); houveMudanca = true;
          }
        } catch (e) {
          console.error(`Erro ao sincronizar Asaas do aluno ${aluno.nome}:`, e);
          falhas.push(aluno.nome);
        }
      }
      if (houveMudanca) carregar();
    } catch (e) {
      console.error('Erro ao sincronizar Asaas:', e);
    } finally {
      sincronizandoRef.current = false;
      setSincronizando(false);
      // Antes isso era 100% silencioso: um erro no meio deixava o personal achando que
      // estava tudo em dia sem estar.
      if (falhas.length) toast(`Não consegui sincronizar o Asaas de: ${falhas.join(', ')}. Tentando de novo na próxima abertura.`, 'error');
    }
  }, [carregar]);

  useEffect(() => { sincronizarAsaas(); }, [sincronizarAsaas]);

  // ── Estatísticas ──────────────────────────────────────────────────────────────
  const agora = new Date();
  const mesSel = new Date(agora.getFullYear(), agora.getMonth() + mesOffset, 1);
  const mesAtual = mesSel.getMonth(); const anoAtual = mesSel.getFullYear();

  // Faturado / Recebido / A receber: o mesmo cálculo do app (utils/financeiro).
  // Recebido = o que JÁ caiu na conta no mês (cartão cai D+32), por isso nem
  // sempre bate com o Faturado.
  const fin = resumoFinanceiro(pagamentos, mesSel);
  const proximosRecebimentos = alunos
    .filter(a => a.cobrancaAutomatica)
    .map(a => {
      const pr = a.proximoRecebimento;
      if (pr && pr.dataCredito) {
        const data = parseDataFlex(pr.dataCredito);
        if (!data) return null;
        const bruto = valorNum(pr.valor || a.valor);
        return { alunoId: a.id, nome: a.nome, data, bruto, liquido: liquidoAsaas(bruto, pr.netValue), estimado: false };
      }
      const venc = parseDataFlex(a.vencimento);
      if (!venc) return null;
      const bruto = valorNum(a.valor) / (FATOR_PLANO[a.plano] || 1);
      const d = new Date(venc); d.setDate(d.getDate() + 32);
      return { alunoId: a.id, nome: a.nome, data: d, bruto, liquido: liquidoAsaas(bruto, null), estimado: true };
    })
    .filter(Boolean)
    .sort((x, y) => x.data - y.data);
  const aReceberFuturo = montarAReceber(fin.listaAReceber, proximosRecebimentos, agora, previstosManuais(alunos, agora));
  const aReceberPorMes = agruparPorMes(aReceberFuturo);
  const totalBrutoFuturo = somaBruto(aReceberFuturo);
  const totalLiquidoFuturo = somaLiquido(aReceberFuturo);
  // Como no Resumo do app: o "A receber" do topo é o do MÊS atual (bruto); a lista completa vem
  // abaixo em "Quando cai na conta".
  const grupoMesAtual = aReceberPorMes.find(g => g.mes === agora.getMonth() && g.ano === agora.getFullYear());
  const totalBrutoProximo = grupoMesAtual?.bruto || 0;
  const totalMensal = mrrAtivos(alunos);
  const inadimplentesResumo = alunos
    .filter(a => a.ativo !== false && calcStatus(a) === 'pendente')
    .map(a => ({ ...a, diasAtraso: -(diasAteVencimento(a.vencimento) || 0) }))
    .sort((a, b) => b.diasAtraso - a.diasAtraso);
  const totalInadimplente = inadimplentesResumo.reduce((t, a) => t + valorNum(a.valor), 0);
  const proxMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
  const alunosNaProjecao = alunos.filter(a => { const d = diasAteVencimento(a.vencimento); return a.ativo !== false && (d === null || d > -60); });
  const projecaoProx = alunosNaProjecao.reduce((t, a) => t + valorNum(a.valor) / (FATOR_PLANO[a.plano] || 1), 0);

  function somaMes(m, y) {
    return pagamentos.filter(p => {
      const [d, mo, a] = (p.data || '').split('/').map(Number);
      return mo - 1 === m && a === y;
    }).reduce((s, p) => s + valorNum(p.valor), 0);
  }

  const receitaMes    = fin.recebido;
  const receitaAno    = Array.from({length:12}, (_,i) => somaMes(i, anoAtual)).reduce((s,v) => s+v, 0);
  const mesAnteriorV  = resumoFinanceiro(pagamentos, new Date(anoAtual, mesAtual - 1, 1)).recebido;
  const variacaoMes   = mesAnteriorV > 0 ? ((receitaMes - mesAnteriorV) / mesAnteriorV * 100) : 0;
  // Dividia sempre por 12 meses fixos, mesmo quando só o mês atual tinha
  // pagamento registrado (achado pelo dono: julho com R$15.766 virava média
  // de R$1.313, quando na verdade É a média real até aqui). Divide pelos
  // meses do ano JÁ passados (Jan até o mês atual), não pelos 12 do ano
  // inteiro — meses futuros óbvio que ainda não têm receita.
  const mesesDecorridosAno = anoAtual === agora.getFullYear() ? agora.getMonth() + 1 : 12;
  const mediaMensal   = receitaAno / Math.max(1, mesesDecorridosAno);
  const metaNum       = valorNum(meta);
  const metaPct       = metaNum > 0 ? Math.min(100, (receitaMes / metaNum) * 100) : 0;

  // Projeção próximo mês: média dos últimos 3 meses COM pagamento registrado
  // (ignora meses sem histórico em vez de contar como R$0 — achado pelo dono:
  // com só 1 mês de dado, a média de 3 meses saía 0 mesmo já havendo receita
  // recorrente confirmada no Asaas pra agosto). Sem NENHUM mês anterior com
  // dado, cai no fallback de baixo (soma dos ativos), nunca fica zerada à toa.
  const prox3 = Array.from({length:3}, (_,i) => {
    const m = mesAtual - i - 1; const a = m < 0 ? anoAtual - 1 : anoAtual;
    return somaMes((m+12)%12, a);
  }).filter(v => v > 0);
  const projecaoHistorico = prox3.length ? prox3.reduce((s,v)=>s+v,0) / prox3.length : null;
  // Fallback: soma do valor mensal de todos os alunos ativos (o que
  // "deveria" entrar mês que vem, no plano) — usado quando ainda não há
  // histórico suficiente pra calcular uma média de verdade.
  const receitaEsperadaAtivos = alunos
    .filter(a => a.ativo !== false)
    .reduce((s,a) => s + valorNum(a.valor), 0);
  const projecao = projecaoHistorico ?? receitaEsperadaAtivos;

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
  const recPresencial  = presenciais.reduce((s,a) => s + valorNum(a.valor), 0);
  const recConsultoria = online.reduce((s,a) => s + valorNum(a.valor), 0);

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
      await registrarPagamento({ ...form, valor: valorNum(form.valor), alunoNome: aluno?.nome || '' });
      // Como no app (NovoPagamento): registrar o pagamento tambem renova o plano.
      const novoVenc = aluno ? await renovarPlanoManual(aluno) : null;
      toast(novoVenc ? `Pagamento registrado. Plano renovado até ${novoVenc}.` : 'Pagamento registrado.');
      setShowForm(false); setForm({ alunoId:'', valor:'', forma:'PIX', tipo:'Mensal', data: new Date().toLocaleDateString('pt-BR'), descricao:'' });
      carregar();
    } catch { toast('Erro ao registrar.', 'error'); } finally { setSaving(false); }
  }

  async function deletarPag(id) {
    try {
      await excluirPagamento(id);
      setConfirmPagId(null);
      carregar();
      toast('Pagamento excluído.');
    } catch {
      // Antes era catch {} — se falhasse, a linha simplesmente não sumia e o
      // personal não tinha ideia de que o pagamento continuava lá.
      toast('Erro ao excluir o pagamento.', 'error');
    }
  }

  function salvarMeta() {
    localStorage.setItem('finMeta', tempMeta); setMeta(tempMeta); setEditMeta(false);
  }

  async function salvarConfig() {
    setSalvandoCfg(true);
    try { await salvarConfigApp(cfgForm); setConfig(cfgForm); setEditCfg(false); toast('Configuração salva.'); }
    catch { toast('Erro ao salvar.', 'error'); } finally { setSalvandoCfg(false); }
  }

  // Mesma regra do app (FinanceiroPersonal.statusPlano): a bandeira de vencido do Asaas vem
  // primeiro; quem tem cobrança automática sem bandeira está em dia; os demais pela data.
  const statusPlanoFin = (a) => {
    if (a.pagamentoVencido) return 'pendente';
    if (a.cobrancaAutomatica) return 'pago';
    const dias = diasAteVencimento(a.vencimento);
    if (dias === null) return 'pago';
    if (dias < 0) return 'pendente';
    if (dias <= 7) return 'vencendo';
    return 'pago';
  };
  const STATUS_FIN = {
    pago:     { cls: 'bg-accent/12 text-accent',      label: 'Em dia' },
    vencendo: { cls: 'bg-amber-500/12 text-amber-400', label: 'Vencendo' },
    pendente: { cls: 'bg-red-500/12 text-red-400',     label: 'Atrasado' },
  };
  const METODO_LABEL = {
    asaas_cartao: 'Cartão · Asaas', confirmado: 'Confirmado por você', pix_recorrente: 'Pix Recorrente', pix_auto: 'Pix Recorrente',
    pix_qr: 'PIX Copia e Cola', pix: 'PIX', cartao: 'Link de Pagamento', cartao_cred: 'Cartão Crédito', cartao_deb: 'Cartão Débito',
    dinheiro: 'Dinheiro', transferencia: 'Transferência',
  };
  const tsPag = (pg) => pg.criadoEm?.seconds ? pg.criadoEm.seconds * 1000 : (() => { const [d, mo, y] = String(pg.data || '').split('/').map(Number); return d ? new Date(y, mo - 1, d).getTime() : 0; })();
  const ultimoMetodoDoAluno = (alunoId) => {
    const meus = pagamentos.filter(pg => pg.alunoId === alunoId).sort((x, y) => tsPag(y) - tsPag(x));
    return meus[0]?.metodo || null;
  };
  const contPersonal = alunos.filter(a => a.ativo !== false && a.tipoServico !== 'online').length;
  const contConsultoria = alunos.filter(a => a.ativo !== false && a.tipoServico === 'online').length;

  const alunosFiltrados = alunos.filter(a => {
    if (a.ativo === false) return false;
    if (filtro === 'presencial') return a.tipoServico !== 'online';
    if (filtro === 'online') return a.tipoServico === 'online';
    return true;
  }).sort((a,b) => (a.nome||'').localeCompare(b.nome||''));

  return (
    <div className="px-4 pt-4 pb-6 md:px-8 md:pt-8 md:pb-8 max-w-[1200px] mx-auto w-full">
      {cobrando && <CobrarModal aluno={cobrando} config={config} toast={toast} onClose={() => setCobrando(null)} onSalvo={() => { setCobrando(null); carregar(); }} />}

      <ConfirmModal
        open={!!confirmPagId}
        title="Excluir pagamento?"
        message="Este registro de pagamento será removido permanentemente do seu histórico financeiro."
        onConfirm={() => deletarPag(confirmPagId)}
        onCancel={() => setConfirmPagId(null)}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-white font-display">Financeiro</h1>
          <p className="text-[12px] text-white/35 mt-0.5">Controle de receitas e cobranças</p>
        </div>
        {aba === 'resumo' && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-[14px] bg-accent hover:bg-accent-hover text-[12px] font-semibold text-on-accent transition-all shadow-lg shadow-black/30">
            <Plus size={13} /> Registrar
          </button>
        )}
      </div>

      {/* Abas */}
      <div className="flex gap-1 p-1 rounded-[14px] bg-white/[0.03] ring-1 ring-white/[0.06] mb-6 w-fit">
        {[['resumo','Resumo'],['alunos','Alunos'],['recebimento','Recebimento']].map(([v,l]) => (
          <button key={v} onClick={() => setAba(v)} className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-all ${aba===v ? 'bg-[#141619] text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}>{l}</button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
      )}

      {/* ── ABA RESUMO ─────────────────────────────────────────────────────────── */}
      {!loading && aba === 'resumo' && (
        <div className="space-y-6">
          {/* Modal registrar pagamento */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)' }}>
              <div className="w-full max-w-md rounded-[22px] bg-[#141619] ring-1 ring-white/[0.08] overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                  <h2 className="text-[15px] font-bold text-white">Registrar pagamento</h2>
                  <button onClick={() => setShowForm(false)} className="p-1.5 text-white/40 hover:text-white"><X size={16} /></button>
                </div>
                <form onSubmit={salvarPagamento} className="p-6 space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Aluno</label>
                    <select value={form.alunoId} onChange={e => setForm(f => ({...f, alunoId: e.target.value}))}
                      className="w-full px-3 py-2.5 rounded-[14px] bg-white/[0.04] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-accent/60 transition-all">
                      <option value="">Selecione...</option>
                      {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Valor (R$) *</label>
                      <input type="text" required value={form.valor} onChange={e => setForm(f=>({...f, valor:e.target.value}))} placeholder="0,00"
                        className="w-full px-3 py-2.5 rounded-[14px] bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-accent/60 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Data *</label>
                      <input type="date" required value={form.data.split('/').reverse().join('-')} onChange={e => { const [a,m,d]=e.target.value.split('-'); setForm(f=>({...f, data:`${d}/${m}/${a}`})); }}
                        className="w-full px-3 py-2.5 rounded-[14px] bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-accent/60 transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Forma</label>
                      <select value={form.forma} onChange={e => setForm(f=>({...f, forma:e.target.value}))}
                        className="w-full px-3 py-2.5 rounded-[14px] bg-white/[0.04] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-accent/60 transition-all">
                        {FORMAS.map(f => <option key={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Tipo</label>
                      <select value={form.tipo} onChange={e => setForm(f=>({...f, tipo:e.target.value}))}
                        className="w-full px-3 py-2.5 rounded-[14px] bg-white/[0.04] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-accent/60 transition-all">
                        {TIPOS.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Descrição</label>
                    <input type="text" value={form.descricao} onChange={e => setForm(f=>({...f, descricao:e.target.value}))}
                      className="w-full px-3 py-2.5 rounded-[14px] bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-accent/60 transition-all" />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-[14px] border border-white/[0.08] text-[13px] text-white/50 hover:text-white transition-all">Cancelar</button>
                    <button type="submit" disabled={saving} className="px-5 py-2 rounded-[14px] bg-accent hover:bg-accent-hover text-[13px] font-semibold text-on-accent disabled:opacity-40 transition-all">
                      {saving ? 'Salvando...' : 'Registrar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Resumo: mesma ordem do app (Recebido em destaque; Faturado / A receber / Mensal total ao lado) */}
          <div>
            <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-2">{MESES_LONGOS[mesAtual]} {anoAtual}</p>
            <div className="rounded-[22px] bg-[#141619] ring-1 ring-white/[0.06] p-5">
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Recebido · já na sua conta</p>
              <p className="text-[34px] font-semibold text-accent leading-tight mt-1 font-display">{fmt(fin.recebido)}</p>
              <p className="text-[11px] text-white/35 mb-4">{fin.qtdRecebido} pagamento{fin.qtdRecebido === 1 ? '' : 's'} creditado{fin.qtdRecebido === 1 ? '' : 's'}</p>
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/[0.06]">
                <div><p className="text-[17px] font-semibold text-white font-display">{fmt(fin.faturado)}</p><p className="text-[10px] text-white/35 mt-0.5">Faturado</p></div>
                <div className="border-x border-white/[0.06] px-3"><p className="text-[17px] font-semibold text-amber-400 font-display">{fmt(totalBrutoProximo)}</p><p className="text-[10px] text-white/35 mt-0.5">A receber no mês</p></div>
                <div><p className="text-[17px] font-semibold text-accent-pale font-display">{fmt(totalMensal)}</p><p className="text-[10px] text-white/35 mt-0.5">Mensal total</p></div>
              </div>
            </div>
          </div>

          {inadimplentesResumo.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-red-300 uppercase tracking-wider mb-2">Inadimplência</p>
              <div className="rounded-[22px] bg-red-500/[0.05] ring-1 ring-red-500/15 p-5">
                <p className="text-[22px] font-semibold text-red-400 font-display">{fmt(totalInadimplente)} <span className="text-[12px] font-normal text-white/40">a receber · {inadimplentesResumo.length} aluno{inadimplentesResumo.length > 1 ? 's' : ''}</span></p>
                <div className="mt-3 divide-y divide-white/[0.05]">
                  {inadimplentesResumo.slice(0, 5).map(a => (
                    <div key={a.id} className="flex items-center gap-3 py-2 text-[13px]">
                      <span className="flex-1 truncate text-white/80">{a.nome}</span>
                      <span className="text-amber-400 text-[12px]">{a.diasAtraso > 0 ? `${a.diasAtraso}d` : 'cobrança não paga'}</span>
                      <span className="text-white/80 w-24 text-right">{fmt(valorNum(a.valor))}</span>
                    </div>
                  ))}
                  {inadimplentesResumo.length > 5 && <p className="pt-2 text-[11px] text-white/35">+{inadimplentesResumo.length - 5} outros</p>}
                </div>
              </div>
            </div>
          )}

          <div>
            <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-2">Projeção — {MESES_LONGOS[proxMes.getMonth()]} {proxMes.getFullYear()}</p>
            <div className="rounded-[22px] bg-[#141619] ring-1 ring-white/[0.06] p-5">
              <p className="text-[26px] font-semibold text-white font-display">{fmt(projecaoProx)}</p>
              <p className="text-[11px] text-white/35 mt-1">Baseado em {alunosNaProjecao.length} alunos ativos · Personal + Consultoria, qualquer forma de pagamento</p>
            </div>
          </div>

          {/* A receber por mês */}
          {aReceberPorMes.length > 0 && (
            <div className="rounded-[22px] bg-[#141619] ring-1 ring-white/[0.06] p-5">
              <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-3">Quando cai na conta</p>
              <div className="mb-4">
                <p className="text-[12px] text-white/45">Total a receber</p>
                <p className="text-[26px] font-semibold text-accent font-display leading-tight">{fmt(totalBrutoFuturo)}</p>
                <p className="text-[11px] text-white/35">{fmt(totalLiquidoFuturo)} líquido · taxa Asaas já descontada</p>
              </div>
              <div className="space-y-4">
                {aReceberPorMes.map(g => (
                  <div key={`${g.ano}-${g.mes}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[12px] font-semibold text-white">{MESES[g.mes]} {g.ano}</p>
                      <div className="text-right"><p className="text-[12px] font-semibold text-amber-400">{fmt(g.bruto)}</p><p className="text-[10px] text-white/35">líq. {fmt(g.liquido)}</p></div>
                    </div>
                    <div className="divide-y divide-white/[0.05]">
                      {g.itens.map((it, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 text-[12px]">
                          <span className="text-white/70 truncate pr-3">{it.nome}{it.estimado ? ' · estimado' : it.manual ? ' · PIX/dinheiro' : ''}</span>
                          <span className="text-white/55 shrink-0 text-right">{String(it.data.getDate()).padStart(2,'0')}/{MESES[it.data.getMonth()].toLowerCase()} · {fmt(it.bruto)} <span className="text-white/30 text-[10px]">líq. {fmt(it.liquido)}</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta + Gráfico */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Meta */}
            <div className="rounded-[22px] bg-[#141619] ring-1 ring-white/[0.06] p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">Meta do mês</p>
                <button onClick={() => setEditMeta(true)} className="text-[11px] text-accent hover:text-accent-pale transition-colors">Editar</button>
              </div>
              {editMeta ? (
                <div className="space-y-2">
                  <input type="text" value={tempMeta} onChange={e => setTempMeta(e.target.value)} placeholder="Ex: 5000"
                    onKeyDown={e => { if (e.key === 'Enter') salvarMeta(); if (e.key === 'Escape') setEditMeta(false); }}
                    className="w-full px-3 py-2 rounded-[14px] bg-white/[0.04] border border-accent/30 text-white text-[13px] focus:outline-none transition-all" autoFocus />
                  <div className="flex gap-2">
                    <button onClick={() => setEditMeta(false)} className="flex-1 py-1.5 rounded-lg border border-white/[0.08] text-[12px] text-white/40 hover:text-white transition-all">Cancelar</button>
                    <button onClick={salvarMeta} className="flex-1 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-[12px] font-semibold text-on-accent transition-all">OK</button>
                  </div>
                </div>
              ) : metaNum > 0 ? (
                <>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-[20px] font-semibold text-white font-display">{fmt(receitaMes)}</span>
                    <span className="text-[12px] text-white/35 mb-0.5">/ {fmt(metaNum)}</span>
                  </div>
                  <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden mb-1">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-accent transition-all" style={{ width:`${metaPct}%` }} />
                  </div>
                  <p className={`text-[11px] ${metaPct >= 100 ? 'text-accent' : 'text-white/35'}`}>{metaPct.toFixed(0)}% da meta {metaPct >= 100 ? '🎉' : ''}</p>
                </>
              ) : (
                <p className="text-[12px] text-white/25 mt-2">Clique em Editar para definir uma meta</p>
              )}
            </div>

            {/* Donut */}
            <div className="rounded-[22px] bg-[#141619] ring-1 ring-white/[0.06] p-5">
              <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-3">Distribuição</p>
              <DonutChart presencial={recPresencial} consultoria={recConsultoria} />
            </div>

            {/* Inadimplência */}
            <div className="rounded-[22px] bg-[#141619] ring-1 ring-white/[0.06] p-5">
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
                  <span className="text-[12px] text-white/60 flex items-center gap-1.5"><Check size={12} className="text-accent" /> Em dia</span>
                  <span className="text-[13px] font-bold text-accent">{alunos.filter(a => a.ativo !== false).length - inadimplentes.length - vencendo7.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico 6 meses */}
          <div className="rounded-[22px] bg-[#141619] ring-1 ring-white/[0.06] p-5">
            <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-4">Receita dos últimos 6 meses</p>
            <BarChart data={chart6} />
          </div>

          {/* Lista pagamentos do mês */}
          <div className="rounded-[22px] bg-[#141619] ring-1 ring-white/[0.06] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
              <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">
                {MESES[mesAtual]} {anoAtual} · {fmt(receitaMes)}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setMesOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all"><ChevronLeft size={14} /></button>
                {mesOffset !== 0 && <button onClick={() => setMesOffset(0)} className="px-2 py-1 rounded-lg text-[10px] text-accent hover:bg-accent/10 transition-all">Hoje</button>}
                <button onClick={() => setMesOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all"><ChevronRight size={14} /></button>
              </div>
            </div>
            {pagsMes.length === 0 ? (
              <p className="text-[12px] text-white/25 text-center py-8">Nenhum pagamento registrado</p>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {pagsMes.map(p => (
                  <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors group">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white">{p.alunoNome || '—'}</p>
                      <p className="text-[11px] text-white/35">{p.data} · {p.forma || '—'}</p>
                    </div>
                    <span className="text-[14px] font-bold text-accent">{fmt(valorNum(p.valor))}</span>
                    <button onClick={() => setConfirmPagId(p.id)} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all"><Trash2 size={14} /></button>
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
            {[['presencial', `Personal (${contPersonal})`],['online', `Consultoria (${contConsultoria})`]].map(([v,l]) => (
              <button key={v} onClick={() => setFiltro(v)} className={`px-4 py-2 rounded-[14px] text-[12px] font-semibold transition-all ${filtro===v ? 'bg-accent/20 text-accent ring-1 ring-accent/30' : 'bg-white/[0.04] text-white/40 hover:text-white'}`}>{l}</button>
            ))}
          </div>

          {/* Lista completa */}
          <div className="rounded-[22px] bg-[#141619] ring-1 ring-white/[0.06] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.05]">
              <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">{alunosFiltrados.length} aluno{alunosFiltrados.length !== 1 ? 's' : ''}</p>
            </div>
            {alunosFiltrados.length === 0 ? (
              <p className="text-[12px] text-white/25 text-center py-8">Nenhum aluno</p>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {alunosFiltrados.map(a => {
                  const st = STATUS_FIN[statusPlanoFin(a)];
                  const met = ultimoMetodoDoAluno(a.id);
                  return (
                    <div key={a.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-white">{a.nome}</p>
                        <p className="text-[12px] text-white/40">{a.plano || 'Sem plano'} • Vence {a.vencimento || '—'}</p>
                        <p className={`text-[11px] mt-1 flex items-center gap-1 ${a.cobrancaAutomatica || met ? 'text-accent' : 'text-white/30'}`}>
                          {a.cobrancaAutomatica ? <><CheckCircle2 size={11} /> Cobrança automática</> : met ? <><Check size={11} /> {METODO_LABEL[met] || met}</> : 'Controle manual'}
                        </p>
                      </div>
                      <button onClick={() => setCobrando(a)} className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-3 py-1.5 rounded-[14px] bg-accent/15 text-[11px] font-semibold text-accent hover:bg-accent/25 transition-all">
                        <DollarSign size={11} /> Cobrar
                      </button>
                      <div className="text-right shrink-0">
                        <p className="text-[15px] font-bold text-white">{fmt(valorNum(a.valor))}</p>
                        <span className={`inline-block mt-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Config PIX */}
          <div className="rounded-[22px] bg-[#141619] ring-1 ring-white/[0.06] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <QrCode size={16} className="text-accent" />
                <p className="text-[14px] font-bold text-white">PIX</p>
              </div>
              <button onClick={() => setEditCfg(c => !c)} className="text-[11px] text-accent hover:text-accent-pale transition-colors">
                {editCfg ? 'Cancelar' : 'Editar'}
              </button>
            </div>
            {editCfg ? (
              <div className="space-y-3">
                {[['pixChave','Chave PIX (CPF/e-mail/telefone/aleatória)'],['pixNome','Nome do recebedor'],['pixCidade','Cidade'],['pixLink','Link de pagamento (Asaas, Stripe…)']].map(([k,l]) => (
                  <div key={k}>
                    <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1">{l}</label>
                    <input value={cfgForm[k]} onChange={e => setCfgForm(f => ({...f, [k]: e.target.value}))} placeholder={k === 'pixLink' ? 'https://...' : ''}
                      className="w-full px-3 py-2.5 rounded-[14px] bg-white/[0.04] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-accent/60 transition-all" />
                  </div>
                ))}
                <button onClick={salvarConfig} disabled={salvandoCfg} className="w-full py-2.5 rounded-[14px] bg-accent hover:bg-accent-hover text-[13px] font-semibold text-on-accent disabled:opacity-40 transition-all">
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
                    className="flex items-center gap-2 px-3 py-2.5 rounded-[14px] bg-accent/[0.08] ring-1 ring-accent/20 text-accent text-[12px] font-semibold hover:bg-accent/15 transition-all">
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
          <div className="rounded-[22px] bg-[#141619] ring-1 ring-white/[0.06] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-amber-400" />
                <p className="text-[14px] font-bold text-white">Asaas (recorrência automática)</p>
              </div>
              <button onClick={sincronizarAsaas} disabled={sincronizando}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] bg-amber-500/10 text-amber-400 text-[11px] font-semibold hover:bg-amber-500/20 disabled:opacity-40 transition-all">
                <RefreshCw size={12} className={sincronizando ? 'animate-spin' : ''} /> {sincronizando ? 'Sincronizando...' : 'Sincronizar agora'}
              </button>
            </div>
            <p className="text-[12px] text-white/40 leading-relaxed mb-4">
              Cobranças recorrentes automáticas — pagamentos confirmados no Asaas atualizam o vencimento do aluno e entram na lista de pagamentos sozinhos. As chaves são gerenciadas no app mobile.
            </p>
            {(() => {
              const comAsaas = alunos.filter(a => a.asaasSubscriptionId && a.cobrancaAutomatica);
              if (!comAsaas.length) {
                return (
                  <div className="flex items-start gap-3 p-3 rounded-[14px] bg-white/[0.03] ring-1 ring-white/[0.05]">
                    <p className="text-[12px] text-white/40">Nenhum aluno com cobrança automática Asaas vinculada ainda.</p>
                  </div>
                );
              }
              return (
                <div className="space-y-2">
                  {comAsaas.map(a => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-[14px] bg-white/[0.03] ring-1 ring-white/[0.05]">
                      <span className="text-[12px] font-semibold text-white/70">{a.nome}</span>
                      {a.proximoRecebimento ? (
                        <span className="text-[11px] text-amber-400">
                          {fmt(a.proximoRecebimento.netValue ?? a.proximoRecebimento.valor)} em {fmtDataISO(a.proximoRecebimento.dataCredito || a.proximoRecebimento.dueDate) || '—'}
                        </span>
                      ) : (
                        <span className="text-[11px] text-white/25">sem cobrança pendente</span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
