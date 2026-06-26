'use client';
import { useEffect, useState, useRef } from 'react';
import {
  listarVideosExercicios, salvarVideoExercicio, removerVideoExercicio,
} from '@/lib/firestore';
import { BIBLIOTECA } from '@/lib/treinoData';
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
      <div className="w-full max-w-2xl rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] overflow-hidden">
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
            <video src={video.videoUrl} controls autoPlay playsInline className="w-full h-full bg-black" />
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
      <div className="w-full max-w-lg rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-bold text-white">
            {item ? 'Editar vídeo' : 'Adicionar vídeo'}
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
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all"
            />
            {showSug && sugestoes.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-10 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.08] overflow-hidden shadow-2xl">
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
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all"
            />
          </div>

          {/* Preview YouTube */}
          {thumb && (
            <div className="rounded-xl overflow-hidden ring-1 ring-white/[0.08]">
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
            className="px-4 py-2 rounded-xl border border-white/[0.08] text-[13px] text-white/50 hover:text-white hover:border-white/15 transition-all">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white disabled:opacity-40 transition-all shadow-lg shadow-blue-900/30">
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

  async function carregar() {
    setLoading(true);
    try {
      const list = await listarVideosExercicios();
      setVideos(list);
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

  const filtrados = busca
    ? videos.filter(v => v.nome?.toLowerCase().includes(busca.toLowerCase()))
    : videos;

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
          <h1 className="text-2xl font-bold text-white tracking-tight">Vídeos de Exercícios</h1>
          <p className="text-[13px] text-white/35 mt-1">Gerencie os vídeos vinculados a cada exercício</p>
        </div>
        <button onClick={() => setModal('novo')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white transition-all shadow-lg shadow-blue-900/30">
          <Plus size={14} /> Adicionar vídeo
        </button>
      </div>

      {/* Busca */}
      <div className="relative mb-6">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar exercício..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#0d1b2e] ring-1 ring-white/[0.06] text-white text-[13px] placeholder-white/25 focus:outline-none focus:ring-blue-500/40 transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-14 text-center">
          <Video size={28} className="text-white/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[13px] text-white/30">
            {busca ? 'Nenhum vídeo encontrado para esta busca.' : 'Nenhum vídeo cadastrado ainda.'}
          </p>
          {!busca && (
            <p className="text-[11px] text-white/20 mt-1">
              Adicione URLs de YouTube ou Firebase Storage para cada exercício.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] overflow-hidden">
          {filtrados.map((v, i) => {
            const ytId = extrairYoutubeId(v.videoUrl || '');
            const thumb = v.thumbnailUrl || (ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null);
            const urlCurta = (v.videoUrl || '').length > 55
              ? v.videoUrl.slice(0, 52) + '...'
              : v.videoUrl;

            return (
              <div key={v.id}
                className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? 'border-t border-white/[0.04]' : ''} hover:bg-white/[0.02] transition-colors`}>
                {/* Thumbnail — clicável para reproduzir */}
                <button onClick={() => setPlaying(v)}
                  className="group/thumb relative w-16 h-10 rounded-lg overflow-hidden bg-white/[0.05] shrink-0 flex items-center justify-center"
                  title="Reproduzir vídeo">
                  {thumb
                    ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                    : <Video size={16} className="text-white/20" />
                  }
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                    <Play size={14} className="text-white" fill="currentColor" />
                  </div>
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-white/80 truncate">{v.nome}</p>
                    {v.global && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20 shrink-0">
                        GLOBAL
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/30 truncate mt-0.5">
                    {v.videoUrl?.includes('youtube') || v.videoUrl?.includes('youtu.be')
                      ? '▶ YouTube'
                      : v.videoUrl?.includes('firebasestorage')
                      ? '☁ Firebase Storage'
                      : v.videoUrl ? '🔗 Link externo' : ''}
                  </p>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <a href={v.videoUrl} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/25 hover:text-white/70 transition-all">
                    <ExternalLink size={13} />
                  </a>
                  {!v.global && (
                    <>
                      <button onClick={() => setModal(v)}
                        className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/25 hover:text-white/70 transition-all">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setConfirmId(v.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
