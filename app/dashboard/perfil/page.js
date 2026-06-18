'use client';
import { useEffect, useState } from 'react';
import { buscarConfigApp, salvarConfigApp } from '@/lib/firestore';
import { Save, User, Phone, Link2, Building2, FileText } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { usePersonal } from '@/lib/AuthContext';

function Field({ label, field, form, setForm, type = 'text', placeholder, icon: Icon, multiline }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="relative">
        {Icon && !multiline && (
          <Icon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
        )}
        {multiline ? (
          <textarea
            value={form[field] || ''}
            onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
            rows={3}
            placeholder={placeholder}
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.07] transition-all resize-none placeholder-white/20"
          />
        ) : (
          <input
            type={type}
            value={form[field] || ''}
            onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
            placeholder={placeholder}
            className={`w-full py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.07] transition-all placeholder-white/20 ${Icon ? 'pl-9 pr-3' : 'px-3'}`}
          />
        )}
      </div>
    </div>
  );
}

function Toggle({ label, sub, field, form, setForm }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
      <div>
        <p className="text-[13px] font-medium text-white/70">{label}</p>
        {sub && <p className="text-[11px] text-white/30 mt-0.5">{sub}</p>}
      </div>
      <button
        onClick={() => setForm(f => ({ ...f, [field]: !f[field] }))}
        className={`w-10 h-5.5 rounded-full relative transition-all ${form[field] ? 'bg-blue-600' : 'bg-white/[0.12]'}`}
        style={{ height: '22px', minWidth: '40px' }}
      >
        <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-all ${form[field] ? 'left-[18px]' : 'left-0.5'}`}
          style={{ width: '18px', height: '18px', left: form[field] ? '19px' : '2px' }} />
      </button>
    </div>
  );
}

export default function PerfilPage() {
  const toast   = useToast();
  const personal = usePersonal();
  const [form,   setForm]   = useState({
    nome: '', cref: '', telefone: '', whatsapp: '', instagram: '',
    modalidades: { musculacao: true, corrida: false, ciclismo: false },
    avisoTexto: '',
  });
  const [saving, setSaving] = useState(false);
  const [loading,setLoading]= useState(true);

  useEffect(() => {
    buscarConfigApp().then(cfg => {
      if (cfg) setForm(f => ({
        ...f,
        nome:       cfg.nome       || '',
        cref:       cfg.cref       || '',
        telefone:   cfg.telefone   || '',
        whatsapp:   cfg.whatsapp   || '',
        instagram:  cfg.instagram  || '',
        modalidades: { musculacao: true, corrida: false, ciclismo: false, ...cfg.modalidades },
        avisoTexto: cfg.aviso?.texto || '',
      }));
    }).finally(() => setLoading(false));
  }, []);

  async function salvar(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await salvarConfigApp({
        nome:       form.nome,
        cref:       form.cref,
        telefone:   form.telefone,
        whatsapp:   form.whatsapp,
        instagram:  form.instagram,
        modalidades: form.modalidades,
        aviso:      form.avisoTexto ? { texto: form.avisoTexto } : null,
      });
      toast('Perfil atualizado com sucesso!');
    } catch { toast('Erro ao salvar perfil.', 'error'); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-white tracking-tight">Meu Perfil</h1>
        <p className="text-[12px] text-white/35 mt-0.5">{personal?.email}</p>
      </div>

      <form onSubmit={salvar} className="space-y-4">

        {/* Informações profissionais */}
        <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-6">
          <h2 className="text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-4">Informações profissionais</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Nome completo" field="nome" form={form} setForm={setForm} icon={User} placeholder="Seu nome" />
            </div>
            <Field label="CREF" field="cref" form={form} setForm={setForm} icon={Building2} placeholder="CREF 000000-X/XX" />
            <Field label="Telefone" field="telefone" form={form} setForm={setForm} icon={Phone} placeholder="(00) 90000-0000" />
            <Field label="WhatsApp" field="whatsapp" form={form} setForm={setForm} icon={Phone} placeholder="(00) 90000-0000" />
            <Field label="Instagram" field="instagram" form={form} setForm={setForm} icon={Link2} placeholder="@seuperfil" />
          </div>
        </div>

        {/* Modalidades */}
        <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-6">
          <h2 className="text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-2">Modalidades ativas</h2>
          <p className="text-[12px] text-white/30 mb-4">As modalidades habilitadas aparecem para os seus alunos no app.</p>
          {[
            { key: 'musculacao', label: 'Musculação', sub: 'Treinos de força e hipertrofia' },
            { key: 'corrida',    label: 'Corrida',    sub: 'Treinos de corrida e cardio' },
            { key: 'ciclismo',   label: 'Ciclismo',   sub: 'Treinos de bike e spinning' },
          ].map(({ key, label, sub }) => (
            <Toggle key={key} label={label} sub={sub}
              field={`__modal_${key}`}
              form={{ [`__modal_${key}`]: form.modalidades[key] }}
              setForm={() => setForm(f => ({
                ...f,
                modalidades: { ...f.modalidades, [key]: !f.modalidades[key] },
              }))}
            />
          ))}
        </div>

        {/* Aviso */}
        <div className="rounded-2xl bg-[#0d1b2e] ring-1 ring-white/[0.06] p-6">
          <h2 className="text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-1">Aviso para alunos</h2>
          <p className="text-[12px] text-white/30 mb-4">Aparece em destaque no dashboard do aluno. Deixe em branco para não exibir.</p>
          <Field label="" field="avisoTexto" form={form} setForm={setForm} multiline
            placeholder="Ex: Academia fechada no feriado de 15/11. Treinos retomam na segunda-feira." />
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold text-white disabled:opacity-40 transition-all shadow-lg shadow-blue-900/30">
            <Save size={14} /> {saving ? 'Salvando...' : 'Salvar perfil'}
          </button>
        </div>
      </form>
    </div>
  );
}
