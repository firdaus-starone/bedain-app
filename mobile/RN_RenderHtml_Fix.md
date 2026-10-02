# Panduan Mengatasi Bug Pemenggalan Kata di React Native (RenderHtml)

Seringkali saat menggunakan library `react-native-render-html` untuk menampilkan konten dari CMS/Database, kita menemui masalah di mana **teks terpotong secara brutal di tengah kata/huruf** saat mencapai ujung layar HP (terutama Android).

Berikut adalah analisa penyebab utamanya dan *"Ultimate Fix"* yang bisa Anda terapkan di proyek-proyek Anda yang lain.

---

## 🔍 3 Penyebab Utama

### 1. Spasi Palsu / Non-Breaking Spaces (`&nbsp;`) - *Tersangka Utama*
Saat jurnalis atau admin melakukan *copy-paste* berita dari Microsoft Word atau aplikasi lain ke dalam CMS, editor teks seringkali secara diam-diam mengubah spasi normal menjadi `&nbsp;` atau `\u00A0` (spasi tidak terpisahkan).
**Akibatnya:** Mesin HP menganggap seluruh kalimat sebagai **satu kata yang sangat panjang**. Karena dilarang memisahkan kata di letak spasi tersebut, sistem terpaksa menebas/memotong huruf secara paksa saat mentok di pinggir layar.

### 2. Atribut *Justify* Tersembunyi
Pengaturan "Rata Kiri-Kanan" (*Justify*) pada Android seringkali *buggy*. Terkadang CMS mengirimkan atribut HTML jadul seperti `<p align="justify">` atau `<p class="text-justify">`. Jika atribut ini lolos dari filter Anda, mesin HP akan mencoba meratakan teks dan akhirnya memicu *bug* pemenggalan kata.

### 3. Font Bawaan HTML yang Tidak Cocok
Secara bawaan, `react-native-render-html` tidak otomatis menggunakan font modern (Sans-Serif) bawaan HP. Seringkali library ini mundur ke font klasik (*Serif* / Times New Roman). Perbedaan jenis font ini sering memperparah cara Android mengkalkulasi spasi antar huruf (kerning).

---

## 🛠️ Solusi Sapujagat (Ultimate Fix)

Gunakan kombinasi pembersihan teks (Regex) dan pengaturan `systemFonts` saat merender HTML. Anda dapat menyalin kode di bawah ini ke proyek Anda yang lain:

```tsx
import RenderHtml, { defaultSystemFonts } from 'react-native-render-html';
import { useWindowDimensions, Platform } from 'react-native';

// 1. Daftarkan font bawaan sistem modern ke dalam library
const systemFonts = [...defaultSystemFonts, 'System', 'sans-serif', 'Roboto'];

export default function ArticleContent({ htmlContent }) {
  const { width } = useWindowDimensions();

  // 2. Fungsi Regex Pembersih Super
  const cleanAndFixHtml = (rawHtml) => {
    if (!rawHtml) return '';
    
    const cleaned = rawHtml
      // A. Hancurkan spasi palsu yang mengikat kata!
      .replace(/&nbsp;/g, ' ')
      .replace(/\u00A0/g, ' ')
      // B. Hancurkan semua format Justify tersembunyi
      .replace(/justify/gi, 'left');
      
    // C. Bungkus dalam Div pelindung yang dikunci secara absolut ke kiri
    return \`<div style="text-align: left;">\${cleaned}</div>\`;
  };

  return (
    <RenderHtml
      contentWidth={width - 40} // Sesuaikan dengan padding layar Anda
      systemFonts={systemFonts} // Masukkan daftar font yang didukung
      baseStyle={{ 
        textAlign: 'left', // Paksa rata kiri
        // Gunakan font modern (System untuk iOS, sans-serif untuk Android)
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontWeight: '500', // Opsional: buat tulisan sedikit tebal/berisi agar premium
        color: '#334155'
      }}
      tagsStyles={{
        // Pastikan tag-tag pembentuk paragraf patuh pada aturan rata kiri
        p: { textAlign: 'left', marginBottom: 14 },
        div: { textAlign: 'left' },
        span: { textAlign: 'left' }
      }}
      source={{ html: cleanAndFixHtml(htmlContent) }}
    />
  );
}
```

### Kesimpulan
Dengan mengubah `&nbsp;` menjadi spasi biasa, memblokir fitur *justify*, dan mengintegrasikan font *sans-serif*, Anda mengizinkan React Native untuk secara alami memenggal teks berdasarkan kata utuh, bukan berdasarkan batasan piksel mentah. Selamat mencoba di proyek Anda yang lain! 🚀
