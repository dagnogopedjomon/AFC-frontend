'use client';

import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { administrationApi, membersApi, type ContributionExemption, type Member } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const EXEMPTION_ROLES = ['ADMIN', 'TREASURER'];

export default function ExonerationsPage(){
  const { user } = useAuth();
  const canManage = !!user && EXEMPTION_ROLES.includes(user.role);
  const now=new Date(); const [rows,setRows]=useState<ContributionExemption[]>([]); const [members,setMembers]=useState<Member[]>([]);
  const [memberId,setMemberId]=useState(''); const [year,setYear]=useState(now.getFullYear()); const [month,setMonth]=useState(now.getMonth()+1); const [reason,setReason]=useState('');
  const load=()=>administrationApi.exemptions(undefined,year).then(setRows).catch(e=>toast.error(e.message));
  useEffect(()=>{ if (canManage) { load(); membersApi.list().then(setMembers); } },[year, canManage]);
  async function submit(e:FormEvent){e.preventDefault();try{await administrationApi.createExemption({memberId,periodYear:year,periodMonth:month,reason});toast.success('Mois exonéré');setReason('');load();}catch(err){toast.error(err instanceof Error?err.message:'Erreur');}}
  if (!canManage) {
    return (
      <div className="rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-6">
        <h1 className="mb-2 text-xl font-semibold text-[var(--afc-text)]">Mois exonérés</h1>
        <p className="text-sm text-[var(--afc-muted)]">L&rsquo;accès à cette page est réservé à l&rsquo;Admin et au trésorier.</p>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <header className="pt-1">
        <h1 className="text-[28px] font-light tracking-[-0.02em] text-[var(--afc-text)]">Mois exonérés</h1>
        <p className="mt-0.5 text-sm text-[var(--afc-muted)]">Les mois exonérés ne génèrent ni retard, ni suspension.</p>
      </header>
      <form onSubmit={submit} className="grid gap-4 rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)] p-5 md:grid-cols-4">
        <label className="text-sm font-medium text-[var(--afc-text-soft)] md:col-span-2">
          Membre
          <select className="afc-login-input mt-1.5 w-full text-sm" required value={memberId} onChange={e=>setMemberId(e.target.value)}>
            <option value="">Choisir…</option>
            {members.filter(m=>m.role!=='ADMIN').map(m=><option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-[var(--afc-text-soft)]">
          Mois
          <select className="afc-login-input mt-1.5 w-full text-sm" value={month} onChange={e=>setMonth(Number(e.target.value))}>
            {Array.from({length:12},(_,i)=><option key={i} value={i+1}>{new Date(2020,i).toLocaleString('fr-FR',{month:'long'})}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-[var(--afc-text-soft)]">
          Année
          <input type="number" className="afc-login-input mt-1.5 w-full text-sm" value={year} onChange={e=>setYear(Number(e.target.value))}/>
        </label>
        <label className="text-sm font-medium text-[var(--afc-text-soft)] md:col-span-3">
          Motif (facultatif)
          <input className="afc-login-input mt-1.5 w-full text-sm" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Blessure, congé exceptionnel…"/>
        </label>
        <button className="afc-button-primary self-end">Ajouter</button>
      </form>
      <div className="overflow-hidden rounded-xl border border-[var(--afc-border)] bg-[var(--afc-card)]">
        <table className="afc-table-dark w-full text-left text-sm">
          <thead>
            <tr>
              <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Membre</th>
              <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Période</th>
              <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--afc-muted)]">Motif</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr className="border-t border-[rgba(var(--afc-hl),0.04)] transition hover:bg-[rgba(var(--afc-hl),0.02)]" key={r.id}>
                <td className="p-4 font-medium text-[var(--afc-text)]">{r.member.firstName} {r.member.lastName}</td>
                <td className="p-4 text-[var(--afc-text-soft)]">{new Date(r.periodYear,r.periodMonth-1).toLocaleString('fr-FR',{month:'long',year:'numeric'})}</td>
                <td className="p-4 text-[var(--afc-muted-2)]">{r.reason||'—'}</td>
                <td className="p-4 text-right"><button className="font-medium text-red-400 transition hover:text-red-300" onClick={()=>administrationApi.deleteExemption(r.id).then(load)}>Retirer</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length===0&&<p className="p-10 text-center text-[var(--afc-muted)]">Aucune exonération en {year}.</p>}
      </div>
    </div>
  );
}
