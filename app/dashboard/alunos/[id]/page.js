'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { buscarAluno, buscarTreinos, atualizarAluno } from '@/lib/firestore';
import { ChevronLeft, Pencil, Save, X, User, CreditCard, Dumbbell, Phone, Mail, Calendar, Plus, ArrowUpRight } from 'lucide-react';
import { useToast } from '@/components/Toast';

function Field({ label, value, field, form, setForm, editing, type = 'text', icon: Icon }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">{label}</label>
      {editing ? (
        <input
          type={type}
          value={form[field] || ''}
          onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.07] transition-all"
        />
      ) : (
        <div className="flex items-center gap-2">
          {Icon && <Icon size={13} className="text-white/25 shrink-0" />}
          <p className="text-[13px] text-white/70 font-medium">
            {value || form[field] || <span className="text-white/25 font-normal">Não informado</span>}
          </p>
        </div>
      )}
    </div>
  );
}

function SelectField({ label, field, form, setForm, editing, options }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">{label}</label>
      {editing ? (
        <select
          value={form[field] || ''}
          onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          className="w-full px-3 py-2.5 rounded-xl bg-[#111f38] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 transition-all"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <p className="text-[13px] text-white/70 font-medium">
          {options.find(o => o.value === form[field])?.label || <span className="text-white/25 font-normal">Não informado</span>}
        </p>
      )}
    </div>
  );
}

export default function FichaAluno() {
  const { id } = useParams();
  const router  = useRouter();
  const toast   = useToast();
  const [aluno, setAluno]     = useState(null);
  const [treinos, setTreinos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState(false);
  const [aba, setAba]         = useState('dados');

  useEffect(() => {
    Promise.all([buscarAluno(id), buscarTreinos(id)])
      .then(([a, t]) => { setAluno(a); setForm(a || {}); setTreinos(t); })
      .finally(() => setLoading(false));
  }, [id]);

  async function salvar() {
    setSaving(true);
    try {
      const { id: _, ...dados } = form;
      await atualizarAluno(id, dados);
      setAluno(form);
      setEditing(false);
      toast('Dados atualizados com sucesso.');
    } catch { toast('Erro ao salvar alterações.', 'error'); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!aluno) return (
    <div className="p-8 text-white/35">Aluno não encontrado.</div>
  );

  const hoje = new Date();
  let statusVenc = 'ok';
  if (aluno.vencimento) {
    const [d, m, y] = aluno.vencimento.split('/');
    const diff = Math.ceil((new Date(+y, m - 1, +d) - hoje) / 86400000);
    if (diff < 0) statusVenc = 'vencido';
    else if (diff <= 7) statusVenc = 'vencendo';
  }

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      {/* Voltar */}
      <Link href="/dashboard/alunos"
        className="inline-flex items-center gap-1.5 text-[12px] text-white/35 hover:text-white/70 transition-colors mb-6">
        <ChevronLeft size={14} /> Alunos
      </Link>

      {/* Header do aluno */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/25 to-indigo-500/25 flex items-center justify-center text-xl font-bold text-blue-400 ring-1 ring-blue-500/20">
            {aluno.nome?.[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">{aluno.nome}</h1>
            <div className="flex items-center gap-2 mt-1">
              {aluno.email && <p className="text-[12px] text-white/40">{aluno.email}</p>}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ${
                statusVenc === 'vencido' ? 'bg-red-500/15 text-red-400 ring-red-500/20' :
                statusVenc === 'vencendo' ? 'bg-amber-500/15 text-amber-400 ring-amber-500/20' :
                'bg-green-500/15 text-green-400 ring-green-500/20'
              }`}>
                {statusVenc === 'vencido' ? 'Vencido' : statusVenc === 'vencendo' ? 'Vence em breve' : 'Ativo'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setForm(aluno); }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.08] text-[12px] text-white/50 hover:text-white hover:border-white/15 transition-all">
                <X size={13} /> Cancelar
              </button>
              <button onClick={salvar} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[12px] font-semibold text-white disabled:opacity-40 transition-all shadow-lg shadow-blue-900/30">
                <Save size={13} /> {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.08] text-[12px] text-white/50 hover:text-white hover:border-white/15 transition-all">
              <Pencil size={13} /> Editar
            </button>
          )}
        </div>
      </div>

      {/* Abas */}
      <div className="flex items-center gap-1 border-b border-white/[0.05] mb-6">
        {[
          { key: 'dados', label: 'Dados pessoais', icon: User },
          { key: 'plano', label: 'Plano', icon: CreditCard },
          { key: 'treinos', label: 'Treinos', icon: Dumbbell },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setAba(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-all ${
              aba === key
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-white/35 hover:text-white/60'
            }`}>
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo das abas */}
      {aba === 'dados' && (
        <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <Field label="Nome completo" field="nome" form={form} setForm={setForm} editing={editing} icon={User} />
            <Field label="E-mail" field="email" form={form} setForm={setForm} editing={editing} icon={Mail} />
            <Field label="Telefone" field="telefone" form={form} setForm={setForm} editing={editing} icon={Phone} />
            <Field label="Data de nascimento" field="nascimento" form={form} setForm={setForm} editing={editing} icon={Calendar} />
            <SelectField label="Tipo de serviço" field="tipoServico" form={form} setForm={setForm} editing={editing}
              options={[{ value: 'presencial', label: 'Presencial' }, { value: 'online', label: 'Online' }]} />
          </div>
        </div>
      )}

      {aba === 'plano' && (
        <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <Field label="Plano" field="plano" form={form} setForm={setForm} editing={editing} />
            <Field label="Frequência semanal" field="frequencia" form={form} setForm={setForm} editing={editing} type="number" />
            <Field label="Vencimento (DD/MM/AAAA)" field="vencimento" form={form} setForm={setForm} editing={editing} />
            <Field label="Valor mensal (R$)" field="valorMensal" form={form} setForm={setForm} editing={editing} type="number" />
          </div>
        </div>
      )}

      {aba === 'treinos' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Link href={`/dashboard/treinos/novo?alunoId=${id}`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[12px] font-semibold text-white transition-all shadow-lg shadow-blue-900/30">
              <Plus size={13} /> Novo treino
            </Link>
          </div>
          {treinos.length === 0 ? (
            <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-12 text-center">
              <Dumbbell size={28} className="text-white/15 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-[13px] text-white/30">Nenhum treino cadastrado para este aluno.</p>
            </div>
          ) : (
            treinos.map(t => (
              <Link key={t.id} href={`/dashboard/treinos/${t.id}`}
                className="flex items-center justify-between p-4 rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] hover:ring-white/[0.10] hover:bg-[#101f38] transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Dumbbell size={16} className="text-blue-400" strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white/80 group-hover:text-white transition-colors">{t.nome}</p>
                    <p className="text-[11px] text-white/30">{t.exercicios?.length || 0} exercícios</p>
                  </div>
                </div>
                <ArrowUpRight size={15} className="text-white/20 group-hover:text-white/50 transition-colors" />
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
