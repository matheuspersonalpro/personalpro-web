'use client';
// Configurações do Perfil que o app tem e o site não tinha: convite, termo, férias, reposição
// e reajuste anual. Mesmos campos de appConfig e mesmos tetos de validação do app
// (screens/personal/PerfilPersonal.js). Cada controle salva na hora, como no app.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy, Link2, FileText, CreditCard, ChevronRight } from 'lucide-react';
import { buscarConfigApp, salvarConfigApp, obterCodigoConvite } from '@/lib/firestore';
import { useToast } from '@/components/Toast';

const card = 'rounded-[22px] bg-[#141619] ring-1 ring-white/[0.06] p-6';
const titulo = 'text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-2';
const inputCls = 'w-20 px-3 py-2 rounded-[14px] bg-white/[0.05] border border-white/[0.08] text-white text-[13px] text-center focus:outline-none focus:border-accent/60 transition-all';
const btnSalvar = 'px-4 py-2 rounded-[14px] bg-accent hover:bg-accent-hover text-[12px] font-semibold text-on-accent disabled:opacity-40 transition-all';

function Chave({ ligado, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`relative rounded-full transition-all disabled:opacity-50 ${ligado ? 'bg-accent' : 'bg-white/[0.12]'}`}
      style={{ height: 22, minWidth: 40 }} aria-pressed={ligado}>
      <span className="absolute top-0.5 rounded-full bg-white shadow transition-all" style={{ width: 18, height: 18, left: ligado ? 19 : 2 }} />
    </button>
  );
}

