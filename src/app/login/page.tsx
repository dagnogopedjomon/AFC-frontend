'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, Moon, Phone, Sun } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const dateLongue = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export default function LoginPage() {
  const { login, token, user, loading } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // La charte propose les deux thèmes sur l'écran de connexion.
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  // Rendu côté client uniquement : la date dépend de l'horloge du visiteur.
  const [aujourdhui, setAujourdhui] = useState('');

  useEffect(() => {
    const stored = window.localStorage.getItem('afc_theme');
    if (stored === 'dark' || stored === 'light') setTheme(stored);
    setAujourdhui(dateLongue.format(new Date()));
  }, []);

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem('afc_theme', next);
      return next;
    });
  };

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
    return (
      <div data-theme={theme} className="grid min-h-screen place-items-center bg-[var(--background)]">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[var(--border-color)] border-t-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div
      data-theme={theme}
      data-login-dark
      className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)] lg:grid lg:grid-cols-2"
    >
      {/* Panneau de marque : fond discret + quadrillé de 56 px (bureau uniquement). */}
      <aside className="brand-grid relative hidden flex-col justify-between border-r border-[var(--border-color)] bg-[var(--secondary)] px-12 py-10 lg:flex">
        <div className="relative z-[1] flex items-start justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/images/logo-afc.png" alt="Amicale Football Club" className="h-11 w-auto shrink-0 object-contain" />
            <div>
              <div className="font-serif text-[21px] font-medium tracking-[-0.01em] text-[var(--foreground)]">Amicale FC</div>
              <div className="afc-eyebrow">Trésorerie du club</div>
            </div>
          </div>
          <div className="text-right">
            <p className="afc-mono flex items-center justify-end gap-1.5 text-[11px] text-[var(--muted-foreground)]">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--primary)]" aria-hidden="true" />
              Service en ligne
            </p>
            <p className="afc-mono mt-0.5 text-[11px] text-[var(--muted-foreground)]">{aujourdhui}</p>
          </div>
        </div>

        <div className="relative z-[1] max-w-[560px]">
          <h2 className="font-serif text-[clamp(44px,4.4vw,64px)] font-light leading-[1.04] tracking-[-0.02em] text-[var(--foreground)]">
            Les cotisations du club,
            <br />
            <span className="afc-accent-word">au millimètre.</span>
          </h2>
          <p className="mt-7 max-w-[460px] text-[15px] leading-relaxed text-[var(--muted-foreground)]">
            L&apos;outil du trésorier de l&apos;<strong className="font-semibold text-[var(--foreground)]">Amicale Football Club</strong> pour
            enregistrer les cotisations mensuelles et exceptionnelles, repérer les joueurs en retard et garder une vue
            d&apos;ensemble nette du compte du club.
          </p>
        </div>

        <div className="relative z-[1] flex items-end justify-between gap-6">
          <p className="max-w-[320px] font-serif text-sm italic text-[var(--muted-foreground)]">
            « Un club bien géré, c&apos;est un club qui gagne hors du terrain aussi. »
          </p>
          <p className="afc-mono shrink-0 text-[11px] text-[var(--muted-foreground)]">Saison 2026-27</p>
        </div>
      </aside>

      {/* Volet de connexion */}
      <main className="relative flex min-h-[100dvh] flex-col px-5 py-6 sm:px-10 lg:min-h-0 lg:py-10">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={toggleTheme}
            className="afc-button-secondary !min-h-9 rounded-full px-3.5 py-1.5 text-[13px]"
            aria-label={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
          >
            {theme === 'dark' ? <Sun size={15} strokeWidth={1.7} /> : <Moon size={15} strokeWidth={1.7} />}
            {theme === 'dark' ? 'Clair' : 'Sombre'}
          </button>
        </div>

        <div className="fade-in mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-6">
          {/* Bloc-marque réduit : seul écran visible sur mobile. */}
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <img src="/images/logo-afc.png" alt="Amicale Football Club" className="h-10 w-auto shrink-0 object-contain" />
            <div>
              <div className="font-serif text-[19px] font-medium tracking-[-0.01em]">Amicale FC</div>
              <div className="afc-eyebrow">Abidjan · Cocody</div>
            </div>
          </div>

          <p className="afc-eyebrow">— Connexion sécurisée</p>
          <h1 className="mt-2 font-serif text-[40px] leading-none tracking-[-0.02em] text-[var(--foreground)]">Bonjour.</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted-foreground)]">
            Connectez-vous pour accéder aux cotisations de l&apos;Amicale Football Club.
          </p>

          <form onSubmit={onSubmit} className="mt-7">
            {error && (
              <div className="afc-badge-red mb-4 rounded-[10px] border px-4 py-3 text-sm">{error}</div>
            )}

            <label htmlFor="phone" className="block text-[13px] font-medium text-[var(--muted-foreground)]">
              Téléphone ou adresse e-mail
            </label>
            <div className="relative mt-1.5">
              <Phone
                size={16}
                strokeWidth={1.7}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                aria-hidden="true"
              />
              <input
                id="phone"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                type="text"
                autoComplete="username"
                placeholder="07 00 00 00 00"
                required
                className="afc-login-input login-dark-input !pl-10"
              />
            </div>

            <label htmlFor="password" className="mt-4 block text-[13px] font-medium text-[var(--muted-foreground)]">
              Mot de passe
            </label>
            <div className="relative mt-1.5">
              <Lock
                size={16}
                strokeWidth={1.7}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                aria-hidden="true"
              />
              <input
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                minLength={6}
                required
                className="afc-login-input login-dark-input !pl-10 !pr-24"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="afc-mono absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-[0.12em] text-[var(--muted-foreground)] transition hover:text-[var(--primary)]"
              >
                {showPassword ? 'Masquer' : 'Afficher'}
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4 text-[13px]">
              <label className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4"
                  style={{ accentColor: 'var(--primary)' }}
                />
                Rester connecté
              </label>
              <a href="#" className="link-accent no-underline hover:underline">
                Mot de passe oublié ?
              </a>
            </div>

            <button type="submit" disabled={submitting} className="afc-login-button mt-6 w-full">
              {submitting ? 'Connexion…' : 'Se connecter'}
              {!submitting && <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />}
            </button>

            <p className="mt-4 text-center text-xs leading-relaxed text-[var(--muted-foreground)]">
              Première connexion ? Utilisez le lien d&apos;activation reçu par SMS. En cas d&apos;oubli du mot de passe,
              contactez le bureau : il n&apos;y a pas de réinitialisation en libre-service.
            </p>
          </form>
        </div>

        <div className="afc-mono flex items-center justify-between gap-4 text-[11px] text-[var(--muted-foreground)]">
          <span>© {new Date().getFullYear()} — Amicale FC</span>
          <span>Abidjan · Cocody</span>
        </div>
      </main>
    </div>
  );
}
