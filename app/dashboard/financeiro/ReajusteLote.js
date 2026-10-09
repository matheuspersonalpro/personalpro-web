'use client';
// Reajuste anual em lote (porte de previaReajuste + aplicarReajuste do app): prévia por aluno,
// limites -50..100% e até R$ 10.000, valor gravado com vírgula e a assinatura do Asaas atualizada
// com a MENSALIDADE (preço ÷ meses do plano). Falha no Asaas é listada, nunca engolida.
import { useState } from 'react';
import { X, TrendingUp } from 'lucide-react';
import { atualizarAluno } from '@/lib/firestore';
import { atualizarValorAssinaturaAsaas } from '@/lib/asaas';
import { valorNum, valorMensalAsaas } from '@/lib/financeiro';

const fmt = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ReajusteLote({ alunos, onFechar, onAplicado }) {
  const [pctTxt, setPctTxt] = useState('');
  const [arredondar, setArredondar] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const pct = parseFloat(String(pctTxt).replace(',', '.'));
  const pctValido = Number.isFinite(pct) && pct >= -50 && pct <= 100 && pct !== 0;
  const previa = !pctValido ? [] : alunos
    .filter(a => a.ativo !== false && valorNum(a.valor) > 0)
    .map(a => {
      const atual = valorNum(a.valor);
      const bruto = atual * (1 + pct / 100);
      const novo = arredondar ? Math.round(bruto) : Math.round(bruto * 100) / 100;
      return { aluno: a, atual, novo, temAsaas: !!(a.asaasSubscriptionId && a.cobrancaAutomatica) };
    })
    .sort((x, y) => (x.aluno.nome || '').localeCompare(y.aluno.nome || '', 'pt-BR'));
  const foraDoLimite = previa.some(p => p.novo > 10000 || p.novo <= 0);
  const totalAtual = previa.reduce((s, p) => s + p.atual, 0);
  const totalNovo = previa.reduce((s, p) => s + p.novo, 0);

  async function aplicar() {
    if (!previa.length || foraDoLimite || aplicando) return;
    setAplicando(true);
    const falhas = [];
    for (const p of previa) {
      try {
        await atualizarAluno(p.aluno.id, { valor: p.novo.toFixed(2).replace('.', ',') });
        if (p.temAsaas) await atualizarValorAssinaturaAsaas(p.aluno.asaasSubscriptionId, valorMensalAsaas(p.novo, p.aluno.plano), true);
      } catch (e) {
        console.error('Reajuste falhou para', p.aluno.nome, e);
        falhas.push(p.aluno.nome);
      }
    }
    setResultado({ total: previa.length, falhas });
    setAplicando(false);
    onAplicado?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-xl max-h-[88vh] rounded-[22px] bg-[#141619] ring-1 ring-white/[0.08] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <h2 className="text-[15px] font-bold text-white flex items-center gap-2"><TrendingUp size={15} className="text-accent" /> Reajuste anual em lote</h2>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all"><X size={16} /></button>
        </div>

        {resultado ? (
          <div className="p-6 space-y-3">
            <p className="text-[14px] text-white/85">{resultado.total - resultado.falhas.length} de {resultado.total} alunos reajustados em {pctTxt}%.</p>
            {resultado.falhas.length > 0 && (
              <p className="text-[12px] text-amber-400 leading-relaxed">Falhou para: {resultado.falhas.join(', ')}. Confira o valor desses alunos e a cobrança no Asaas.</p>
            )}
            <div className="flex justify-end pt-2"><button onClick={onFechar} className="px-5 py-2 rounded-[14px] bg-accent text-[13px] font-semibold text-on-accent">Fechar</button></div>
          </div>
        ) : (
          <>
            <div className="px-6 pt-5 shrink-0 space-y-3">
              <p className="text-[12px] text-white/40 leading-relaxed">Aplica um percentual em todos os alunos ativos de uma vez: atualiza o valor e a assinatura no Asaas (para quem tem cobrança automática).</p>
              <div className="flex items-center gap-3">
                <div className="relative w-32">
                  <input value={pctTxt} onChange={e => setPctTxt(e.target.value)} placeholder="Ex: 5" inputMode="decimal"
                    className="w-full px-3 py-2.5 pr-8 rounded-[14px] bg-white/[0.05] border border-white/[0.08] text-white text-[15px] font-semibold text-center focus:outline-none focus:border-accent/60 transition-all" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-[14px]">%</span>
                </div>
                <label className="flex items-center gap-2 text-[12px] text-white/55 cursor-pointer select-none">
                  <input type="checkbox" checked={arredondar} onChange={e => setArredondar(e.target.checked)} className="accent-[#C6F432]" /> Arredondar para reais inteiros
                </label>
              </div>
              {pctTxt && !pctValido && <p className="text-[11px] text-red-400">Informe um percentual entre -50 e 100 (diferente de zero).</p>}
              {foraDoLimite && <p className="text-[11px] text-red-400">Algum aluno ficaria fora do limite (R$ 0 a R$ 10.000). Nada será alterado.</p>}
            </div>
            <div className="overflow-y-auto px-6 py-4 flex-1">
              {previa.length === 0 ? (
                <p className="text-[12px] text-white/25 text-center py-8">Digite o percentual para ver a prévia por aluno.</p>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {previa.map(p => (
                    <div key={p.aluno.id} className="flex items-center gap-3 py-2 text-[12px]">
                      <span className="flex-1 min-w-0 truncate text-white/80">{p.aluno.nome}{p.temAsaas && <span className="ml-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/12 text-accent">Asaas</span>}</span>
                      <span className="text-white/35">{fmt(p.atual)}</span>
                      <span className="text-white/25">→</span>
                      <span className="text-accent font-semibold w-24 text-right">{fmt(p.novo)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-white/[0.06] shrink-0 flex items-center justify-between gap-3">
              <p className="text-[11px] text-white/40">{previa.length > 0 ? `${previa.length} alunos · ${fmt(totalAtual)} → ${fmt(totalNovo)} /mês` : ' '}</p>
              <div className="flex gap-2">
                <button onClick={onFechar} className="px-4 py-2 rounded-[14px] border border-white/[0.08] text-[13px] text-white/50 hover:text-white transition-all">Cancelar</button>
                <button onClick={aplicar} disabled={!previa.length || foraDoLimite || aplicando}
                  className="px-5 py-2 rounded-[14px] bg-accent hover:bg-accent-hover text-[13px] font-semibold text-on-accent disabled:opacity-40 transition-all">
                  {aplicando ? 'Aplicando…' : `Aplicar a ${previa.length} alunos`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
