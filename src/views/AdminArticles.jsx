import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, getDocs, deleteDoc, doc, updateDoc, setDoc, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { 
  PlusCircle, Trash2, Edit, Search, Eye, Star, 
  Sparkles, ExternalLink, Newspaper, Clock, CheckCircle, Bell, Send, X
} from 'lucide-react';
import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';

import { getYouTubeId } from '../lib/videoHelpers';

const AdminArticles = () => {
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'published', 'draft', 'headline'
  const [visibleCount, setVisibleCount] = useState(20);
  const [showPushModal, setShowPushModal] = useState(false);
  const [pushData, setPushData] = useState({ title: '', body: '', click_action: '' });
  const [pushing, setPushing] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleImportPionirArticles = async () => {
    if (!window.confirm("Import artikel dari Pionir House? Peringatan: Proses ini akan mengimpor maksimal 100 artikel terbaru.")) return;
    setImporting(true);
    try {
      const parseFirestoreValue = (v) => {
        if (!v) return null;
        if (v.stringValue !== undefined) return v.stringValue;
        if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
        if (v.booleanValue !== undefined) return v.booleanValue;
        if (v.timestampValue !== undefined) return Timestamp.fromDate(new Date(v.timestampValue));
        if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(parseFirestoreValue);
        if (v.mapValue !== undefined) {
          const obj = {};
          for (const [key, val] of Object.entries(v.mapValue.fields || {})) {
            obj[key] = parseFirestoreValue(val);
          }
          return obj;
        }
        return null;
      };

      const res = await fetch("https://firestore.googleapis.com/v1/projects/pionerhouse-app/databases/(default)/documents/articles?pageSize=100");
      const data = await res.json();
      if (data.documents) {
        let importedCount = 0;
        for (const d of data.documents) {
          const origId = d.name.split('/').pop();
          const parsedData = {};
          for (const [key, val] of Object.entries(d.fields || {})) {
            parsedData[key] = parseFirestoreValue(val);
          }
          const docRef = doc(db, 'articles', origId);
          await setDoc(docRef, parsedData, { merge: true });
          importedCount++;
        }
        alert(`Berhasil mengimpor ${importedCount} artikel dari Pionir!`);
        fetchArticles();
      }
    } catch(e) {
      console.error(e);
      alert('Gagal import: ' + e.message);
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    if (currentUser && userRole) {
      fetchArticles();
    }
  }, [currentUser, userRole]);

  useEffect(() => {
    filterArticlesList();
    setVisibleCount(20); // Reset visible count on filter change
  }, [articles, searchTerm, activeTab]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      let q;
      if (userRole === 'reporter') {
        q = query(
          collection(db, 'articles'), 
          where('authorId', '==', currentUser.uid),
          orderBy('publishedAt', 'desc')
        );
      } else {
        q = query(collection(db, 'articles'), orderBy('publishedAt', 'desc'));
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

      const getSortTimestamp = (item) => {
        const ts = item.createdAt || item.updatedAt || item.publishedAt;
        if (ts && typeof ts.toMillis === 'function') return ts.toMillis();
        if (ts && ts.seconds) return ts.seconds * 1000;
        if (item.publishedAt && typeof item.publishedAt.toMillis === 'function') return item.publishedAt.toMillis();
        if (item.publishedAt && item.publishedAt.seconds) return item.publishedAt.seconds * 1000;
        if (item.date) {
          const parsed = Date.parse(item.date);
          if (!isNaN(parsed)) return parsed;
        }
        return 0;
      };

      data.sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a));
      setArticles(data);
    } catch (error) {
      console.error("Error fetching articles:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterArticlesList = () => {
    let result = [...articles];

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(a => 
        (a.title && a.title.toLowerCase().includes(term)) ||
        (a.category && a.category.toLowerCase().includes(term)) ||
        (a.author?.name && a.author.name.toLowerCase().includes(term))
      );
    }

    const now = new Date();
    const isPastSchedule = (a) => {
      if (a.status !== 'scheduled') return false;
      return (a.publishedAt && typeof a.publishedAt.toDate === 'function' && a.publishedAt.toDate() <= now) || 
             (a.scheduledAt && new Date(a.scheduledAt) <= now);
    };

    if (activeTab === 'published') {
      result = result.filter(a => a.status === 'published' || isPastSchedule(a));
    } else if (activeTab === 'scheduled') {
      result = result.filter(a => a.status === 'scheduled' && !isPastSchedule(a));
    } else if (activeTab === 'draft') {
      result = result.filter(a => a.status === 'draft');
    } else if (activeTab === 'headline') {
      result = result.filter(a => a.isHeadline);
    }

    const getSortTimestamp = (item) => {
      const ts = item.createdAt || item.updatedAt || item.publishedAt;
      if (ts && typeof ts.toMillis === 'function') return ts.toMillis();
      if (ts && ts.seconds) return ts.seconds * 1000;
      if (item.publishedAt && typeof item.publishedAt.toMillis === 'function') return item.publishedAt.toMillis();
      if (item.publishedAt && item.publishedAt.seconds) return item.publishedAt.seconds * 1000;
      if (item.date) {
        const parsed = Date.parse(item.date);
        if (!isNaN(parsed)) return parsed;
      }
      return 0;
    };

    result.sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a));
    setFilteredArticles(result);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus berita ini secara permanen dari portal?')) {
      try {
        await deleteDoc(doc(db, 'articles', id));
        setArticles(articles.filter(a => a.id !== id));
        alert('Artikel berhasil dihapus');
      } catch (error) {
        console.error("Error deleting article:", error);
        alert('Gagal menghapus artikel');
      }
    }
  };

  const handleSendPush = async (e) => {
    e.preventDefault();
    if (!pushData.title || !pushData.body) return alert("Judul dan pesan harus diisi.");
    
    setPushing(true);
    try {
      const broadcastPushNotification = httpsCallable(functions, 'broadcastPushNotification');
      const result = await broadcastPushNotification(pushData);
      
      alert(result.data.message || 'Push notification sent!');
      setShowPushModal(false);
      setPushData({ title: '', body: '', click_action: '' });
    } catch (error) {
      console.error("Error sending push:", error);
      alert(`Gagal: ${error.message}`);
    } finally {
      setPushing(false);
    }
  };

  const handleToggleHeadline = async (article) => {
    try {
      const articleRef = doc(db, 'articles', article.id);
      await updateDoc(articleRef, {
        isHeadline: !article.isHeadline
      });
      fetchArticles();
    } catch (error) {
      console.error("Error updating headline status:", error);
      alert("Gagal mengubah status headline.");
    }
  };

  const handlePublishNow = async (article) => {
    if (window.confirm(`Langsung tayangkan berita "${article.title}" ke publik sekarang?`)) {
      try {
        const articleRef = doc(db, 'articles', article.id);
        await updateDoc(articleRef, {
          status: 'published',
          publishedAt: Timestamp.now()
        });
        fetchArticles();
      } catch (error) {
        console.error("Error publishing article:", error);
        alert("Gagal mempublikasikan berita.");
      }
    }
  };

  if (authLoading) return <div className="admin-loading-screen"><div className="spinner"></div><p>Memeriksa otentikasi redaksi...</p></div>;

  const now = new Date();
  const isPastScheduleCount = (a) => {
    if (a.status !== 'scheduled') return false;
    return (a.publishedAt && typeof a.publishedAt.toDate === 'function' && a.publishedAt.toDate() <= now) || 
           (a.scheduledAt && new Date(a.scheduledAt) <= now);
  };

  const publishedCount = articles.filter(a => a.status === 'published' || isPastScheduleCount(a)).length;
  const scheduledCount = articles.filter(a => a.status === 'scheduled' && !isPastScheduleCount(a)).length;
  const draftCount = articles.filter(a => a.status === 'draft').length;
  const headlineCount = articles.filter(a => a.isHeadline).length;

  return (
    <div className="admin-layout">
      
      <main className="admin-main" style={{ padding: '32px 40px', background: 'var(--admin-bg)', minHeight: '100vh' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Newspaper size={14} /> PUSAT PENGELOLAAN BERITA
              </span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0 }}>
              Daftar Semua Berita
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--admin-text-secondary)', margin: '4px 0 0 0' }}>
              Kelola, publikasikan, edit, atau jadikan headline untuk seluruh artikel yang ada di portal BEDAIN NEWS.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {(userRole === 'superadmin' || userRole === 'admin') && (
              <button 
                onClick={handleImportPionirArticles}
                disabled={importing}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: importing ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
                  opacity: importing ? 0.7 : 1
                }}
              >
                📥 {importing ? 'Mengimpor...' : 'Import dari Pionir'}
              </button>
            )}

            {(userRole === 'superadmin' || userRole === 'admin' || userRole === 'editor') && (
              <button 
                onClick={() => setShowPushModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                }}
              >
                <Bell size={18} /> Push Notifikasi
              </button>
            )}

            <Link href="/admin/editor" 
              style={{
                background: 'linear-gradient(135deg, var(--color-accent) 0%, #b81d24 100%)',
                color: '#fff',
                padding: '10px 24px',
                borderRadius: '10px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(230, 57, 70, 0.3)',
                transition: 'transform 0.2s'
              }}
            >
              <PlusCircle size={18} /> Tulis Berita Baru
            </Link>
          </div>
        </header>

        {/* Enhanced Articles Management Table Section */}
        <div style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
          {/* Table Control Header */}
          <div style={{ padding: '24px', borderBottom: '1px solid var(--admin-card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0 }}>
                {userRole === 'reporter' ? 'Berita Tulisan Saya' : 'Semua Publikasi Berita'}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', margin: '4px 0 0 0' }}>
                Total <strong style={{ color: 'var(--admin-text-primary)' }}>{filteredArticles.length}</strong> artikel ditampilkan dari {articles.length} berita.
              </p>
            </div>

            {/* Filter Tabs & Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                <input
                  type="text"
                  placeholder="Cari judul, kategori..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    background: 'var(--admin-bg)',
                    border: '1px solid var(--admin-card-border)',
                    borderRadius: '8px',
                    padding: '8px 12px 8px 36px',
                    color: 'var(--admin-text-primary)',
                    fontSize: '13px',
                    width: '240px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', background: 'var(--admin-bg)', padding: '4px', borderRadius: '8px', border: '1px solid var(--admin-card-border)' }}>
                <button
                  onClick={() => setActiveTab('all')}
                  style={{ background: activeTab === 'all' ? 'var(--color-accent)' : 'transparent', color: activeTab === 'all' ? '#fff' : 'var(--admin-text-primary)', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Semua ({articles.length})
                </button>
                <button
                  onClick={() => setActiveTab('published')}
                  style={{ background: activeTab === 'published' ? 'var(--color-accent)' : 'transparent', color: activeTab === 'published' ? '#fff' : 'var(--admin-text-primary)', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Tayang ({publishedCount})
                </button>
                <button
                  onClick={() => setActiveTab('scheduled')}
                  style={{ background: activeTab === 'scheduled' ? '#9333ea' : 'transparent', color: activeTab === 'scheduled' ? '#fff' : 'var(--admin-text-primary)', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  ⏰ Terjadwal ({scheduledCount})
                </button>
                <button
                  onClick={() => setActiveTab('draft')}
                  style={{ background: activeTab === 'draft' ? 'var(--color-accent)' : 'transparent', color: activeTab === 'draft' ? '#fff' : 'var(--admin-text-primary)', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Draf ({draftCount})
                </button>
                <button
                  onClick={() => setActiveTab('headline')}
                  style={{ background: activeTab === 'headline' ? 'var(--color-accent)' : 'transparent', color: activeTab === 'headline' ? '#fff' : 'var(--admin-text-primary)', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  ⭐ Headline ({headlineCount})
                </button>
              </div>
            </div>
          </div>
          
          {/* Table Body */}
          {loading ? (
            <div style={{ padding: '80px 0', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
              <p style={{ color: 'var(--admin-text-secondary)' }}>Memuat daftar artikel redaksi...</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--admin-hover-bg)', borderBottom: '1px solid var(--admin-card-border)' }}>
                    <th style={{ padding: '16px 24px', fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 700, textTransform: 'uppercase', minWidth: '320px' }}>Berita & Kategori</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Penulis</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Views</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Tanggal</th>
                    <th style={{ padding: '16px 24px', fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>Aksi Editorial</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArticles.slice(0, visibleCount).map(article => {
                    const ytId = getYouTubeId(article.videoUrl) || getYouTubeId(article.youtubeUrl) || getYouTubeId(article.video) || getYouTubeId(article.content);
                    const thumb = ytId
                      ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
                      : (article.coverImage || article.imageUrl || 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=200&q=80');
                    const articleSlug = article.slug || article.id;

                    return (
                      <tr key={article.id} style={{ borderBottom: '1px solid var(--admin-card-border)', transition: 'background 0.2s' }} className="admin-table-row">
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{ width: '64px', height: '44px', borderRadius: '8px', overflow: 'hidden', background: 'var(--admin-border)', flexShrink: 0, position: 'relative' }}>
                              {ytId && (
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '18px', height: '18px', background: 'rgba(230,32,32,0.85)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                                  <svg viewBox="0 0 24 24" fill="white" width="10" height="10"><path d="M8 5v14l11-7z"/></svg>
                                </div>
                              )}
                                <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=200&q=80'; }} />
                              </div>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: '14px', lineHeight: 1.4, marginBottom: '4px', maxWidth: '400px' }}>
                                {article.title}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '11px', background: 'var(--admin-hover-bg)', padding: '2px 8px', borderRadius: '4px', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>
                                  #{article.category || 'Berita'}
                                </span>
                                {article.isHeadline && (
                                  <span style={{ fontSize: '11px', background: 'rgba(250, 204, 21, 0.15)', color: '#facc15', border: '1px solid rgba(250, 204, 21, 0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    ⭐ Headline
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '16px 20px', color: 'var(--admin-text-secondary)', fontSize: '13px', fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--admin-hover-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                              {(article.author?.name || 'R')[0].toUpperCase()}
                            </div>
                            <span>{article.author?.name || 'Redaksi'}</span>
                          </div>
                        </td>

                        <td style={{ padding: '16px 20px', color: 'var(--admin-text-secondary)', fontSize: '13px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Eye size={14} style={{ color: 'var(--color-accent)' }} /> {(article.views || 0).toLocaleString('id-ID')}
                          </span>
                        </td>

                        <td style={{ padding: '16px 20px' }}>
                          {(() => {
                            const now = new Date();
                            const isScheduledPast = article.status === 'scheduled' && (
                              (article.publishedAt && typeof article.publishedAt.toDate === 'function' && article.publishedAt.toDate() <= now) ||
                              (article.scheduledAt && new Date(article.scheduledAt) <= now)
                            );
                            
                            const displayStatus = article.status === 'published' || isScheduledPast ? 'published' : article.status;
                            
                            return (
                              <span 
                                className={`status-badge ${displayStatus === 'published' ? 'status-published' : displayStatus === 'scheduled' ? 'status-scheduled' : 'status-draft'}`} 
                                title={article.status === 'scheduled' ? `Jadwal Tayang: ${article.scheduledAt ? article.scheduledAt.replace('T', ' ') : '-'}` : ''}
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '6px',
                                  background: displayStatus === 'scheduled' ? 'rgba(168, 85, 247, 0.15)' : undefined,
                                  color: displayStatus === 'scheduled' ? '#d8b4fe' : undefined,
                                  border: displayStatus === 'scheduled' ? '1px solid rgba(168, 85, 247, 0.3)' : undefined,
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: displayStatus === 'published' ? '#4ade80' : displayStatus === 'scheduled' ? '#a855f7' : '#facc15' }}></span>
                                {displayStatus === 'published' ? (isScheduledPast ? 'Tayang (Auto)' : 'Tayang') : displayStatus === 'scheduled' ? `Terjadwal ${article.scheduledAt ? article.scheduledAt.split('T')[1] : ''}` : 'Draf'}
                              </span>
                            );
                          })()}
                        </td>

                        <td style={{ padding: '16px 20px', color: 'var(--admin-text-secondary)', fontSize: '13px' }}>
                          {article.publishedAt?.toDate ? article.publishedAt.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Hari ini'}
                        </td>
                        
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '8px', maxWidth: '240px', marginLeft: 'auto' }}>
                              <a 
                                href={`/article/${articleSlug}`} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{ background: 'var(--admin-hover-bg)', color: 'var(--admin-text-secondary)', padding: '8px', borderRadius: '8px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                title="Lihat Berita Live di Web"
                              >
                                <ExternalLink size={16} />
                              </a>

                              <button
                                onClick={() => {
                                  const url = `https://bedainnews.com/article/${articleSlug}`;
                                  const text = `🚨 *BREAKING NEWS - BEDAIN NEWS* 🚨\n\n*${article.title}*\n\n🔗 Baca selengkapnya:\n${url}\n\n#Bedain News #BeritaTerkini`;
                                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                                }}
                                style={{ background: 'rgba(37, 211, 102, 0.15)', color: '#25D366', border: '1px solid rgba(37, 211, 102, 0.3)', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, transition: 'all 0.2s' }}
                                title="Blast / Broadcast Berita ini ke WhatsApp Group"
                              >
                                💬 WA
                              </button>

                              <button
                                onClick={() => {
                                  const url = `https://bedainnews.com/article/${articleSlug}`;
                                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
                                }}
                                style={{ background: 'rgba(24, 119, 242, 0.15)', color: '#1877F2', border: '1px solid rgba(24, 119, 242, 0.3)', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, transition: 'all 0.2s' }}
                                title="Bagikan ke Facebook"
                              >
                                📘 FB
                              </button>

                              <button
                                onClick={() => {
                                  const url = `https://bedainnews.com/article/${articleSlug}`;
                                  const text = `🚨 *BREAKING NEWS* 🚨\n${article.title}\n\n`;
                                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
                                }}
                                style={{ background: 'rgba(20, 23, 26, 0.15)', color: '#14171A', border: '1px solid rgba(20, 23, 26, 0.3)', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, transition: 'all 0.2s' }}
                                title="Bagikan ke X (Twitter)"
                              >
                                𝕏 X
                              </button>

                            {article.status !== 'published' && userRole !== 'reporter' && (
                              <button
                                onClick={() => handlePublishNow(article)}
                                style={{ background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.3)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, transition: 'all 0.2s' }}
                                title="Langsung Tayangkan ke Publik Sekarang"
                              >
                                ⚡ Tayang
                              </button>
                            )}

                            {['superadmin', 'admin'].includes(userRole) && (
                              <button 
                                onClick={() => handleToggleHeadline(article)} 
                                style={{ background: article.isHeadline ? 'rgba(250, 204, 21, 0.2)' : 'var(--admin-hover-bg)', color: article.isHeadline ? '#facc15' : 'var(--admin-text-secondary)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                                title={article.isHeadline ? "Hapus dari Headline" : "Jadikan Headline Utama"}
                              >
                                <Star size={16} fill={article.isHeadline ? '#facc15' : 'none'} />
                              </button>
                            )}

                            {/* Grup Edit & Hapus agar selalu berdampingan */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <Link href={`/admin/editor?id=${article.id}`}
                                style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '8px 12px', borderRadius: '8px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s' }}
                                title="Edit Artikel Ini"
                              >
                                <Edit size={15} /> Edit
                              </Link>

                              {userRole !== 'reporter' && (
                                <button 
                                  onClick={() => handleDelete(article.id)} 
                                  className="admin-btn-icon-danger" 
                                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                                  title="Hapus Berita"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredArticles.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--admin-text-secondary)' }}>
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📰</div>
                        <div style={{ fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: '4px' }}>Belum ada artikel yang cocok dengan filter ini</div>
                        <div style={{ fontSize: '12px' }}>Coba gunakan kata kunci pencarian lain atau klik tab 'Semua'</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {visibleCount < filteredArticles.length && (
                <div style={{ padding: '24px', textAlign: 'center', borderTop: '1px solid var(--admin-card-border)', background: 'var(--admin-card-bg)' }}>
                  <button
                    type="button"
                    onClick={() => setVisibleCount(prev => prev + 20)}
                    style={{
                      padding: '12px 28px',
                      fontSize: '14px',
                      fontWeight: 600,
                      borderRadius: '10px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#3b82f6',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                  >
                    📂 Muat Lebih Banyak Artikel ({filteredArticles.length - visibleCount} lagi)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Push Notification Modal */}
      {showPushModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--admin-bg)', width: '90%', maxWidth: '500px', 
            borderRadius: '16px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            position: 'relative', border: '1px solid var(--admin-border)'
          }}>
            <button onClick={() => setShowPushModal(false)} style={{
              position: 'absolute', top: '16px', right: '16px', background: 'none', 
              border: 'none', color: 'var(--admin-text-secondary)', cursor: 'pointer'
            }}>
              <X size={20} />
            </button>
            
            <h3 style={{ marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--admin-text-primary)' }}>
              <Bell size={20} color="#10b981" /> Broadcast Push Notifikasi
            </h3>
            
            <form onSubmit={handleSendPush}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Judul Notifikasi</label>
                <input 
                  type="text" required 
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-card-bg)', color: 'var(--admin-text-primary)' }}
                  value={pushData.title} onChange={e => setPushData({...pushData, title: e.target.value})}
                  placeholder="Misal: Breaking News! Pertandingan Berakhir"
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Isi Pesan (Body)</label>
                <textarea 
                  required rows="3"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-card-bg)', color: 'var(--admin-text-primary)', resize: 'vertical' }}
                  value={pushData.body} onChange={e => setPushData({...pushData, body: e.target.value})}
                  placeholder="Isi pesan singkat..."
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Target URL (Opsional)</label>
                <input 
                  type="text" 
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-card-bg)', color: 'var(--admin-text-primary)' }}
                  value={pushData.click_action} onChange={e => setPushData({...pushData, click_action: e.target.value})}
                  placeholder="https://bedainnews.com/article/..."
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowPushModal(false)} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--admin-border)', borderRadius: '8px', color: 'var(--admin-text-primary)', cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={pushing} style={{ padding: '10px 16px', background: '#10b981', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {pushing ? 'Mengirim...' : <><Send size={16} /> Kirim Broadcast</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminArticles;
