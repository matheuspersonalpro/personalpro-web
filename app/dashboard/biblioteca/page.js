'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  buscarTemplatesGlobais, buscarTemplatesTreinos,
  copiarTemplateGlobal, clonarTemplateParaAlunos, excluirTreino, buscarAlunos,
  atribuirProgramaMuscular,
} from '@/lib/firestore';
import { listarProgramas } from '@/lib/programaMusculacao';
import { BookOpen, Plus, X, Dumbbell, Copy, Users, Trash2, Check, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';

function gruposDoTemplate(t) {
  if (t.foco) return t.foco;
  if (Array.isArray(t.grupos) && t.grupos.length > 0) {
    return t.grupos.map(g => (typeof g === 'string' ? g : g.nome)).filter(Boolean).join(', ');
  }
  return null;
}

// ── Modal: Gerar programa automático para aluno ────────────────────────────
function ModalGerarPrograma({ programa, alunos, onFechar, onConcluido }) {
  const toast = useToast();
  const [alunoId, setAlunoId] = useState('');
  const [mes, setMes] = useState(1);
  const [gerando, setGerando] = useState(false);

  async function gerar() {
    if (!alunoId) { toast('Selecione um aluno.', 'error'); return; }
    setGerando(true);
    try {
      const aluno = alunos.find(a => a.id === alunoId);
      await atribuirProgramaMuscular(aluno, programa.id, mes);
      toast(`Programa "${programa.nome}" gerado a partir do Mês ${mes} para ${aluno.nome.split(' ')[0]}!`);
      onConcluido();
    } catch { toast('Erro ao gerar programa.', 'error'); }
    finally { setGerando(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-[15px] font-bold text-white">Gerar programa</h2>
            <p className="text-[12px] text-white/40 mt-0.5">{programa.nome}</p>
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Aluno</label>
            <select value={alunoId} onChange={e => setAlunoId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all">
              <option value="">Selecione um aluno...</option>
              {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">
              Mês inicial — Mês {mes} de 12
            </label>
            <div className="flex items-center gap-3">
              <button onClick={() => setMes(m => Math.max(1, m - 1))}
                className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white/60 hover:text-white transition-all">
                <ChevronLeft size={14} />
              </button>
              <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(mes / 12) * 100}%` }} />
              </div>
              <button onClick={() => setMes(m => Math.min(12, m + 1))}
                className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white/60 hover:text-white transition-all">
                <ChevronRight size={14} />
              </button>
            </div>
            <p className="text-[11px] text-white/30 mt-2">
              {mes <= 3 ? 'Bloco 1 — Adaptação (meses 1-3)' : mes <= 6 ? 'Bloco 2 — Hipertrofia (meses 4-6)' : mes <= 9 ? 'Bloco 3 — Força (meses 7-9)' : 'Bloco 4 — Intensidade (meses 10-12)'}
            </p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2">
          <button onClick={onFechar}
            className="px-4 py-2 rounded-xl border border-white/[0.08] text-[13px] text-white/50 hover:text-white hover:border-white/15 transition-all">
            Cancelar
          </button>
          <button onClick={gerar} disabled={gerando || !alunoId}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white disabled:opacity-40 transition-all shadow-lg shadow-blue-900/30">
            {gerando ? 'Gerando...' : 'Gerar programa'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalUsarTemplate({ template, alunos, onFechar, onConfirmar }) {
  const [selecionados, setSelecionados] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();

  function toggle(id) {
    setSelecionados(s => s.includes(id) ? s.filter(i => i !== id) : [...s, id]);
  }

  async function confirmar() {
    if (selecionados.length === 0) { toast('Selecione ao menos um aluno.', 'error'); return; }
    setSalvando(true);
    try {
      await onConfirmar(template, selecionados);
      toast(`Treino aplicado a ${selecionados.length} aluno(s).`);
      onFechar();
    } catch { toast('Erro ao aplicar template.', 'error'); }
    finally { setSalvando(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.08] overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-[15px] font-bold text-white">Aplicar template</h2>
            <p className="text-[12px] text-white/40 mt-0.5">{template.nome}</p>
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-1.5">
          <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-3">Selecione os alunos</p>
          {alunos.length === 0 && (
            <p className="text-[13px] text-white/30 text-center py-6">Nenhum aluno cadastrado.</p>
          )}
          {alunos.map(a => (
            <button key={a.id} onClick={() => toggle(a.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                selecionados.includes(a.id)
                  ? 'bg-blue-600/20 ring-1 ring-blue-500/40'
                  : 'bg-white/[0.03] ring-1 ring-white/[0.05] hover:bg-white/[0.06]'
              }`}>
              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${
                selecionados.includes(a.id) ? 'bg-blue-600' : 'bg-white/[0.08]'
              }`}>
                {selecionados.includes(a.id) && <Check size={11} className="text-white" />}
              </div>
              <span className="text-[13px] text-white/75">{a.nome}</span>
            </button>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2">
          <button onClick={onFechar}
            className="px-4 py-2 rounded-xl border border-white/[0.08] text-[13px] text-white/50 hover:text-white hover:border-white/15 transition-all">
            Cancelar
          </button>
          <button onClick={confirmar} disabled={salvando || selecionados.length === 0}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white disabled:opacity-40 transition-all shadow-lg shadow-blue-900/30">
            {salvando ? 'Aplicando...' : `Aplicar (${selecionados.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

function CardTemplate({ template, tipo, onUsar, onSalvar, onExcluir }) {
  const grupos = gruposDoTemplate(template);
  const qtd = template.exercicios?.length || 0;

  return (
    <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-5 flex flex-col gap-4 hover:ring-white/[0.10] transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <BookOpen size={17} className="text-blue-400" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-white/85 truncate">{template.nome}</p>
            {grupos && <p className="text-[11px] text-white/35 mt-0.5 truncate">{grupos}</p>}
          </div>
        </div>
        {tipo === 'pessoal' && (
          <button onClick={() => onExcluir(template.id)}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all shrink-0">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-white/30">
        <Dumbbell size={12} strokeWidth={1.8} />
        <span>{qtd} exercício{qtd !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex gap-2">
        {tipo === 'global' ? (
          <>
            <button onClick={() => onUsar(template)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[12px] font-semibold text-white transition-all shadow-lg shadow-blue-900/30">
              <Users size={12} /> Usar template
            </button>
            <button onClick={() => onSalvar(template)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] text-[12px] text-white/50 hover:text-white hover:border-white/15 transition-all">
              <Copy size={12} /> Salvar
            </button>
          </>
        ) : (
          <Link href={`/dashboard/treinos?id=${template.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] text-[12px] text-white/50 hover:text-white hover:border-white/15 transition-all">
            Editar
          </Link>
        )}
      </div>
    </div>
  );
}

export default function BibliotecaPage() {
  const toast = useToast();
  const [globais, setGlobais]   = useState([]);
  const [pessoais, setPessoais] = useState([]);
  const [alunos, setAlunos]     = useState([]);
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalTemplate, setModalTemplate] = useState(null);
  const [modalPrograma, setModalPrograma] = useState(null);
  const [confirmExcluir, setConfirmExcluir] = useState(null);
  const [salvando, setSalvando] = useState(null); // id do template sendo salvo

  async function carregar() {
    setLoading(true);
    try {
      const [g, p, a] = await Promise.all([
        buscarTemplatesGlobais(),
        buscarTemplatesTreinos(),
        buscarAlunos(),
      ]);
      setGlobais(g);
      setPessoais(p);
      setAlunos(a);
      setProgramas(listarProgramas());
    } catch { toast('Erro ao carregar biblioteca.', 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { carregar(); }, []);

  async function handleSalvar(template) {
    setSalvando(template.id);
    try {
      await copiarTemplateGlobal(template);
      toast('Template salvo na sua biblioteca.');
      const p = await buscarTemplatesTreinos();
      setPessoais(p);
    } catch { toast('Erro ao salvar template.', 'error'); }
    finally { setSalvando(null); }
  }

  async function handleExcluir(id) {
    try {
      await excluirTreino(id);
      setPessoais(prev => prev.filter(t => t.id !== id));
      setConfirmExcluir(null);
      toast('Modelo excluído.');
    } catch { toast('Erro ao excluir modelo.', 'error'); }
  }

  return (
    <div className="px-4 pt-5 pb-6 md:p-8 max-w-6xl mx-auto w-full">
      {modalTemplate && (
        <ModalUsarTemplate
          template={modalTemplate}
          alunos={alunos}
          onFechar={() => setModalTemplate(null)}
          onConfirmar={clonarTemplateParaAlunos}
        />
      )}
      {modalPrograma && (
        <ModalGerarPrograma
          programa={modalPrograma}
          alunos={alunos}
          onFechar={() => setModalPrograma(null)}
          onConcluido={() => setModalPrograma(null)}
        />
      )}
      <ConfirmModal
        open={!!confirmExcluir}
        title="Excluir modelo"
        message="Este modelo será removido permanentemente da sua biblioteca."
        onConfirm={() => handleExcluir(confirmExcluir)}
        onCancel={() => setConfirmExcluir(null)}
      />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Biblioteca</h1>
          <p className="text-[13px] text-white/35 mt-1">Templates de treino prontos para usar</p>
        </div>
        <Link href="/dashboard/treinos?id=novo&template=true"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white transition-all shadow-lg shadow-blue-900/30">
          <Plus size={14} /> Novo modelo
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-10">
          {/* Programas Automáticos (gerador de periodização) */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-[15px] font-bold text-white">Programas Automáticos</h2>
              <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ring-emerald-500/20">
                {programas.length} programas · 12 meses
              </span>
            </div>
            <p className="text-[12px] text-white/35 mb-4">
              Periodização científica de 12 meses gerada automaticamente. Selecione um programa e o sistema cria todos os treinos para o aluno.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {programas.map(p => (
                <button key={p.id} onClick={() => setModalPrograma(p)}
                  className="group rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-5 text-left hover:ring-emerald-500/30 hover:bg-emerald-900/10 transition-all">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:bg-emerald-500/20 transition-all">
                    <Zap size={16} className="text-emerald-400" strokeWidth={1.8} />
                  </div>
                  <p className="text-[13px] font-semibold text-white/85 leading-snug">{p.nome}</p>
                  <p className="text-[11px] text-white/35 mt-1 line-clamp-2">{p.desc || ''}</p>
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.05] text-white/40">
                      {p.freq}×/semana
                    </span>
                    <span className="text-[10px] text-emerald-400/60 ml-auto">Gerar →</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Biblioteca Global — só mostra se tiver templates */}
          {globais.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-[15px] font-bold text-white">Biblioteca Personal Pro</h2>
                <span className="bg-blue-500/15 text-blue-400 text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ring-blue-500/20">
                  {globais.length} templates
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {globais.map(t => (
                  <CardTemplate
                    key={t.id}
                    template={t}
                    tipo="global"
                    onUsar={setModalTemplate}
                    onSalvar={handleSalvar}
                    onExcluir={id => setConfirmExcluir(id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Meus Modelos */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-[15px] font-bold text-white">Meus Modelos</h2>
              <span className="bg-white/[0.06] text-white/40 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                {pessoais.length}
              </span>
            </div>
            {pessoais.length === 0 ? (
              <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-12 text-center">
                <Dumbbell size={28} className="text-white/15 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-[13px] text-white/30">Nenhum modelo criado ainda.</p>
                <p className="text-[11px] text-white/20 mt-1">Crie um novo modelo ou salve um template da biblioteca global.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pessoais.map(t => (
                  <CardTemplate
                    key={t.id}
                    template={t}
                    tipo="pessoal"
                    onUsar={setModalTemplate}
                    onSalvar={handleSalvar}
                    onExcluir={id => setConfirmExcluir(id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
