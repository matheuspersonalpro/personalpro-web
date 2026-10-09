'use client';
// Configurações do Perfil que o app tem e o site não tinha: convite, termo, férias, reposição
// e reajuste anual. Mesmos campos de appConfig e mesmos tetos de validação do app
// (screens/personal/PerfilPersonal.js). Cada controle salva na hora, como no app.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy, Link2, FileText, CreditCard, ChevronRight, Camera, Lock, X } from 'lucide-react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth, storage } from '@/lib/firebase';
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
  const [logoUrl, setLogoUrl] = useState('');
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [modalSenha, setModalSenha] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState('');
  // Conta Google/Apple não tem senha: "Trocar senha" pediria a senha atual e sempre falharia.
  const entraComSenha = !!auth.currentUser?.providerData?.some(pd => pd.providerId === 'password');

  useEffect(() => {
    buscarConfigApp().then(cfg => {
      if (cfg?.logoUrl) setLogoUrl(cfg.logoUrl);
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
  // Reduz a foto para no máximo 512 px (JPEG) antes de enviar, como o app.
  function reduzirFoto(arquivo, lado = 512) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(arquivo);
      img.onload = () => {
        const esc = Math.min(1, lado / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * esc); c.height = Math.round(img.height * esc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(b => (b ? resolve(b) : reject(new Error('Não consegui processar a imagem.'))), 'image/jpeg', 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Arquivo de imagem inválido.')); };
      img.src = url;
    });
  }
  async function escolherLogo(e) {
    const arq = e.target.files?.[0];
    e.target.value = '';
    if (!arq) return;
    if (!arq.type.startsWith('image/')) { toast('Escolha um arquivo de imagem.', 'error'); return; }
    const uid = auth.currentUser?.uid;
    if (!uid) { toast('Sessão expirada. Entre novamente.', 'error'); return; }
    setEnviandoLogo(true);
    try {
      const blob = await reduzirFoto(arq);
      const fRef = storageRef(storage, `perfis/${uid}/logo.jpg`);
      await uploadBytes(fRef, blob);
      const url = await getDownloadURL(fRef);
      await salvarConfigApp({ logoUrl: url });
      setLogoUrl(url + '&t=' + Date.now());
      toast('Foto atualizada.');
    } catch (err) { toast(err?.message || 'Não foi possível enviar a foto.', 'error'); }
    finally { setEnviandoLogo(false); }
  }

  function fecharSenha() { setModalSenha(false); setSenhaAtual(''); setNovaSenha(''); setConfirmar(''); setErroSenha(''); }
  async function alterarSenha() {
    setErroSenha('');
    if (!senhaAtual || !novaSenha || !confirmar) { setErroSenha('Preencha todos os campos.'); return; }
    if (novaSenha.length < 6) { setErroSenha('A nova senha precisa ter pelo menos 6 caracteres.'); return; }
    if (novaSenha !== confirmar) { setErroSenha('A nova senha e a confirmação não coincidem.'); return; }
    setSalvandoSenha(true);
    try {
      const user = auth.currentUser;
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, senhaAtual));
      await updatePassword(user, novaSenha);
      fecharSenha();
      toast('Sua senha foi atualizada com sucesso.');
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') setErroSenha('A senha atual informada está incorreta.');
      else if (e.code === 'auth/network-request-failed') setErroSenha('Verifique sua internet e tente de novo.');
      else if (e.code === 'auth/requires-recent-login') setErroSenha('Por segurança, saia e entre de novo antes de trocar a senha.');
      else if (e.code === 'auth/too-many-requests') setErroSenha('Muitas tentativas. Aguarde alguns minutos e tente de novo.');
      else setErroSenha('Não foi possível alterar a senha agora. Tente novamente em instantes.');
    } finally { setSalvandoSenha(false); }
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
        <h2 className={titulo}>Foto ou logo</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-2 flex items-center justify-center ring-1 ring-accent/20 shrink-0">
            {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-cover" /> : <Camera size={20} className="text-white/30" />}
          </div>
          <div>
            <label className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-[14px] bg-accent/15 text-[12px] font-semibold text-accent hover:bg-accent/25 transition-all cursor-pointer ${enviandoLogo ? 'opacity-50 pointer-events-none' : ''}`}>
              <Camera size={13} /> {enviandoLogo ? 'Enviando…' : logoUrl ? 'Trocar foto' : 'Adicionar foto ou logo'}
              <input type="file" accept="image/*" className="hidden" onChange={escolherLogo} />
            </label>
            <p className="text-[11px] text-white/30 mt-1.5">Aparece para os seus alunos no app.</p>
          </div>
        </div>
      </div>

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
        {entraComSenha && (
          <button type="button" onClick={() => setModalSenha(true)} className="w-full flex items-center justify-between py-2 text-[13px] font-medium text-white/75 hover:text-white transition-colors">
            <span className="flex items-center gap-2"><Lock size={14} className="text-accent" /> Trocar senha</span><ChevronRight size={14} className="text-white/30" />
          </button>
        )}
      </div>

      {modalSenha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-[22px] bg-[#141619] ring-1 ring-white/[0.08] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h2 className="text-[15px] font-bold text-white">Trocar senha</h2>
              <button onClick={fecharSenha} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-3">
              {[['Senha atual', senhaAtual, setSenhaAtual, 'current-password'], ['Nova senha', novaSenha, setNovaSenha, 'new-password'], ['Confirmar nova senha', confirmar, setConfirmar, 'new-password']].map(([l, v, set, ac]) => (
                <div key={l}>
                  <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">{l}</label>
                  <input type="password" value={v} autoComplete={ac} onChange={e => set(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-[14px] bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-accent/60 transition-all" />
                </div>
              ))}
              {erroSenha && <p className="text-[12px] text-red-400">{erroSenha}</p>}
            </div>
            <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2">
              <button onClick={fecharSenha} className="px-4 py-2 rounded-[14px] border border-white/[0.08] text-[13px] text-white/50 hover:text-white transition-all">Cancelar</button>
              <button onClick={alterarSenha} disabled={salvandoSenha} className={btnSalvar}>{salvandoSenha ? 'Salvando…' : 'Salvar nova senha'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
