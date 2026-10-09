'use client';
// "Gerar PIX na hora" e "PIX Recorrente" do Recebimento (porte do app): copia-e-cola sem aluno,
// com valor livre (0) ou fixo, e o texto de instrução do Pix Automático para mandar ao aluno.
import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { gerarPixEMV } from '@/lib/pix';
import { valorNum } from '@/lib/financeiro';

export function textoInstrucaoPixAutomatico(chave) {
  const c = chave || '(configure sua chave PIX nas configurações)';
  return `Olá! Para facilitar o pagamento da mensalidade, quero configurar o Pix Automático.\n\n` +
    `Com ele, o valor é debitado automaticamente todo mês — sem precisar fazer nada.\n\n` +
    `Para autorizar:\n` +
    `1. Abra seu banco\n` +
    `2. Procure por "Pix Automático" ou "Débito Automático Pix"\n` +
    `3. Cadastre a autorização com a chave: ${c}\n\n` +
    `Qualquer dúvida, é só chamar!`;
}

export default function PixNaHora({ config, onFechar, onConfigurar }) {
  const [valorTxt, setValorTxt] = useState('');
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);

  function gerar() {
    setErro('');
    if (!config?.pixChave) { setErro('Chave PIX não configurada. Configure sua chave PIX para gerar o código.'); return; }
    const v = valorTxt.trim() === '' ? 0 : valorNum(valorTxt);
    if (!Number.isFinite(v) || v < 0) { setErro('Digite zero (ou deixe em branco) para valor livre, ou um valor positivo.'); return; }
    setCodigo(gerarPixEMV({ chave: config.pixChave, nome: config.pixNome || 'Personal', cidade: config.pixCidade || 'Brasil', valor: v }));
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(codigo); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }
    catch { setErro('Não consegui copiar. Selecione o código e copie manualmente.'); }
  }
  const qrUrl = codigo ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(codigo)}&size=180x180&bgcolor=ffffff&color=0a0b0d&qzone=1` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-[22px] bg-[#141619] ring-1 ring-white/[0.08] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-bold text-white">Gerar PIX na hora</h2>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Valor (R$) — deixe em branco para valor livre</label>
            <input value={valorTxt} onChange={e => { setValorTxt(e.target.value); setCodigo(''); }} inputMode="decimal" placeholder="Ex: 150,00"
              className="w-full px-3 py-2.5 rounded-[14px] bg-white/[0.05] border border-white/[0.08] text-white text-[14px] focus:outline-none focus:border-accent/60 transition-all" />
          </div>
          {erro && (
            <p className="text-[12px] text-red-400">{erro} {!config?.pixChave && onConfigurar && <button onClick={onConfigurar} className="underline text-accent">Configurar agora</button>}</p>
          )}
          {codigo && (
            <div className="space-y-3">
              <div className="flex justify-center"><img src={qrUrl} alt="QR Code PIX" width={180} height={180} className="rounded-[14px] bg-white" /></div>
              <p className="text-[11px] text-white/45 break-all rounded-[14px] bg-white/[0.04] px-3 py-2.5 font-mono leading-relaxed">{codigo}</p>
              <p className="text-[11px] text-white/30">Confira o nome do recebedor no app do banco antes de mandar para alguém.</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-[14px] border border-white/[0.08] text-[13px] text-white/50 hover:text-white transition-all">Fechar</button>
          {codigo && (
            <button onClick={copiar} className="flex items-center gap-1.5 px-4 py-2 rounded-[14px] border border-accent/30 text-[13px] font-semibold text-accent hover:bg-accent/10 transition-all">
              {copiado ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar código</>}
            </button>
          )}
          <button onClick={gerar} className="px-5 py-2 rounded-[14px] bg-accent hover:bg-accent-hover text-[13px] font-semibold text-on-accent transition-all">{codigo ? 'Gerar de novo' : 'Gerar PIX'}</button>
        </div>
      </div>
    </div>
  );
}
