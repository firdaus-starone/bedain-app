import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Inbox, CheckCircle2, XCircle, Clock, Eye, Trash2, Edit3, Send, 
  Search, Filter, User, Mail, Phone, Briefcase, FileText, AlertCircle,
  ExternalLink, ArrowLeft
} from 'lucide-react';

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'published', 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editExcerpt, setEditExcerpt] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editBio, setEditBio] = useState('');
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
    setIsEditing(false);
    setEditTitle(sub.title || '');
    setEditCategory(sub.category || 'Opini');
    setEditExcerpt(sub.excerpt || '');
    setEditContent(sub.content || '');
    setEditBio(sub.authorBio || '');
  };

  const handleSaveEdit = async () => {
    if (!selectedSubmission) return;
    setIsProcessing(true);
    try {
      const subRef = doc(db, 'user_submissions', selectedSubmission.id);
      await updateDoc(subRef, {
        title: editTitle,
        category: editCategory,
        excerpt: editExcerpt,
        content: editContent,
        authorBio: editBio,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setSubmissions(prev => prev.map(item => 
        item.id === selectedSubmission.id 
          ? { ...item, title: editTitle, category: editCategory, excerpt: editExcerpt, content: editContent, authorBio: editBio }
          : item
      ));
      setSelectedSubmission(prev => ({ ...prev, title: editTitle, category: editCategory, excerpt: editExcerpt, content: editContent, authorBio: editBio }));
      setIsEditing(false);
      alert('Perubahan berhasil disimpan!');
    } catch (err) {
      console.error('Gagal menyimpan perubahan:', err);
      alert('Gagal menyimpan perubahan.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Publish to 'articles' collection
  const handlePublish = async (sub) => {
    if (!window.confirm(`Terbitkan tulisan "${sub.title}" karya ${sub.authorName} ke Beranda sekarang?`)) return;

    setIsProcessing(true);
    try {
      const titleToUse = isEditing ? editTitle : sub.title;
      const categoryToUse = isEditing ? editCategory : sub.category;
      const excerptToUse = isEditing ? editExcerpt : sub.excerpt;
      const contentToUse = isEditing ? editContent : sub.content;
      const bioToUse = isEditing ? editBio : (sub.authorBio || 'Kontributor Bedain News');

      const finalSlug = titleToUse.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(2, 6);

      const articleData = {
        title: titleToUse,
        slug: finalSlug,
        category: categoryToUse,
        excerpt: excerptToUse || contentToUse.substring(0, 160) + '...',
        content: contentToUse,
        imageUrl: sub.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80',
        coverImage: sub.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80',
        imageCaption: `Foto kiriman: ${sub.authorName}`,
        status: 'published',
        isHeadline: false,
        seoTitle: titleToUse,
        seoDescription: excerptToUse,
        tags: [categoryToUse.toLowerCase(), 'kiriman warga', 'opini pembaca'],
        location: '',
        videoUrl: '',
        createdAt: Timestamp.now(),
        publishedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        authorId: 'contributor_' + sub.id,
        author: {
          name: sub.authorName,
          email: sub.authorEmail || '',
          bio: bioToUse,
          avatar: sub.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(sub.authorName)}&background=E62020&color=fff&size=128`,
          isContributor: true
        },
        views: 0
      };

      // 1. Add to articles collection
      const newArticleRef = await addDoc(collection(db, 'articles'), articleData);

      // 2. Update status inside user_submissions
      await updateDoc(doc(db, 'user_submissions', sub.id), {
        status: 'published',
        publishedArticleId: newArticleRef.id,
        updatedAt: serverTimestamp()
      });

      // Update local states
      setSubmissions(prev => prev.map(item => item.id === sub.id ? { ...item, status: 'published', publishedArticleId: newArticleRef.id } : item));
      setSelectedSubmission(null);
      alert(`🎉 Selamat! Tulisan berhasil diterbitkan ke Beranda! (ID: ${newArticleRef.id})`);
    } catch (err) {
      console.error('Gagal menerbitkan tulisan:', err);
      alert('Terjadi kesalahan saat menerbitkan tulisan.');
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
    if (!window.confirm('Hapus permanen kiriman tulisan ini? Tindakan ini tidak dapat dibatalkan.')) return;
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
    const matchesStatus = item.status === activeTab;
    const matchesSearch = !searchQuery.trim() || 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.authorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.authorEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const publishedCount = submissions.filter(s => s.status === 'published').length;
  const rejectedCount = submissions.filter(s => s.status === 'rejected').length;

  return (
    <div className="admin-layout">
      
      <main className="admin-main" style={{ padding: '2rem 2.5rem', background: 'var(--admin-bg)', minHeight: '100vh' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', margin: '0 0 0.3rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Inbox color="#E62020" size={30} />
              <span>Moderasi Kiriman Warga</span>
            </h1>
            <p style={{ color: '#a1a1aa', margin: 0, fontSize: '0.95rem' }}>
              Tinjau, sunting, dan terbitkan opini serta reportase jurnalistik dari masyarakat luas
            </p>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '280px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
            <input
              type="text"
              placeholder="Cari judul atau nama pengirim..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.8rem',
                backgroundColor: '#18181b',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              border: activeTab === 'pending' ? '1px solid #E62020' : '1px solid rgba(255,255,255,0.08)',
              backgroundColor: activeTab === 'pending' ? 'rgba(230, 32, 32, 0.15)' : '#18181b',
              color: activeTab === 'pending' ? '#ff4d4d' : '#a1a1aa',
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
            onClick={() => setActiveTab('published')}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              border: activeTab === 'published' ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.08)',
              backgroundColor: activeTab === 'published' ? 'rgba(34, 197, 94, 0.15)' : '#18181b',
              color: activeTab === 'published' ? '#22c55e' : '#a1a1aa',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <CheckCircle2 size={16} />
            <span>Sudah Diterbitkan ({publishedCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('rejected')}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              border: activeTab === 'rejected' ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.08)',
              backgroundColor: activeTab === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : '#18181b',
              color: activeTab === 'rejected' ? '#ef4444' : '#a1a1aa',
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
          <div style={{ textAlign: 'center', padding: '4rem', color: '#71717a' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p>Memuat daftar kiriman tulisan...</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div style={{
            backgroundColor: '#18181b',
            border: '1px dashed rgba(255,255,255,0.12)',
            borderRadius: '16px',
            padding: '4rem 2rem',
            textAlign: 'center',
            color: '#71717a'
          }}>
            <Inbox size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Belum Ada Kiriman {activeTab === 'pending' ? 'Baru' : activeTab === 'published' ? 'Diterbitkan' : 'Ditolak'}</h3>
            <p style={{ maxWidth: '400px', margin: '0 auto' }}>
              Saat masyarakat atau kontributor mengirimkan opini/reportase melalui form publik, daftar akan muncul di antrean ini.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {filteredSubmissions.map(sub => (
              <div
                key={sub.id}
                style={{
                  backgroundColor: '#18181b',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}
              >
                {/* Image & Category Badge */}
                <div style={{ position: 'relative', height: '180px', backgroundColor: '#0f0f12' }}>
                  <img src={sub.imageUrl} alt={sub.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: '1rem', left: '1rem', backgroundColor: '#E62020', color: '#fff', padding: '0.3rem 0.8rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                    {sub.category}
                  </div>
                  {sub.status === 'published' && (
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', backgroundColor: 'rgba(34, 197, 94, 0.9)', color: '#fff', padding: '0.3rem 0.8rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <CheckCircle2 size={13} />
                      <span>Tayang</span>
                    </div>
                  )}
                </div>

                {/* Content Summary */}
                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: '0 0 0.6rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {sub.title}
                  </h3>
                  
                  <p style={{ color: '#a1a1aa', fontSize: '0.88rem', margin: '0 0 1rem', lineHeight: 1.6, flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {sub.excerpt || sub.content?.substring(0, 120) + '...'}
                  </p>

                  {/* Author Info Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', backgroundColor: '#0f0f12', padding: '0.6rem 0.85rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                    <img src={sub.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(sub.authorName)}&background=E62020&color=fff`} alt={sub.authorName} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.86rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.authorName}</div>
                      <div style={{ color: '#71717a', fontSize: '0.76rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.authorBio || sub.authorEmail}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                    <button
                      onClick={() => handleOpenDetail(sub)}
                      style={{
                        flex: 1,
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        color: '#fff',
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
                      <span>Tinjau / Edit</span>
                    </button>

                    {sub.status === 'pending' && (
                      <button
                        onClick={() => handlePublish(sub)}
                        disabled={isProcessing}
                        style={{
                          backgroundColor: '#22c55e',
                          color: '#fff',
                          border: 'none',
                          padding: '0.6rem 1rem',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.4rem',
                          transition: 'all 0.2s'
                        }}
                        title="Terbitkan ke Beranda"
                      >
                        <Send size={15} />
                        <span>Terbitkan</span>
                      </button>
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
                      title="Hapus Permanen"
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
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem'
          }}>
            <div style={{
              backgroundColor: '#18181b',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
              overflow: 'hidden'
            }}>
              {/* Modal Header */}
              <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#121214' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button onClick={() => setSelectedSubmission(null)} style={{ backgroundColor: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '0.2rem' }}>
                    <ArrowLeft size={20} />
                  </button>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    {isEditing ? 'Sunting Kiriman Warga' : 'Tinjauan Detail Kiriman'}
                  </h3>
                </div>
                
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    style={{
                      backgroundColor: isEditing ? '#E62020' : 'rgba(255,255,255,0.08)',
                      color: '#fff',
                      border: 'none',
                      padding: '0.45rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.4rem'
                    }}
                  >
                    <Edit3 size={15} />
                    <span>{isEditing ? 'Batal Edit' : 'Edit Isi Tulisan'}</span>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Author Info Banner */}
                <div style={{ backgroundColor: '#0f0f12', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <img src={selectedSubmission.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedSubmission.authorName)}&background=E62020&color=fff`} alt={selectedSubmission.authorName} style={{ width: '46px', height: '46px', borderRadius: '50%' }} />
                    <div>
                      <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: '0 0 0.2rem' }}>{selectedSubmission.authorName}</h4>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem', color: '#a1a1aa', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Mail size={14} color="#E62020" /> {selectedSubmission.authorEmail}</span>
                        {selectedSubmission.authorPhone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={14} color="#22c55e" /> {selectedSubmission.authorPhone}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.78rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Profesi / Bio</div>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{selectedSubmission.authorBio || 'Kontributor Bedain News'}</div>
                  </div>
                </div>

                {/* Article Content Area */}
                {isEditing ? (
                  /* Edit Form Inside Modal */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#a1a1aa', marginBottom: '0.4rem' }}>Judul Artikel</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0f0f12', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '1rem', fontWeight: 600, boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#a1a1aa', marginBottom: '0.4rem' }}>Kategori</label>
                        <input
                          type="text"
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0f0f12', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#a1a1aa', marginBottom: '0.4rem' }}>Profesi / Bio Penulis</label>
                        <input
                          type="text"
                          value={editBio}
                          onChange={(e) => setEditBio(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0f0f12', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#a1a1aa', marginBottom: '0.4rem' }}>Excerpt / Ringkasan</label>
                      <input
                        type="text"
                        value={editExcerpt}
                        onChange={(e) => setEditExcerpt(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0f0f12', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#a1a1aa', marginBottom: '0.4rem' }}>Isi Tulisan Lengkap</label>
                      <textarea
                        rows="12"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem', backgroundColor: '#0f0f12', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', lineHeight: 1.7, boxSizing: 'border-box', fontFamily: 'inherit' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={handleSaveEdit}
                        disabled={isProcessing}
                        style={{ backgroundColor: '#E62020', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Simpan Perubahan
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Read Only View Inside Modal */
                  <div>
                    <div style={{ borderRadius: '12px', overflow: 'hidden', maxHeight: '350px', marginBottom: '1.5rem' }}>
                      <img src={selectedSubmission.imageUrl} alt={selectedSubmission.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
                    </div>

                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', margin: '0 0 0.5rem', lineHeight: 1.3 }}>
                      {selectedSubmission.title}
                    </h2>
                    
                    <div style={{ display: 'inline-block', backgroundColor: '#E62020', color: '#fff', padding: '0.3rem 0.85rem', borderRadius: '50px', fontSize: '0.82rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                      Kategori: {selectedSubmission.category}
                    </div>

                    <div style={{ color: '#e4e4e7', lineHeight: 1.8, fontSize: '1.05rem', whiteSpace: 'pre-wrap', backgroundColor: '#0f0f12', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {selectedSubmission.content}
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer Actions */}
              <div style={{ padding: '1.25rem 1.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#121214', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ color: '#71717a', fontSize: '0.85rem' }}>
                  Status saat ini: <strong style={{ color: selectedSubmission.status === 'published' ? '#22c55e' : selectedSubmission.status === 'rejected' ? '#ef4444' : '#fbbf24', textTransform: 'uppercase' }}>{selectedSubmission.status}</strong>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {selectedSubmission.status !== 'rejected' && (
                    <button
                      onClick={() => handleReject(selectedSubmission.id)}
                      disabled={isProcessing}
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <XCircle size={18} />
                      <span>Tolak Kiriman</span>
                    </button>
                  )}

                  {selectedSubmission.status !== 'published' && (
                    <button
                      onClick={() => handlePublish(selectedSubmission)}
                      disabled={isProcessing}
                      style={{ backgroundColor: '#22c55e', color: '#fff', border: 'none', padding: '0.75rem 1.75rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)' }}
                    >
                      <Send size={18} />
                      <span>Terbitkan ke Beranda Sekarang</span>
                    </button>
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
