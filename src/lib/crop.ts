/** Crée une image à partir d'une URL (object URL ou data URL). */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export type PixelCrop = { x: number; y: number; width: number; height: number };

/**
 * Retourne un blob JPEG recadré à partir de l'image source et de la zone en pixels.
 * Utilisé après react-easy-crop (croppedAreaPixels).
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  mime: string = 'image/jpeg',
  quality: number = 0.9
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Contexte 2d indisponible');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Échec de l’export canvas'));
      },
      mime,
      quality
    );
  });
}
