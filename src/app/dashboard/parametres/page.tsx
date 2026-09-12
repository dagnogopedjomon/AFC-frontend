'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { KeyRound, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { administrationApi, authApi, type ExpenseCategory } from '@/lib/api';

export default function ParametresPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [categories,setCategories]=useState<ExpenseCategory[]>([]);
  const [categoryName,setCategoryName]=useState('');
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

  return <div className="space-y-6">
    <div className="flex items-start justify-between gap-4"><div><h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900"><Settings size={24}/>Paramètres</h1><p className="mt-1 text-sm text-slate-500">Configuration du club et de l'application.</p></div><Link href="/dashboard/cotisations/paiement" className="afc-button-primary shrink-0">+ Nouveau paiement</Link></div>
    <div className="card max-w-2xl">
      <div className="mb-6 flex items-start gap-3"><div className="rounded-lg bg-blue-50 p-2 text-blue-700"><KeyRound size={20}/></div><div><h2 className="font-semibold text-slate-900">Modifier le mot de passe</h2><p className="text-sm text-slate-500">Utilisez au moins 8 caractères.</p></div></div>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">Mot de passe actuel<input type="password" className="input-field mt-1.5 w-full" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} required minLength={6}/></label>
        <label className="block text-sm font-medium text-slate-700">Nouveau mot de passe<input type="password" className="input-field mt-1.5 w-full" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} required minLength={8}/></label>
        <label className="block text-sm font-medium text-slate-700">Confirmer le nouveau mot de passe<input type="password" className="input-field mt-1.5 w-full" value={confirmation} onChange={(e)=>setConfirmation(e.target.value)} required minLength={8}/></label>
        <button disabled={submitting} className="btn-primary disabled:opacity-60">{submitting ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}</button>
      </form>
    </div>
    <div className="card max-w-2xl"><h2 className="font-semibold text-slate-900">Catégories de dépenses</h2><p className="mb-4 mt-1 text-sm text-slate-500">Classez les dépenses pour faciliter les rapports.</p><form className="flex gap-2" onSubmit={async(e)=>{e.preventDefault();try{await administrationApi.createCategory(categoryName);setCategoryName('');loadCategories();toast.success('Catégorie ajoutée');}catch(err){toast.error(err instanceof Error?err.message:'Erreur');}}}><input className="input-field flex-1" placeholder="Nouvelle catégorie…" value={categoryName} onChange={e=>setCategoryName(e.target.value)} required/><button className="btn-primary">Ajouter</button></form><ul className="mt-4 divide-y">{categories.map(category=><li key={category.id} className="flex items-center justify-between py-3"><span className={category.isActive?'text-slate-800':'text-slate-400 line-through'}>{category.name}</span><button className="text-sm font-medium text-blue-700" onClick={()=>administrationApi.updateCategory(category.id,{isActive:!category.isActive}).then(loadCategories)}>{category.isActive?'Désactiver':'Réactiver'}</button></li>)}</ul></div>
  </div>;
}
