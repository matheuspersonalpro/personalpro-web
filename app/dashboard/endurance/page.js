'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  buscarAlunos, criarSessaoEndurance, buscarSessoesEndurance,
  atualizarSessaoEndurance, deletarSessaoEndurance,
  definirProvaEndurance, salvarTesteEndurance, removerTesteEndurance,
  salvarModeloEndurance, buscarModelosEndurance, deletarModeloEndurance,
  limparPlanoEndurance,
} from '@/lib/firestore';
import {
  tiposPorModalidade, tipoTreino, TIPOS_TREINO,
  inicioDaSemana, diasDaSemana, chaveData, dataCurta,
  formatarDistancia, formatarDuracao, volumeSemanal,
  semanasAteProva, fasePeriodizacao, mapaZonas, anotarZonasDetalhe,
} from '@/lib/enduranceTreinos';
import { modelosProntos, modelosSugeridos, semanaSugerida, nivelDoPerfil } from '@/lib/enduranceModelos';
import {
  calcularVDOT, zonasCorridaPorVDOT,
  calcularFTP, calcularFTPRampa, zonasCiclismoPorFTP,
  fcMaxTanaka, zonasFCPorFCMax, zonasFCKarvonen,
} from '@/lib/enduranceZonas';
import {
  ChevronLeft, ChevronRight, Activity, BookOpen, Calendar,
  Target, Zap, Flag, Ruler, Trash2, Plus, X, Check, Save,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';

const DIST_OPCOES_CORRIDA = [
  { valor: '5km',  label: '5 km',      sub: 'VO₂máx',       cor: '#34d399' },
  { valor: '10km', label: '10 km',     sub: 'VO₂ + Limiar', cor: '#60a5fa' },
  { valor: '21km', label: '21 km',     sub: 'Meia Maratona', cor: '#fbbf24' },
  { valor: '42km', label: '42 km',     sub: 'Maratona',      cor: '#fb7185' },
];
const DIST_OPCOES_CICLISMO = [
  { valor: 'criterium', label: 'Criterium', sub: '~1-2h · potência',   cor: '#fb7185' },
  { valor: 'granfondo', label: 'Granfondo', sub: '3-5h · resistência', cor: '#fbbf24' },
  { valor: 'endurance', label: 'Endurance', sub: '5h+ · aeróbico',    cor: '#34d399' },
];
const DIST_LABELS = {
  '5km':'5 km','10km':'10 km','21km':'21 km','42km':'Maratona',
  'criterium':'Criterium','granfondo':'Granfondo','endurance':'Endurance',
};
const COR_FASE  = { base:'#34d399', build:'#3B82F6', pico:'#fb923c', taper:'#fbbf24', prova:'#fb7185', geral:'#60a5fa' };
const NOME_FASE = { base:'Base aeróbica', build:'Específico (build)', pico:'Pico', taper:'Taper/polimento', prova:'Semana da prova', geral:'Condicionamento' };

export default function EndurancePage() {
  const toast = useToast();
  const confirm = useConfirm();

  // ── Estado global ─────────────────────────────────────────────────────────
  const [alunos,     setAlunos]     = useState([]);
  const [alunoId,    setAlunoId]    = useState('');
  const [modalidade, setModalidade] = useState('corrida');
  const [aba,        setAba]        = useState('zonas');

  // ── Zonas ─────────────────────────────────────────────────────────────────
  const [distanciaM,  setDistanciaM]  = useState(5000);
  const [minTeste,    setMinTeste]    = useState('');
  const [segTeste,    setSegTeste]    = useState('');
  const [potencia,    setPotencia]    = useState('');
  const [testeCic,    setTesteCic]    = useState('20min');
  const [idadeTeste,  setIdadeTeste]  = useState('');
  const [fcMaxManual, setFcMaxManual] = useState('');
  const [fcRepouso,   setFcRepouso]   = useState('');
  const [resultado,   setResultado]   = useState(null);
  const [salvandoT,   setSalvandoT]   = useState(false);

  // ── Planilha ──────────────────────────────────────────────────────────────
  const [semanaIni,   setSemanaIni]   = useState(() => inicioDaSemana());
  const [sessoes,     setSessoes]     = useState([]);
  const [carregando,  setCarregando]  = useState(false);
  const [dataProva,   setDataProva]   = useState(null);
  const [distProva,   setDistProva]   = useState(null);

  // Editor de sessão
  const [editor,      setEditor]      = useState(null);
  const [salvandoS,   setSalvandoS]   = useState(false);

  // Modais
  const [modalProva,  setModalProva]  = useState(false);
  const [distTemp,    setDistTemp]    = useState(null);
  const [dataTemp,    setDataTemp]    = useState('');
  const [modalPlano,  setModalPlano]  = useState(false);
  const [resumoPlano, setResumoPlano] = useState(null);
  const [gerandoP,    setGerandoP]    = useState(false);
  const [limpandoT,   setLimpandoT]   = useState(false);
  const [modalMod,    setModalMod]    = useState(false);
  const [meusModelos, setMeusModelos] = useState([]);

  // ── Derivados ─────────────────────────────────────────────────────────────
  const aluno   = alunos.find(a => a.id === alunoId) || null;
  const perfil  = aluno?.enduranceProfile?.[modalidade] || {};
  // Nível do aluno (iniciante|intermediario|avancado) a partir do teste salvo —
  // escala o VOLUME das semanas sugeridas. Sem teste, cai em 'intermediario'.
  // Antes o site não calculava isso: TODO aluno recebia plano intermediário fixo.
  const nivelAluno = nivelDoPerfil(modalidade, perfil);
  const dias    = diasDaSemana(semanaIni);
  const iniKey  = chaveData(dias[0]);
  const fimKey  = chaveData(dias[6]);
  const hojeKey = chaveData(new Date());
  const semRest = semanasAteProva(dataProva, semanaIni);
  const faseProva = dataProva ? fasePeriodizacao(semRest, distProva) : null;
  const focoInfo  = faseProva || { chave:'geral', fase:'Condicionamento geral', cor:'#3B82F6', foco:'Maior parte fácil + 1-2 treinos de qualidade por semana.' };
  const sugestoes = modelosSugeridos(modalidade, focoInfo.chave, distProva);
  const zonasMap  = mapaZonas(perfil);
  const matDet    = (det) => anotarZonasDetalhe(det || '', zonasMap);
  const vol       = volumeSemanal(sessoes);

  // ── Carregar alunos ───────────────────────────────────────────────────────
  useEffect(() => { buscarAlunos().then(setAlunos).catch(() => {}); }, []);

  // ── Carregar sessões ──────────────────────────────────────────────────────
  const carregar = useCallback(async () => {
    if (!alunoId) { setSessoes([]); return; }
    setCarregando(true);
    try {
      const todas = await buscarSessoesEndurance(alunoId, modalidade);
      setSessoes(todas.filter(s => s.data >= iniKey && s.data <= fimKey));
    } finally { setCarregando(false); }
  }, [alunoId, modalidade, iniKey, fimKey]);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Ao trocar aluno/modalidade ─────────────────────────────────────────────
  useEffect(() => {
    if (!aluno) { setResultado(null); setDataProva(null); setDistProva(null); return; }
    const p = aluno?.enduranceProfile?.[modalidade];
    setDataProva(p?.dataProva || null);
    setDistProva(p?.distanciaProva || null);
    // carrega zonas salvas
    if (p?.zonas) {
      setResultado(p.zonas);
      const dt = p.dadosTeste || {};
      setIdadeTeste(dt.idade || '');
      setFcMaxManual(dt.fcMaxManual || '');
      setFcRepouso(dt.fcRepouso || '');
      if (modalidade === 'corrida') { setDistanciaM(dt.distanciaM || 5000); setMinTeste(dt.min || ''); setSegTeste(dt.seg || ''); }
      else { setPotencia(dt.potencia || ''); setTesteCic(dt.testeCic || '20min'); }
    } else {
      setResultado(null); setMinTeste(''); setSegTeste(''); setPotencia('');
    }
  }, [alunoId, modalidade]);

  // ─────────────────────────────────────────────────────────────────────────
  // ZONAS
  // ─────────────────────────────────────────────────────────────────────────
  function calcularZonas() {
    const idadeN = parseInt(idadeTeste, 10);
    const fcMaxN = parseInt(fcMaxManual, 10);
    const fcRepN = parseInt(fcRepouso, 10);
    const fcMax  = fcMaxN > 0 ? fcMaxN : (idadeN > 0 ? fcMaxTanaka(idadeN) : null);
    const fcEstimada = !(fcMaxN > 0) && idadeN > 0;
    const zonasFC = fcMax ? (fcRepN > 0 ? zonasFCKarvonen(fcMax, fcRepN) : zonasFCPorFCMax(fcMax)) : null;

    if (modalidade === 'corrida') {
      const tempoSeg = (parseInt(minTeste, 10) || 0) * 60 + (parseInt(segTeste, 10) || 0);
      if (!distanciaM || tempoSeg <= 0) { toast('Preencha a distância e o tempo do teste.', 'error'); return; }
      const vdot = calcularVDOT(distanciaM, tempoSeg);
      setResultado({ tipo:'corrida', destaque:`VDOT ${vdot.toFixed(1)}`, zonas:zonasCorridaPorVDOT(vdot), zonasFC, fcMax, fcEstimada, metodoFC: fcRepN > 0 ? 'Karvonen' : '% FCmáx' });
      toast(`VDOT ${vdot.toFixed(1)} — zonas calculadas`);
    } else {
      const pot = parseInt(potencia, 10);
      if (!pot || pot <= 0) { toast('Preencha a potência do teste.', 'error'); return; }
      const ftp = testeCic === 'rampa' ? calcularFTPRampa(pot) : calcularFTP(pot);
      setResultado({ tipo:'ciclismo', destaque:`FTP ${ftp} W`, zonas:zonasCiclismoPorFTP(ftp), zonasFC, fcMax, fcEstimada, metodoFC: fcRepN > 0 ? 'Karvonen' : '% FCmáx' });
      toast(`FTP ${ftp} W — zonas calculadas`);
    }
  }

  async function salvarTeste() {
    if (!alunoId || !resultado) return;
    setSalvandoT(true);
    try {
      const dadosTeste = modalidade === 'corrida'
        ? { distanciaM, min:minTeste, seg:segTeste, idade:idadeTeste, fcMaxManual, fcRepouso }
        : { potencia, testeCic, idade:idadeTeste, fcMaxManual, fcRepouso };
      await salvarTesteEndurance(alunoId, modalidade, dadosTeste, resultado);
      const lista = await buscarAlunos(); setAlunos(lista);
      toast('Zonas salvas no perfil do aluno.');
    } catch { toast('Erro ao salvar.', 'error'); } finally { setSalvandoT(false); }
  }

  async function removerTeste() {
    if (!alunoId) return;
    if (!await confirm({
      title: 'Refazer o teste deste aluno?',
      message: 'As zonas salvas serão removidas para você registrar um teste novo.',
      confirmLabel: 'Remover zonas',
    })) return;
    try {
      await removerTesteEndurance(alunoId, modalidade);
      const lista = await buscarAlunos(); setAlunos(lista);
      setResultado(null); setMinTeste(''); setSegTeste(''); setPotencia('');
      toast('Teste removido — faça um novo.');
    } catch { toast('Erro ao remover.', 'error'); }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PLANILHA — sessões
  // ─────────────────────────────────────────────────────────────────────────
  const sessoesDoDia = (key) => sessoes.filter(s => s.data === key);

  const alvoDaZona = (zonaId) => {
    const r = perfil?.zonas;
    if (!r) return null;
    const z  = (r.zonas  || []).find(x => x.zona === zonaId);
    const zf = (r.zonasFC || []).find(x => x.zona === zonaId);
    return { principal: z?.texto || null, fc: zf?.texto || null };
  };

  const modeloParaEditor = (m, data) => ({
    data, tipo: m.tipo, titulo: m.titulo, medida: m.medida,
    valorTxt: m.valor != null ? (m.medida === 'distancia' ? String(m.valor / 1000).replace('.', ',') : String(Math.round(m.valor / 60))) : '',
    zona: m.zona, detalhe: matDet(m.detalhe),
  });

  const valorBase = (medida, valorTxt) => {
    const n = parseFloat(String(valorTxt).replace(',', '.'));
    if (!isFinite(n) || n <= 0) return null;
    return medida === 'distancia' ? Math.round(n * 1000) : Math.round(n * 60);
  };

  function abrirNovo(key) {
    const t = tiposPorModalidade(modalidade)[1];
    setEditor({ data:key, tipo:t.id, titulo:t.nome, medida:t.medida, valorTxt:'', zona:t.zona, detalhe:'' });
  }

  function abrirEdicao(s) {
    setEditor({
      id:s.id, data:s.data, tipo:s.tipo, titulo:s.titulo, medida:s.medida,
      valorTxt: s.valor != null ? (s.medida==='distancia' ? String(s.valor/1000).replace('.',',') : String(Math.round(s.valor/60))) : '',
      zona:s.zona, detalhe:s.detalhe||'', status:s.status||null, pse:s.pse??null, comentario:s.comentario||'',
    });
  }

  function escolherTipo(id) {
    const t = tipoTreino(id, modalidade);
    setEditor(e => ({
      ...e, tipo:id,
      titulo: (!e.titulo || TIPOS_TREINO.some(x => x.nome === e.titulo)) ? t.nome : e.titulo,
      medida: t.medida, zona: t.zona,
    }));
  }

  const editorSemVolume = editor?.tipo === 'descanso' || editor?.tipo === 'prova';

  async function salvarSessao() {
    if (!editor) return;
    setSalvandoS(true);
    try {
      const payload = {
        data: editor.data, tipo: editor.tipo,
        titulo: editor.titulo?.trim() || tipoTreino(editor.tipo, modalidade).nome,
        medida: editorSemVolume ? null : editor.medida,
        valor:  editorSemVolume ? null : valorBase(editor.medida, editor.valorTxt),
        zona:   editorSemVolume ? null : editor.zona,
        detalhe: editor.detalhe?.trim() || '',
      };
      if (editor.id) await atualizarSessaoEndurance(editor.id, payload);
      else           await criarSessaoEndurance(alunoId, modalidade, payload);
      setEditor(null); await carregar();
      toast(editor.id ? 'Treino atualizado.' : 'Treino adicionado ao dia.');
    } catch { toast('Erro ao salvar.', 'error'); } finally { setSalvandoS(false); }
  }

  async function excluirSessao() {
    if (!editor?.id) return;
    if (!await confirm({
      title: 'Excluir este treino do calendário?',
      message: 'O treino será removido do plano do aluno.',
      confirmLabel: 'Excluir',
    })) return;
    try { await deletarSessaoEndurance(editor.id); setEditor(null); await carregar(); toast('Treino removido.'); }
    catch { toast('Erro ao excluir.', 'error'); }
  }

  async function salvarComoModelo() {
    if (!editor) return;
    try {
      await salvarModeloEndurance(modalidade, {
        tipo:editor.tipo, titulo:editor.titulo?.trim()||tipoTreino(editor.tipo,modalidade).nome,
        medida:editor.medida, valor:valorBase(editor.medida,editor.valorTxt),
        zona:editor.zona, detalhe:editor.detalhe?.trim()||'',
      });
      toast('Treino salvo na biblioteca de modelos.');
    } catch { toast('Erro ao salvar modelo.', 'error'); }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MONTAR SEMANA / LIMPAR
  // ─────────────────────────────────────────────────────────────────────────
  async function montarSemana() {
    if (!alunoId) return;
    const plano = semanaSugerida(modalidade, focoInfo.chave, distProva, semRest, nivelAluno, null);
    const livres = dias.filter(d => {
      const k = chaveData(d);
      return sessoesDoDia(k).length === 0 && !(dataProva && k >= dataProva);
    }).length;
    if (livres === 0) { toast('A semana já está preenchida.', 'error'); return; }
    if (!await confirm({
      title: `Preencher ${livres} dia(s) livre(s) desta semana?`,
      message: `Os dias sem treino receberão a sugestão automática de "${focoInfo.fase}".`,
      confirmLabel: 'Preencher',
      danger: false,
    })) return;
    try {
      for (let i = 0; i < 7; i++) {
        const key = chaveData(dias[i]);
        if (sessoesDoDia(key).length > 0) continue;
        if (dataProva && key >= dataProva) continue;
        const item = plano[i];
        if (!item) continue;
        const payload = item.rest
          ? { data:key, tipo:'descanso', titulo:'Descanso', medida:null, valor:null, zona:null, detalhe:'' }
          : { data:key, tipo:item.tipo, titulo:item.titulo, medida:item.medida, valor:item.valor, zona:item.zona, detalhe:matDet(item.detalhe) };
        await criarSessaoEndurance(alunoId, modalidade, payload);
      }
      if (dataProva && dataProva >= iniKey && dataProva <= fimKey && sessoesDoDia(dataProva).length === 0) {
        await criarMarcadorProva();
      }
      await carregar(); toast('Semana montada!');
    } catch { toast('Erro ao montar semana.', 'error'); }
  }

  async function limparSemana() {
    if (sessoes.length === 0) { toast('Semana já está vazia.', 'error'); return; }
    if (!await confirm({
      title: `Excluir os ${sessoes.length} treino(s) desta semana?`,
      message: 'Todos os treinos desta semana serão removidos do plano do aluno.',
      confirmLabel: 'Excluir semana',
    })) return;
    try {
      for (const s of sessoes) await deletarSessaoEndurance(s.id);
      await carregar(); toast('Semana limpa.');
    } catch { toast('Erro ao limpar.', 'error'); }
  }

  async function limparPlano() {
    if (!await confirm({
      title: `Apagar TODOS os treinos de ${modalidade} deste aluno?`,
      message: 'Toda a programação desta modalidade será apagada. Não dá para desfazer.',
      confirmLabel: 'Apagar tudo',
    })) return;
    setLimpandoT(true);
    try {
      const n = await limparPlanoEndurance(alunoId, modalidade);
      await carregar(); toast(n > 0 ? `Plano limpo — ${n} treino(s) removido(s).` : 'O plano já estava vazio.');
    } catch { toast('Erro ao limpar plano.', 'error'); } finally { setLimpandoT(false); }
  }

  async function criarMarcadorProva() {
    const nome = DIST_LABELS[distProva] || distProva;
    await criarSessaoEndurance(alunoId, modalidade, {
      data:dataProva, tipo:'prova', titulo:'🏁 Chegou o grande dia!',
      medida:null, valor:null, zona:null,
      detalhe:`Dia da prova${nome ? ` — ${nome}` : ''}. Aquecimento leve, hidratação, foco e confiança. Você treinou para isso! 💪`,
      status:'planejado',
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GERAR PLANO COMPLETO
  // ─────────────────────────────────────────────────────────────────────────
  function abrirGerarPlano() {
    if (!dataProva || !distProva) return;
    const hoje = inicioDaSemana(new Date());
    const hojeReal = chaveData(new Date());
    const semProva = inicioDaSemana(new Date(dataProva + 'T00:00:00'));
    const fasesCount = {}; let totalSemanas = 0, totalSessoes = 0;
    let cursor = new Date(hoje);
    while (cursor <= semProva) {
      const sR = semanasAteProva(dataProva, cursor);
      const fase = fasePeriodizacao(sR, distProva);
      const chave = fase?.chave || 'geral';
      const plano = semanaSugerida(modalidade, chave, distProva, sR, nivelAluno, null);
      const dS = diasDaSemana(cursor);
      totalSessoes += plano.filter((d, i) => {
        if (d.rest) return false;
        const k = chaveData(dS[i]);
        return k >= hojeReal && k < dataProva;
      }).length;
      fasesCount[chave] = (fasesCount[chave] || 0) + 1;
      totalSemanas++;
      cursor = new Date(cursor); cursor.setDate(cursor.getDate() + 7);
    }
    setResumoPlano({ totalSemanas, totalSessoes, fasesCount });
    setModalPlano(true);
  }

  async function gerarPlanoCompleto() {
    if (!dataProva || !distProva || !aluno) return;
    setGerandoP(true);
    try {
      const hoje = inicioDaSemana(new Date());
      const hojeReal = chaveData(new Date());
      const existentes = await buscarSessoesEndurance(alunoId, modalidade);
      const ocupados = new Set(existentes.map(s => s.data));
      const semProva = inicioDaSemana(new Date(dataProva + 'T00:00:00'));
      let cursor = new Date(hoje), criadas = 0;
      while (cursor <= semProva) {
        const sR = semanasAteProva(dataProva, cursor);
        const fase = fasePeriodizacao(sR, distProva);
        const chave = fase?.chave || 'geral';
        const plano = semanaSugerida(modalidade, chave, distProva, sR, nivelAluno, null);
        const dS = diasDaSemana(cursor);
        for (let i = 0; i < 7; i++) {
          const item = plano[i]; if (!item || item.rest) continue;
          const k = chaveData(dS[i]);
          if (k < hojeReal || k > dataProva || ocupados.has(k) || k === dataProva) continue;
          await criarSessaoEndurance(alunoId, modalidade, {
            data:k, tipo:item.tipo, titulo:item.titulo, medida:item.medida, valor:item.valor,
            zona:item.zona, detalhe:matDet(item.detalhe), status:'planejado',
          });
          criadas++;
        }
        cursor = new Date(cursor); cursor.setDate(cursor.getDate() + 7);
      }
      if (!ocupados.has(dataProva)) { await criarMarcadorProva(); criadas++; }
      setModalPlano(false);
      toast(`Plano gerado! ${criadas} treino(s) criado(s).`);
      carregar();
    } catch { toast('Erro ao gerar plano.', 'error'); } finally { setGerandoP(false); }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROVA
  // ─────────────────────────────────────────────────────────────────────────
  function abrirProva() {
    setDistTemp(distProva);
    setDataTemp(dataProva || '');
    setModalProva(true);
  }

  async function salvarProva() {
    try {
      await definirProvaEndurance(alunoId, modalidade, dataTemp || null, distTemp || null);
      setDataProva(dataTemp || null); setDistProva(distTemp || null);
      setModalProva(false); toast(dataTemp ? 'Prova-alvo definida.' : 'Prova removida.');
      const lista = await buscarAlunos(); setAlunos(lista);
    } catch { toast('Erro ao salvar prova.', 'error'); }
  }

  async function removerProva() {
    try {
      await definirProvaEndurance(alunoId, modalidade, null, null);
      setDataProva(null); setDistProva(null); setModalProva(false);
      toast('Prova removida.'); const lista = await buscarAlunos(); setAlunos(lista);
    } catch { toast('Erro ao remover prova.', 'error'); }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MODELOS
  // ─────────────────────────────────────────────────────────────────────────
  async function abrirModelos() {
    setMeusModelos(await buscarModelosEndurance(modalidade));
    setModalMod(true);
  }

  function aplicarModelo(m) {
    setEditor(e => ({ ...e, tipo:m.tipo, titulo:m.titulo, medida:m.medida,
      valorTxt: m.valor != null ? (m.medida==='distancia' ? String(m.valor/1000).replace('.',',') : String(Math.round(m.valor/60))) : '',
      zona:m.zona, detalhe:matDet(m.detalhe) }));
    setModalMod(false);
  }

  async function excluirModelo(id) {
    if (!await confirm({
      title: 'Remover este modelo da biblioteca?',
      message: 'O modelo deixará de ficar disponível para reutilizar nos planos.',
      confirmLabel: 'Remover',
    })) return;
    try { await deletarModeloEndurance(id); setMeusModelos(await buscarModelosEndurance(modalidade)); }
    catch { toast('Erro ao excluir.', 'error'); }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-4 pb-6 md:px-8 md:pt-8 md:pb-8 max-w-[1200px] mx-auto w-full">

      {/* ── Modais ────────────────────────────────────────────────────────── */}

      {/* Editor de sessão */}
      {editor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] overflow-hidden max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div>
                <h2 className="text-[15px] font-bold text-white">{editor.id ? 'Editar treino' : 'Novo treino'}</h2>
                {editor.data && <p className="text-[11px] text-white/40 mt-0.5">{dataCurta(editor.data)}</p>}
              </div>
              <button onClick={() => setEditor(null)} className="p-1.5 rounded-xl hover:bg-white/[0.08] text-white/40 hover:text-white transition-all"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto p-5 flex-1 space-y-4">
              {/* registro do aluno */}
              {editor.status && (
                <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 ring-1"
                  style={{ background: editor.status==='feito' ? 'rgba(52,211,153,0.08)' : 'rgba(251,113,133,0.08)', borderColor: editor.status==='feito' ? 'rgba(52,211,153,0.4)' : 'rgba(251,113,133,0.4)' }}>
                  <span className={`text-[12px] font-semibold ${editor.status==='feito' ? 'text-green-400' : 'text-red-400'}`}>
                    {editor.status==='feito' ? 'Aluno fez' : 'Aluno não fez'}
                    {editor.pse != null ? ` · PSE ${editor.pse}/10` : ''}
                    {editor.comentario ? ` · "${editor.comentario}"` : ''}
                  </span>
                </div>
              )}
              {/* tipo */}
              <div>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">Tipo</p>
                <div className="flex flex-wrap gap-2">
                  {tiposPorModalidade(modalidade).map(t => {
                    const ativo = editor.tipo === t.id;
                    return (
                      <button key={t.id} onClick={() => escolherTipo(t.id)}
                        className="px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all ring-1"
                        style={{ background: ativo ? t.cor+'22' : 'rgba(255,255,255,0.04)', color: ativo ? t.cor : 'rgba(255,255,255,0.5)', borderColor: ativo ? t.cor : 'rgba(255,255,255,0.1)' }}>
                        {t.nome}
                      </button>
                    );
                  })}
                </div>
              </div>
              {editor.tipo !== 'descanso' && (
                <>
                  {/* título */}
                  <div>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">Título</p>
                    <input value={editor.titulo || ''} onChange={e => setEditor(x => ({...x, titulo:e.target.value}))}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all" />
                  </div>
                  {!editorSemVolume && (
                    <>
                      {/* volume */}
                      <div>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">Volume</p>
                        <div className="flex items-center gap-2">
                          {['distancia','tempo'].map(m => (
                            <button key={m} onClick={() => setEditor(e => ({...e, medida:m}))}
                              className={`px-3 py-2 rounded-xl text-[12px] font-semibold transition-all ${editor.medida===m ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30' : 'bg-white/[0.04] text-white/40 hover:text-white'}`}>
                              {m === 'distancia' ? 'Distância' : 'Tempo'}
                            </button>
                          ))}
                          <div className="flex items-center gap-1.5 bg-white/[0.04] rounded-xl px-3 py-2 ring-1 ring-white/[0.08] flex-1">
                            <input type="number" value={editor.valorTxt || ''} onChange={e => setEditor(x => ({...x, valorTxt:e.target.value}))}
                              placeholder="0" className="flex-1 bg-transparent text-white text-[15px] font-semibold text-center focus:outline-none w-12" />
                            <span className="text-[12px] text-white/40">{editor.medida==='distancia' ? 'km' : 'min'}</span>
                          </div>
                        </div>
                      </div>
                      {/* zona */}
                      <div>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">Zona alvo</p>
                        <div className="flex gap-2">
                          {['Z1','Z2','Z3','Z4','Z5'].map(z => {
                            const ativo = editor.zona === z;
                            return (
                              <button key={z} onClick={() => setEditor(e => ({...e, zona: ativo ? null : z}))}
                                className={`flex-1 py-2 rounded-xl text-[12px] font-bold transition-all ${ativo ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30' : 'bg-white/[0.04] text-white/40 hover:text-white'}`}>
                                {z}
                              </button>
                            );
                          })}
                        </div>
                        {editor.zona && alvoDaZona(editor.zona) && (
                          <p className="text-[11px] text-blue-400 mt-2">
                            {[alvoDaZona(editor.zona)?.principal && `Alvo: ${alvoDaZona(editor.zona).principal}`, alvoDaZona(editor.zona)?.fc && `FC ${alvoDaZona(editor.zona).fc}`].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                  {/* detalhe */}
                  <div>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">{editor.tipo==='prova' ? 'Mensagem do dia' : 'Detalhes (opcional)'}</p>
                    <textarea value={editor.detalhe || ''} onChange={e => setEditor(x => ({...x, detalhe:e.target.value}))} rows={4}
                      placeholder="Ex: 5x 800 m em Z4 com 400 m de trote" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[12px] focus:outline-none focus:border-blue-500/60 transition-all resize-none leading-relaxed" />
                  </div>
                  {!editorSemVolume && (
                    <div className="flex gap-2">
                      <button onClick={abrirModelos} className="flex-1 py-2.5 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/30 text-[12px] text-blue-400 font-semibold hover:bg-blue-500/20 transition-all">Usar modelo</button>
                      <button onClick={salvarComoModelo} className="flex-1 py-2.5 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/30 text-[12px] text-blue-400 font-semibold hover:bg-blue-500/20 transition-all">Salvar modelo</button>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="px-5 py-4 border-t border-white/[0.06] space-y-2">
              <button onClick={salvarSessao} disabled={salvandoS}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-bold text-white disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                <Check size={15} /> {salvandoS ? 'Salvando...' : (editor.id ? 'Salvar alterações' : 'Adicionar ao dia')}
              </button>
              {editor.id && (
                <button onClick={excluirSessao} className="w-full py-2 text-[12px] text-red-400/70 hover:text-red-400 transition-colors">Excluir treino</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de modelos */}
      {modalMod && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] overflow-hidden max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-[15px] font-bold text-white">Modelos de treino</h2>
              <button onClick={() => setModalMod(false)} className="p-1.5 rounded-xl hover:bg-white/[0.08] text-white/40 hover:text-white transition-all"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              <p className="text-[10px] font-bold text-blue-400/90 uppercase tracking-wider">Prontos · Base científica</p>
              {modelosProntos(modalidade).map(m => {
                const t = tipoTreino(m.tipo, modalidade);
                const vol = m.medida==='distancia' ? formatarDistancia(m.valor) : m.medida==='tempo' ? formatarDuracao(m.valor) : null;
                return (
                  <button key={m.id} onClick={() => aplicarModelo(m)} className="w-full text-left flex items-start gap-3 py-2.5 border-b border-white/[0.05] hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: t.cor+'22' }}>
                      <BookOpen size={14} style={{ color: t.cor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-white">{m.titulo}</span>
                        {vol && <span className="text-[11px] font-semibold text-blue-400">{vol}{m.zona ? ` · ${m.zona}` : ''}</span>}
                      </div>
                      {m.detalhe && <p className="text-[11px] text-white/40 mt-0.5 leading-relaxed line-clamp-2">{matDet(m.detalhe)}</p>}
                      {m.ref && <p className="text-[10px] text-white/25 mt-0.5 italic">{m.ref}</p>}
                    </div>
                  </button>
                );
              })}
              <p className="text-[10px] font-bold text-blue-400/90 uppercase tracking-wider pt-2">Meus modelos</p>
              {meusModelos.length === 0 ? (
                <p className="text-[12px] text-white/35 text-center py-4">Nenhum modelo ainda. Monte um treino e toque em "Salvar modelo".</p>
              ) : meusModelos.map(m => {
                const t = tipoTreino(m.tipo, modalidade);
                const vol = m.medida==='distancia' ? formatarDistancia(m.valor) : m.medida==='tempo' ? formatarDuracao(m.valor) : null;
                return (
                  <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.05]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: t.cor+'22' }}>
                      <BookOpen size={14} style={{ color: t.cor }} />
                    </div>
                    <button onClick={() => aplicarModelo(m)} className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
                      <p className="text-[13px] font-semibold text-white truncate">{m.titulo || t.nome}</p>
                      <p className="text-[11px] text-white/40">{[vol, m.zona].filter(Boolean).join(' · ') || m.detalhe}</p>
                    </button>
                    <button onClick={() => excluirModelo(m.id)} className="p-1.5 text-white/25 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal configurar prova */}
      {modalProva && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl bg-[#1A2535] ring-1 ring-white/[0.08] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-bold text-white">Configurar prova-alvo</h2>
              <button onClick={() => setModalProva(false)} className="p-1.5 text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-[11px] font-semibold text-white/45 uppercase tracking-wider mb-3">{modalidade==='ciclismo' ? 'Tipo de evento' : 'Distância da prova'}</p>
            <div className="flex gap-2 mb-5 flex-wrap">
              {(modalidade==='ciclismo' ? DIST_OPCOES_CICLISMO : DIST_OPCOES_CORRIDA).map(op => {
                const sel = distTemp === op.valor;
                return (
                  <button key={op.valor} onClick={() => setDistTemp(op.valor)}
                    className="flex-1 min-w-[80px] py-3 rounded-xl text-center transition-all ring-1"
                    style={{ background: sel ? op.cor+'18' : 'rgba(15,23,42,0.8)', color: sel ? op.cor : 'rgba(255,255,255,0.55)', borderColor: sel ? op.cor : 'rgba(255,255,255,0.15)' }}>
                    <p className="text-[14px] font-bold">{op.label}</p>
                    {op.sub && <p className="text-[10px] opacity-70 mt-0.5">{op.sub}</p>}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] font-semibold text-white/45 uppercase tracking-wider mb-2">Data da prova</p>
            <input type="date" value={dataTemp || ''} onChange={e => setDataTemp(e.target.value)} min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 rounded-xl bg-[#0F172A] border border-blue-500/30 text-white text-[14px] focus:outline-none focus:border-blue-500/60 transition-all mb-5" />
            <button onClick={salvarProva} disabled={!distTemp || !dataTemp}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-[14px] font-bold text-white disabled:opacity-40 transition-all mb-2 flex items-center justify-center gap-2">
              <Flag size={15} /> Salvar prova
            </button>
            {(dataProva || distProva) && (
              <button onClick={removerProva} className="w-full py-2.5 text-[13px] text-red-400/70 hover:text-red-400 transition-colors">Remover prova-alvo</button>
            )}
          </div>
        </div>
      )}

      {/* Modal gerar plano completo */}
      {modalPlano && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl bg-[#1A2535] ring-1 ring-white/[0.08] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-bold text-white">Gerar plano completo</h2>
              {!gerandoP && <button onClick={() => setModalPlano(false)} className="p-1.5 text-white/40 hover:text-white"><X size={18} /></button>}
            </div>
            {resumoPlano && (
              <>
                <div className="flex bg-[#0F172A] rounded-2xl p-4 mb-5">
                  {[
                    { icon: <Calendar size={20} className="text-blue-400" />, val: resumoPlano.totalSemanas, label: 'Semanas' },
                    { icon: <Zap size={20} className="text-green-400" />, val: `~${resumoPlano.totalSessoes}`, label: 'Treinos' },
                    { icon: <Flag size={20} className="text-amber-400" />, val: DIST_LABELS[distProva] || distProva, label: 'Prova', small: true },
                  ].map((item, i) => (
                    <div key={i} className={`flex-1 flex flex-col items-center gap-1 ${i > 0 ? 'border-l border-white/[0.08]' : ''}`}>
                      {item.icon}
                      <span className={`font-bold text-white ${item.small ? 'text-[13px]' : 'text-[22px]'}`}>{item.val}</span>
                      <span className="text-[11px] text-white/40">{item.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] font-semibold text-white/45 uppercase tracking-wider mb-3">Distribuição de fases</p>
                <div className="space-y-2 mb-4">
                  {Object.entries(resumoPlano.fasesCount).map(([chave, sems]) => (
                    <div key={chave} className="flex items-center gap-3 py-2 border-b border-white/[0.06]">
                      <div className="w-2 h-2 rounded-full" style={{ background: COR_FASE[chave] || '#60a5fa' }} />
                      <span className="flex-1 text-[13px] text-white/80">{NOME_FASE[chave] || chave}</span>
                      <span className="text-[13px] font-bold" style={{ color: COR_FASE[chave] || '#60a5fa' }}>{sems} sem.</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-white/35 text-center leading-relaxed mb-4">Dias que já têm treino serão preservados — o plano preenche apenas os dias vazios.</p>
              </>
            )}
            <button onClick={gerarPlanoCompleto} disabled={gerandoP}
              className="w-full py-3.5 rounded-xl text-[14px] font-bold text-white disabled:opacity-60 transition-all flex items-center justify-center gap-2"
              style={{ background: '#34d399' }}>
              {gerandoP ? 'Gerando...' : <><Check size={15} /> Gerar plano</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Activity size={20} className="text-blue-400" /> Endurance
        </h1>
        <p className="text-[12px] text-white/35 mt-1">Plano de corrida e ciclismo por aluno</p>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select value={alunoId} onChange={e => setAlunoId(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all min-w-[200px]">
          <option value="">Selecione um aluno</option>
          {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
        <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1">
          {['corrida','ciclismo'].map(m => (
            <button key={m} onClick={() => setModalidade(m)}
              className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${modalidade===m ? 'bg-blue-600 text-white shadow' : 'text-white/40 hover:text-white/70'}`}>
              {m === 'corrida' ? 'Corrida' : 'Ciclismo'}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-xl bg-white/[0.04] p-1">
          <button onClick={() => setAba('zonas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${aba==='zonas' ? 'bg-blue-600 text-white shadow' : 'text-white/40 hover:text-white/70'}`}>
            <Ruler size={12} /> Zonas
          </button>
          <button onClick={() => setAba('plano')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${aba==='plano' ? 'bg-blue-600 text-white shadow' : 'text-white/40 hover:text-white/70'}`}>
            <Calendar size={12} /> Planilha
          </button>
        </div>
      </div>

      {/* Estado vazio */}
      {!alunoId && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.15)' }}>
            <Activity size={28} className="text-blue-400/60" />
          </div>
          <h3 className="text-[15px] font-semibold text-white/60 mb-2">Selecione um aluno</h3>
          <p className="text-[12px] text-white/30 max-w-xs">Escolha um aluno para visualizar ou criar o plano de endurance.</p>
        </div>
      )}

      {/* ── ABA: ZONAS ────────────────────────────────────────────────────────── */}
      {alunoId && aba === 'zonas' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-blue-500/[0.08] ring-1 ring-blue-500/20 px-4 py-3 flex items-center gap-3">
            <Ruler size={15} className="text-blue-400/70 shrink-0" />
            <p className="text-[12px] text-white/50">
              {modalidade==='corrida' ? 'Faça um teste contra-relógio e calcule as zonas de ritmo.' : 'Use o teste de 20 min ou rampa para estimar o FTP e as zonas de potência.'}
            </p>
          </div>

          {/* Card do teste */}
          <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] p-5">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-4">Teste</p>

            {modalidade === 'corrida' ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] text-white/40 mb-2">Distância</p>
                  <div className="flex gap-2 flex-wrap">
                    {[{m:3000,l:'3 km'},{m:5000,l:'5 km'},{m:10000,l:'10 km'},{m:21097,l:'21 km'}].map(d => (
                      <button key={d.m} onClick={() => setDistanciaM(d.m)}
                        className={`px-4 py-2 rounded-xl text-[12px] font-semibold transition-all ${distanciaM===d.m ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/40' : 'bg-white/[0.05] text-white/50 hover:text-white'}`}>
                        {d.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-white/40 mb-2">Tempo (min : seg)</p>
                  <div className="flex items-center gap-2">
                    <input type="number" value={minTeste} onChange={e => setMinTeste(e.target.value)} placeholder="min"
                      className="w-24 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[16px] font-bold text-center focus:outline-none focus:border-blue-500/60 transition-all" />
                    <span className="text-white/30 text-xl font-bold">:</span>
                    <input type="number" value={segTeste} onChange={e => setSegTeste(e.target.value)} placeholder="seg"
                      className="w-24 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[16px] font-bold text-center focus:outline-none focus:border-blue-500/60 transition-all" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] text-white/40 mb-2">Protocolo</p>
                  <div className="flex gap-2">
                    {[{id:'20min',l:'Teste 20 min'},{id:'rampa',l:'Rampa'}].map(t => (
                      <button key={t.id} onClick={() => setTesteCic(t.id)}
                        className={`px-4 py-2 rounded-xl text-[12px] font-semibold transition-all ${testeCic===t.id ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/40' : 'bg-white/[0.05] text-white/50 hover:text-white'}`}>
                        {t.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-white/40 mb-2">{testeCic==='rampa' ? 'Melhor potência de 1 min na rampa (W)' : 'Potência média no teste de 20 min (W)'}</p>
                  <input type="number" value={potencia} onChange={e => setPotencia(e.target.value)} placeholder="Ex.: 250"
                    className="w-36 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[14px] focus:outline-none focus:border-blue-500/60 transition-all" />
                  <p className="text-[11px] text-white/30 mt-1.5">{testeCic==='rampa' ? 'FTP = 75% da melhor potência de 1 min (MAP).' : 'FTP = 95% da potência média dos 20 min.'}</p>
                </div>
              </div>
            )}

            {/* FC */}
            <div className="mt-5 pt-4 border-t border-white/[0.06]">
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-3">Zonas por frequência cardíaca <span className="normal-case font-normal">(opcional)</span></p>
              <p className="text-[11px] text-white/35 mb-3">Idade vem do cadastro; FC máx e repouso refinam as zonas.</p>
              <div className="flex gap-3 flex-wrap">
                {[
                  { label:'Idade', val:idadeTeste, set:setIdadeTeste, ph:'anos', w:'w-20' },
                  { label:'FC máx (opc.)', val:fcMaxManual, set:setFcMaxManual, ph:'bpm', w:'w-24' },
                  { label:'FC repouso (opc.)', val:fcRepouso, set:setFcRepouso, ph:'bpm', w:'w-24' },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-[11px] text-white/40 mb-1">{f.label}</p>
                    <input type="number" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                      className={`${f.w} px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-[12px] text-center focus:outline-none focus:border-blue-500/50 transition-all`} />
                  </div>
                ))}
              </div>
            </div>

            <button onClick={calcularZonas}
              className="mt-5 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-[14px] font-bold text-white transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2">
              Calcular zonas
            </button>
          </div>

          {/* Resultado */}
          {resultado && !resultado.erro && (
            <div className="space-y-3">
              {(resultado.destaque || resultado.fcMax) && (
                <div className="rounded-2xl p-4 text-center ring-1" style={{ background:'rgba(59,130,246,0.10)', borderColor:'rgba(59,130,246,0.30)' }}>
                  {resultado.destaque && <p className="text-[28px] font-bold text-blue-400">{resultado.destaque}</p>}
                  {resultado.destaque && (
                    <p className="text-[11px] text-white/55 mt-1 leading-relaxed px-2">
                      {modalidade==='corrida' ? 'Índice de condicionamento de corrida (Daniels) — quanto maior, mais rápido.' : 'Potência que você sustenta por ~1 hora — base das suas zonas.'}
                    </p>
                  )}
                  {resultado.fcMax && <p className="text-[12px] text-white/50 mt-2">FC máx {resultado.fcEstimada ? 'estimada' : 'usada'}: {resultado.fcMax} bpm</p>}
                </div>
              )}
              {resultado.zonas && (
                <div>
                  <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2">{modalidade==='corrida' ? 'Zonas de ritmo (pace)' : 'Zonas de potência'}</p>
                  <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] overflow-hidden">
                    {resultado.zonas.map((z, i) => (
                      <div key={z.zona} className={`flex items-center gap-3 px-4 py-3 ${i>0 ? 'border-t border-white/[0.06]' : ''}`}>
                        <div className="w-3 h-3 rounded-sm shrink-0" style={{ background:z.cor }} />
                        <span className="text-[13px] text-white/85 flex-1">{z.zona} · {z.nome}</span>
                        <span className="text-[13px] font-semibold text-white tabular-nums">{z.texto}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {resultado.zonasFC && (
                <div>
                  <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2">Zonas de FC · {resultado.metodoFC}</p>
                  <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] overflow-hidden">
                    {resultado.zonasFC.map((z, i) => (
                      <div key={z.zona} className={`flex items-center gap-3 px-4 py-3 ${i>0 ? 'border-t border-white/[0.06]' : ''}`}>
                        <div className="w-3 h-3 rounded-sm shrink-0" style={{ background:z.cor }} />
                        <span className="text-[13px] text-white/85 flex-1">{z.zona} · {z.nome}</span>
                        <span className="text-[13px] font-semibold text-white tabular-nums">{z.texto}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(resultado.zonas || resultado.zonasFC) && (
                <button onClick={salvarTeste} disabled={salvandoT}
                  className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-[14px] font-semibold text-green-400 disabled:opacity-50 transition-all ring-1"
                  style={{ background:'rgba(52,211,153,0.12)', borderColor:'rgba(52,211,153,0.40)' }}>
                  <Save size={14} /> {salvandoT ? 'Salvando...' : `Salvar no perfil de ${aluno?.nome?.split(' ')[0] || 'aluno'}`}
                </button>
              )}
              {aluno?.enduranceProfile?.[modalidade]?.zonas && (
                <button onClick={removerTeste} className="w-full py-2.5 flex items-center justify-center gap-2 text-[13px] text-red-400/70 hover:text-red-400 transition-colors">
                  <Trash2 size={14} /> Remover teste salvo (refazer)
                </button>
              )}
              <p className="text-[11px] text-white/35 text-center leading-relaxed">Valores de referência (Daniels/Coggan). Use a aba "Planilha" para montar os treinos.</p>
            </div>
          )}
        </div>
      )}

      {/* ── ABA: PLANILHA ─────────────────────────────────────────────────────── */}
      {alunoId && aba === 'plano' && (
        <div className="space-y-3">
          {/* Card da prova */}
          <button onClick={abrirProva} className="w-full text-left flex items-center gap-3 bg-[#0d1b2e] rounded-2xl p-4 ring-1 ring-blue-500/25 hover:ring-blue-500/50 transition-all">
            <Flag size={20} style={{ color: focoInfo.cor }} />
            <div className="flex-1 min-w-0">
              {dataProva ? (
                <>
                  <p className="text-[14px] font-semibold text-white">
                    {semRest === 0 ? 'Semana da prova!' : `Faltam ${semRest} semana${semRest > 1 ? 's' : ''} para a prova`}
                  </p>
                  <p className="text-[12px] text-white/50 mt-0.5">
                    {dataCurta(dataProva)}/{dataProva?.split('-')[0]}
                    {distProva ? ` · ${DIST_LABELS[distProva] || distProva}` : ''}
                    {faseProva ? ` · ${faseProva.fase}` : ''}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[14px] font-semibold text-white">Definir prova-alvo</p>
                  <p className="text-[12px] text-white/40 mt-0.5">Opcional — ativa a periodização por fases e sugestões específicas.</p>
                </>
              )}
            </div>
            <ChevronRight size={18} className="text-white/30 shrink-0" />
          </button>

          {/* Botão gerar plano completo */}
          {dataProva && distProva && (
            <button onClick={abrirGerarPlano}
              className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all ring-1"
              style={{ background:'rgba(52,211,153,0.08)', borderColor:'rgba(52,211,153,0.30)' }}>
              <Calendar size={17} className="text-green-400 shrink-0" />
              <span className="flex-1 text-[13px] font-semibold text-green-400">Gerar plano completo até a prova</span>
              <ChevronRight size={16} style={{ color:'rgba(52,211,153,0.5)' }} />
            </button>
          )}

          {/* Card foco/fase + sugestões + montar semana */}
          <div className="rounded-2xl bg-[#1A2535] p-4 ring-1" style={{ borderColor: focoInfo.cor + '55' }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ background: focoInfo.cor }} />
              <span className="text-[13px] font-bold text-white">{dataProva ? `Fase: ${focoInfo.fase}` : focoInfo.fase}</span>
            </div>
            <p className="text-[12px] text-white/50 mb-3 ml-4">{focoInfo.foco}</p>
            {sugestoes.length > 0 && (
              <>
                <p className="text-[11px] text-white/40 mb-2">Sugestões</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {sugestoes.slice(0, 4).map(m => {
                    const t = tipoTreino(m.tipo, modalidade);
                    return (
                      <button key={m.id}
                        onClick={() => { setAba('plano'); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] text-white/80 font-medium transition-all ring-1 bg-[#0d1b2e] hover:bg-[#243044]"
                        style={{ borderColor: t.cor+'55' }}>
                        {m.titulo}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <button onClick={montarSemana}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white transition-all flex items-center justify-center gap-2">
              <Calendar size={14} /> Montar semana automática
            </button>
          </div>

          {/* Navegação semana */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button onClick={() => { const n = new Date(semanaIni); n.setDate(n.getDate()-7); setSemanaIni(inicioDaSemana(n)); }}
                className="p-2 rounded-xl bg-[#0d1b2e] ring-1 ring-white/[0.08] text-white/60 hover:text-white transition-all"><ChevronLeft size={18} /></button>
              <div className="text-center px-3">
                <p className="text-[14px] font-bold text-white">{dataCurta(iniKey)} – {dataCurta(fimKey)}</p>
                <button onClick={() => setSemanaIni(inicioDaSemana())} className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors">Ir para hoje</button>
              </div>
              <button onClick={() => { const n = new Date(semanaIni); n.setDate(n.getDate()+7); setSemanaIni(inicioDaSemana(n)); }}
                className="p-2 rounded-xl bg-[#0d1b2e] ring-1 ring-white/[0.08] text-white/60 hover:text-white transition-all"><ChevronRight size={18} /></button>
            </div>
            {/* Volume */}
            <div className="flex items-center gap-4 bg-[#0d1b2e] rounded-2xl px-4 py-2 ring-1 ring-white/[0.08]">
              {[{v:vol.treinos,l:'Treinos'},{v:formatarDistancia(vol.distancia),l:'Dist.'},{v:formatarDuracao(vol.tempo),l:'Tempo'}].map((x,i) => (
                <div key={i} className={`text-center ${i>0 ? 'pl-4 border-l border-white/[0.08]' : ''}`}>
                  <p className="text-[15px] font-bold text-white">{x.v}</p>
                  <p className="text-[10px] text-white/40">{x.l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Limpar */}
          <div className="flex gap-2">
            {sessoes.length > 0 && (
              <button onClick={limparSemana} className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 text-[12px] font-medium text-red-400 ring-1 transition-all" style={{ background:'rgba(251,113,133,0.08)', borderColor:'rgba(251,113,133,0.3)' }}>
                <Trash2 size={13} /> Limpar semana
              </button>
            )}
            <button onClick={limparPlano} disabled={limpandoT} className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 text-[12px] font-semibold text-red-400 ring-1 disabled:opacity-40 transition-all" style={{ background:'rgba(251,113,133,0.15)', borderColor:'rgba(251,113,133,0.5)' }}>
              <Trash2 size={13} /> {limpandoT ? 'Limpando...' : 'Limpar plano inteiro'}
            </button>
          </div>

          {/* Dias da semana */}
          {carregando ? (
            <div className="py-12 text-center text-white/30 text-[13px]">Carregando...</div>
          ) : dias.map((d, i) => {
            const key = chaveData(d);
            const lista = sessoesDoDia(key);
            const ehHoje = key === hojeKey;
            return (
              <div key={key} className="rounded-2xl p-4 ring-1 transition-all" style={{ background:'#0d1b2e', borderColor: ehHoje ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[14px] font-bold ${ehHoje ? 'text-blue-400' : 'text-white'}`}>
                      {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'][i]}
                    </span>
                    <span className="text-[12px] text-white/40">{dataCurta(key)}</span>
                  </div>
                  <button onClick={() => abrirNovo(key)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all" style={{ background:'rgba(96,165,250,0.12)' }}>
                    <Plus size={14} className="text-blue-400" />
                  </button>
                </div>
                {lista.length === 0 ? (
                  <p className="text-[13px] text-white/25 py-1">—</p>
                ) : lista.map(sess => {
                  const t = tipoTreino(sess.tipo, modalidade);
                  const alvo = sess.zona ? alvoDaZona(sess.zona) : null;
                  const medidaTxt = sess.medida==='distancia' ? formatarDistancia(sess.valor) : sess.medida==='tempo' ? formatarDuracao(sess.valor) : null;
                  return (
                    <button key={sess.id} onClick={() => abrirEdicao(sess)} className="w-full text-left flex items-center gap-3 py-2.5 mt-1 rounded-xl hover:bg-white/[0.04] transition-all px-1">
                      <div className="w-1 self-stretch rounded-full" style={{ background:t.cor }} />
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background:t.cor+'22' }}>
                        <Zap size={13} style={{ color:t.cor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white truncate">{sess.titulo || t.nome}</p>
                        <p className="text-[11px] text-white/50 truncate">
                          {[medidaTxt, sess.zona ? `${sess.zona}${alvo?.principal ? ` (${alvo.principal})` : ''}` : null].filter(Boolean).join(' · ') || sess.detalhe || 'toque para editar'}
                        </p>
                      </div>
                      {sess.status==='feito' && <Check size={15} className="text-green-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
