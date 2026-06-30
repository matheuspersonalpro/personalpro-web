'use client';
import { useEffect, useState } from 'react';
import { buscarAlunos } from '@/lib/firestore';
import {
  PLANOS, ALUNOS_GRATIS, fmtBRL, avaliarAssinatura,
  criarCheckoutAssinatura, iniciarTrialAssinatura,
} from '@/lib/assinatura';
import { usePersonal } from '@/lib/AuthContext';
import { CreditCard, Check, Zap, Clock, ShieldCheck, AlertCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/Toast';

const ESTADO_UI = {
  sem:       { cor: 'text-white/50',    bg: 'bg-white/[0.04]',    ring: 'ring-white/[0.06]',    icone: Zap,          label: 'Sem assinatura' },
  trial:     { cor: 'text-blue-400',    bg: 'bg-blue-500/10',     ring: 'ring-blue-500/20',     icone: Clock,        label: 'Período de trial' },
  ativa:     { cor: 'text-emerald-400', bg: 'bg-emerald-500/10',  ring: 'ring-emerald-500/20',  icone: ShieldCheck,  label: 'Assinatura ativa' },
  pendente:  { cor: 'text-amber-400',   bg: 'bg-amber-500/10',    ring: 'ring-amber-500/20',    icone: AlertCircle,  label: 'Pagamento pendente' },
  bloqueada: { cor: 'text-red-400',     bg: 'bg-red-500/10',      ring: 'ring-red-500/20',      icone: AlertCircle,  label: 'Assinatura bloqueada' },
};

const LABEL_PLANO = {
  mensal: '1 mês', trimestral: '3 meses', semestral: '6 meses', anual: '12 meses',
};

function StatusCard({ avaliacao, alunosAtivos, planoLabel }) {
  const ui = ESTADO_UI[avaliacao.estado] || ESTADO_UI.sem;
  const Icone = ui.icone;
  const alunosGratis = alunosAtivos <= ALUNOS_GRATIS;

  return (
    <div className={`rounded-2xl ring-1 p-6 flex items-start gap-4 ${ui.bg} ${ui.ring}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${ui.bg} ring-1 ${ui.ring}`}>
        <Icone size={20} className={ui.cor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[15px] font-bold ${ui.cor}`}>{ui.label}</p>
        {alunosGratis ? (
          <p className="text-[13px] text-white/50 mt-1">
            Você tem <strong className="text-white/80">{alunosAtivos}</strong> aluno{alunosAtivos !== 1 ? 's' : ''} ativo{alunosAtivos !== 1 ? 's' : ''}.
            O plano gratuito inclui até <strong className="text-white/80">{ALUNOS_GRATIS} alunos</strong>.
          </p>
        ) : avaliacao.estado === 'ativa' ? (
          <p className="text-[13px] text-white/50 mt-1">
            Plano <strong className="text-white/80">{planoLabel}</strong> · vence em{' '}
            <strong className="text-white/80">{avaliacao.validade?.toLocaleDateString('pt-BR')}</strong>
            {avaliacao.diasRestantes > 0 && ` (${avaliacao.diasRestantes} dias)`}
          </p>
        ) : avaliacao.estado === 'trial' ? (
          <p className="text-[13px] text-white/50 mt-1">
            Expira em <strong className="text-white/80">{avaliacao.validade?.toLocaleDateString('pt-BR')}</strong>
            {' '}· <strong className="text-white/80">{avaliacao.diasRestantes} dias</strong> restantes
          </p>
        ) : avaliacao.estado === 'pendente' ? (
          <p className="text-[13px] text-white/50 mt-1">
            Pagamento não identificado · ainda libera por{' '}
            <strong className="text-amber-400">{avaliacao.diasRestantes} dia{avaliacao.diasRestantes !== 1 ? 's' : ''}</strong> (carência)
          </p>
        ) : avaliacao.estado === 'bloqueada' ? (
          <p className="text-[13px] text-white/50 mt-1">
            Acesso bloqueado. Assine um plano para continuar usando o app com mais de {ALUNOS_GRATIS} alunos.
          </p>
        ) : (
          <p className="text-[13px] text-white/50 mt-1">
            Com mais de {ALUNOS_GRATIS} alunos ativos é necessário assinar um plano.
          </p>
        )}
        {(avaliacao.estado === 'ativa' || avaliacao.estado === 'trial' || avaliacao.estado === 'pendente') && (
          <p className="text-[11px] text-white/25 mt-2">
            O status atualiza automaticamente quando um pagamento é confirmado.
          </p>
        )}
      </div>
    </div>
  );
}

function CardPlano({ plano, selecionado, onSelecionar, processando }) {
  const ativo = selecionado === plano.id;
  return (
    <button
      onClick={() => onSelecionar(plano.id)}
      disabled={processando}
      className={`relative rounded-2xl p-5 text-left transition-all w-full ${
        ativo
          ? 'bg-blue-600/15 ring-2 ring-blue-500/60'
          : 'bg-[#0d1b2e] ring-1 ring-white/[0.06] hover:ring-blue-500/20 hover:bg-blue-900/10'
      } ${plano.popular ? 'shadow-xl shadow-blue-900/20 pt-8' : ''}`}
    >
      {plano.popular && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-900/40">
            MAIS POPULAR
          </span>
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-[14px] font-bold text-white/85">{LABEL_PLANO[plano.id] || plano.id}</p>
          {plano.desconto && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20">
              {plano.desconto}
            </span>
          )}
        </div>
        <div className={`w-5 h-5 rounded-full ring-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${
          ativo ? 'ring-blue-500 bg-blue-500' : 'ring-white/20 bg-transparent'
        }`}>
          {ativo && <Check size={11} className="text-white" strokeWidth={3} />}
        </div>
      </div>
      <div className="mb-1 flex items-end gap-1">
        <span className="text-[26px] font-bold text-white">{fmtBRL(plano.porMes)}</span>
        <span className="text-[12px] text-white/40 mb-0.5">/mês</span>
      </div>
      <p className="text-[11px] text-white/35">
        {fmtBRL(plano.preco)} no total
        {plano.de && <span className="ml-2 line-through text-white/20">{fmtBRL(plano.de)}</span>}
      </p>
    </button>
  );
}

export default function AssinaturaPage() {
  const toast      = useToast();
  const personal   = usePersonal(); // assinatura atualiza automaticamente via onSnapshot no AuthContext

  const [alunosAtivos, setAtivos]     = useState(0);
  const [loadingAlunos, setLoading]   = useState(true);
  const [planoSel, setPlanoSel]       = useState('anual');
  const [processando, setProcessando] = useState(false);
  const [cpf, setCpf]                 = useState('');

  // Formata CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00) conforme digita
  function formatCpfCnpj(v) {
    const d = v.replace(/\D/g, '').slice(0, 14);
    if (d.length <= 11) {
      return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }

  useEffect(() => {
    buscarAlunos()
      .then(list => setAtivos(list.filter(a => a.ativo !== false).length))
      .finally(() => setLoading(false));
  }, []);

  // Pré-preenche o CPF/CNPJ se já foi salvo numa assinatura anterior
  useEffect(() => {
    if (personal?.cpf) setCpf(formatCpfCnpj(personal.cpf));
  }, [personal?.cpf]);

  const assinatura  = personal?.assinatura;
  const avaliacao   = avaliarAssinatura(assinatura);
  const planoAtual  = assinatura?.plano;
  const alunosGratis = alunosAtivos <= ALUNOS_GRATIS;

  async function assinar() {
    const cpfDigits = cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11 && cpfDigits.length !== 14) {
      toast('Informe um CPF ou CNPJ válido para assinar.', 'error');
      return;
    }
    setProcessando(true);
    try {
      const { url } = await criarCheckoutAssinatura(planoSel, cpfDigits);
      if (url) window.open(url, '_blank');
      else toast('Link de pagamento não retornado. Tente novamente.', 'error');
    } catch (e) {
      toast(e.message || 'Erro ao iniciar checkout. Tente novamente.', 'error');
    } finally {
      setProcessando(false);
    }
  }

  async function iniciarTrial() {
    setProcessando(true);
    try {
      await iniciarTrialAssinatura();
      toast('Trial iniciado! Você tem 14 dias de acesso completo.');
      // AuthContext via onSnapshot atualiza personal.assinatura automaticamente
    } catch (e) {
      toast(e.message || 'Erro ao iniciar trial.', 'error');
    } finally {
      setProcessando(false);
    }
  }

  if (!personal || loadingAlunos) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="px-4 pt-5 pb-6 md:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-bold text-white tracking-tight flex items-center gap-2.5">
          <CreditCard size={20} className="text-blue-400" />
          Assinatura
        </h1>
        <p className="text-[12px] text-white/35 mt-1">Gerencie seu plano PersonalPro</p>
      </div>

      {/* Status atual */}
      <StatusCard avaliacao={avaliacao} alunosAtivos={alunosAtivos} planoLabel={LABEL_PLANO[planoAtual] || planoAtual} />

      {/* Planos — só mostra se não for grátis */}
      {!alunosGratis && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-5">
            <h2 className="text-[15px] font-bold text-white">
              {avaliacao.estado === 'ativa' ? 'Mudar plano' : 'Escolha seu plano'}
            </h2>
            <span className="text-[11px] text-white/30">Acesso ilimitado a alunos e todas as funcionalidades</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
            {PLANOS.map(p => (
              <CardPlano
                key={p.id}
                plano={p}
                selecionado={planoSel}
                onSelecionar={setPlanoSel}
                processando={processando}
              />
            ))}
          </div>

          {/* O que está incluso */}
          <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-5 mb-6">
            <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-3">Incluído em todos os planos</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Alunos ilimitados',
                'Periodização automática 12 meses',
                'Treinos de musculação e endurance',
                'Vídeos dos exercícios',
                'Avaliações físicas e Pollock 7',
                'Agenda e controle financeiro',
                'App mobile Android + iOS',
                'Suporte via WhatsApp',
              ].map(item => (
                <div key={item} className="flex items-center gap-2 text-[12px] text-white/50">
                  <Check size={12} className="text-emerald-400 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* CPF/CNPJ — exigido pelo Asaas para emitir a cobrança */}
          <div className="mb-3">
            <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">
              CPF ou CNPJ do titular
            </label>
            <input
              value={cpf}
              onChange={e => setCpf(formatCpfCnpj(e.target.value))}
              inputMode="numeric"
              placeholder="000.000.000-00"
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 text-[14px] focus:outline-none focus:border-blue-500/60 transition-all"
            />
            <p className="text-[11px] text-white/25 mt-1.5">Necessário para gerar a cobrança no Asaas.</p>
          </div>

          {/* CTA */}
          <button
            onClick={assinar}
            disabled={processando || !planoSel}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-[14px] font-bold text-white transition-all shadow-xl shadow-blue-900/30"
          >
            {processando ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Abrindo checkout...
              </>
            ) : (
              <>
                <ExternalLink size={15} />
                Assinar plano {LABEL_PLANO[planoSel]} — {fmtBRL(PLANOS.find(p => p.id === planoSel)?.preco)}
              </>
            )}
          </button>
          <p className="text-[11px] text-white/25 text-center mt-2.5">
            Você será redirecionado para o checkout seguro do Asaas. O status atualiza automaticamente após a confirmação do pagamento.
          </p>
        </div>
      )}

      {/* Trial */}
      {!alunosGratis && avaliacao.estado === 'sem' && (
        <div className="mt-4 pt-4 border-t border-white/[0.05] text-center">
          <p className="text-[12px] text-white/30 mb-3">Ou comece com um trial gratuito de 14 dias</p>
          <button
            onClick={iniciarTrial}
            disabled={processando}
            className="px-6 py-2.5 rounded-xl border border-white/[0.10] text-[13px] text-white/50 hover:text-white hover:border-white/20 disabled:opacity-40 transition-all"
          >
            Iniciar trial grátis (14 dias)
          </button>
        </div>
      )}

      {/* Plano gratuito */}
      {alunosGratis && (
        <div className="mt-6 rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-6 text-center">
          <Zap size={24} className="text-white/20 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[13px] text-white/50 mb-1">
            Você está no <strong className="text-white/80">plano gratuito</strong> — até {ALUNOS_GRATIS} alunos ativos sem custo.
          </p>
          <p className="text-[12px] text-white/30">
            Ao atingir {ALUNOS_GRATIS + 1} alunos ativos, você receberá um aviso para assinar um plano.
          </p>
        </div>
      )}
    </div>
  );
}
