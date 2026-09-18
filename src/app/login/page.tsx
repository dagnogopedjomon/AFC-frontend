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
  const [pageBg, setPageBg] = useState('#10162A');

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('afc_theme');
    setPageBg(storedTheme === 'light' ? '#FFFFFF' : '#10162A');
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
      <div className="grid min-h-screen place-items-center" style={{ background: pageBg }}>
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-white/10 border-t-[#C9A048]" />
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-[100dvh] items-start justify-center overflow-hidden px-4 pb-4 pt-4 text-[#F5F1E8] sm:pb-10 sm:pt-8"
      style={{ fontFamily: 'var(--font-technical)', background: pageBg }}
    >
      <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <circle cx="720" cy="450" r="160" fill="none" stroke="#C9A048" strokeWidth="1" opacity="0.2" />
        <circle cx="720" cy="450" r="3" fill="#C9A048" opacity="0.26" />
        <path d="M 0 260 A 210 210 0 0 1 0 640" fill="none" stroke="#2E5FA3" strokeWidth="1" opacity="0.28" />
        <path d="M 1440 260 A 210 210 0 0 0 1440 640" fill="none" stroke="#2E5FA3" strokeWidth="1" opacity="0.28" />
      </svg>

      <div className="relative z-10 flex w-full flex-col items-center">
        <div className="relative z-[2] mb-[-16px] sm:mb-[-24px]">
          <img src="/images/logo-afc.png" alt="Amicale Football Club" className="block h-14 w-auto object-contain sm:h-[92px]" />
        </div>

        <div className="mb-3 pt-4 text-center sm:mb-6 sm:pt-9">
          <div className="text-xl font-semibold tracking-[-0.5px] sm:text-[30px]" style={{ color: pageBg === '#FFFFFF' ? '#10162A' : '#F5F1E8' }}>La trésorerie du club</div>
        </div>

        <div className="relative w-full max-w-[500px]">
          <div
            className="pointer-events-none fixed hidden h-px sm:block"
            style={{ background: 'rgba(201,160,72,0.45)', left: 0, width: 'calc(50vw - 250px)', top: '50vh' }}
          />
          <div
            className="pointer-events-none fixed hidden h-px sm:block"
            style={{ background: 'rgba(201,160,72,0.45)', right: 0, width: 'calc(50vw - 250px)', top: '50vh' }}
          />
          <div
            className="relative z-10 box-border w-full overflow-hidden border border-[rgba(201,160,72,0.22)] bg-[#161D33] px-6 pb-8 pt-9 sm:px-14 sm:pb-14 sm:pt-16"
            style={{ clipPath: 'polygon(0 0, calc(100% - 36px) 0, 100% 36px, 100% 100%, 0 100%)' }}
          >
          <h1 className="relative z-[1] m-0 text-xl font-semibold text-[#F5F1E8] sm:text-2xl">Content de vous revoir</h1>
          <p className="relative z-[1] mb-4 mt-2 text-sm text-[#9C9585] sm:mb-[30px]">Connectez-vous pour accéder à votre espace.</p>

          <form onSubmit={onSubmit} className="relative z-[1] space-y-0">
            {error && (
              <div className="mb-4 rounded border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 sm:mb-5">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="phone" className="mb-[7px] block text-xs font-medium tracking-[0.5px] text-[#9C9585]">
                TÉLÉPHONE OU ADRESSE E-MAIL
              </label>
              <input
                id="phone"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                type="text"
                autoComplete="username"
                placeholder="07 00 00 00 00"
                required
                className="w-full box-border rounded border border-white/10 bg-[#0D1120] px-[14px] py-[13px] text-[15px] text-[#F5F1E8] outline-none transition-colors focus:border-[#C9A048]"
              />
            </div>

            <div className="mt-3 sm:mt-5">
              <label htmlFor="password" className="mb-[7px] block text-xs font-medium tracking-[0.5px] text-[#9C9585]">
                MOT DE PASSE
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
                  className="w-full box-border rounded border border-white/10 bg-[#0D1120] py-[13px] pl-[14px] pr-[44px] text-[15px] text-[#F5F1E8] outline-none transition-colors focus:border-[#C9A048]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  className="absolute right-[10px] top-1/2 flex -translate-y-1/2 items-center border-none bg-transparent p-1 text-[#9C9585]"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M2 12 C4.5 7 8 4.5 12 4.5 C16 4.5 19.5 7 22 12 C19.5 17 16 19.5 12 19.5 C8 19.5 4.5 17 2 12 Z" />
                      <circle cx="12" cy="12" r="3" />
                      <path d="M3 3 L21 21" strokeWidth="1.6" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M2 12 C4.5 7 8 4.5 12 4.5 C16 4.5 19.5 7 22 12 C19.5 17 16 19.5 12 19.5 C8 19.5 4.5 17 2 12 Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[13px] sm:mt-[18px]">
              <label className="flex items-center gap-2 text-[#9C9585]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  style={{ accentColor: '#2E5FA3' }}
                />
                Rester connecté
              </label>
              <a href="#" className="text-[13px] text-[#C9A048] no-underline hover:underline">
                Mot de passe oublié ?
              </a>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 w-full box-border rounded-lg border-none bg-[#C9A048] py-[15px] text-[15px] font-semibold tracking-[0.3px] text-[#12140F] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55 sm:mt-7"
            >
              {submitting ? 'CONNEXION…' : 'SE CONNECTER'}
            </button>
          </form>
          </div>
        </div>

        <div className="mt-3 text-xs tracking-[0.5px] sm:mt-7" style={{ color: pageBg === '#FFFFFF' ? '#8A8578' : '#6B665A' }}>Besoin d&apos;aide ? Contactez le bureau.</div>
      </div>
    </div>
  );
}
