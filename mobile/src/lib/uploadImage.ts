import * as ImageManipulator from 'expo-image-manipulator';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

const WATERMARK_API_URL = 'https://bedainnews.com/api/watermark';

/**
 * Memproses foto sampul:
 * 1. Resize ke maks 1200px di HP agar cepat diupload.
 * 2. Membubuhkan logo & teks watermark resmi 'bedainnews' via server API.
 * 3. Menyimpan hasil olahan ke Firebase Storage di folder 'articles/images/'.
 * 4. Fallback otomatis jika offline atau API tidak terjangkau.
 */
export async function uploadArticleCover(originalUri: string): Promise<string> {
  if (!originalUri) {
    throw new Error('URI gambar tidak valid.');
  }

  // 1. Kompresi awal di perangkat: resize maks 1200px lebar
  const manipResult = await ImageManipulator.manipulateAsync(
    originalUri,
    [{ resize: { width: 1200 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
  );

  let finalBlob: Blob | null = null;

  // 2. Coba proses watermark via Bedain News Watermark API
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: manipResult.uri,
      name: `cover_${Date.now()}.jpg`,
      type: 'image/jpeg',
    } as any);

    const apiResponse = await fetch(WATERMARK_API_URL, {
      method: 'POST',
      body: formData,
    });

    if (apiResponse.ok && apiResponse.headers.get('content-type')?.includes('image')) {
      finalBlob = await apiResponse.blob();
    } else {
      console.warn('Watermark API mengembalikan status non-200, menggunakan fallback.');
    }
  } catch (apiError) {
    console.warn('Gagal menghubungi Watermark API, beralih ke fallback upload lokal:', apiError);
  }

  // 3. Fallback: jika API tidak dapat dijangkau, gunakan foto yang sudah di-resize
  if (!finalBlob) {
    const localResp = await fetch(manipResult.uri);
    finalBlob = await localResp.blob();
  }

  // 4. Unggah ke Firebase Storage (folder articles/images/)
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
  const storageRef = ref(storage, `articles/images/${uniqueName}`);
  
  await uploadBytes(storageRef, finalBlob);
  const downloadUrl = await getDownloadURL(storageRef);

  return downloadUrl;
}
