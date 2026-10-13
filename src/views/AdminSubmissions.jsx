import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Inbox, CheckCircle2, XCircle, Clock, Eye, Trash2, Edit3, 
  Search, Mail, Phone, ArrowLeft
} from 'lucide-react';

export default function AdminSubmissions() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'approved', 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'user_submissions'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setSubmissions(data);
    } catch (err) {
      console.error('Gagal mengambil data kiriman tulisan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleOpenDetail = (sub) => {
    setSelectedSubmission(sub);
  };

  // Setujui kiriman dan masukkan sebagai DRAF ke koleksi 'articles' (Tetap tercatat di user_submissions)
  const handleApprove = async (sub) => {
    if (!window.confirm(`Setujui tulisan "${sub.title}" karya ${sub.authorName} dan masukkan ke Draf Berita?`)) return;

    setIsProcessing(true);
    try {
      const titleToUse = sub.title || 'Tanpa Judul';
      const categoryToUse = sub.category || 'Opini';
      const excerptToUse = sub.excerpt || (sub.content ? sub.content.substring(0, 160) + '...' : '');
      const contentToUse = sub.content || '';
      const bioToUse = sub.authorBio || 'Kontributor Bedain News';

      const finalSlug = titleToUse.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(2, 6);

      const articleData = {
        title: titleToUse,
        slug: finalSlug,
        category: categoryToUse,
        excerpt: excerptToUse,
        content: contentToUse,
        imageUrl: sub.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80',
        coverImage: sub.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80',
        imageCaption: `Foto kiriman: ${sub.authorName}`,
        status: 'draft', // DISIMPAN SEBAGAI DRAFT SESUAI ALUR REDAKSI
        isHeadline: false,
        seoTitle: titleToUse,
        seoDescription: excerptToUse,
        tags: [categoryToUse.toLowerCase(), 'kiriman warga', 'opini pembaca'],
        location: '',
        videoUrl: '',
        createdAt: Timestamp.now(),
        publishedAt: null, // Belum dipublish ke publik
        updatedAt: Timestamp.now(),
        authorId: 'contributor_' + sub.id,
        contributorName: sub.authorName,
        author: {
          name: sub.authorName,
          email: sub.authorEmail || '',
          bio: bioToUse,
          avatar: sub.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(sub.authorName)}&background=E62020&color=fff&size=128`,
          isContributor: true
        },
        views: 0,
        autoShareFacebook: false
      };

      // 1. Simpan ke koleksi articles sebagai DRAFT
      const newArticleRef = await addDoc(collection(db, 'articles'), articleData);

      // 2. TETAP TERCATAT di laporan kiriman warga (user_submissions)
      await updateDoc(doc(db, 'user_submissions', sub.id), {
        status: 'approved',
        publishedArticleId: newArticleRef.id,
        articleId: newArticleRef.id,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 3. Update state lokal
      setSubmissions(prev => prev.map(item => 
        item.id === sub.id 
          ? { ...item, status: 'approved', publishedArticleId: newArticleRef.id, articleId: newArticleRef.id } 
          : item
      ));
      setSelectedSubmission(null);

      // 4. Tanya apakah ingin langsung membuka di Editor Berita
      const openEditor = window.confirm(
        `✅ Kiriman berhasil disetujui!\nNaskah tetap tercatat di Laporan Warga dan sudah masuk sebagai DRAF di Daftar Berita.\n\nApakah Anda ingin langsung membuka halaman Editor Berita sekarang untuk mengedit naskah ini?`
      );
      if (openEditor) {
        if (router?.push) {
          router.push(`/admin/editor?id=${newArticleRef.id}`);
        } else {
          window.location.href = `/admin/editor?id=${newArticleRef.id}`;
        }
      }
    } catch (err) {
      console.error('Gagal menyetujui kiriman tulisan:', err);
      alert('Terjadi kesalahan saat menyetujui kiriman tulisan.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject submission
  const handleReject = async (subId) => {
    if (!window.confirm('Tolak kiriman tulisan ini? Status akan diubah menjadi Ditolak.')) return;
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'user_submissions', subId), {
        status: 'rejected',
        updatedAt: serverTimestamp()
      });
      setSubmissions(prev => prev.map(item => item.id === subId ? { ...item, status: 'rejected' } : item));
      if (selectedSubmission && selectedSubmission.id === subId) {
        setSelectedSubmission(prev => ({ ...prev, status: 'rejected' }));
      }
    } catch (err) {
      console.error('Gagal menolak tulisan:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete permanently
  const handleDelete = async (subId) => {
    if (!window.confirm('Hapus permanen kiriman tulisan ini dari Laporan Warga? Tindakan ini tidak dapat dibatalkan.')) return;
    try {
      await deleteDoc(doc(db, 'user_submissions', subId));
      setSubmissions(prev => prev.filter(item => item.id !== subId));
      if (selectedSubmission && selectedSubmission.id === subId) {
        setSelectedSubmission(null);
      }
    } catch (err) {
      console.error('Gagal menghapus kiriman:', err);
    }
  };

  // Filter & Search
  const filteredSubmissions = submissions.filter(item => {
    const matchesStatus = activeTab === 'approved'
      ? (item.status === 'approved' || item.status === 'published')
      : item.status === activeTab;
    const matchesSearch = !searchQuery.trim() || 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.authorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.authorEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const approvedCount = submissions.filter(s => s.status === 'approved' || s.status === 'published').length;
  const rejectedCount = submissions.filter(s => s.status === 'rejected').length;

  return (
    <div className="admin-layout">
      
      <main className="admin-main" style={{ padding: '2rem 2.5rem', background: 'var(--admin-bg)', minHeight: '100vh' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: '0 0 0.3rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Inbox color="#E62020" size={30} />
              <span>Moderasi Kiriman Warga</span>
            </h1>
            <p style={{ color: 'var(--admin-text-secondary)', margin: 0, fontSize: '0.95rem' }}>
              Tinjau dan setujui opini serta reportase masyarakat ke Draf Berita untuk disunting redaksi
            </p>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '280px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-secondary)' }} />
            <input
              type="text"
              placeholder="Cari judul atau nama pengirim..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.8rem',
                backgroundColor: 'var(--admin-card-bg)',
                border: '1px solid var(--admin-border)',
                borderRadius: '10px',
                color: 'var(--admin-text-primary)',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', borderBottom: '1px solid var(--admin-border)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              border: activeTab === 'pending' ? '1px solid #E62020' : '1px solid var(--admin-border)',
              backgroundColor: activeTab === 'pending' ? 'rgba(230, 32, 32, 0.15)' : 'var(--admin-card-bg)',
              color: activeTab === 'pending' ? '#ff4d4d' : 'var(--admin-text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <Clock size={16} />
            <span>Menunggu Moderasi ({pendingCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('approved')}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              border: activeTab === 'approved' ? '1px solid #22c55e' : '1px solid var(--admin-border)',
              backgroundColor: activeTab === 'approved' ? 'rgba(34, 197, 94, 0.15)' : 'var(--admin-card-bg)',
              color: activeTab === 'approved' ? '#22c55e' : 'var(--admin-text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <CheckCircle2 size={16} />
            <span>Sudah Disetujui ({approvedCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('rejected')}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              border: activeTab === 'rejected' ? '1px solid #ef4444' : '1px solid var(--admin-border)',
              backgroundColor: activeTab === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'var(--admin-card-bg)',
              color: activeTab === 'rejected' ? '#ef4444' : 'var(--admin-text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <XCircle size={16} />
            <span>Ditolak ({rejectedCount})</span>
          </button>
        </div>

        {/* List of Submissions */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--admin-text-secondary)' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p>Memuat daftar kiriman tulisan...</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div style={{
            backgroundColor: 'var(--admin-card-bg)',
            border: '1px dashed var(--admin-border)',
            borderRadius: '16px',
            padding: '4rem 2rem',
            textAlign: 'center',
            color: 'var(--admin-text-secondary)'
          }}>
            <Inbox size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <h3 style={{ color: 'var(--admin-text-primary)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              Belum Ada Kiriman {activeTab === 'pending' ? 'Baru' : activeTab === 'approved' ? 'Disetujui' : 'Ditolak'}
            </h3>
            <p style={{ maxWidth: '400px', margin: '0 auto' }}>
              Saat masyarakat atau kontributor mengirimkan opini/reportase melalui form publik, catatan akan muncul di antrean ini.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {filteredSubmissions.map(sub => (
              <div
                key={sub.id}
                style={{
                  backgroundColor: 'var(--admin-card-bg)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}
              >
                {/* Image & Category Badge */}
                <div style={{ position: 'relative', height: '180px', backgroundColor: 'var(--admin-bg)' }}>
                  <img src={sub.imageUrl} alt={sub.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: '1rem', left: '1rem', backgroundColor: '#E62020', color: 'var(--admin-text-primary)', padding: '0.3rem 0.8rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                    {sub.category}
                  </div>
                  {(sub.status === 'approved' || sub.status === 'published') && (
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', backgroundColor: 'rgba(34, 197, 94, 0.9)', color: '#ffffff', padding: '0.3rem 0.8rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <CheckCircle2 size={13} />
                      <span>Disetujui (Draf)</span>
                    </div>
                  )}
                  {sub.status === 'rejected' && (
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.9)', color: '#ffffff', padding: '0.3rem 0.8rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <XCircle size={13} />
                      <span>Ditolak</span>
                    </div>
                  )}
                </div>

                {/* Content Summary */}
                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--admin-text-primary)', margin: '0 0 0.6rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {sub.title}
                  </h3>
                  
                  <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.88rem', margin: '0 0 1rem', lineHeight: 1.6, flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {sub.excerpt || sub.content?.substring(0, 120) + '...'}
                  </p>

                  {/* Author Info Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', backgroundColor: 'var(--admin-bg)', padding: '0.6rem 0.85rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                    <img src={sub.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(sub.authorName)}&background=E62020&color=fff`} alt={sub.authorName} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ color: 'var(--admin-text-primary)', fontWeight: 600, fontSize: '0.86rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.authorName}</div>
                      <div style={{ color: 'var(--admin-text-secondary)', fontSize: '0.76rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.authorBio || sub.authorEmail}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--admin-border)', paddingTop: '1rem' }}>
                    <button
                      onClick={() => handleOpenDetail(sub)}
                      style={{
                        flex: 1,
                        backgroundColor: 'var(--admin-border)',
                        color: 'var(--admin-text-primary)',
                        border: 'none',
                        padding: '0.6rem',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Eye size={16} />
                      <span>Tinjau</span>
                    </button>

                    {sub.status === 'pending' && (
                      <button
                        onClick={() => handleApprove(sub)}
                        disabled={isProcessing}
                        style={{
                          backgroundColor: '#22c55e',
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.6rem 1rem',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.4rem',
                          transition: 'all 0.2s'
                        }}
                        title="Setujui dan masukkan ke Draf Berita"
                      >
                        <CheckCircle2 size={15} />
                        <span>Setujui</span>
                      </button>
                    )}

                    {(sub.status === 'approved' || sub.status === 'published') && (sub.publishedArticleId || sub.articleId) && (
                      <Link
                        href={`/admin/editor?id=${sub.publishedArticleId || sub.articleId}`}
                        style={{
                          backgroundColor: 'rgba(59, 130, 246, 0.15)',
                          color: '#60a5fa',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          padding: '0.6rem 0.9rem',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          textDecoration: 'none',
                          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                          transition: 'all 0.2s'
                        }}
                        title="Buka dan edit di Editor Berita"
                      >
                        <Edit3 size={15} />
                        <span>Buka Editor</span>
                      </Link>
                    )}

                    <button
                      onClick={() => handleDelete(sub.id)}
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: '#ef4444',
                        border: 'none',
                        padding: '0.6rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                      title="Hapus Permanen dari Laporan Warga"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail / Moderation Modal */}
        {selectedSubmission && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem'
          }}>
            <div style={{
              backgroundColor: 'var(--admin-card-bg)',
              border: '1px solid var(--admin-border)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
              overflow: 'hidden'
            }}>
              {/* Modal Header */}
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--admin-card-bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button onClick={() => setSelectedSubmission(null)} style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--admin-text-secondary)', cursor: 'pointer', padding: '0.2rem' }}>
                    <ArrowLeft size={20} />
                  </button>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--admin-text-primary)', margin: 0 }}>
                    Tinjauan Detail Kiriman Warga
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedSubmission(null)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--admin-text-secondary)',
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    lineHeight: 1,
                    padding: '0.2rem 0.5rem'
                  }}
                >
                  &times;
                </button>
              </div>

              {/* Modal Body (Clean Read-Only Preview) */}
              <div style={{ padding: '1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Author Info Banner */}
                <div style={{ backgroundColor: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <img src={selectedSubmission.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedSubmission.authorName)}&background=E62020&color=fff`} alt={selectedSubmission.authorName} style={{ width: '46px', height: '46px', borderRadius: '50%' }} />
                    <div>
                      <h4 style={{ color: 'var(--admin-text-primary)', fontSize: '1rem', fontWeight: 700, margin: '0 0 0.2rem' }}>{selectedSubmission.authorName}</h4>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem', color: 'var(--admin-text-secondary)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Mail size={14} color="#E62020" /> {selectedSubmission.authorEmail}</span>
                        {selectedSubmission.authorPhone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={14} color="#22c55e" /> {selectedSubmission.authorPhone}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Profesi / Bio</div>
                    <div style={{ color: 'var(--admin-text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>{selectedSubmission.authorBio || 'Kontributor Bedain News'}</div>
                  </div>
                </div>

                {/* Banner if already approved */}
                {(selectedSubmission.status === 'approved' || selectedSubmission.status === 'published') && (
                  <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '10px', padding: '0.9rem 1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#93c5fd', fontSize: '0.9rem' }}>
                      <CheckCircle2 size={18} color="#60a5fa" />
                      <span>Kiriman ini telah disetujui & tercatat di sistem sebagai Draf Berita. Silakan sunting melalui Editor Berita.</span>
                    </div>
                    {(selectedSubmission.publishedArticleId || selectedSubmission.articleId) && (
                      <Link
                        href={`/admin/editor?id=${selectedSubmission.publishedArticleId || selectedSubmission.articleId}`}
                        style={{ backgroundColor: '#3b82f6', color: '#fff', padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Edit3 size={14} />
                        <span>Buka di Editor</span>
                      </Link>
                    )}
                  </div>
                )}

                {/* Read-Only Article View */}
                <div>
                  {selectedSubmission.imageUrl && (
                    <div style={{ borderRadius: '12px', overflow: 'hidden', maxHeight: '350px', marginBottom: '1.5rem', backgroundColor: 'var(--admin-bg)' }}>
                      <img src={selectedSubmission.imageUrl} alt={selectedSubmission.title} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }} />
                    </div>
                  )}

                  <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: '0 0 0.5rem', lineHeight: 1.3 }}>
                    {selectedSubmission.title}
                  </h2>
                  
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-block', backgroundColor: '#E62020', color: 'var(--admin-text-primary)', padding: '0.3rem 0.85rem', borderRadius: '50px', fontSize: '0.82rem', fontWeight: 700 }}>
                      Kategori: {selectedSubmission.category}
                    </span>
                    {selectedSubmission.excerpt && (
                      <span style={{ color: 'var(--admin-text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                        Excerpt: "{selectedSubmission.excerpt}"
                      </span>
                    )}
                  </div>

                  <div style={{ color: 'var(--admin-text-primary)', lineHeight: 1.8, fontSize: '1.02rem', whiteSpace: 'pre-wrap', backgroundColor: 'var(--admin-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--admin-border)' }}>
                    {selectedSubmission.content}
                  </div>
                </div>

              </div>

              {/* Modal Footer Actions */}
              <div style={{ padding: '1.25rem 1.75rem', borderTop: '1px solid var(--admin-border)', backgroundColor: 'var(--admin-card-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ color: 'var(--admin-text-secondary)', fontSize: '0.85rem' }}>
                  Status di Laporan Warga:{' '}
                  <strong style={{ color: (selectedSubmission.status === 'approved' || selectedSubmission.status === 'published') ? '#22c55e' : selectedSubmission.status === 'rejected' ? '#ef4444' : '#fbbf24', textTransform: 'uppercase' }}>
                    {selectedSubmission.status === 'approved' ? 'Disetujui (Draf)' : selectedSubmission.status === 'published' ? 'Sudah Diterbitkan' : selectedSubmission.status === 'rejected' ? 'Ditolak' : 'Menunggu Moderasi'}
                  </strong>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {selectedSubmission.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleReject(selectedSubmission.id)}
                        disabled={isProcessing}
                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: 600, cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <XCircle size={18} />
                        <span>Tolak Kiriman</span>
                      </button>

                      <button
                        onClick={() => handleApprove(selectedSubmission)}
                        disabled={isProcessing}
                        style={{ backgroundColor: '#22c55e', color: '#ffffff', border: 'none', padding: '0.75rem 1.75rem', borderRadius: '10px', fontWeight: 700, cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)' }}
                      >
                        <CheckCircle2 size={18} />
                        <span>Setujui & Jadikan Draf Berita</span>
                      </button>
                    </>
                  )}

                  {(selectedSubmission.status === 'approved' || selectedSubmission.status === 'published') && (selectedSubmission.publishedArticleId || selectedSubmission.articleId) && (
                    <Link
                      href={`/admin/editor?id=${selectedSubmission.publishedArticleId || selectedSubmission.articleId}`}
                      style={{ backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)' }}
                    >
                      <Edit3 size={18} />
                      <span>Buka di Editor Berita</span>
                    </Link>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
