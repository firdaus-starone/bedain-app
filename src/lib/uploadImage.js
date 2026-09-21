import imageCompression from 'browser-image-compression';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Kompres gambar, ubah format ke webp (jika didukung browser), lalu unggah ke Firebase.
 * @param {File} imageFile - File gambar dari input
 * @param {string} path - Path/folder di storage, misal 'articles/cover'
 * @returns {Promise<string>} - URL gambar setelah diunggah
 */
export const uploadAndCompressImage = async (imageFile, path = 'articles/images') => {
  if (!imageFile) throw new Error("File gambar tidak ditemukan");

  // 1. Opsi Kompresi & Konversi WebP
  const options = {
    maxSizeMB: 1, // Maksimal 1MB
    maxWidthOrHeight: 1200, // Dimensi maksimal 1200px
    useWebWorker: false, // MATIKAN web worker karena sering hang di production (Vite)
    fileType: 'image/webp' // Paksa ubah format ke webp (mirip inspirasikalbar)
  };

  try {
    // 2. Lakukan Kompresi
    const compressedFile = await imageCompression(imageFile, options);
    
    // 3. Siapkan Ref Storage Firebase dengan nama unik
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
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
