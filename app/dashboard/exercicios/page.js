'use client';
import { useEffect, useState, useRef } from 'react';
import {
  listarVideosExercicios, salvarVideoExercicio, removerVideoExercicio, buscarExerciciosCustom,
} from '@/lib/firestore';
import { BIBLIOTECA, grupoAtual } from '@/lib/treinoData';
import { Video, Plus, X, Pencil, Trash2, Search, ExternalLink, Play } from 'lucide-react';
import { useToast } from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';

// Lista plana de todos os exercícios da biblioteca para autocomplete
const TODOS_EXERCICIOS = BIBLIOTECA.flatMap(b => b.exercicios.map(nome => ({ nome, grupo: b.grupo })));

function extrairYoutubeId(url) {
  return (url || '').match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([^&?#/]+)/)?.[1] || null;
}

// Player inline: embed do YouTube ou <video> para MP4 (Firebase Storage etc.)
function PlayerModal({ video, onFechar }) {
  const ytId = extrairYoutubeId(video.videoUrl);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onFechar(); }}>
      <div className="w-full max-w-2xl rounded-[22px] bg-[#141619] ring-1 ring-white/[0.08] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
          <p className="text-[14px] font-semibold text-white truncate">{video.nome}</p>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="w-full bg-black" style={{ aspectRatio: '16 / 9' }}>
          {ytId ? (
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
              title={video.nome}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video src={video.videoUrl} controls autoPlay loop playsInline className="w-full h-full bg-black" />
          )}
        </div>
      </div>
    </div>
  );
}

