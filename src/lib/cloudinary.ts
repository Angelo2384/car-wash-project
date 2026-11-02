import { doc, setDoc } from 'firebase/firestore';
import { updateProfile, type User } from 'firebase/auth';
import { db } from './firebase';

/**
 * Profile pictures are uploaded straight from the browser to Cloudinary using an
 * UNSIGNED upload preset. Only the cloud name and preset name live in the app;
 * the Cloudinary API secret must never be added here (VITE_ vars ship to the browser).
 */
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

/** Returns an error message for an unusable file, or null if it's fine to upload. */
export function validateProfileImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Choose a JPG, PNG or WebP image.';
  if (file.size > MAX_PROFILE_IMAGE_BYTES) return 'Choose an image under 5MB.';
  return null;
}

/**
 * Uploads an image to Cloudinary and returns its https URL. Unsigned presets can't
 * overwrite, so every upload gets a new id; the user's doc always points at the latest.
 */
export async function uploadProfileImage(file: File): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Profile picture uploads are not set up yet. Add the Cloudinary settings to .env.');
  }
  const problem = validateProfileImage(file);
  if (problem) throw new Error(problem);

  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', UPLOAD_PRESET!);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.secure_url) {
    throw new Error(data?.error?.message || "Couldn't upload the image. Try again.");
  }
  return data.secure_url as string;
}

/** Saves the picture URL on the user's Firestore doc and their Firebase Auth profile. */
export async function saveProfilePhotoUrl(user: User, url: string): Promise<void> {
  await setDoc(doc(db, 'users', user.uid), { photoURL: url }, { merge: true });
  await updateProfile(user, { photoURL: url });
}

/**
 * Small, face-centred square version of a Cloudinary image for avatars.
 * Non-Cloudinary URLs are returned unchanged.
 */
export function avatarUrl(url: string | null | undefined, size = 160): string | undefined {
  if (!url) return undefined;
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/c_fill,g_face,w_${size},h_${size},q_auto,f_auto/`);
}
