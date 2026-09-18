'use client';

import { FormEvent, useEffect, useState } from 'react';
import { KeyRound, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { administrationApi, authApi, type ExpenseCategory } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function ParametresPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [categories,setCategories]=useState<ExpenseCategory[]>([]);
  const [categoryName,setCategoryName]=useState('');
  const [editingCategoryId,setEditingCategoryId]=useState<string|null>(null);
  const [showCategoryForm,setShowCategoryForm]=useState(false);
  const loadCategories=()=>administrationApi.categories(true).then(setCategories).catch(()=>setCategories([]));
  useEffect(()=>{ if (isAdmin) loadCategories(); },[isAdmin]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmation) return toast.error('Les nouveaux mots de passe ne correspondent pas.');
    setSubmitting(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmation('');
      toast.success('Mot de passe mis à jour.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Mise à jour impossible');
    } finally { setSubmitting(false); }
  }

  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    try {
      if (editingCategoryId) await administrationApi.updateCategory(editingCategoryId, { name: categoryName });
      else await administrationApi.createCategory(categoryName);
      setCategoryName(''); setEditingCategoryId(null); setShowCategoryForm(false); loadCategories(); toast.success(editingCategoryId ? 'Catégorie modifiée.' : 'Catégorie ajoutée.');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
  }

  return (
    <div className="space-y-5">
      <header className="border-b border-[var(--afc-border)] pb-5 pt-1">
        <h1 className="text-[28px] font-light tracking-[-0.02em] text-[var(--afc-text)]">Paramètres</h1>
        <p className="mt-0.5 text-sm text-[var(--afc-muted)]">Configuration du club et de l&apos;application</p>
      </header>

      <div className="max-w-2xl rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-lg bg-[#C9A048]/10 p-2 text-[#C9A048]"><KeyRound size={20}/></div>
          <div>
            <h2 className="font-semibold text-[var(--afc-text)]">Modifier le mot de passe</h2>
            <p className="text-sm text-[var(--afc-muted)]">Utilisez au moins 8 caractères.</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium text-[var(--afc-text-soft)]">
            Mot de passe actuel
            <input type="password" className="afc-login-input mt-1.5 w-full text-sm" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} required minLength={6}/>
          </label>
          <label className="block text-sm font-medium text-[var(--afc-text-soft)]">
            Nouveau mot de passe
            <input type="password" className="afc-login-input mt-1.5 w-full text-sm" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} required minLength={8}/>
          </label>
          <label className="block text-sm font-medium text-[var(--afc-text-soft)]">
            Confirmer le nouveau mot de passe
            <input type="password" className="afc-login-input mt-1.5 w-full text-sm" value={confirmation} onChange={(e)=>setConfirmation(e.target.value)} required minLength={8}/>
          </label>
          <button disabled={submitting} className="afc-button-primary disabled:opacity-60">{submitting ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}</button>
        </form>
      </div>

      {isAdmin && (
        <section className="max-w-4xl rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--afc-text)]">Catégories de dépense</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--afc-muted)]">
                Liste des catégories proposées lors de l&apos;enregistrement d&apos;une dépense courante.<br/>
                Désactivez plutôt que de supprimer si des dépenses y sont déjà liées.
              </p>
            </div>
            <button
              type="button"
              onClick={()=>{setEditingCategoryId(null);setCategoryName('');setShowCategoryForm((v)=>!v);}}
              className="afc-button-primary shrink-0"
            >
              <Plus size={15} strokeWidth={2}/> Ajouter
            </button>
          </div>

          {showCategoryForm && (
            <form className="mt-6 flex flex-col gap-2 rounded-xl border border-[rgba(var(--afc-hl),0.08)] bg-[rgba(var(--afc-hl),0.02)] p-4 sm:flex-row" onSubmit={saveCategory}>
              <input className="afc-login-input flex-1 text-sm" placeholder="Nom de la catégorie" value={categoryName} onChange={e=>setCategoryName(e.target.value)} required autoFocus/>
              <button className="afc-button-primary">{editingCategoryId ? 'Enregistrer' : 'Ajouter'}</button>
              <button type="button" onClick={()=>{setShowCategoryForm(false);setEditingCategoryId(null);}} className="rounded-lg border border-[rgba(var(--afc-hl),0.1)] bg-[rgba(var(--afc-hl),0.03)] px-4 py-2 text-sm font-medium text-[var(--afc-text-soft)] transition hover:bg-[rgba(var(--afc-hl),0.06)]">Annuler</button>
            </form>
          )}

          <ul className="mt-5 divide-y divide-[rgba(var(--afc-hl),0.06)] overflow-hidden rounded-xl border border-[var(--afc-border)]">
            {categories.map(category=>(
              <li key={category.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <span className={`text-base font-medium ${category.isActive?'text-[var(--afc-text)]':'text-[var(--afc-muted-3)] line-through'}`}>{category.name}</span>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    title={category.isActive?'Désactiver':'Réactiver'}
                    aria-label={category.isActive?'Désactiver':'Réactiver'}
                    onClick={()=>administrationApi.updateCategory(category.id,{isActive:!category.isActive}).then(loadCategories)}
                    className={`relative h-8 w-14 rounded-full transition ${category.isActive?'bg-[#C9A048]':'bg-white/10'}`}
                  >
                    <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition ${category.isActive?'right-1':'left-1'}`}/>
                  </button>
                  <button type="button" title="Modifier" aria-label="Modifier" onClick={()=>{setEditingCategoryId(category.id);setCategoryName(category.name);setShowCategoryForm(true);}} className="text-[var(--afc-text-soft)] transition hover:text-[#C9A048]"><Pencil size={18}/></button>
                  <button type="button" title="Désactiver la catégorie" aria-label="Désactiver la catégorie" onClick={()=>administrationApi.updateCategory(category.id,{isActive:false}).then(loadCategories)} className="text-amber-400 transition hover:text-amber-300"><Trash2 size={18}/></button>
                </div>
              </li>
            ))}
          </ul>
          {categories.length===0 && <p className="mt-8 rounded-xl border border-[var(--afc-border)] bg-[rgba(var(--afc-hl),0.02)] py-8 text-center text-[var(--afc-muted)]">Aucune catégorie configurée.</p>}
        </section>
      )}
    </div>
  );
}
