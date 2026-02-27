'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';

const schema = z.object({
  phone: z.string().min(1, 'Le numéro de téléphone est requis'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, token, user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
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
      <div className="min-h-screen flex items-center justify-center bg-neutral-800">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-neutral-500 border-t-neutral-200" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-800 px-4">
      <div className="card w-full max-w-md shadow-xl border border-neutral-600/30">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--sky-blue-dark)]">AFC</h1>
          <p className="text-gray-600 mt-1">Amicale Football – Connexion</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <div
              className={
                error.toLowerCase().includes('suspendu')
                  ? 'rounded-xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm font-medium'
                  : 'rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm'
              }
            >
              {error}
            </div>
          )}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
              Téléphone <span className="text-red-500">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="06 12 34 56 78"
              className="input-field"
              {...register('phone')}
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Mot de passe <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className="input-field"
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
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

        <p className="mt-6 text-center text-sm text-gray-500">
          Utilisez vos identifiants fournis par le bureau du club.
        </p>
      </div>
    </div>
  );
}
