import imageCompression from 'browser-image-compression';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Menambahkan watermark logo ke gambar menggunakan Canvas
 */
const applyWatermark = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const logo = new Image();
      logo.src = '/logo-no-latar.png'; // Logo transparan
      logo.onload = () => {
        // Logo width = 15% dari lebar gambar
        const logoWidth = img.width * 0.15;
        const ratio = logo.width / logo.height;
        const logoHeight = logoWidth / ratio;
        
        // Posisi di pojok kanan bawah dengan padding 3%
        const padding = img.width * 0.03;
        const x = img.width - logoWidth - padding;
        const y = img.height - logoHeight - padding;
        
        ctx.globalAlpha = 0.8; // Transparansi watermark
        ctx.drawImage(logo, x, y, logoWidth, logoHeight);
        ctx.globalAlpha = 1.0;
        
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: file.type }));
        }, file.type);
      };
      logo.onerror = () => {
        resolve(file); // Jika gagal memuat logo, kembalikan file asli
      };
    };
    img.onerror = () => resolve(file); // Jika gambar error dibaca, kembalikan asli
    img.src = url;
  });
};

/**
 * Kompres gambar, beri watermark, ubah format ke webp (jika didukung browser), lalu unggah ke Firebase.
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
    // 2. Beri Watermark jika gambar untuk artikel
    let processedFile = imageFile;
    if (path.includes('article')) {
      processedFile = await applyWatermark(imageFile);
    }

    // 3. Lakukan Kompresi
    const compressedFile = await imageCompression(processedFile, options);
    
    // 4. Siapkan Ref Storage Firebase dengan nama unik
    const uidSuffix = uid ? `_${uid}` : '';
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${uidSuffix}.${isPNG ? 'png' : 'jpg'}`;
    const storageRef = ref(storage, `${path}/${uniqueFileName}`);

    // 5. Unggah ke Firebase Storage (gunakan uploadBytes agar promise resolve dengan benar)
    const snapshot = await uploadBytes(storageRef, compressedFile);
    
    // 6. Dapatkan URL publik
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Gagal mengompres/mengunggah gambar:", error);
    throw error;
  }
};
