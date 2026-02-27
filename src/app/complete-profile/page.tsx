'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Cropper, { type Area } from 'react-easy-crop';
import { useAuth } from '@/lib/auth-context';
import { API_BASE, membersApi } from '@/lib/api';
import { getCroppedImg, type PixelCrop } from '@/lib/crop';

const schema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  profilePhotoUrl: z.string().min(1, 'La photo de profil est requise'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  neighborhood: z.string().optional(),
  secondaryContact: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CompleteProfilePage() {
  const { user, token, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const [showCropModal, setShowCropModal] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      profilePhotoUrl: '',
      email: '',
      neighborhood: '',
      secondaryContact: '',
    },
  });

  const profilePhotoUrl = watch('profilePhotoUrl');

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels as PixelCrop);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setCroppedAreaPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setShowCropModal(true);
    e.target.value = '';
  }, []);

  const closeCropModal = useCallback(() => {
    setShowCropModal(false);
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(null);
    setCroppedAreaPixels(null);
  }, [imageSrc]);

  const handleCropConfirm = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setUploading(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const { url } = await membersApi.uploadAvatar(blob);
      const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
      setValue('profilePhotoUrl', fullUrl, { shouldValidate: true });
      closeCropModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l’upload');
    } finally {
      setUploading(false);
    }
  }, [imageSrc, croppedAreaPixels, setValue, closeCropModal]);

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        profilePhotoUrl: user.profilePhotoUrl ?? '',
        email: user.email ?? '',
      });
    }
  }, [user, reset]);

  useEffect(() => {
    if (!loading && !token) router.replace('/login');
  }, [loading, token, router]);

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      await membersApi.completeProfile({
        firstName: data.firstName,
        lastName: data.lastName,
        profilePhotoUrl: data.profilePhotoUrl,
        email: data.email || undefined,
        neighborhood: data.neighborhood,
        secondaryContact: data.secondaryContact,
      });
      await refreshUser();
      router.push('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l’enregistrement');
    }
  }

  if (loading || !token) {
    return (
      <div
        className="min-h-screen flex items-center justify-center relative bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/Foot.jpg)' }}
      >
        <div className="absolute inset-0 bg-[var(--sky-blue-soft-lighter)]/75" aria-hidden />
        <div className="relative z-10 inline-block h-10 w-10 animate-spin rounded-full border-4 border-[var(--sky-blue)] border-r-transparent" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative bg-cover bg-center py-8 px-4"
      style={{ backgroundImage: 'url(/images/Foot.jpg)' }}
    >
      <div className="absolute inset-0 bg-[var(--sky-blue-soft-lighter)]/75" aria-hidden />
      <div className="max-w-lg mx-auto card relative z-10 shadow-lg">
        <h1 className="text-xl font-bold text-[var(--sky-blue-dark)] mb-6">
          Compléter mon profil
        </h1>
        <p className="text-gray-600 text-sm mb-6">
          Pour accéder à l’application, complétez les champs obligatoires ci-dessous.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom <span className="text-red-500">*</span></label>
              <input className="input-field" {...register('firstName')} />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom <span className="text-red-500">*</span></label>
              <input className="input-field" {...register('lastName')} />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Photo de profil <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-4 flex-wrap">
              {profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl.startsWith('http') ? profilePhotoUrl : `${API_BASE}${profilePhotoUrl}`}
                  alt=""
                  className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs text-center px-1">
                  Aucune photo
                </div>
              )}
              <label className="cursor-pointer">
                <span className="inline-block px-4 py-2 rounded-xl bg-[var(--sky-blue)] text-white text-sm font-medium hover:opacity-90">
                  Choisir une image
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </label>
            </div>
            {errors.profilePhotoUrl && (
              <p className="mt-1 text-sm text-red-600">{errors.profilePhotoUrl.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email (optionnel)</label>
            <input type="email" className="input-field" {...register('email')} />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Quartier (optionnel)
            </label>
            <input className="input-field" {...register('neighborhood')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Contact secondaire (optionnel)
            </label>
            <input className="input-field" {...register('secondaryContact')} />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full py-3 rounded-xl disabled:opacity-60"
          >
            {isSubmitting ? 'Enregistrement…' : 'Enregistrer et continuer'}
          </button>
        </form>
      </div>

      {showCropModal && imageSrc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
          <div className="flex-1 relative min-h-0">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              style={{ containerStyle: { backgroundColor: '#000' } }}
            />
          </div>
          <div className="p-4 bg-gray-900 flex items-center justify-between gap-4">
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 max-w-xs"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeCropModal}
                className="px-4 py-2 rounded-xl bg-gray-600 text-white text-sm font-medium"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                disabled={uploading || !croppedAreaPixels}
                className="px-4 py-2 rounded-xl bg-[var(--sky-blue)] text-white text-sm font-medium disabled:opacity-60"
              >
                {uploading ? 'Envoi…' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