function Linha({ label, sub, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/[0.04] last:border-0">
      <div>
        <p className="text-[13px] font-medium text-white/75">{label}</p>
        {sub && <p className="text-[11px] text-white/30 mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">{children}</div>
    </div>
  );
}

export default function ConfigExtra({ nomePersonal }) {
  const toast = useToast();
  const [carregou, setCarregou] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [termo, setTermo] = useState('');
  const [temTermo, setTemTermo] = useState(false);
  const [salvandoTermo, setSalvandoTermo] = useState(false);
  const [feriasAtiva, setFeriasAtiva] = useState(true);
  const [feriasDias, setFeriasDias] = useState('10');
  const [repoLimiteAtiva, setRepoLimiteAtiva] = useState(true);
  const [repoLimiteQtd, setRepoLimiteQtd] = useState('2');
  const [repoAntecedencia, setRepoAntecedencia] = useState('24');
  const [reajusteAtivo, setReajusteAtivo] = useState(true);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    buscarConfigApp().then(cfg => {
      if (cfg?.termoCompromisso) { setTermo(cfg.termoCompromisso); setTemTermo(true); }
      if (cfg?.feriasAtiva === false) setFeriasAtiva(false);
      if (cfg?.feriasDias) setFeriasDias(String(cfg.feriasDias));
      if (cfg?.reajusteAnualAtivo === false) setReajusteAtivo(false);
      if (cfg?.reposicaoLimiteAtiva === false) setRepoLimiteAtiva(false);
      if (cfg?.reposicaoLimiteQtd) setRepoLimiteQtd(String(cfg.reposicaoLimiteQtd));
      if (cfg?.reposicaoAntecedenciaHoras != null) setRepoAntecedencia(String(cfg.reposicaoAntecedenciaHoras));
    }).catch(() => {}).finally(() => setCarregou(true));
    obterCodigoConvite().then(c => c && setCodigo(c)).catch(() => {});
  }, []);

  const link = codigo ? `https://personalpro.app.br/convite/?codigo=${codigo}` : '';
  async function copiar(texto, aviso) {
    try { await navigator.clipboard.writeText(texto); toast(aviso); }
    catch { toast('Não consegui copiar. Selecione e copie manualmente.', 'error'); }
  }
  const mensagem = () => `Bora treinar! 💪\n\nBaixe o Personal Pro e entre na minha lista${nomePersonal ? ` do ${nomePersonal}` : ''}:\n${link}\n\nSe o link não abrir, use o código: ${codigo}`;

  async function salvar(dados, erro, aviso) {
    setOcupado(true);
    try { await salvarConfigApp(dados); if (aviso) toast(aviso); return true; }
    catch { toast(erro, 'error'); return false; }
    finally { setOcupado(false); }
  }
  async function alternar(setter, atual, campo) {
    const nova = !atual;
    setter(nova);
    if (!await salvar({ [campo]: nova }, 'Não foi possível salvar. Tente novamente.')) setter(atual);
  }
  async function salvarNumero(texto, setter, { min, max, padrao, campo, aviso }) {
    const n = parseInt(String(texto).replace(/\D/g, ''), 10);
    if (!Number.isFinite(n) || n < min) { setter(String(padrao)); return; }
    const val = Math.min(max, n);
    setter(String(val));
    await salvar({ [campo]: val }, 'Não foi possível salvar.', aviso(val));
  }
  async function salvarTermo() {
    const texto = termo.trim();
    if (texto.length > 0 && texto.length < 50) { toast('Escreva pelo menos um parágrafo, ou deixe em branco para não usar termo.', 'error'); return; }
    setSalvandoTermo(true);
    try {
      await salvarConfigApp({ termoCompromisso: texto, termoVersao: texto ? Date.now() : null });
      setTemTermo(!!texto);
      toast(texto ? 'Este é o SEU termo. Seus alunos presenciais vão aceitá-lo no próximo acesso.' : 'Seus alunos não verão nenhum termo.');
    } catch { toast('Não foi possível salvar o termo. Tente novamente.', 'error'); }
    finally { setSalvandoTermo(false); }
  }

  if (!carregou) return null;
  return (
    <>
      <div className={card}>
        <h2 className={titulo}>Convidar aluno</h2>
        <p className="text-[11px] text-white/30 mb-4">O aluno toca no link e entra direto na sua lista.</p>
        <div className="flex items-center justify-between gap-3 rounded-[14px] bg-white/[0.03] ring-1 ring-white/[0.06] px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">Seu código de convite</p>
            <p className="text-[24px] font-semibold text-accent tracking-[0.2em] font-display">{codigo || '------'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" disabled={!codigo} onClick={() => copiar(codigo, 'Código copiado.')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[14px] border border-white/[0.1] text-[12px] text-white/70 hover:text-white disabled:opacity-40 transition-all"><Copy size={13} /> Código</button>
            <button type="button" disabled={!codigo} onClick={() => copiar(mensagem(), 'Mensagem de convite copiada: cole na conversa com o aluno.')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[14px] bg-accent/15 text-[12px] font-semibold text-accent hover:bg-accent/25 disabled:opacity-40 transition-all"><Link2 size={13} /> Copiar convite</button>
          </div>
        </div>
      </div>

      <div className={card}>
        <h2 className={titulo}>Documentos</h2>
        <div className="flex items-center gap-2 mb-1"><FileText size={14} className="text-accent" /><p className="text-[13px] font-medium text-white/75">Termo de compromisso</p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${temTermo ? 'bg-accent/12 text-accent' : 'bg-white/[0.06] text-white/40'}`}>{temTermo ? 'Em uso' : 'Sem termo'}</span></div>
        <p className="text-[11px] text-white/30 mb-3">Os alunos presenciais aceitam este texto no próximo acesso. Deixe em branco para não usar termo.</p>
        <textarea value={termo} onChange={e => setTermo(e.target.value)} rows={6} placeholder="Escreva o seu termo de compromisso…"
          className="w-full px-3 py-2.5 rounded-[14px] bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-accent/60 transition-all resize-y" />
        <div className="flex justify-end mt-3"><button type="button" onClick={salvarTermo} disabled={salvandoTermo} className={btnSalvar}>{salvandoTermo ? 'Salvando…' : 'Salvar termo'}</button></div>
      </div>

      <div className={card}>
        <h2 className={titulo}>Férias dos alunos</h2>
        <p className="text-[12px] text-white/30 mb-2">Alunos pedem férias; o vencimento estende sozinho.</p>
        <Linha label="Permitir férias"><Chave ligado={feriasAtiva} disabled={ocupado} onClick={() => alternar(setFeriasAtiva, feriasAtiva, 'feriasAtiva')} /></Linha>
        {feriasAtiva && (
          <Linha label="Dias por trimestre">
            <input className={inputCls} value={feriasDias} inputMode="numeric" onChange={e => setFeriasDias(e.target.value)}
              onBlur={() => salvarNumero(feriasDias, setFeriasDias, { min: 1, max: 90, padrao: 10, campo: 'feriasDias', aviso: v => null })} />
            <button type="button" disabled={ocupado} className={btnSalvar}
              onClick={() => salvarNumero(feriasDias, setFeriasDias, { min: 1, max: 90, padrao: 10, campo: 'feriasDias', aviso: v => `Agora cada aluno tem ${v} dias de férias por trimestre.` })}>Salvar</button>
          </Linha>
        )}
      </div>

      <div className={card}>
        <h2 className={titulo}>Reposição de aulas</h2>
        <p className="text-[12px] text-white/30 mb-2">Antecedência mínima pra pedir reposição continua valendo mesmo com o limite desligado.</p>
        <Linha label="Antecedência mínima (horas)">
          <input className={inputCls} value={repoAntecedencia} inputMode="numeric" onChange={e => setRepoAntecedencia(e.target.value)} />
          <button type="button" disabled={ocupado} className={btnSalvar}
            onClick={() => salvarNumero(repoAntecedencia, setRepoAntecedencia, { min: 0, max: 168, padrao: 24, campo: 'reposicaoAntecedenciaHoras', aviso: v => `Agora as reposições precisam ser pedidas com pelo menos ${v}h de antecedência.` })}>Salvar</button>
        </Linha>
        <Linha label="Limitar quantidade"><Chave ligado={repoLimiteAtiva} disabled={ocupado} onClick={() => alternar(setRepoLimiteAtiva, repoLimiteAtiva, 'reposicaoLimiteAtiva')} /></Linha>
        {repoLimiteAtiva && (
          <Linha label="Reposições por mês">
            <input className={inputCls} value={repoLimiteQtd} inputMode="numeric" onChange={e => setRepoLimiteQtd(e.target.value)} />
            <button type="button" disabled={ocupado} className={btnSalvar}
              onClick={() => salvarNumero(repoLimiteQtd, setRepoLimiteQtd, { min: 1, max: 30, padrao: 1, campo: 'reposicaoLimiteQtd', aviso: v => `Agora cada aluno pode fazer até ${v} ${v === 1 ? 'reposição' : 'reposições'} por mês.` })}>Salvar</button>
          </Linha>
        )}
      </div>

      <div className={card}>
        <h2 className={titulo}>Reajuste anual</h2>
        <p className="text-[12px] text-white/30 mb-2">Em dezembro, avisa e já sugere o IPCA acumulado pra reajustar os planos.</p>
        <Linha label="Reajuste anual"><Chave ligado={reajusteAtivo} disabled={ocupado} onClick={() => alternar(setReajusteAtivo, reajusteAtivo, 'reajusteAnualAtivo')} /></Linha>
      </div>

      <div className={card}>
        <h2 className={titulo}>Conta</h2>
        <Link href="/dashboard/assinatura" className="flex items-center justify-between py-2 text-[13px] font-medium text-white/75 hover:text-white transition-colors">
          <span className="flex items-center gap-2"><CreditCard size={14} className="text-accent" /> Minha assinatura</span><ChevronRight size={14} className="text-white/30" />
        </Link>
      </div>
    </>
  );
}
