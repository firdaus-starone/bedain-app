import imageCompression from 'browser-image-compression';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Kompres gambar, ubah format ke webp (jika didukung browser), lalu unggah ke Firebase.
 * @param {File} imageFile - File gambar dari input
 * @param {string} path - Path/folder di storage, misal 'articles/cover'
 * @returns {Promise<string>} - URL gambar setelah diunggah
 */
export const uploadAndCompressImage = async (imageFile, path = 'articles/images', uid = null) => {
  if (!imageFile) throw new Error("File gambar tidak ditemukan");

  const isPNG = imageFile.type === 'image/png';

  // 1. Opsi Kompresi & Konversi (Sangat Penting untuk WhatsApp/FB OG Meta)
  const options = {
    maxSizeMB: 0.25, // Maksimal 250KB (Batas aman WhatsApp < 300KB)
    maxWidthOrHeight: 1200, // Dimensi maksimal 1200px
    useWebWorker: false, // MATIKAN web worker karena sering hang di production (Vite)
    fileType: isPNG ? 'image/png' : 'image/jpeg' // Pertahankan PNG agar transparan, selain itu JPG
  };

  try {
    // 2. Lakukan Kompresi
    const compressedFile = await imageCompression(imageFile, options);
    
    // 3. Siapkan Ref Storage Firebase dengan nama unik
    const uidSuffix = uid ? `_${uid}` : '';
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${uidSuffix}.${isPNG ? 'png' : 'jpg'}`;
    const storageRef = ref(storage, `${path}/${uniqueFileName}`);

    // 4. Unggah ke Firebase Storage (gunakan uploadBytes agar promise resolve dengan benar)
    const snapshot = await uploadBytes(storageRef, compressedFile);
    
    // 5. Dapatkan URL publik
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Gagal mengompres/mengunggah gambar:", error);
    throw error;
  }
};
