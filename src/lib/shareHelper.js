import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { getArticleCardImage } from './videoHelpers';

/**
 * Cek apakah perangkat saat ini adalah HP/Mobile/Native (bukan Desktop PC/Mac)
 */
export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  if (Capacitor.isNativePlatform()) return true;
  const ua = window.navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isTouchScreen = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0 && window.innerWidth <= 1024);
  return isMobileUA || (isTouchScreen && window.innerWidth <= 1024);
};

/**
 * Mengubah Blob/File menjadi Base64 string
 */
/**
 * Mengubah Blob/File menjadi Base64 string
 */
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });
};

/**
 * Mendapatkan URL publik artikel yang sah (mencegah localhost saat dijalankan di aplikasi Android/iOS)
 */
export const getPublicArticleUrl = (article) => {
  if (article && (article.slug || article.id)) {
    const slugOrId = String(article.slug || article.id).trim();
    if (slugOrId.startsWith('http://') || slugOrId.startsWith('https://')) return slugOrId;
    const safeSlug = slugOrId.replace(/\s+/g, '-');
    return `https://bedainnews.com/article/${encodeURIComponent(safeSlug)}`;
  }
  if (typeof window !== 'undefined' && window.location && window.location.href) {
    const href = window.location.href;
    if (!href.includes('localhost') && !href.includes('127.0.0.1')) {
      return href;
    }
  }
  return 'https://bedainnews.com';
};

/**
 * Bagikan artikel beserta foto/gambar (coverImage) ke aplikasi (WhatsApp, Telegram, IG, dll.)
 */
export const shareArticleWithImage = async (article, customText = '') => {
  if (!article) return false;

  const title = article.title || 'Bedain News';
  const excerpt = article.seoDescription || article.excerpt || (article.content ? article.content.replace(/<[^>]+>/g, '').substring(0, 140) + '...' : '');
  const publicUrl = getPublicArticleUrl(article);
  const text = customText || `${title}\n\n${excerpt}\n\nBaca selengkapnya di Bedain News:\n${publicUrl}`;
  const rawImageUrl = getArticleCardImage(article);

  // Pastikan URL gambar adalah absolute URL dan bukan mengarah ke localhost
  const imageUrl = rawImageUrl && rawImageUrl.startsWith('/')
    ? `https://bedainnews.com${rawImageUrl}`
    : (rawImageUrl || 'https://bedainnews.com/logo.png');

  try {
    // 1. Jika dijalankan di Native Android / iOS (Capacitor)
    if (Capacitor.isNativePlatform()) {
      let fileUri = null;
      try {
        const ext = imageUrl.includes('.png') ? 'png' : imageUrl.includes('.webp') ? 'webp' : 'jpg';
        const fileName = `bedain_share_${article.id || Date.now()}.${ext}`;

        // 1a. Coba unduh langsung secara native via Filesystem.downloadFile (bebas dari batasan CORS WebView)
        try {
          const downloadResult = await Filesystem.downloadFile({
            url: imageUrl,
            path: fileName,
            directory: Directory.Cache
          });
          if (downloadResult && downloadResult.path) {
            if (downloadResult.path.startsWith('file:')) {
              fileUri = downloadResult.path;
            } else {
              const uriResult = await Filesystem.getUri({
                path: fileName,
                directory: Directory.Cache
              });
              fileUri = uriResult.uri;
            }
          }
        } catch (nativeDownloadErr) {
          console.warn('Filesystem.downloadFile fallback ke fetch:', nativeDownloadErr);
        }

        // 1b. Jika downloadFile gagal, fallback menggunakan fetch + base64 + Filesystem.writeFile
        if (!fileUri) {
          const response = await fetch(imageUrl, { mode: 'cors' });
          if (response.ok) {
            const blob = await response.blob();
            const base64DataUrl = await blobToBase64(blob);
            const base64Data = base64DataUrl.split(',')[1];

            const writeResult = await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Cache
            });

            if (writeResult && writeResult.uri) {
              fileUri = writeResult.uri.startsWith('file:') ? writeResult.uri : (await Filesystem.getUri({ path: fileName, directory: Directory.Cache })).uri;
            }
          }
        }
      } catch (imgErr) {
        console.warn('Gagal mengunduh atau menyimpan gambar untuk native share:', imgErr);
      }

      // Catatan penting di Android (SharePlugin.java):
      // Jika parameter `url` dan `text` dikirim bersamaan, plugin otomatis menyambungkan `text + " " + url`
      // yang menyebabkan URL muncul dua kali. Karena `text` sudah memuat `publicUrl`, kita tidak mengirim parameter `url`.
      const shareOptions = {
        title: title,
        text: text,
        dialogTitle: 'Bagikan Artikel Bedain News'
      };

      if (fileUri) {
        shareOptions.files = [fileUri];
      } else if (!text.includes(publicUrl)) {
        shareOptions.url = publicUrl;
      }

      await Share.share(shareOptions);
      return true;
    }

    // 2. Jika dijalankan di Browser Mobile/Tablet yang mendukung Web Share API dengan files
    if (isMobileDevice() && typeof navigator !== 'undefined' && navigator.canShare && navigator.share) {
      try {
        const response = await fetch(imageUrl, { mode: 'cors' });
        if (response.ok) {
          const blob = await response.blob();
          const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
          const file = new File([blob], `bedainapp_article.${ext}`, { type: blob.type || 'image/jpeg' });

          const shareDataWithFile = {
            title: title,
            text: text,
            files: [file]
          };
          if (!text.includes(publicUrl)) {
            shareDataWithFile.url = publicUrl;
          }

          if (navigator.canShare(shareDataWithFile)) {
            await navigator.share(shareDataWithFile);
            return true;
          }
        }
      } catch (webImgErr) {
        console.warn('Gagal menyiapkan file gambar untuk Web Share API:', webImgErr);
      }

      // Fallback Web Share tanpa file (hindari duplikasi param url jika text sudah memuat publicUrl)
      const shareDataNoFile = text.includes(publicUrl) ? { title, text } : { title, text, url: publicUrl };
      if (navigator.canShare(shareDataNoFile)) {
        await navigator.share(shareDataNoFile);
        return true;
      } else if (navigator.share) {
        await navigator.share({ title, url: publicUrl });
        return true;
      }
    }
  } catch (err) {
    console.warn('Share dibatalkan atau gagal:', err);
    if (err && (err.name === 'AbortError' || err.message?.toLowerCase().includes('cancel') || err.message?.toLowerCase().includes('dismiss'))) {
      return true;
    }
  }

  return false;
};
