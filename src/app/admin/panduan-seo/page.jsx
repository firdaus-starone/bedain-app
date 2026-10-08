"use client";
import React from 'react';
import { BookOpen, CheckCircle, AlertTriangle, TrendingUp, Search, Type, Image as ImageIcon, Link as LinkIcon, Edit3 } from 'lucide-react';

export default function PanduanSEO() {
  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', color: 'var(--admin-text-primary)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid var(--admin-border)' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <BookOpen size={32} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Buku Saku SEO Jurnalis</h1>
          <p style={{ margin: 0, color: 'var(--admin-text-secondary)', fontSize: '0.95rem', maxWidth: '600px', lineHeight: 1.5 }}>
            Panduan rahasia standar penulisan redaksi Bedain News agar artikel cepat terindeks oleh Google dan menembus halaman pertama Google News (E-E-A-T).
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* Modul 1 */}
        <div className="seo-card" style={cardStyle}>
          <div style={cardHeaderStyle}>
            <Type size={20} color="#3b82f6" />
            <h2 style={cardTitleStyle}>1. Judul (Headline) & Paragraf Pertama</h2>
          </div>
          <div style={cardBodyStyle}>
            <ul style={listStyle}>
              <li><strong>Panjang Judul Ideal:</strong> Maksimal 60 karakter agar tidak terpotong (titik-titik) di hasil pencarian Google.</li>
              <li><strong>Keyword di Depan:</strong> Taruh kata kunci utama di bagian awal judul. <em>(Contoh: "Kecelakaan Tol Cipularang, Korban Dievakuasi")</em></li>
              <li><strong>Clickbait Positif:</strong> Boleh memancing rasa penasaran, tapi <strong>haram</strong> menipu isi berita. Google News sangat membenci clickbait palsu.</li>
              <li><strong>Hukum 5W+1H:</strong> Paragraf pertama (atau ringkasan/excerpt) wajib menjawab <em>Siapa, Apa, Kapan, di Mana</em> agar robot Google langsung tahu konteks beritanya.</li>
            </ul>
          </div>
        </div>

        {/* Modul 2 */}
        <div className="seo-card" style={cardStyle}>
          <div style={cardHeaderStyle}>
            <Edit3 size={20} color="#10b981" />
            <h2 style={cardTitleStyle}>2. Struktur & Format Konten</h2>
          </div>
          <div style={cardBodyStyle}>
            <ul style={listStyle}>
              <li><strong>Gunakan Sub-judul (H2 / H3):</strong> Jangan membuat paragraf yang terlalu panjang menjuntai. Pecah dengan Sub-judul (Heading 2) agar mata pembaca dan robot Google mudah melakukan <em>scanning</em> topik.</li>
              <li><strong>Paragraf Pendek:</strong> Maksimal 3-4 kalimat per paragraf. Pembaca di HP sangat tidak suka paragraf yang "tebal" seperti buku pelajaran.</li>
              <li><strong>Bullet Points:</strong> Gunakan format daftar (seperti ini) jika menjelaskan poin-poin. Google sangat menyukai konten terstruktur (Listicle).</li>
            </ul>
          </div>
        </div>

        {/* Modul 3 */}
        <div className="seo-card" style={cardStyle}>
          <div style={cardHeaderStyle}>
            <ImageIcon size={20} color="#f59e0b" />
            <h2 style={cardTitleStyle}>3. Optimasi Media & Gambar</h2>
          </div>
          <div style={cardBodyStyle}>
            <ul style={listStyle}>
              <li><strong>Wajib Ada Gambar Unggulan (Thumbnail):</strong> Beresolusi tinggi, tajam, dan relevan dengan isi berita. Resolusi minimal disarankan 1200x630 pixel untuk standar Google Discover.</li>
              <li><strong>Deskripsi Gambar (Alt Text):</strong> Jika memungkinkan, selalu berikan deskripsi/caption pada gambar. Robot Google itu buta, mereka "membaca" gambar dari teks caption.</li>
              <li><strong>Hindari Gambar Blur/Watermark Web Lain:</strong> Google News memprioritaskan situs dengan aset gambar milik sendiri atau yang bersih dari watermark situs pesaing.</li>
            </ul>
          </div>
        </div>

        {/* Modul 4 */}
        <div className="seo-card" style={cardStyle}>
          <div style={cardHeaderStyle}>
            <Search size={20} color="#8b5cf6" />
            <h2 style={cardTitleStyle}>4. Prinsip E-E-A-T (Sangat Krusial!)</h2>
          </div>
          <div style={cardBodyStyle}>
            <p style={{ fontSize: '0.9rem', color: 'var(--admin-text-secondary)', marginBottom: '12px' }}>
              Google News menilai situs berita dari <strong>Experience, Expertise, Authoritativeness, & Trustworthiness</strong>.
            </p>
            <ul style={listStyle}>
              <li><strong>Byline Penulis (Author):</strong> Jangan pernah mem-publish artikel dengan nama "Admin" atau "Redaksi" (kecuali Press Release). Gunakan nama asli penulis.</li>
              <li><strong>Cantumkan Sumber:</strong> Jika mengutip pernyataan dari wawancara, sebutkan jabatannya. Jika mengutip dari situs lain, cantumkan sumbernya. Kepercayaan (Trust) adalah nomor satu.</li>
              <li><strong>Orisinalitas:</strong> <em>Plagiarisme adalah dosa besar.</em> Jangan melakukan copy-paste 100%. Tulis ulang dengan gaya bahasa khas Bedain News.</li>
            </ul>
          </div>
        </div>

        {/* Modul 5 */}
        <div className="seo-card" style={cardStyle}>
          <div style={cardHeaderStyle}>
            <LinkIcon size={20} color="#ec4899" />
            <h2 style={cardTitleStyle}>5. Internal Linking (Jaring Laba-laba)</h2>
          </div>
          <div style={cardBodyStyle}>
            <ul style={listStyle}>
              <li><strong>Tautkan Berita Terkait:</strong> Selalu sempatkan menyisipkan 1-2 link ke artikel Bedain News lain yang masih nyambung (Bisa berupa teks "Baca Juga: ...").</li>
              <li><strong>Fungsinya:</strong> Membuat pembaca berlama-lama di website kita (menurunkan <em>Bounce Rate</em>) dan membantu robot Google merayapi halaman lama yang mulai tenggelam.</li>
              <li><strong>Hyperlink Natural:</strong> Berikan link pada kata yang relevan, jangan cuma sekadar menaruh link tanpa konteks.</li>
            </ul>
          </div>
        </div>

      </div>

      <div style={{ marginTop: '32px', padding: '24px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <CheckCircle size={28} color="#3b82f6" style={{ flexShrink: 0, marginTop: '4px' }} />
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#3b82f6' }}>Komitmen Kualitas Jurnalisme</h3>
          <p style={{ margin: 0, color: 'var(--admin-text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Kecepatan memang penting dalam jurnalisme online, tapi <strong>kualitas dan akurasi tidak boleh dikorbankan</strong>. Berita yang akurat, enak dibaca, dan mematuhi kaidah SEO di atas akan dengan sendirinya direkomendasikan oleh algoritma Google kepada jutaan pembaca di luar sana. Selamat menulis, Jurnalis! ✍️🔥
          </p>
        </div>
      </div>

    </div>
  );
}

// Styling Objects for clean code
const cardStyle = {
  background: 'var(--admin-card-bg)',
  border: '1px solid var(--admin-border)',
  borderRadius: '16px',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  transition: 'transform 0.2s',
};

const cardHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '16px 20px',
  borderBottom: '1px solid var(--admin-border)',
  background: 'rgba(0,0,0,0.02)',
};

const cardTitleStyle = {
  fontSize: '1.05rem',
  fontWeight: 700,
  margin: 0,
  letterSpacing: '-0.2px',
};

const cardBodyStyle = {
  padding: '20px',
  flex: 1,
};

const listStyle = {
  margin: 0,
  paddingLeft: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  color: 'var(--admin-text-secondary)',
  fontSize: '0.9rem',
  lineHeight: 1.6,
};
