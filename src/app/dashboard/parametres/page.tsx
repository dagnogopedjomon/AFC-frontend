'use client';

import { FormEvent, useEffect, useState } from 'react';
import { KeyRound, Pencil, Plus, Settings, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { administrationApi, authApi, type ExpenseCategory } from '@/lib/api';

export default function ParametresPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [categories,setCategories]=useState<ExpenseCategory[]>([]);
  const [categoryName,setCategoryName]=useState('');
  const [editingCategoryId,setEditingCategoryId]=useState<string|null>(null);
  const [showCategoryForm,setShowCategoryForm]=useState(false);
  const loadCategories=()=>administrationApi.categories(true).then(setCategories).catch(()=>setCategories([]));
  useEffect(()=>{loadCategories();},[]);

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

  return <div className="space-y-8">
    <div className="flex items-start gap-4 border-b border-slate-200 pb-6"><div className="mt-1 text-slate-700"><Settings size={28}/></div><div><h1 className="font-serif text-4xl text-slate-900">Paramètres</h1><p className="mt-1 text-base text-slate-500">Configuration du club et de l&apos;application</p></div></div>
    <div className="card max-w-2xl">
      <div className="mb-6 flex items-start gap-3"><div className="rounded-lg bg-blue-50 p-2 text-blue-700"><KeyRound size={20}/></div><div><h2 className="font-semibold text-slate-900">Modifier le mot de passe</h2><p className="text-sm text-slate-500">Utilisez au moins 8 caractères.</p></div></div>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">Mot de passe actuel<input type="password" className="input-field mt-1.5 w-full" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} required minLength={6}/></label>
        <label className="block text-sm font-medium text-slate-700">Nouveau mot de passe<input type="password" className="input-field mt-1.5 w-full" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} required minLength={8}/></label>
        <label className="block text-sm font-medium text-slate-700">Confirmer le nouveau mot de passe<input type="password" className="input-field mt-1.5 w-full" value={confirmation} onChange={(e)=>setConfirmation(e.target.value)} required minLength={8}/></label>
        <button disabled={submitting} className="btn-primary disabled:opacity-60">{submitting ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}</button>
      </form>
    </div>
    <section className="card max-w-none">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-serif text-3xl text-slate-900">Catégories de dépense</h2><p className="mt-2 max-w-3xl text-base leading-7 text-slate-500">Liste des catégories proposées lors de l&apos;enregistrement d&apos;une dépense courante.<br/>Désactivez plutôt que de supprimer si des dépenses y sont déjà liées.</p></div><button type="button" onClick={()=>{setEditingCategoryId(null);setCategoryName('');setShowCategoryForm((v)=>!v);}} className="afc-button-primary shrink-0"><Plus size={18}/> Ajouter</button></div>
      {showCategoryForm && <form className="mt-6 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row" onSubmit={saveCategory}><input className="input-field flex-1" placeholder="Nom de la catégorie" value={categoryName} onChange={e=>setCategoryName(e.target.value)} required autoFocus/><button className="btn-primary">{editingCategoryId ? 'Enregistrer' : 'Ajouter'}</button><button type="button" onClick={()=>{setShowCategoryForm(false);setEditingCategoryId(null);}} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium">Annuler</button></form>}
      <ul className="mt-8 overflow-hidden rounded-2xl border border-slate-200 divide-y divide-slate-200">{categories.map(category=><li key={category.id} className="flex items-center justify-between gap-4 px-8 py-6"><span className={`text-xl ${category.isActive?'text-slate-800':'text-slate-400 line-through'}`}>{category.name}</span><div className="flex items-center gap-6"><button type="button" title={category.isActive?'Désactiver':'Réactiver'} aria-label={category.isActive?'Désactiver':'Réactiver'} onClick={()=>administrationApi.updateCategory(category.id,{isActive:!category.isActive}).then(loadCategories)} className={`relative h-9 w-16 rounded-full transition ${category.isActive?'bg-[var(--sky-blue)]':'bg-slate-300'}`}><span className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow-sm transition ${category.isActive?'right-1':'left-1'}`}/></button><button type="button" title="Modifier" aria-label="Modifier" onClick={()=>{setEditingCategoryId(category.id);setCategoryName(category.name);setShowCategoryForm(true);}} className="text-slate-700 hover:text-[var(--sky-blue)]"><Pencil size={22}/></button><button type="button" title="Désactiver la catégorie" aria-label="Désactiver la catégorie" onClick={()=>administrationApi.updateCategory(category.id,{isActive:false}).then(loadCategories)} className="text-orange-600 hover:text-orange-700"><Trash2 size={22}/></button></div></li>)}</ul>
      {categories.length===0 && <p className="mt-8 rounded-xl bg-slate-50 py-8 text-center text-slate-500">Aucune catégorie configurée.</p>}
    </section>
  </div>;
}
