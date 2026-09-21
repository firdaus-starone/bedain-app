"use client";
import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, HelpCircle, ThumbsUp, ThumbsDown, Check, Sparkles, Mail, MessageSquare, BookOpen, ShieldAlert, PenTool } from 'lucide-react';

const faqData = [
  // Kategori 1: Fitur AI & Baca
  {
    id: 'ai-summary',
    category: '📖 Fitur AI & Baca',
    question: 'Apa itu Ringkasan AI BEDAIN dan bagaimana cara kerjanya?',
    answer: `<strong>Ringkasan AI BEDAIN</strong> adalah teknologi kecerdasan buatan eksklusif kami yang menganalisis dan merangkum poin-poin inti dari sebuah liputan berita secara instan. 
    <br/><br/>
    Fitur ini dirancang khusus untuk memberikan pemahaman cepat dan akurat kepada pembaca dengan mobilitas tinggi, tanpa mengurangi substansi atau fakta penting dari artikel lengkapnya. Ringkasan AI ini berada di dalam kotak bergradien ungu di bagian atas artikel.`
  },
  {
    id: 'ai-audio',
    category: '📖 Fitur AI & Baca',
    question: 'Bagaimana cara mendengarkan artikel berformat suara (Text-to-Speech / Podcast AI)?',
    answer: `Di setiap halaman artikel, Anda dapat menemukan kotak interaktif <strong>"Dengarkan Berita AI"</strong>. 
    <br/><br/>
    <ul>
      <li>Klik tombol <strong>"Putar Suara"</strong> untuk mendengarkan narator AI membacakan seluruh isi berita layaknya siaran <em>podcast</em>.</li>
      <li>Anda dapat mengubah kecepatan narasi mulai dari <strong>0.8x hingga 1.5x</strong> sesuai kenyamanan Anda.</li>
      <li>Pilihan karakter suara narator (pria/wanita berbahasa Indonesia) juga dapat dipilih melalui menu <em>dropdown Suara</em>.</li>
    </ul>`
  },
  {
    id: 'theme-font',
    category: '📖 Fitur AI & Baca',
    question: 'Bagaimana cara mengubah ukuran teks (Aa) dan mode tampilan Gelap/Terang (Dark Mode)?',
    answer: `BEDAIN NEWS mengutamakan kenyamanan visual Anda saat membaca:
    <br/><br/>
    <ul>
      <li><strong>Ukuran Font (Aa):</strong> Tekan tombol <strong>Aa</strong> pada bilah aksi (di bawah judul artikel) untuk memperbesar atau memperkecil huruf menjadi Normal, Besar (Large), atau Sangat Besar (X-Large).</li>
      <li><strong>Mode Gelap / Terang:</strong> Klik ikon matahari/bulan (☀️/🌙) di menu navigasi utama bagian atas untuk beralih antara tema gelap yang nyaman di malam hari dan tema terang yang bersih.</li>
    </ul>`
  },
  {
    id: 'auto-typography',
    category: '📖 Fitur AI & Baca',
    question: 'Apa yang dimaksud dengan fitur Auto-Typography & Garis Aksen pada judul berita?',
    answer: `Sistem redaksi BEDAIN NEWS dilengkapi dengan pemformatan tipografi pintar. Setiap kali artikel dimuat atau disusun, sistem secara otomatis mengenali subjudul paragraf, memberikan garis aksen gradien di sebelah kiri, dan mendaftarkannya ke dalam widget <strong>Daftar Isi</strong> di panel samping kiri, sehingga Anda dapat dengan mudah melompat ke bagian topik yang diinginkan.`
  },

  // Kategori 2: Kontribusi Warga
  {
    id: 'citizen-submit',
    category: '✍️ Kontribusi & Jurnalisme',
    question: 'Siapa saja yang boleh mengirimkan tulisan atau reportase warga ke BEDAIN NEWS?',
    answer: `Kami membuka ruang seluas-luasnya bagi jurnalis warga (*citizen journalist*), akademisi, mahasiswa, peneliti, pengamat, maupun pembaca setia yang ingin menyuarakan opini, analisis, atau reportase investigatif.
    <br/><br/>
    Cukup klik tombol <strong>"✍️ Kirim Opini / Reportase Warga"</strong> yang terdapat di menu atas atau bagian bawah website, lalu lengkapi formulir pengiriman tulisan beserta gambar pendukung.`
  },
  {
    id: 'citizen-moderation',
    category: '✍️ Kontribusi & Jurnalisme',
    question: 'Bagaimana alur moderasi karya tulisan warga dan berapa lama prosesnya?',
    answer: `Setiap kiriman tulisan akan melalui proses kurasi dan verifikasi oleh Dewan Redaksi BEDAIN NEWS maksimal <strong>1x24 jam</strong> sejak dikirimkan.
    <br/><br/>
    Tim redaksi akan memeriksa akurasi fakta, tata bahasa, dan kepatuhan terhadap <em>Kode Etik Jurnalistik</em> serta <em>Pedoman Pemberitaan Media Siber</em>. Jika lolos kurasi, artikel akan langsung diterbitkan dengan mencantumkan nama dan profil Anda sebagai kontributor resmi.`
  },
  {
    id: 'citizen-copyright',
    category: '✍️ Kontribusi & Jurnalisme',
    question: 'Apakah ada pedoman khusus terkait gambar sampul dan hak cipta tulisan warga?',
    answer: `Penulis bertanggung jawab penuh atas keaslian (*originality*) karya tulisan dan bebas dari unsur plagiasi, hoaks, SARA, serta pencemaran nama baik. Gambar sampul (*cover image*) yang diunggah disarankan berformat resolusi tinggi (16:9) dan tidak melanggar hak cipta pihak ketiga.`
  },

  // Kategori 3: Interaksi & Komentar
  {
    id: 'comment-moderation',
    category: '💬 Interaksi & Komentar',
    question: 'Mengapa komentar yang saya tulis tidak langsung muncul di bawah artikel?',
    answer: `Untuk menciptakan ruang diskusi publik yang sehat, bermartabat, dan bebas dari spam maupun ujaran kebencian, BEDAIN NEWS menerapkan sistem moderasi komentar berlapis.
    <br/><br/>
    Komentar yang Anda kirim berstatus <em>Pending</em> (menunggu persetujuan) dan akan ditampilkan secara publik segera setelah diverifikasi oleh tim redaksi kami.`
  },
  {
    id: 'reader-reaction',
    category: '💬 Interaksi & Komentar',
    question: 'Apa fungsi fitur "Respons Pembaca" (Suka, Bermanfaat, Memukau, Inspiratif)?',
    answer: `Fitur jajak pendapat mikro di akhir setiap berita memungkinkan pembaca mengekspresikan penilaian serta reaksi emosional secara cepat terhadap liputan yang dibaca. Data statistik persentase respons diperbarui secara <em>real-time</em> untuk memperlihatkan sentimen publik terhadap topik tersebut.`
  },

  // Kategori 4: Redaksi & Privasi
  {
    id: 'editorial-correction',
    category: '🏢 Redaksi & Privasi',
    question: 'Bagaimana prosedur pengajuan ralat, koreksi berita, atau Hak Jawab?',
    answer: `Sesuai Undang-Undang Pers No. 40 Tahun 1999 dan Kode Etik Jurnalistik, BEDAIN NEWS menjamin Hak Jawab dan Hak Koreksi bagi masyarakat atau pihak yang terkait dengan pemberitaan.
    <br/><br/>
    Pengajuan ralat atau klarifikasi resmi dapat disampaikan melalui email ke <strong>redaksi@bedainnews.com</strong> dengan mencantumkan tautan (*link*) artikel yang dimaksud serta lampiran bukti pendukung yang relevan.`
  },
  {
    id: 'privacy-security',
    category: '🏢 Redaksi & Privasi',
    question: 'Bagaimana BEDAIN NEWS menjaga keamanan data pribadi dan aktivitas membaca saya?',
    answer: `Privasi Anda adalah prioritas utama kami. Seluruh koneksi ke website BEDAIN NEWS dilindungi oleh enkripsi SSL/HTTPS standar perbankan. Kami tidak pernah menjual atau membagikan data riwayat kunjungan maupun informasi akun Anda kepada pihak ketiga mana pun tanpa izin resmi Anda. Selengkapnya dapat dibaca pada halaman <strong>Kebijakan Privasi</strong>.`
  },
  {
    id: 'partnership-ads',
    category: '🏢 Redaksi & Privasi',
    question: 'Bagaimana cara menjalin kerja sama media partner, iklan, atau peliputan khusus?',
    answer: `Untuk keperluan penempatan iklan digital (*banner advertising*), kerja sama media partner (*media partnership*), liputan eksklusif, maupun kemitraan bisnis lainnya, silakan menghubungi Divisi Komersial & Kerja Sama BEDAIN NEWS melalui kontak WhatsApp resmi atau email ke <strong>info@bedainnews.com</strong>.`
  }
];

