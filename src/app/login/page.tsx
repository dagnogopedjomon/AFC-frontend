'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Moon, ShieldCheck, Sun } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const demoMembers = [
  ['Mariam Diallo', 'À jour'],
  ['Ousmane Bah', 'À jour'],
  ['Fatou Camara', 'Retard'],
  ['Souleymane Touré', 'À jour'],
  ['Aïssata Sow', 'À jour'],
];

export default function LoginPage() {
  const { login, token, user, loading } = useAuth();
  const router = useRouter();
  const [accountType, setAccountType] = useState<'member' | 'admin'>('member');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [dark, setDark] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !token || !user) return;
    if (user.isSuspended) router.replace('/dashboard/regulariser');
    else if (user.role === 'ADMIN' || user.profileCompleted) router.replace('/dashboard');
    else router.replace('/complete-profile');
  }, [loading, token, user, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!identifier.trim() || password.length < 6) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(identifier.trim(), password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Connexion impossible');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-[#f7f9fb]"><div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-[#315f9e]" /></div>;
  }

  const today = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date());
  const hour = new Date().getHours();
  const greeting = hour >= 18 || hour < 5 ? 'Bonsoir' : 'Bonjour';

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-[100dvh] bg-[#f7f9fb] text-[#172033] lg:grid lg:grid-cols-[minmax(460px,1.08fr)_minmax(440px,.92fr)] dark:bg-[#101521] dark:text-white">
        <aside className="relative hidden overflow-hidden bg-[#e9eef3] p-10 lg:flex lg:flex-col xl:p-14 dark:bg-[#171e2a]">
          <div className="flex items-center gap-4">
            <img src="/images/logo-afc.png" alt="Amicale Football Club" className="h-16 w-14 object-contain" />
            <div><p className="text-xl font-semibold">Amicale FC</p><p className="text-sm text-slate-500 dark:text-slate-400">Trésorerie du club</p></div>
          </div>
          <div className="mt-10 flex items-center justify-between text-xs font-semibold uppercase tracking-[.16em] text-slate-500">
            <span>Service en ligne</span><span>{today}</span>
          </div>
          <div className="my-auto max-w-2xl py-12">
            <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">Les cotisations du club,<br /><em className="font-serif font-normal text-[#315f9e]">au millimètre.</em></h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">L&apos;outil du trésorier de l&apos;<strong>Amicale Football Club</strong> pour enregistrer les cotisations, repérer les membres en retard et garder une vue d&apos;ensemble nette de la caisse.</p>
            <div className="mt-10 rounded-2xl border border-white/80 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <div className="mb-4 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[.18em] text-slate-500">Aperçu — Avril</span><span className="font-mono text-sm text-slate-400">04 / 2026</span></div>
              <div className="divide-y divide-slate-100 dark:divide-white/10">{demoMembers.map(([name,status]) => <div key={name} className="flex items-center justify-between py-2.5 text-sm"><span>{name}</span><span className={status === 'Retard' ? 'text-rose-600' : 'text-emerald-600'}>{status}</span><span className="font-medium">5 000 F</span></div>)}</div>
            </div>
          </div>
          <p className="text-sm italic text-slate-500">« Un club bien géré, c&apos;est un club qui gagne hors du terrain aussi. »</p>
        </aside>

        <main className="flex min-h-[100dvh] flex-col px-4 py-3 sm:px-10 sm:py-6 lg:px-14 xl:px-20">
          <div className="flex justify-end"><button type="button" onClick={() => setDark(v => !v)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200">{dark ? <Sun size={16}/> : <Moon size={16}/>} {dark ? 'Clair' : 'Sombre'}</button></div>
          <div className="m-auto w-full max-w-md py-4 sm:py-10">
            <div className="mb-3 sm:mb-8 lg:hidden"><img src="/images/logo-afc.png" alt="Amicale Football Club" className="mx-auto h-16 w-14 object-contain sm:h-24 sm:w-20" /></div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-[#315f9e]"><ShieldCheck size={16}/> Connexion sécurisée</p>
            <h2 className="mt-2 font-serif text-4xl sm:mt-4 sm:text-5xl">{greeting}.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 sm:mt-4 sm:text-base sm:leading-7 dark:text-slate-300">Connectez-vous pour accéder aux cotisations de l&apos;Amicale Football Club.</p>
            <div className="mt-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1 sm:mt-8 dark:bg-white/10" role="tablist" aria-label="Type de compte">
              {([['member','Membre'],['admin','Administration']] as const).map(([value,label]) => <button key={value} type="button" role="tab" aria-selected={accountType===value} onClick={() => {setAccountType(value);setIdentifier('');setError(null);}} className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${accountType===value?'bg-white text-[#172033] shadow-sm dark:bg-slate-700 dark:text-white':'text-slate-500'}`}>{label}</button>)}
            </div>
            <form onSubmit={onSubmit} className="mt-4 space-y-3 sm:mt-7 sm:space-y-5">
              {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
              <label className="block"><span className="mb-2 block text-sm font-semibold">{accountType==='admin'?'Email ou téléphone':'Téléphone'}</span><input value={identifier} onChange={e=>setIdentifier(e.target.value)} type={accountType==='admin'?'text':'tel'} autoComplete={accountType==='admin'?'username':'tel'} placeholder={accountType==='admin'?'admin@example.com ou 0600000000':'0612345678'} className="afc-input" required /></label>
              <label className="block"><span className="mb-2 block text-sm font-semibold">Mot de passe</span><span className="relative block"><input value={password} onChange={e=>setPassword(e.target.value)} type={showPassword?'text':'password'} autoComplete="current-password" placeholder="••••••••" className="afc-input pr-24" minLength={6} required /><button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-xs font-semibold text-slate-500">{showPassword?<EyeOff size={16}/>:<Eye size={16}/>} {showPassword?'Masquer':'Afficher'}</button></span></label>
              <label className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-[#315f9e]"/> Rester connecté</label>
              <button type="submit" disabled={submitting} className="afc-button-primary w-full">{submitting?'Connexion…':'Se connecter'}</button>
            </form>
            {accountType==='member' && <p className="mt-3 text-xs leading-5 text-slate-500 sm:mt-6 sm:text-sm sm:leading-6">Première connexion ? Votre mot de passe est <strong>password</strong>. En cas d&apos;oubli, contactez un administrateur.</p>}
          </div>
          <footer className="text-center text-xs text-slate-400">© {new Date().getFullYear()} — Amicale FC</footer>
        </main>
      </div>
    </div>
  );
}
