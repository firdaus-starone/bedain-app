import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { uploadAndCompressImage } from '../lib/uploadImage';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { 
  PenTool, User, Mail, Phone, Briefcase, FileText, Image as ImageIcon, 
  CheckCircle2, AlertCircle, Send, Sparkles, Eye, Edit3, ArrowLeft,
  ShieldCheck, HelpCircle, Tag
} from 'lucide-react';

const CATEGORIES = [
  'Opini',
  'Suara Warga',
  'Edukasi & Kampus',
  'Puisi & Sastra',
  'Cerita Inspiratif',
  'Teknologi & Digital',
  'Ekonomi & UMKM',
  'Budaya & Wisata',
  'Lingkungan & Sosial'
];

export default function SubmitArticle() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('write'); // 'write' or 'preview'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form States
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [authorPhone, setAuthorPhone] = useState('');
  const [authorBio, setAuthorBio] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Opini');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [agreedToEthics, setAgreedToEthics] = useState(false);

  // Auto-Save States
  const [draftRestored, setDraftRestored] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);

  // Load Draft from LocalStorage on Mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('bedainapp_submission_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && (parsed.title || parsed.content || parsed.authorName)) {
          if (parsed.authorName) setAuthorName(parsed.authorName);
          if (parsed.authorEmail) setAuthorEmail(parsed.authorEmail);
          if (parsed.authorPhone) setAuthorPhone(parsed.authorPhone);
          if (parsed.authorBio) setAuthorBio(parsed.authorBio);
          if (parsed.title) setTitle(parsed.title);
          if (parsed.category) setCategory(parsed.category);
          if (parsed.excerpt) setExcerpt(parsed.excerpt);
          if (parsed.content) setContent(parsed.content);
          if (parsed.agreedToEthics) setAgreedToEthics(parsed.agreedToEthics);
          setDraftRestored(true);
          setLastSavedTime(parsed.savedAt ? new Date(parsed.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Baru saja');
        }
      }
    } catch (err) {
      console.error('Gagal memuat draft:', err);
    }
  }, []);

  // Auto-Save Draft to LocalStorage whenever form fields change
  useEffect(() => {
    if (!authorName && !authorEmail && !title && !content && !excerpt) return;
    
    try {
      const draftData = {
        authorName,
        authorEmail,
        authorPhone,
        authorBio,
        title,
        category,
        excerpt,
        content,
        agreedToEthics,
        savedAt: Date.now()
      };
      localStorage.setItem('bedainapp_submission_draft', JSON.stringify(draftData));
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Gagal menyimpan draft:', err);
    }
  }, [authorName, authorEmail, authorPhone, authorBio, title, category, excerpt, content, agreedToEthics]);

  const clearDraft = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus draft tulisan ini dan mulai dari awal?')) {
      localStorage.removeItem('bedainapp_submission_draft');
      setAuthorName('');
      setAuthorEmail('');
      setAuthorPhone('');
      setAuthorBio('');
      setTitle('');
      setCategory('Opini');
      setExcerpt('');
      setContent('');
      setCoverFile(null);
      setCoverPreview('');
      setAgreedToEthics(false);
      setDraftRestored(false);
      setLastSavedTime(null);
    }
  };

  // Handle Cover Selection
  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran gambar maksimal 5MB. Silakan pilih gambar yang lebih kecil.');
      return;
    }

    setCoverFile(file);
    const objectUrl = URL.createObjectURL(file);
    setCoverPreview(objectUrl);
  };

  // Insert formatting tokens
  const insertFormatting = (syntaxStart, syntaxEnd = '') => {
    const textarea = document.getElementById('article-content-input');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    const replacement = `${syntaxStart}${selected || 'teks di sini'}${syntaxEnd}`;
    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + syntaxStart.length, start + replacement.length - syntaxEnd.length);
    }, 10);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!authorName.trim() || !authorEmail.trim() || !title.trim() || !content.trim()) {
      setErrorMsg('Harap lengkapi Nama Lengkap, Email, Judul, dan Isi Tulisan.');
      return;
    }

    if (!agreedToEthics) {
      setErrorMsg('Anda wajib menyetujui pernyataan kode etik & keaslian karya sebelum mengirim.');
      return;
    }

    if (content.trim().length < 150) {
      setErrorMsg('Isi tulisan terlalu pendek. Minimal 150 karakter agar layak muat.');
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedImageUrl = '';
      if (coverFile) {
        uploadedImageUrl = await uploadAndCompressImage(coverFile, 'submissions/images');
      }

      const submissionData = {
        authorName: authorName.trim(),
        authorEmail: authorEmail.trim(),
        authorPhone: authorPhone.trim(),
        authorBio: authorBio.trim() || 'Kontributor Bedain News',
        authorAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName.trim())}&background=E62020&color=fff&size=128`,
        title: title.trim(),
        category,
        excerpt: excerpt.trim() || content.trim().substring(0, 160) + '...',
        content: content.trim(),
        imageUrl: uploadedImageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80',
        status: 'pending', // Menunggu Moderasi
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'user_submissions'), submissionData);
      try { localStorage.removeItem('bedainapp_submission_draft'); } catch (e) {}
      setSubmitSuccess(true);
      setDraftRestored(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Gagal mengirim tulisan:', err);
      setErrorMsg('Terjadi kesalahan saat mengunggah tulisan. Silakan coba kembali sesaat lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#0f0f12', minHeight: '100vh', color: '#e4e4e7', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main className="submit-article-main" style={{ flex: 1, padding: '2rem 0 4rem', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        
        {/* Hero Banner */}
        <div className="submit-article-box" style={{
          background: 'linear-gradient(135deg, rgba(230, 32, 32, 0.15) 0%, rgba(18, 18, 20, 0.9) 100%)',
          border: '1px solid rgba(230, 32, 32, 0.3)',
          borderRadius: '16px',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          marginBottom: '2.5rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: -30, right: -30,
            width: '120px', height: '120px',
            background: 'radial-gradient(circle, rgba(230,32,32,0.2) 0%, rgba(0,0,0,0) 70%)',
            borderRadius: '50%', filter: 'blur(20px)'
          }} />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(230, 32, 32, 0.2)', color: '#ff4d4d', padding: '0.4rem 1rem', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', border: '1px solid rgba(230,32,32,0.4)' }}>
            <Sparkles size={16} />
            <span>Suara Warga & Jurnalisme Warga</span>
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', margin: '0 0 1rem', lineHeight: 1.2 }}>
            Kirim Tulisan ke <span style={{ color: '#E62020' }}>Bedain News</span>
          </h1>
          <p style={{ color: '#a1a1aa', fontSize: '1.05rem', maxWidth: '680px', margin: '0 auto', lineHeight: 1.6 }}>
            Jadilah bagian dari perubahan informasi! Kirimkan opini, reportase warga, puisi, tips edukatif, atau cerita inspiratifmu. Tulisan terpilih akan ditayangkan di beranda dan dibaca ribuan masyarakat luas.
          </p>
        </div>

        {/* Success Screen */}
        {submitSuccess ? (
          <div className="submit-article-box" style={{
            backgroundColor: '#18181b',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            borderRadius: '16px',
            padding: '3rem 2rem',
            textAlign: 'center',
            boxShadow: '0 15px 35px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              width: '80px', height: '80px',
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              color: '#22c55e',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
              border: '2px solid rgba(34, 197, 94, 0.4)'
            }}>
              <CheckCircle2 size={44} />
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>
              Tulisan Berhasil Dikirim! 🎉
            </h2>
            <p style={{ color: '#a1a1aa', fontSize: '1.05rem', maxWidth: '550px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
              Terima kasih <strong style={{ color: '#fff' }}>{authorName}</strong>, karya Anda berjudul <strong style={{ color: '#22c55e' }}>"{title}"</strong> telah masuk ke antrean redaksi Bedain News.
            </p>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '1.25rem',
              maxWidth: '500px',
              margin: '0 auto 2rem',
              textAlign: 'left',
              fontSize: '0.9rem',
              color: '#d4d4d8'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fbbf24', fontWeight: 600, marginBottom: '0.5rem' }}>
                <AlertCircle size={18} />
                <span>Tahap Selanjutnya:</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.4rem', lineHeight: 1.7, color: '#a1a1aa' }}>
                <li>Tim redaksi akan meninjau kelayakan & menyunting tata bahasa dalam waktu <strong style={{ color: '#fff' }}>1x24 jam</strong>.</li>
                <li>Setelah lolos kurasi, artikel akan langsung tayang di kategori <strong style={{ color: '#fff' }}>{category}</strong> dengan menyertakan nama & bio Anda.</li>
              </ul>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  try { localStorage.removeItem('bedainapp_submission_draft'); } catch (e) {}
                  setSubmitSuccess(false);
                  setTitle('');
                  setExcerpt('');
                  setContent('');
                  setCoverFile(null);
                  setCoverPreview('');
                  setAgreedToEthics(false);
                  setDraftRestored(false);
                  setLastSavedTime(null);
                }}
                style={{
                  backgroundColor: '#E62020',
                  color: '#fff',
                  border: 'none',
                  padding: '0.85rem 1.75rem',
                  borderRadius: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  transition: 'all 0.2s'
                }}
              >
                <PenTool size={18} />
                <span>Kirim Tulisan Lainnya</span>
              </button>
              <button
                onClick={() => router.push('/')}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  padding: '0.85rem 1.75rem',
                  borderRadius: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  transition: 'all 0.2s'
                }}
              >
                <ArrowLeft size={18} />
                <span>Kembali ke Beranda</span>
              </button>
            </div>
          </div>
        ) : (
          /* Submission Form */
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Error Banner */}
            {errorMsg && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                color: '#f87171',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                fontSize: '0.95rem'
              }}>
                <AlertCircle size={22} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Auto-Save Draft Indicator Banner */}
            {(draftRestored || lastSavedTime) && (authorName || title || content || excerpt) && (
              <div style={{
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.35)',
                borderRadius: '12px',
                padding: '0.9rem 1.25rem',
                color: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                fontSize: '0.88rem',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: '1 1 280px' }}>
                  <CheckCircle2 size={20} style={{ flexShrink: 0, color: '#22c55e' }} />
                  <span style={{ lineHeight: 1.5, color: '#d4d4d8' }}>
                    <strong style={{ color: '#fff' }}>Penyimpanan Otomatis Aktif</strong> — Draft tulisan Anda disimpan di memori perangkat ({lastSavedTime ? `jam ${lastSavedTime}` : 'aman'}). Jika Anda menutup aplikasi atau merefresh layar HP, tulisan tidak akan hilang!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={clearDraft}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  🗑️ Hapus Draft & Mulai Baru
                </button>
              </div>
            )}

            {/* SECTION 1: Author Identity */}
            <div className="submit-article-box" style={{
              backgroundColor: '#18181b',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <User size={20} color="#E62020" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0 }}>1. Identitas Penulis / Kontributor</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#d4d4d8', marginBottom: '0.5rem' }}>
                    Nama Lengkap / Nama Pena <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
                    <input
                      type="text"
                      placeholder="Contoh: Ahmad Fauzi"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.85rem 1rem 0.85rem 2.8rem',
                        backgroundColor: '#0f0f12',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#d4d4d8', marginBottom: '0.5rem' }}>
                    Alamat Email Aktif <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
                    <input
                      type="email"
                      placeholder="fauzi@gmail.com"
                      value={authorEmail}
                      onChange={(e) => setAuthorEmail(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.85rem 1rem 0.85rem 2.8rem',
                        backgroundColor: '#0f0f12',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#d4d4d8', marginBottom: '0.5rem' }}>
                    No. WhatsApp / Telepon <span style={{ color: '#71717a', fontWeight: 400 }}>(Opsional untuk konfirmasi)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
                    <input
                      type="tel"
                      placeholder="081234567890"
                      value={authorPhone}
                      onChange={(e) => setAuthorPhone(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.85rem 1rem 0.85rem 2.8rem',
                        backgroundColor: '#0f0f12',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#d4d4d8', marginBottom: '0.5rem' }}>
                    Profesi / Bio Singkat <span style={{ color: '#71717a', fontWeight: 400 }}>(Ditampilkan di artikel)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Briefcase size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
                    <input
                      type="text"
                      placeholder="Contoh: Mahasiswa Hukum / Pegiat Literasi / Guru"
                      value={authorBio}
                      onChange={(e) => setAuthorBio(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.85rem 1rem 0.85rem 2.8rem',
                        backgroundColor: '#0f0f12',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Article Details */}
            <div className="submit-article-box" style={{
              backgroundColor: '#18181b',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <FileText size={20} color="#E62020" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0 }}>2. Detail Artikel & Isi Tulisan</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#d4d4d8', marginBottom: '0.5rem' }}>
                    Judul Tulisan <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Buat judul yang menarik dan mencerminkan isi tulisan..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem',
                      backgroundColor: '#0f0f12',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '1.05rem',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#d4d4d8', marginBottom: '0.5rem' }}>
                      Kategori Pilihan <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Tag size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.85rem 1rem 0.85rem 2.8rem',
                          backgroundColor: '#0f0f12',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '10px',
                          color: '#fff',
                          fontSize: '0.95rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                          cursor: 'pointer'
                        }}
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat} style={{ backgroundColor: '#18181b', color: '#fff' }}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#d4d4d8', marginBottom: '0.5rem' }}>
                      Ringkasan Singkat / Excerpt <span style={{ color: '#71717a', fontWeight: 400 }}>(Opsional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="1-2 kalimat rangkuman untuk tampilan kartu beranda..."
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.85rem 1rem',
                        backgroundColor: '#0f0f12',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Cover Image Upload */}
              <div style={{ marginBottom: '1.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#d4d4d8', marginBottom: '0.5rem' }}>
                  Foto Utama / Sampul Tulisan <span style={{ color: '#71717a', fontWeight: 400 }}>(Maksimal 5MB - format JPG/PNG/WebP)</span>
                </label>
                
                <div style={{
                  border: '2px dashed rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  padding: coverPreview ? '1rem' : '2rem',
                  textAlign: 'center',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}>
                  {coverPreview ? (
                    <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', maxHeight: '350px' }}>
                      <img src={coverPreview} alt="Preview Sampul" style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                        <label style={{
                          backgroundColor: '#E62020', color: '#fff', padding: '0.5rem 1rem',
                          borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                        }}>
                          Ganti Foto
                          <input type="file" accept="image/*" onChange={handleCoverChange} style={{ display: 'none' }} />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(230,32,32,0.1)', color: '#E62020', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                        <ImageIcon size={28} />
                      </div>
                      <p style={{ color: '#fff', fontWeight: 600, margin: '0 0 0.4rem', fontSize: '1rem' }}>
                        Klik untuk memilih atau unggah foto sampul
                      </p>
                      <p style={{ color: '#71717a', fontSize: '0.85rem', margin: '0 0 1.25rem' }}>
                        Foto yang jernih dan menarik meningkatkan pembaca secara drastis
                      </p>
                      <label style={{
                        backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff', padding: '0.6rem 1.25rem',
                        borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.15)', display: 'inline-block'
                      }}>
                        Pilih File Gambar
                        <input type="file" accept="image/*" onChange={handleCoverChange} style={{ display: 'none' }} />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Rich Text Editor / Area with Live Preview */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#d4d4d8' }}>
                    Isi Tulisan <span style={{ color: '#ef4444' }}>*</span> <span style={{ color: '#71717a', fontWeight: 400 }}>({content.length} karakter)</span>
                  </label>

                  {/* Mode Selector */}
                  <div style={{ display: 'flex', backgroundColor: '#0f0f12', padding: '0.2rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab('write')}
                      style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: activeTab === 'write' ? '#E62020' : 'transparent',
                        color: activeTab === 'write' ? '#fff' : '#a1a1aa',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.4rem'
                      }}
                    >
                      <Edit3 size={14} />
                      <span>Tulis</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: activeTab === 'preview' ? '#E62020' : 'transparent',
                        color: activeTab === 'preview' ? '#fff' : '#a1a1aa',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.4rem'
                      }}
                    >
                      <Eye size={14} />
                      <span>Pratinjau (Preview)</span>
                    </button>
                  </div>
                </div>

                {activeTab === 'write' ? (
                  <div>
                    {/* Formatting Toolbar */}
                    <div style={{
                      display: 'flex', gap: '0.5rem', backgroundColor: '#0f0f12',
                      padding: '0.6rem 0.85rem', borderRadius: '10px 10px 0 0',
                      border: '1px solid rgba(255,255,255,0.12)', borderBottom: 'none',
                      flexWrap: 'wrap'
                    }}>
                      <button type="button" onClick={() => insertFormatting('**', '**')} style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                        Tebal
                      </button>
                      <button type="button" onClick={() => insertFormatting('*', '*')} style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.8rem', fontStyle: 'italic', cursor: 'pointer' }}>
                        Miring
                      </button>
                      <button type="button" onClick={() => insertFormatting('## ')} style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                        Subjudul (H2)
                      </button>
                      <button type="button" onClick={() => insertFormatting('> ')} style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                        Kutipan
                      </button>
                      <button type="button" onClick={() => insertFormatting('\n- ')} style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                        Daftar Poin
                      </button>
                    </div>

                    <textarea
                      id="article-content-input"
                      rows="14"
                      placeholder="Tuliskan isi artikel atau ceritamu di sini... Gunakan enter 2 kali untuk membuat paragraf baru yang rapi."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '1rem',
                        backgroundColor: '#0f0f12',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '0 0 10px 10px',
                        color: '#fff',
                        fontSize: '1rem',
                        lineHeight: 1.7,
                        outline: 'none',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                ) : (
                  /* Preview Mode */
                  <div style={{
                    backgroundColor: '#0f0f12',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    padding: '1.5rem',
                    minHeight: '300px'
                  }}>
                    {title && <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', lineHeight: 1.3 }}>{title}</h1>}
                    {authorName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#a1a1aa', fontSize: '0.88rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.8rem' }}>
                        <span>Oleh <strong style={{ color: '#fff' }}>{authorName}</strong></span>
                        <span>•</span>
                        <span style={{ color: '#E62020' }}>{category}</span>
                      </div>
                    )}
                    {content ? (
                      <div style={{ color: '#e4e4e7', lineHeight: 1.8, fontSize: '1.02rem', whiteSpace: 'pre-wrap' }}>
                        {content}
                      </div>
                    ) : (
                      <p style={{ color: '#71717a', fontStyle: 'italic' }}>Belum ada teks tulisan untuk ditampilkan pratinjau...</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 3: Ethics Statement & Submit CTA */}
            <div className="submit-article-box" style={{
              backgroundColor: '#18181b',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <ShieldCheck size={20} color="#22c55e" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0 }}>3. Pernyataan Keaslian & Kode Etik</h2>
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <input
                  type="checkbox"
                  checked={agreedToEthics}
                  onChange={(e) => setAgreedToEthics(e.target.checked)}
                  style={{ width: '20px', height: '20px', marginTop: '0.15rem', accentColor: '#E62020', cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ fontSize: '0.92rem', color: '#d4d4d8', lineHeight: 1.6 }}>
                  Saya menyatakan bahwa tulisan ini adalah <strong style={{ color: '#fff' }}>karya asli saya</strong> (bukan hasil plagiarisme atau AI murni tanpa penyuntingan), tidak mengandung unsur SARA/hoaks, dan menyetujui hak redaksi <strong style={{ color: '#fff' }}>Bedain News</strong> untuk menyunting judul atau tata bahasa sebelum ditayangkan.
                </span>
              </label>

              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: isSubmitting ? '#991b1b' : '#E62020',
                    color: '#fff',
                    border: 'none',
                    padding: '1rem 2.5rem',
                    borderRadius: '12px',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.65rem',
                    boxShadow: '0 8px 25px rgba(230, 32, 32, 0.4)',
                    transition: 'all 0.2s',
                    width: '100%',
                    justifyContent: 'center'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '3px' }}></div>
                      <span>Mengunggah Karya Anda...</span>
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      <span>Kirim Tulisan Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </form>
        )}

      </main>

      <Footer />
    </div>
  );
}
