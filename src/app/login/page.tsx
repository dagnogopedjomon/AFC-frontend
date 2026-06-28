'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';
import { Eye, EyeOff } from 'lucide-react';
import { PhoneInput } from '@/components/PhoneInput';

const schema = z.object({
  phone: z.string().min(1, 'Le numéro de téléphone est requis'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, token, user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '', password: '' },
  });

  useEffect(() => {
    if (loading) return;
    if (!token || !user) return;
    // L'admin accède au dashboard même sans profil complété.
    if (user.role === 'ADMIN' || user.profileCompleted) router.replace('/dashboard');
    else router.replace('/complete-profile');
  }, [loading, token, user, router]);

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      await login(data.phone, data.password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion impossible');
    }
  }

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: '#ffffff' }}
      >
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-700" />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: '#ffffff' }}
    >
      <div
        data-login-dark
        className="w-full max-w-md rounded-2xl border p-6 shadow-xl"
        style={{
          backgroundColor: '#262626',
          borderColor: 'rgba(229, 231, 235, 0.35)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div className="mb-8 flex flex-col items-center">
          <div
            className="mb-3 shrink-0 overflow-hidden ring-2 ring-neutral-500"
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
            }}
          >
            <img
              src="/images/afcimage.jpeg"
              alt="AFC"
              className="h-full w-full object-cover object-center"
              width={80}
              height={80}
            />
          </div>
          <p className="mt-1 text-neutral-100">Amicale Football – Connexion</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <div
              className={
                error.toLowerCase().includes('suspendu')
                  ? 'rounded-xl border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm font-medium text-amber-200'
                  : 'rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200'
              }
            >
              {error}
            </div>
          )}
          <div>
            <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-neutral-200">
              Téléphone <span className="text-red-400">*</span>
            </label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  {...field}
                  variant="dark"
                  placeholder="07 12 34 56 78"
                  className="w-full"
                />
              )}
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-400">{errors.phone.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-neutral-200">
              Mot de passe <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                className="login-dark-input w-full rounded-xl border border-neutral-600 bg-neutral-700/50 px-4 py-3 pr-10 text-neutral-100 caret-sky-400 placeholder:text-neutral-500 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/25"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full py-3 rounded-xl disabled:opacity-60"
          >
            {isSubmitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-400">
          Utilisez vos identifiants fournis par le bureau du club.
        </p>
      </div>
    </div>
  );
}