function ModalVideo({ item, onFechar, onSalvo }) {
  const toast = useToast();
  const [nome, setNome]       = useState(item?.nome || '');
  const [url, setUrl]         = useState(item?.videoUrl || '');
  const [salvando, setSalvando] = useState(false);
  const [sugestoes, setSugestoes] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const inputRef = useRef(null);

  const ytId = extrairYoutubeId(url);
  const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null;

  function buscarSugestoes(val) {
    if (!val.trim()) { setSugestoes([]); return; }
    const q = val.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    setSugestoes(
      TODOS_EXERCICIOS
        .filter(e => e.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q))
        .slice(0, 8)
    );
  }

  function handleNomeChange(val) {
    setNome(val);
    buscarSugestoes(val);
    setShowSug(true);
  }

  async function salvar() {
    if (!nome.trim()) { toast('Informe o nome do exercício.', 'error'); return; }
    if (!url.trim()) { toast('Informe a URL do vídeo.', 'error'); return; }
    setSalvando(true);
    try {
      await salvarVideoExercicio(nome.trim(), url.trim());
      toast('Vídeo salvo com sucesso.');
      onSalvo();
    } catch { toast('Erro ao salvar vídeo.', 'error'); }
    finally { setSalvando(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-[22px] bg-[#141619] ring-1 ring-white/[0.08] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-bold text-white">
            {item?.videoUrl ? 'Editar vídeo' : 'Adicionar vídeo'}
          </h2>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Nome do exercício com autocomplete */}
          <div className="relative">
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">
              Nome do exercício
            </label>
            <input
              ref={inputRef}
              value={nome}
              onChange={e => handleNomeChange(e.target.value)}
              onFocus={() => setShowSug(true)}
              onBlur={() => setTimeout(() => setShowSug(false), 150)}
              placeholder="Ex: Supino Reto com Barra"
              className="w-full px-3 py-2.5 rounded-[14px] bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-accent/60 transition-all"
            />
            {showSug && sugestoes.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-10 rounded-[14px] bg-white/[0.04] ring-1 ring-white/[0.08] overflow-hidden shadow-2xl">
                {sugestoes.map(s => (
                  <button key={s.nome}
                    onMouseDown={() => { setNome(s.nome); setSugestoes([]); setShowSug(false); }}
                    className="w-full text-left px-3 py-2.5 hover:bg-white/[0.06] transition-colors">
                    <p className="text-[13px] text-white/80">{s.nome}</p>
                    <p className="text-[10px] text-white/30">{s.grupo}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* URL do vídeo */}
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">
              URL do vídeo (YouTube ou Firebase Storage)
            </label>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-3 py-2.5 rounded-[14px] bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-accent/60 transition-all"
            />
          </div>

          {/* Preview YouTube */}
          {thumb && (
            <div className="rounded-[14px] overflow-hidden ring-1 ring-white/[0.08]">
              <img src={thumb} alt="Thumbnail" className="w-full object-cover" style={{ maxHeight: 180 }} />
              <div className="px-3 py-2 bg-white/[0.03] flex items-center gap-2">
                <Video size={12} className="text-white/30" />
                <span className="text-[11px] text-white/40 truncate">{url}</span>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2">
          <button onClick={onFechar}
            className="px-4 py-2 rounded-[14px] border border-white/[0.08] text-[13px] text-white/50 hover:text-white hover:border-white/15 transition-all">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando}
            className="px-5 py-2 rounded-[14px] bg-accent hover:bg-accent-hover text-[13px] font-semibold text-on-accent disabled:opacity-40 transition-all shadow-lg shadow-black/30">
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExerciciosPage() {
  const toast = useToast();
  const [videos, setVideos]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busca, setBusca]       = useState('');
  const [modal, setModal]       = useState(null); // null | 'novo' | item
  const [confirmId, setConfirmId] = useState(null);
  const [playing, setPlaying]   = useState(null); // vídeo em reprodução
  const [custom, setCustom]     = useState([]);
  const [soSemVideo, setSoSemVideo] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const [list, cust] = await Promise.all([listarVideosExercicios(), buscarExerciciosCustom().catch(() => [])]);
      setVideos(list);
      setCustom(cust);
    } catch { toast('Erro ao carregar vídeos.', 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { carregar(); }, []);

  async function handleExcluir(id) {
    try {
      await removerVideoExercicio(id);
      setVideos(prev => prev.filter(v => v.id !== id));
      setConfirmId(null);
      toast('Vídeo removido.');
    } catch { toast('Erro ao remover vídeo.', 'error'); }
  }

  // A biblioteca INTEIRA (embutida + exercícios próprios) com o vídeo de cada um, agrupada
  // por grupo muscular, como a tela de vídeos do app. Vídeo cujo nome não está na biblioteca
  // entra no grupo "Outros".
  const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const videoPorNome = new Map(videos.map(v => [norm(v.nome), v]));
  const linhas = [];
  const vistos = new Set();
  const addLinha = (nome, grupo) => {
    const k = norm(nome);
    if (!k || vistos.has(k)) return;
    vistos.add(k);
    linhas.push({ nome, grupo: grupo || 'Outros', video: videoPorNome.get(k) || null });
  };
  TODOS_EXERCICIOS.forEach(e => addLinha(e.nome, e.grupo));
  custom.forEach(e => addLinha(e.nome, grupoAtual(e.grupo)));
  videos.forEach(v => addLinha(v.nome, 'Outros'));
  const grupos = [];
  linhas
    .filter(l => !busca || norm(l.nome).includes(norm(busca)))
    .filter(l => !soSemVideo || !l.video)
    .forEach(l => {
      let g = grupos.find(x => x.grupo === l.grupo);
      if (!g) { g = { grupo: l.grupo, itens: [] }; grupos.push(g); }
      g.itens.push(l);
    });
  const totalComVideo = linhas.filter(l => l.video).length;
  const filtrados = grupos;

  return (
    <div className="px-4 pt-5 pb-6 md:p-8 max-w-5xl mx-auto w-full">
      {(modal === 'novo' || (modal && typeof modal === 'object')) && (
        <ModalVideo
          item={modal === 'novo' ? null : modal}
          onFechar={() => setModal(null)}
          onSalvo={() => { setModal(null); carregar(); }}
        />
      )}
      <ConfirmModal
        open={!!confirmId}
        title="Remover vídeo"
        message="O link de vídeo deste exercício será removido."
        onConfirm={() => handleExcluir(confirmId)}
        onCancel={() => setConfirmId(null)}
      />
      {playing && <PlayerModal video={playing} onFechar={() => setPlaying(null)} />}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight font-display">Vídeos de Exercícios</h1>
          <p className="text-[13px] text-white/35 mt-1">Gerencie os vídeos vinculados a cada exercício</p>
        </div>
        <button onClick={() => setModal('novo')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[14px] bg-accent hover:bg-accent-hover text-[13px] font-semibold text-on-accent transition-all shadow-lg shadow-black/30">
          <Plus size={14} /> Adicionar vídeo
        </button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] text-white/40">{totalComVideo} de {linhas.length} exercícios com vídeo</p>
        <button onClick={() => setSoSemVideo(v => !v)}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold ring-1 transition-all ${soSemVideo ? 'bg-accent/15 text-accent ring-accent/30' : 'text-white/40 ring-white/[0.08] hover:text-white/70'}`}>
          Só os sem vídeo
        </button>
      </div>

      {/* Busca */}
      <div className="relative mb-6">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar exercício..."
          className="w-full pl-9 pr-4 py-2.5 rounded-[14px] bg-[#141619] ring-1 ring-white/[0.06] text-white text-[13px] placeholder-white/25 focus:outline-none focus:ring-accent/40 transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-[22px] bg-[#141619] ring-1 ring-white/[0.06] p-14 text-center">
          <Video size={28} className="text-white/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[13px] text-white/30">{soSemVideo && !busca ? 'Todos os exercícios têm vídeo.' : 'Nenhum exercício encontrado para esta busca.'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filtrados.map(g => {
            const comVideo = g.itens.filter(l => l.video).length;
            return (
              <div key={g.grupo}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">{g.grupo}</p>
                  <p className="text-[11px] text-white/30">{comVideo} de {g.itens.length} com vídeo</p>
                </div>
                <div className="rounded-[22px] bg-[#141619] ring-1 ring-white/[0.06] overflow-hidden">
                  {g.itens.map((l, i) => {
                    const v = l.video;
                    const ytId = extrairYoutubeId(v?.videoUrl || '');
                    const thumb = v ? (v.thumbnailUrl || (ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null)) : null;
                    return (
                      <div key={l.nome} className={`flex items-center gap-4 px-5 py-3.5 ${i > 0 ? 'border-t border-white/[0.04]' : ''} hover:bg-white/[0.02] transition-colors`}>
                        {v ? (
                          <button onClick={() => setPlaying(v)} title="Reproduzir vídeo"
                            className="group/thumb relative w-16 h-10 rounded-lg overflow-hidden bg-white/[0.05] shrink-0 flex items-center justify-center">
                            {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : <Video size={16} className="text-white/20" />}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                              <Play size={14} className="text-white" fill="currentColor" />
                            </div>
                          </button>
                        ) : (
                          <div className="w-16 h-10 rounded-lg bg-white/[0.03] ring-1 ring-white/[0.05] shrink-0 flex items-center justify-center">
                            <Video size={16} className="text-white/15" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-semibold text-white/80 truncate">{l.nome}</p>
                            {v?.global && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-accent/15 text-accent ring-1 ring-accent/20 shrink-0">PERSONALPRO</span>}
                          </div>
                          <p className="text-[11px] text-white/30 truncate mt-0.5">{v ? 'Vídeo em loop, sem som' : 'Sem vídeo ainda'}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {v && (
                            <a href={v.videoUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/25 hover:text-white/70 transition-all"><ExternalLink size={13} /></a>
                          )}
                          {v && !v.global && (
                            <>
                              <button onClick={() => setModal(v)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/25 hover:text-white/70 transition-all"><Pencil size={13} /></button>
                              <button onClick={() => setConfirmId(v.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all"><Trash2 size={13} /></button>
                            </>
                          )}
                          {!v && (
                            <button onClick={() => setModal({ nome: l.nome, videoUrl: '' })}
                              className="px-3 py-1.5 rounded-[14px] bg-accent/12 text-accent text-[12px] font-semibold hover:bg-accent/20 transition-all">Enviar</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
