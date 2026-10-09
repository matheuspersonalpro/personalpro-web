'use client';
// "Relatório mensal para o aluno" da ficha (porte do modal do app): gera pela Cloud Function,
// mostra a abertura e os números, e abre a folha para imprimir/salvar em PDF.
import { useEffect, useState } from 'react';
import { X, FileText, Printer } from 'lucide-react';
import { gerarRelatorioMensalAluno } from '@/lib/relatorio';
import { abrirRelatorioParaImprimir, mesPorExtenso } from '@/lib/pdfRelatorioMensal';
import { buscarConfigApp } from '@/lib/firestore';

export default function RelatorioMensalModal({ aluno, onFechar }) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [relatorio, setRelatorio] = useState(null);
  const [nomePersonal, setNomePersonal] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    let vivo = true;
    buscarConfigApp().then(c => vivo && setNomePersonal(c?.nome || '')).catch(() => {});
    gerarRelatorioMensalAluno(aluno.id)
      .then(r => vivo && setRelatorio(r))
      .catch(e => vivo && setErro(e?.message || 'Não foi possível gerar o relatório agora. Tente de novo em instantes.'))
      .finally(() => vivo && setCarregando(false));
    return () => { vivo = false; };
  }, [aluno.id]);

  function imprimir() {
    setAviso('');
    try { abrirRelatorioParaImprimir({ aluno: aluno.nome, personal: nomePersonal, dados: relatorio.dados, texto: relatorio.texto }); }
    catch (e) { setAviso(e?.message || 'Não deu pra abrir o relatório.'); }
  }

  const f = relatorio?.dados?.frequencia;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg max-h-[88vh] rounded-[22px] bg-[#141619] ring-1 ring-white/[0.08] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <h2 className="text-[15px] font-bold text-white flex items-center gap-2"><FileText size={15} className="text-accent" /> Relatório mensal · {aluno.nome?.split(' ')[0]}</h2>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all"><X size={16} /></button>
        </div>
        <div className="p-6 overflow-y-auto space-y-4">
          {carregando && (
            <div className="flex items-center gap-3 py-8 justify-center">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-[13px] text-white/45">Gerando o relatório…</p>
            </div>
          )}
          {!carregando && erro && <p className="text-[13px] text-red-400 leading-relaxed">{erro}</p>}
          {!carregando && !erro && relatorio?.vazio && (
            <p className="text-[13px] text-white/55 leading-relaxed">Ainda não há evolução para mostrar neste mês. Melhor não enviar nada do que mandar uma folha com poucos dados.</p>
          )}
          {!carregando && !erro && relatorio && !relatorio.vazio && (
            <>
              <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">{mesPorExtenso(relatorio.dados?.anoMes)}</p>
              {relatorio.texto && <p className="text-[14px] text-white/85 leading-relaxed whitespace-pre-line">{relatorio.texto}</p>}
              {relatorio.semTexto && <p className="text-[12px] text-amber-400 leading-relaxed">A abertura escrita não saiu desta vez, mas os números vieram. O relatório sai sem o texto de abertura.</p>}
              {f && <p className="text-[12px] text-white/40">Frequência no mês: {Object.values(f.contagem || {}).reduce((a, b) => a + b, 0)} treinos</p>}
              {aviso && <p className="text-[12px] text-red-400">{aviso}</p>}
            </>
          )}
        </div>
        <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2 shrink-0">
          <button onClick={onFechar} className="px-4 py-2 rounded-[14px] border border-white/[0.08] text-[13px] text-white/50 hover:text-white transition-all">Fechar</button>
          {!carregando && !erro && relatorio && !relatorio.vazio && (
            <button onClick={imprimir} className="flex items-center gap-1.5 px-5 py-2 rounded-[14px] bg-accent hover:bg-accent-hover text-[13px] font-semibold text-on-accent transition-all"><Printer size={14} /> Abrir PDF</button>
          )}
        </div>
      </div>
    </div>
  );
}
