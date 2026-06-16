'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { buscarTreinosBiblioteca, buscarAlunos, excluirTreino } from '@/lib/firestore';
import { Plus, Search, Dumbbell, ArrowUpRight, Trash2, User } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/components/Toast';
import EditarTreino from './EditarTreinoClient';

export default function TreinosPage() {
  const searchParams = useSearchParams();
  const treinoId     = searchParams.get('id');

  const toast = useToast();
  const [treinos, setTreinos] = useState([]);
  const [alunos, setAlunos]   = useState([]);
  const [busca, setBusca]     = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);

  const carregar = () => {
    Promise.all([buscarTreinosBiblioteca(), buscarAlunos()])
      .then(([t, a]) => { setTreinos(t); setAlunos(a); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (treinoId) return;
    carregar();
  }, [treinoId]);

  if (treinoId) return <EditarTreino />;

  function nomeAluno(id) {
    return alunos.find(a => a.id === id)?.nome || null;
  }

  async function deletar(id, e) {
    e.preventDefault();
    setConfirmId(id);
  }

  async function confirmarDelete() {
    if (!confirmId) return;
    await excluirTreino(confirmId);
    setConfirmId(null);
    carregar();
    toast('Treino excluído.');
  }

  const filtrados = treinos.filter(t =>
    t.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    nomeAluno(t.alunoId)?.toLowerCase().includes(busca.toLowerCase())
  );

  const grupos = filtrados.reduce((acc, t) => {
    const key = t.alunoId || '__sem_aluno__';
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      {confirmId && (
        <ConfirmModal
          title="Excluir treino"
          body="Esta ação não pode ser desfeita. O treino será removido permanentemente."
          confirmLabel="Excluir"
          onConfirm={confirmarDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">Treinos</h1>
          <p className="text-[12px] text-white/35 mt-0.5">{treinos.length} treino{treinos.length !== 1 ? 's' : ''} na biblioteca</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..."
              className="pl-8 pr-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.07] text-white placeholder-white/25 text-[13px] focus:outline-none focus:border-blue-500/50 transition-all w-44" />
          </div>
          <Link href="/dashboard/treinos?id=novo"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[12px] font-semibold text-white transition-all shadow-lg shadow-blue-900/30">
            <Plus size={13} /> Novo treino
          </Link>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-16 text-center">
          <Dumbbell size={32} className="text-white/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[13px] text-white/25">Nenhum treino encontrado.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grupos).map(([alunoId, lista]) => {
            const nome = alunoId === '__sem_aluno__' ? null : nomeAluno(alunoId);
            return (
              <div key={alunoId}>
                <div className="flex items-center gap-2 mb-3">
                  {nome ? (
                    <>
                      <div className="w-6 h-6 rounded-full bg-blue-500/15 flex items-center justify-center text-[10px] font-bold text-blue-400">
                        {nome[0]}
                      </div>
                      <Link href={`/dashboard/alunos?id=${alunoId}`}
                        className="text-[12px] font-semibold text-white/60 hover:text-white transition-colors flex items-center gap-1">
                        {nome} <ArrowUpRight size={11} />
                      </Link>
                    </>
                  ) : (
                    <>
                      <User size={13} className="text-white/25" />
                      <span className="text-[12px] font-semibold text-white/35">Sem aluno vinculado</span>
                    </>
                  )}
                  <span className="text-[10px] text-white/20 ml-1">{lista.length} treino{lista.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {lista.map(t => (
                    <Link key={t.id} href={`/dashboard/treinos?id=${t.id}`}
                      className="group relative rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] hover:ring-blue-500/25 hover:bg-[#101f38] p-4 transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <Dumbbell size={16} className="text-blue-400" strokeWidth={1.8} />
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={e => deletar(t.id, e)}
                            className="w-7 h-7 rounded-lg hover:bg-red-500/15 flex items-center justify-center text-white/25 hover:text-red-400 transition-all">
                            <Trash2 size={13} />
                          </button>
                          <div className="w-7 h-7 rounded-lg hover:bg-white/[0.08] flex items-center justify-center text-white/25 hover:text-white transition-all">
                            <ArrowUpRight size={13} />
                          </div>
                        </div>
                      </div>
                      <p className="text-[13px] font-semibold text-white/80 group-hover:text-white transition-colors mb-1 leading-tight">{t.nome}</p>
                      <p className="text-[11px] text-white/30">{t.exercicios?.length || 0} exercício{(t.exercicios?.length || 0) !== 1 ? 's' : ''}</p>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
