import { doc, getDoc, setDoc, deleteField, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const SECRETS_DOC = doc(db, 'settings', 'secrets');
const SITE_DOC = doc(db, 'settings', 'site');

// Cached in-memory key for current session
let memoryKey = null;

/**
 * Mengambil Gemini API Key secara aman dari dokumen rahasia Firestore (settings/secrets).
 * Dokumen ini dilindungi Firestore Security Rules sehingga HANYA redaksi/admin terautentikasi yang bisa membacanya.
 * Pengunjung publik biasa TIDAK BISA mengaksesnya sama sekali.
 */
export async function getGeminiApiKey() {
  if (memoryKey) return memoryKey;

  // 1. Coba ambil dari dokumen rahasia terproteksi
  try {
    const snap = await getDoc(SECRETS_DOC);
    if (snap.exists() && snap.data().geminiApiKey) {
      memoryKey = snap.data().geminiApiKey.trim();
      return memoryKey;
    }
  } catch (err) {
    // Pengguna belum login atau permission denied
  }

  // 2. Migrasi otomatis: cek apakah kunci masih ada di dokumen publik lama (settings/site)
  try {
    const siteSnap = await getDoc(SITE_DOC);
    if (siteSnap.exists() && siteSnap.data().geminiApiKey) {
      const oldKey = siteSnap.data().geminiApiKey.trim();
      memoryKey = oldKey;
      
      // Auto-migrasikan ke dokumen rahasia jika user terautentikasi
      try {
        await setDoc(SECRETS_DOC, { geminiApiKey: oldKey, updatedAt: new Date() }, { merge: true });
        await updateDoc(SITE_DOC, { geminiApiKey: deleteField() });
      } catch (e) {}

      return memoryKey;
    }
  } catch (err) {}

  // 3. Fallback ke LocalStorage redaksi
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem('bedain_gemini_api_key');
      if (local && local.trim()) {
        memoryKey = local.trim();
        return memoryKey;
      }
    } catch (e) {}
  }

  // 4. Fallback ke Environment Variable
  const envKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY);
  if (envKey && envKey !== 'YOUR_GEMINI_API_KEY') {
    return envKey.trim();
  }

  return null;
}

/**
 * Menyimpan Gemini API Key ke dokumen rahasia terproteksi (settings/secrets)
 * dan menghapusnya dari dokumen publik settings/site agar tidak bocor ke publik.
 */
export async function saveGeminiApiKey(key) {
  const cleanKey = (key || '').trim();
  memoryKey = cleanKey;

  // 1. Simpan ke dokumen rahasia (settings/secrets)
  await setDoc(SECRETS_DOC, { 
    geminiApiKey: cleanKey, 
    updatedAt: new Date() 
  }, { merge: true });

  // 2. Hapus dari dokumen publik settings/site agar tidak pernah diunduh pengunjung
  try {
    await updateDoc(SITE_DOC, { 
      geminiApiKey: deleteField() 
    });
  } catch (e) {}

  // 3. Simpan di local storage redaksi lokal
  if (typeof window !== 'undefined') {
    try {
      if (cleanKey) {
        localStorage.setItem('bedain_gemini_api_key', cleanKey);
      } else {
        localStorage.removeItem('bedain_gemini_api_key');
      }
    } catch (e) {}
  }
}