const categoriesList = ['Semua', '📖 Fitur AI & Baca', '✍️ Kontribusi & Jurnalisme', '💬 Interaksi & Komentar', '🏢 Redaksi & Privasi'];

const FAQSection = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [openItems, setOpenItems] = useState({ 'ai-summary': true }); // default open first item
  const [feedbackGiven, setFeedbackGiven] = useState({});

  const toggleItem = (id) => {
    setOpenItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleFeedback = (id, isHelpful, e) => {
    e.stopPropagation();
    setFeedbackGiven(prev => ({
      ...prev,
      [id]: isHelpful ? 'helpful' : 'unhelpful'
    }));
  };

  const filteredFaq = faqData.filter(item => {
    const matchesCategory = selectedCategory === 'Semua' || item.category === selectedCategory;
    const matchesSearch = searchTerm.trim() === '' || 
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="faq-interactive-wrapper" style={{ width: '100%' }}>
      {/* Search Bar & Intro */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
        border: '1px solid var(--color-border)',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '32px',
        textAlign: 'center',
        boxShadow: '0 8px 24px rgba(0,0,0,0.04)'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(59, 130, 246, 0.12)',
          color: 'var(--color-accent)',
          padding: '6px 16px',
          borderRadius: '50px',
          fontSize: '13px',
          fontWeight: 700,
          marginBottom: '14px',
          letterSpacing: '0.5px'
        }}>
          <HelpCircle size={16} /> PUSAT BANTUAN & INFORMASI
        </div>
        <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.7rem)', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 10px 0', fontFamily: 'var(--font-heading)' }}>
          Bagaimana kami dapat membantu Anda hari ini?
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14.5px', maxWidth: '620px', margin: '0 auto 24px', lineHeight: 1.6 }}>
          Temukan jawaban atas pertanyaan umum terkait pembacaan berita, fitur teknologi AI, pengajuan opini jurnalisme warga, hingga kebijakan redaksi.
        </p>

        {/* Input Search */}
        <div style={{
          position: 'relative',
          maxWidth: '560px',
          margin: '0 auto'
        }}>
          <Search size={20} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
          <input
            type="text"
            placeholder="Cari pertanyaan (misal: audio AI, kirim berita, komentar...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '16px 20px 16px 50px',
              borderRadius: '50px',
              border: '2px solid var(--color-border)',
              background: 'var(--color-bg-primary)',
              color: 'var(--color-text-primary)',
              fontSize: '15px',
              fontWeight: 500,
              boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
              outline: 'none',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--color-accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '18px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'var(--color-bg-tertiary)',
                border: 'none',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-secondary)',
                fontSize: '12px',
                fontWeight: 700
              }}
              title="Hapus pencarian"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
        marginBottom: '28px',
        justifyContent: 'center'
      }}>
        {categoriesList.map(cat => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '10px 18px',
                borderRadius: '50px',
                border: isActive ? 'none' : '1px solid var(--color-border)',
                background: isActive ? 'linear-gradient(135deg, var(--color-accent), #6366f1)' : 'var(--color-bg-secondary)',
                color: isActive ? '#fff' : 'var(--color-text-primary)',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isActive ? '0 6px 16px rgba(59, 130, 246, 0.3)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Results Count & Empty State */}
      {filteredFaq.length === 0 ? (
        <div style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: '20px',
          padding: '60px 24px',
          textAlign: 'center',
          margin: '20px 0'
        }}>
          <HelpCircle size={48} color="var(--color-text-secondary)" style={{ opacity: 0.5, margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 8px 0' }}>
            Pertanyaan "{searchTerm}" tidak ditemukan
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.6 }}>
            Coba gunakan kata kunci lain yang lebih umum atau pilih kategori "Semua" di atas.
          </p>
          <button
            onClick={() => { setSearchTerm(''); setSelectedCategory('Semua'); }}
            style={{
              background: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '50px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Reset Pencarian
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredFaq.map((item) => {
            const isOpen = !!openItems[item.id];
            const feedback = feedbackGiven[item.id];

            return (
              <div
                key={item.id}
                style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderLeft: isOpen ? '4px solid var(--color-accent)' : '1px solid var(--color-border)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  transition: 'all 0.25s ease',
                  boxShadow: isOpen ? '0 10px 25px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.02)'
                }}
              >
                {/* Accordion Question Header */}
                <div
                  onClick={() => toggleItem(item.id)}
                  style={{
                    padding: '20px 24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      {item.category}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.45, fontFamily: 'var(--font-heading)' }}>
                      {item.question}
                    </h3>
                  </div>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: isOpen ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                    color: isOpen ? '#fff' : 'var(--color-text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.3s ease'
                  }}>
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Accordion Answer Content */}
                {isOpen && (
                  <div style={{
                    padding: '0 24px 24px 24px',
                    borderTop: '1px dashed var(--color-border)',
                    paddingTop: '20px',
                    color: 'var(--color-text-secondary)',
                    fontSize: '15px',
                    lineHeight: 1.8
                  }}>
                    <div dangerouslySetInnerHTML={{ __html: item.answer }} />

                    {/* Feedback Micro-Widget */}
                    <div style={{
                      marginTop: '24px',
                      paddingTop: '16px',
                      borderTop: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      fontSize: '13px'
                    }}>
                      {feedback ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 600 }}>
                          <Check size={16} /> Terima kasih atas masukan Anda! Kami terus menyempurnakan informasi ini.
                        </div>
                      ) : (
                        <>
                          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                            Apakah penjelasan ini membantu Anda?
                          </span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={(e) => handleFeedback(item.id, true, e)}
                              style={{
                                background: 'var(--color-bg-tertiary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '8px',
                                padding: '6px 14px',
                                color: 'var(--color-text-primary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12.5px',
                                transition: 'all 0.2s'
                              }}
                            >
                              <ThumbsUp size={14} color="#10b981" /> Ya, Membantu
                            </button>
                            <button
                              onClick={(e) => handleFeedback(item.id, false, e)}
                              style={{
                                background: 'var(--color-bg-tertiary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '8px',
                                padding: '6px 14px',
                                color: 'var(--color-text-primary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12.5px',
                                transition: 'all 0.2s'
                              }}
                            >
                              <ThumbsDown size={14} color="#ef4444" /> Kurang Jelas
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Need More Help / Contact Callout Box */}
      <div style={{
        marginTop: '48px',
        padding: '36px',
        background: 'linear-gradient(135deg, var(--color-bg-secondary) 0%, rgba(59, 130, 246, 0.05) 100%)',
        border: '1px solid var(--color-border)',
        borderRadius: '24px',
        textAlign: 'center',
        boxShadow: '0 12px 32px rgba(0,0,0,0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--color-accent), #ff5252)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)'
        }}>
          <MessageSquare size={26} />
        </div>
        <h3 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.45rem)', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 10px 0', fontFamily: 'var(--font-heading)' }}>
          Masih Memiliki Pertanyaan atau Butuh Bantuan Redaksi?
        </h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14.5px', maxWidth: '560px', margin: '0 auto 24px', lineHeight: 1.6 }}>
          Jika Anda tidak menemukan jawaban yang Anda cari di atas, atau ingin mengajukan kerja sama liputan, tim redaksi BEDAIN NEWS siap membantu Anda.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <a
            href="mailto:redaksi@bedainnews.com"
            style={{
              background: 'var(--color-accent)',
              color: '#fff',
              padding: '12px 26px',
              borderRadius: '50px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 6px 18px rgba(59, 130, 246, 0.3)',
              transition: 'transform 0.2s'
            }}
          >
            <Mail size={16} /> Email ke Redaksi
          </a>
          <a
            href="/kirim-tulisan"
            style={{
              background: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              padding: '12px 26px',
              borderRadius: '50px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background 0.2s'
            }}
          >
            <PenTool size={16} color="var(--color-accent)" /> Kirim Tulisan Warga
          </a>
        </div>
      </div>
    </div>
  );
};

export default FAQSection;
