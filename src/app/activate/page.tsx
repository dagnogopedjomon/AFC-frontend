'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';
import { authApi } from '@/lib/api';
import { Eye, EyeOff } from 'lucide-react';

const codeSchema = z.object({
  code: z.string().min(4, 'Le code doit contenir au moins 4 caractères').max(8, 'Code invalide'),
});

const passwordSchema = z
  .object({
    password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
    confirm: z.string().min(1, 'Confirmez le mot de passe'),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirm'],
  });

type CodeFormData = z.infer<typeof codeSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

type Step = 'otp' | 'code' | 'password';

function ActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const phoneFromUrl = searchParams.get('phone')?.trim() || '';
  const tokenFromUrl = searchParams.get('token')?.trim() || '';

  const [step, setStep] = useState<Step>('otp');
  const [phone, setPhone] = useState(phoneFromUrl);
  const [activationToken, setActivationToken] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const autoSentOtpRef = useRef(false);

  useEffect(() => {
    if (phoneFromUrl) setPhone(phoneFromUrl);
  }, [phoneFromUrl]);

  const codeForm = useForm<CodeFormData>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirm: '' },
  });

  // Si on arrive avec un token dans l'URL (lien d'invitation "1 clic"),
  // on saute directement les étapes OTP / code et on passe à la création du mot de passe.
  useEffect(() => {
    if (!tokenFromUrl) return;
    setActivationToken(tokenFromUrl);
    setStep('password');
  }, [tokenFromUrl]);

  // Si l'utilisateur vient du lien d'invitation (avec ?phone=...), on envoie le code automatiquement
  // pour que le parcours soit "clic sur le lien → recevoir le code → définir le mot de passe".
  useEffect(() => {
    // Si un token est présent, on est en mode "1 clic" : pas d'OTP à envoyer.
    if (tokenFromUrl) return;
    if (!phoneFromUrl) return;
    if (autoSentOtpRef.current) return;
    autoSentOtpRef.current = true;
    // Ne pas bloquer le rendu si l'appel échoue : l'erreur est affichée et l'utilisateur peut réessayer.
    void handleSendOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneFromUrl]);

  async function handleSendOtp() {
    const num = phone.trim();
    if (!num) {
      setError('Indiquez votre numéro de téléphone.');
      return;
    }
    setError(null);
    setDemoCode(null);
    setSendingOtp(true);
    try {
      const res = await authApi.sendActivationOtp(num);
      setPhone(num);
      if (res.demoCode) {
        setDemoCode(res.demoCode);
        codeForm.setValue('code', res.demoCode);
      } else {
        setDemoCode(null);
      }
      setStep('code');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible d’envoyer le code.');
    } finally {
      setSendingOtp(false);
    }
  }

  async function onCodeSubmit(data: CodeFormData) {
    const num = phone.trim();
    if (!num) return;
    setError(null);
    try {
      const { activationToken: token } = await authApi.verifyActivationOtp(num, data.code.trim());
      setActivationToken(token);
      setStep('password');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Code invalide ou expiré.');
    }
  }

  async function onPasswordSubmit(data: PasswordFormData) {
    if (!activationToken || !phone.trim()) {
      setError('Session invalide. Utilisez à nouveau le lien d’activation reçu par SMS ou WhatsApp.');
      return;
    }
    setError(null);
    try {
      await authApi.setPassword(activationToken, data.password);
      await login(phone.trim(), data.password);
      // login() redirige vers /complete-profile ou /dashboard selon profileCompleted
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur réseau ou serveur. Réessayez.';
      setError(message);
    }
  }

  if (!phoneFromUrl && step === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-800 px-4">
        <div className="card w-full max-w-md shadow-xl border border-neutral-600/30">
          <img src="/images/afcimage.jpeg" alt="AFC" className="h-20 w-20 object-cover rounded-xl mx-auto mb-3" />
          <h1 className="text-xl font-bold text-[var(--sky-blue-dark)] mb-2">Activation</h1>
          <p className="text-gray-600 mb-4">
            Utilisez le lien reçu par SMS ou WhatsApp pour activer votre compte. Le lien doit contenir votre numéro de téléphone.
          </p>
          <a href="/login" className="text-[var(--sky-blue-dark)] hover:underline font-medium">
            ← Retour à la connexion
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-800 px-4">
      <div className="card w-full max-w-md shadow-xl border border-neutral-600/30">
        <div className="flex flex-col items-center mb-6">
          <img src="/images/afcimage.jpeg" alt="AFC" className="h-20 w-20 object-cover rounded-xl mb-3" />
          <p className="text-gray-600 mt-1">Activation de votre compte</p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Étape 1 : Envoyer le code OTP */}
        {step === 'otp' && (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Un code va être envoyé au <strong>{phone || 'numéro indiqué dans le lien'}</strong> (WhatsApp ou SMS).
            </p>
            {!phoneFromUrl && (
              <div>
                <label htmlFor="activate-phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone <span className="text-red-500">*</span>
                </label>
                <input
                  id="activate-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="06 12 34 56 78"
                  className="input-field"
                />
              </div>
            )}
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={sendingOtp || !phone.trim()}
              className="btn-primary w-full py-3 rounded-xl disabled:opacity-60"
            >
              {sendingOtp ? 'Envoi…' : 'Envoyer le code'}
            </button>
          </div>
        )}

        {/* Étape 2 : Saisir le code OTP */}
        {step === 'code' && (
          <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="space-y-4">
            {demoCode ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 mb-2">
                <p className="text-amber-800 font-medium text-sm">Mode démo (SMS/WhatsApp indisponibles)</p>
                <p className="text-amber-700 text-sm mt-1">Votre code : <strong className="text-lg">{demoCode}</strong></p>
              </div>
            ) : (
              <p className="text-gray-600 text-sm">
                Saisissez le code reçu au <strong>{phone}</strong> (valide 15 min).
              </p>
            )}
            <div>
              <label htmlFor="activate-code" className="block text-sm font-medium text-gray-700 mb-1">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                id="activate-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className="input-field"
                {...codeForm.register('code')}
              />
              {codeForm.formState.errors.code && (
                <p className="mt-1 text-sm text-red-600">{codeForm.formState.errors.code.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={codeForm.formState.isSubmitting}
              className="btn-primary w-full py-3 rounded-xl disabled:opacity-60"
            >
              {codeForm.formState.isSubmitting ? 'Vérification…' : 'Valider le code'}
            </button>
            <button
              type="button"
              onClick={() => setStep('otp')}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              Changer de numéro / Renvoyer le code
            </button>
          </form>
        )}

        {/* Étape 3 : Définir le mot de passe */}
        {step === 'password' && (
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <p className="text-gray-600 text-sm">
              Choisissez un mot de passe pour vous connecter à l’application.
            </p>
            <div>
              <label htmlFor="activate-password" className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="activate-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input-field pr-10"
                  {...passwordForm.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordForm.formState.errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {passwordForm.formState.errors.password.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="activate-confirm" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmer le mot de passe <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="activate-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input-field pr-10"
                  {...passwordForm.register('confirm')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showConfirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordForm.formState.errors.confirm && (
                <p className="mt-1 text-sm text-red-600">
                  {passwordForm.formState.errors.confirm.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={passwordForm.formState.isSubmitting}
              className="btn-primary w-full py-3 rounded-xl disabled:opacity-60"
            >
              {passwordForm.formState.isSubmitting ? 'Création…' : 'Créer mon mot de passe'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          <a href="/login" className="text-[var(--sky-blue-dark)] hover:underline">
            Retour à la connexion
          </a>
        </p>
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-800 px-4">
        <div className="card w-full max-w-md shadow-xl border border-neutral-600/30 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-full" />
        </div>
      </div>
    }>
      <ActivateContent />
    </Suspense>
  );
}
