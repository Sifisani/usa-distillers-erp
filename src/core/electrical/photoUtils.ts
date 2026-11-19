/**
 * Client-side Image Compression Utility for Electrical Inspection Photos
 *
 * Resizes and compresses uploaded inspection images into bounded JPEG data URLs
 * so attachments remain well within Firestore document size limits without requiring
 * external object storage configuration.
 */

import { InspectionPhotoAttachment } from '../../types';
import { MAX_PHOTO_DATA_URL_BYTES } from './inspections';

export async function compressInspectionPhotoFile(
  file: File
): Promise<InspectionPhotoAttachment> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`Unsupported file type "${file.type || file.name}". Only image files are supported.`);
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  if (typeof document === 'undefined') {
    if (dataUrl.length > MAX_PHOTO_DATA_URL_BYTES) {
      throw new Error('Image exceeds maximum allowed size.');
    }
    return {
      id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: file.name.slice(0, 80),
      contentType: file.type || 'image/jpeg',
      sizeBytes: file.size,
      dataUrl,
      capturedAt: new Date().toISOString()
    };
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Invalid or corrupted image file "${file.name}".`));
    image.src = dataUrl;
  });

  const maxDim = 960;
  const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
  const targetWidth = Math.max(1, Math.round(img.width * scale));
  const targetHeight = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas image processor unavailable in this browser.');
  }
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  let quality = 0.72;
  let compressed = canvas.toDataURL('image/jpeg', quality);
  while (compressed.length > MAX_PHOTO_DATA_URL_BYTES && quality > 0.3) {
    quality -= 0.12;
    compressed = canvas.toDataURL('image/jpeg', quality);
  }

  if (compressed.length > MAX_PHOTO_DATA_URL_BYTES) {
    throw new Error(
      `Photo "${file.name}" could not be compressed under ${Math.round(MAX_PHOTO_DATA_URL_BYTES / 1000)} KB.`
    );
  }

  return {
    id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: file.name.slice(0, 80),
    contentType: 'image/jpeg',
    sizeBytes: compressed.length,
    dataUrl: compressed,
    capturedAt: new Date().toISOString()
  };
}
