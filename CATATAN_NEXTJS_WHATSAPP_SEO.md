# 🐛 Catatan Sakti: Menaklukkan Mesin WhatsApp dengan Next.js 14 (App Router)

Catatan ini adalah dokumentasi historis dari peperangan kita melawan mesin *scraper* WhatsApp Desktop yang super kaku dan tidak sabaran. Jika di masa depan fitur *share* WhatsApp rusak (tidak muncul gambar/judul), bacalah catatan ini.

---

## 💥 Akar Masalah Utama

Mesin pembaca *link* milik Facebook sangat canggih dan sabar. Dia mau menunggu Javascript bekerja. **Tapi mesin WhatsApp Desktop/Web:**
1. **Tidak membaca Javascript** (dia hanya mengambil HTML mentah dari *request* pertama).
2. **Sangat tidak sabar** (dia akan **memutus koneksi (timeout)** jika server tidak membalas dalam waktu maksimal **1.5 hingga 2.0 detik**).

Jika WhatsApp menemui salah satu masalah di atas, dia akan menyerah dan hanya menampilkan nama domain kosong (misal: `bedainnews.com`) atau mengambil teks sembarangan.

---

## 🛠️ Dua Bug Utama yang Kita Pecahkan

### BUG 1: Efek *Streaming* HTML (Gara-Gara `loading.jsx`)
Di Next.js 14 App Router, jika kita memiliki file `loading.jsx` pada suatu rute (contoh: `article/[slug]/loading.jsx`), Next.js akan langsung mengirim kerangka HTML awal beserta halaman *loading* ke pengguna secepat kilat.
**Celakanya**, tag `<meta property="og:image">` (Metadata SEO) dari halaman tersebut ditunda dan baru disuntikkan belakangan di bagian paling bawah HTML lewat Javascript (`self.__next_f.push`).

**Akibatnya:** Mesin WhatsApp yang membaca `<head>` HTML bagian atas tidak menemukan Meta Tag apapun, sehingga gambar dan judul gagal muncul!

**Solusinya:**
Hapus file `loading.jsx` (atau komponen `<Suspense>` bawaan) yang membungkus komponen utama halaman artikel. Dengan membuang `loading.jsx`, Next.js dipaksa untuk merakit seluruh isi halaman (termasuk tag `<meta>`) di dalam `<head>` secara utuh sebelum mengirimkannya ke publik.

> **Mantra 1:** *"Jika halaman butuh Preview WhatsApp yang cantik, HARAM hukumnya ada `loading.jsx` yang membungkus halaman terluarnya."*

### BUG 2: Beban Database Ganda (Gara-Gara `POST` Request & `no-store`)
Karena kita menggunakan `cache: 'no-store'` agar SEO selalu *fresh*, Next.js harus mengambil data dari Firestore setiap kali ada *request*. 
Masalahnya, kita menggunakan *endpoint* `runQuery` yang berbasis `POST`.
Next.js secara bawaan **HANYA bisa menduplikasi (memoize) request `GET`**. Karena kita menggunakan `POST`, server Next.js kita terpaksa mengambil data **DUA KALI SECARA BERUNTUN**:
1. Satu kali untuk fungsi `generateMetadata`.
2. Satu kali lagi untuk komponen utama `Page`.

Karena Firebase butuh waktu sekitar 800ms, memanggilnya dua kali membuat respons server melar menjadi **1.9 detik**. Mesin WhatsApp yang hanya punya batas waktu 2 detik akhirnya menyerah dan memutuskan koneksi (*timeout*).

**Solusinya:**
Bungkus fungsi pemanggil *database* (misal: `getArticleBySlug`) menggunakan fungsi `cache()` bawaan React.
```javascript
import { cache } from 'react';

// Fungsi di-cache agar request database kedua langsung mengambil dari ingatan!
const getArticleBySlug = cache(async (slug) => {
   // ... fetch ke Firestore
});
```
Dengan mantra `cache()`, waktu *loading* web langsung terpangkas setengahnya menjadi di bawah 1 detik. Mesin WhatsApp pun puas karena web kita merespons sangat cepat!

> **Mantra 2:** *"Selalu gunakan `cache()` dari React untuk membungkus fungsi pengambil data di Server Component, apalagi jika fungsi itu dipakai oleh `generateMetadata`."*

---
*Ditulis saat merayakan kemenangan telak melawan mesin WhatsApp yang kolot. ☕🔥*
