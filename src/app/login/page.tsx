'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const { login, token, user, loading } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // La charte propose le thème sombre sur l'écran de connexion ; on respecte le choix enregistré.
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('afc_theme');
    if (storedTheme === 'dark' || storedTheme === 'light') setTheme(storedTheme);
  }, []);

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
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[var(--afc-border)] border-t-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div
      data-theme={theme}
      data-login-dark
      className="brand-grid relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[var(--secondary)] px-4 py-6 text-[var(--foreground)]"
    >
      <div className="fade-in relative z-10 w-full max-w-[440px]">
        {/* Bloc-marque : écusson, nom en Fraunces, mention en mono capitales. */}
        <div className="mb-5 flex items-center justify-center gap-3">
          <img src="/images/logo-afc.png" alt="Amicale Football Club" className="h-[44px] w-auto shrink-0 object-contain" />
          <div className="text-left">
            <div className="font-serif text-[22px] font-medium tracking-[-0.01em] text-[var(--foreground)]">Amicale FC</div>
            <div className="afc-eyebrow">Abidjan · Cocody</div>
          </div>
        </div>

        <div className="rounded-[14px] border border-[var(--border-color)] bg-[var(--card)] px-6 py-7 sm:px-9 sm:py-9">
          <p className="afc-eyebrow">— Connexion sécurisée</p>
          <h1 className="mt-2 font-serif text-[26px] leading-tight text-[var(--foreground)]">
            Content de vous <span className="afc-accent-word">revoir</span>.
          </h1>
          <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
            Connectez-vous pour accéder aux cotisations de l&apos;Amicale Football Club.
          </p>

          <form onSubmit={onSubmit} className="mt-6">
            {error && (
              <div className="afc-badge-red mb-4 rounded-[10px] border px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="phone" className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                Téléphone ou adresse e-mail
              </label>
              <input
                id="phone"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                type="text"
                autoComplete="username"
                placeholder="07 00 00 00 00"
                required
                className="afc-login-input login-dark-input"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="password" className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  minLength={6}
                  required
                  className="afc-login-input login-dark-input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center border-none bg-transparent p-1 text-[var(--muted-foreground)] transition hover:text-[var(--primary)]"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                      <path d="M2 12 C4.5 7 8 4.5 12 4.5 C16 4.5 19.5 7 22 12 C19.5 17 16 19.5 12 19.5 C8 19.5 4.5 17 2 12 Z" />
                      <circle cx="12" cy="12" r="3" />
                      <path d="M3 3 L21 21" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                      <path d="M2 12 C4.5 7 8 4.5 12 4.5 C16 4.5 19.5 7 22 12 C19.5 17 16 19.5 12 19.5 C8 19.5 4.5 17 2 12 Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-[13px]">
              <label className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  style={{ accentColor: 'var(--primary)' }}
                />
                Rester connecté
              </label>
              <a href="#" className="link-accent no-underline hover:underline">
                Mot de passe oublié ?
              </a>
            </div>

            <button type="submit" disabled={submitting} className="afc-login-button mt-5 w-full">
              {submitting ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-[var(--muted-foreground)]">
          Besoin d&apos;aide ? Contactez le bureau.
        </p>
      </div>
    </div>
  );
}
