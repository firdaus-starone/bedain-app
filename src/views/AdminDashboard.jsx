import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, getDocs, limit, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { seedAllDummyArticles } from '../lib/seedData';
import SmartAnalytics from '../components/SmartAnalytics';
import { 
  PenTool, Globe, FileText, Image as ImageIcon, Tag, 
  Eye, TrendingUp, Sparkles, PlusCircle, CheckCircle, 
  Clock, ExternalLink, Newspaper, ArrowRight, BarChart2, MousePointerClick
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';


const AdminDashboard = () => {
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const [allArticles, setAllArticles] = useState([]);
  const [topArticles, setTopArticles] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    scheduled: 0,
    drafts: 0,
    headlines: 0,
    totalViews: 0
  });
  const [importing, setImporting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleImportDummy = async () => {
    if (!window.confirm("Apakah Anda yakin ingin mengimpor 22 berita contoh ke dalam database CMS agar dapat diedit dan dikelola?")) return;
    setImporting(true);
    try {
      const count = await seedAllDummyArticles();
      if (count === 0) {
        alert("Semua berita contoh sudah ada di dalam database CMS.");
      } else {
        alert(`Berhasil! ${count} berita contoh telah ditambahkan ke database CMS.`);
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
      alert("Gagal mengimpor berita: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleResetViews = async () => {
    if (!window.confirm("Apakah Anda yakin ingin mereset angka Total Pembaca (Views) ke 0 untuk semua artikel di database?")) return;
    setResetting(true);
    try {
      const q = query(collection(db, 'articles'));
      const snap = await getDocs(q);
      let updatedCount = 0;
      
      // We do this sequentially or in batches. Sequential is fine for small amounts.
      const { updateDoc, doc } = await import('firebase/firestore');
      
      for (const document of snap.docs) {
        const data = document.data();
        if (data.views > 0) {
          await updateDoc(doc(db, 'articles', document.id), { views: 0 });
          updatedCount++;
        }
      }
      
      alert(`Berhasil! Angka Views untuk ${updatedCount} artikel telah direset ke 0.`);
      fetchDashboardData(); // Refresh data
    } catch (err) {
      console.error(err);
      alert("Gagal mereset views: " + err.message);
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    if (currentUser && userRole) {
      fetchDashboardData();
    }
  }, [currentUser, userRole]);

  const fetchDashboardData = async () => {
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
      setAllArticles(data);

      // Removed setRecentArticles
      
      const now = new Date();
      const isPastSchedule = (a) => {
        if (a.status !== 'scheduled') return false;
        return (a.publishedAt && typeof a.publishedAt.toDate === 'function' && a.publishedAt.toDate() <= now) || 
               (a.scheduledAt && new Date(a.scheduledAt) <= now);
      };

      const pubCount = data.filter(a => a.status === 'published' || isPastSchedule(a)).length;
      const scheduledCount = data.filter(a => a.status === 'scheduled' && !isPastSchedule(a)).length;
      const draftCount = data.filter(a => a.status === 'draft').length;
      const headCount = data.filter(a => a.isHeadline).length;
      const viewsSum = data.reduce((sum, a) => sum + (a.views || 0), 0);
      
      setStats({
        total: data.length,
        published: pubCount,
        scheduled: scheduledCount,
        drafts: draftCount,
        headlines: headCount,
        totalViews: viewsSum
      });

      const sortedByViews = [...data].sort((a, b) => (b.views || 0) - (a.views || 0));
      setTopArticles(sortedByViews.slice(0, 5));
      
      const basePercentages = [0.1, 0.12, 0.08, 0.15, 0.2, 0.15, 0.2];
      const today = new Date();
      const mockChartData = basePercentages.map((pct, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        const dayStr = d.toLocaleDateString('id-ID', { weekday: 'short' });
        return {
          name: dayStr,
          views: Math.max(0, Math.floor(viewsSum * pct))
        };
      });
      setChartData(mockChartData);
    } catch (error) {
      console.error("Error fetching articles:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="admin-loading-screen"><div className="spinner"></div><p>Memeriksa otentikasi redaksi...</p></div>;

  return (
    <div className="admin-layout">
      
      {/* Main Ultra-Modern Dashboard */}
      <main className="admin-main" style={{ padding: '32px 40px', background: 'var(--admin-bg)', minHeight: '100vh' }}>
        {/* Header Bar */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} /> NEWSROOM EXECUTIVE DASHBOARD
              </span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0 }}>
              Selamat Datang, {currentUser?.displayName || 'Redaksi'} 👋
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--admin-text-secondary)', margin: '4px 0 0 0' }}>
              Pantau aktivitas jurnalistik, analisis pembaca, dan kelola seluruh publikasi berita secara real-time.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {userRole === 'superadmin' && (
              <button 
                onClick={handleResetViews} 
                disabled={resetting}
                style={{
                  background: 'var(--admin-card-bg)',
                  border: '1px solid var(--admin-card-border)',
                  color: 'var(--admin-text-secondary)',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: resetting ? 'wait' : 'pointer'
                }}
              >
                {resetting ? 'Mereset...' : 'Reset Views'}
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

        {/* 4 Glassmorphism Analytics Metric Cards */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Berita</span>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--admin-text-primary)', marginTop: '4px' }}>{stats.total}</div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                <FileText size={20} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#4ade80', fontWeight: 600 }}>
              <TrendingUp size={13} /> <span>Semua publikasi</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tayang Publik</span>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#4ade80', marginTop: '4px' }}>{stats.published}</div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
                <Globe size={20} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--admin-text-secondary)', fontWeight: 500 }}>
              <CheckCircle size={13} style={{ color: '#4ade80' }} /> <span>Siap dibaca publik</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Terjadwal</span>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#a855f7', marginTop: '4px' }}>{stats.scheduled}</div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
                <Clock size={20} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--admin-text-secondary)', fontWeight: 500 }}>
              <span>Menunggu waktu</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Draf Tersimpan</span>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#facc15', marginTop: '4px' }}>{stats.drafts}</div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(250, 204, 21, 0.1)', border: '1px solid rgba(250, 204, 21, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#facc15' }}>
                <PenTool size={20} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--admin-text-secondary)', fontWeight: 500 }}>
              <span>Menunggu review</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Headline Utama</span>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#eab308', marginTop: '4px' }}>{stats.headlines}</div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eab308' }}>
                <Sparkles size={20} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--admin-text-secondary)', fontWeight: 500 }}>
              <span>Sorotan halaman</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Pembaca</span>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--admin-text-primary)', marginTop: '4px' }}>{stats.totalViews.toLocaleString('id-ID')}</div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(230, 57, 70, 0.15)', border: '1px solid rgba(230, 57, 70, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
                <Eye size={20} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#4ade80', fontWeight: 600 }}>
              <TrendingUp size={13} /> <span>Akumulasi views</span>
            </div>
          </div>
        </div>

        {/* Editorial Shortcuts Panel ("Aksi Cepat Redaksi") */}
        <div style={{ marginBottom: '36px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--admin-text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚡ Aksi Cepat Redaksi
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <Link href="/admin/editor" style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '12px', padding: '18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '16px', transition: 'all 0.2s' }} className="shortcut-card">
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(230, 57, 70, 0.1)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PenTool size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: '14px' }}>Tulis Breaking News</div>
                <div style={{ fontSize: '12px', color: 'var(--admin-text-secondary)' }}>Buat artikel kilat</div>
              </div>
            </Link>

            <Link href="/admin/articles" style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '12px', padding: '18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '16px', transition: 'all 0.2s' }} className="shortcut-card">
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Newspaper size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: '14px' }}>Daftar Semua Berita</div>
                <div style={{ fontSize: '12px', color: 'var(--admin-text-secondary)' }}>Kelola, edit & hapus</div>
              </div>
            </Link>

            <Link href="/admin/media" style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '12px', padding: '18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '16px', transition: 'all 0.2s' }} className="shortcut-card">
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ImageIcon size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: '14px' }}>Galeri & Foto</div>
                <div style={{ fontSize: '12px', color: 'var(--admin-text-secondary)' }}>Upload aset media</div>
              </div>
            </Link>

            <Link href="/admin/categories" style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '12px', padding: '18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '16px', transition: 'all 0.2s' }} className="shortcut-card">
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Tag size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: '14px' }}>Kategori Portal</div>
                <div style={{ fontSize: '12px', color: 'var(--admin-text-secondary)' }}>Atur topik rubrik</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Smart Analytics Dashboard */}
        <SmartAnalytics articles={allArticles} />

        {/* Top Performing Articles */}
        <div style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--admin-card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔥 Artikel Terpopuler (Top 5)
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', margin: '4px 0 0 0' }}>
                Artikel dengan jumlah tayangan (views) terbanyak sepanjang masa.
              </p>
            </div>
            <Link href="/admin/articles"
              style={{
                background: 'rgba(230, 57, 70, 0.15)',
                border: '1px solid var(--color-accent)',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              Lihat Seluruh Daftar Berita ({stats.total}) <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
              <p style={{ color: 'var(--admin-text-secondary)' }}>Memuat data analitik...</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--admin-hover-bg)', borderBottom: '1px solid var(--admin-card-border)' }}>
                    <th style={{ padding: '16px 24px', fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Judul Berita</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Penulis</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Total Views</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '16px 24px', fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {topArticles.map((article, index) => {
                    const thumb = article.coverImage || article.imageUrl || 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=200&q=80';
                    const articleSlug = article.slug || article.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || article.id;
                    const percentOfTotal = stats.totalViews > 0 ? Math.round(((article.views || 0) / stats.totalViews) * 100) : 0;

                    return (
                      <tr key={article.id} style={{ borderBottom: '1px solid var(--admin-card-border)' }} className="admin-table-row">
                        <td style={{ padding: '14px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: index === 0 ? 'var(--color-accent)' : 'var(--admin-hover-bg)', color: index === 0 ? '#fff' : 'var(--admin-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', flexShrink: 0 }}>
                              {index + 1}
                            </div>
                            <div style={{ width: '50px', height: '36px', borderRadius: '6px', overflow: 'hidden', background: 'var(--admin-border)', flexShrink: 0 }}>
                              <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: '13px', lineHeight: 1.3, marginBottom: '4px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {article.title}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '10px', background: 'var(--admin-hover-bg)', padding: '2px 6px', borderRadius: '4px', color: 'var(--admin-text-secondary)' }}>
                                  #{article.category || 'Berita'}
                                </span>
                                <span style={{ fontSize: '10px', color: 'var(--admin-text-secondary)' }}>{percentOfTotal}% dari total</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px', color: 'var(--admin-text-secondary)', fontSize: '13px' }}>
                          {article.author?.name || 'Redaksi'}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--admin-text-primary)', fontWeight: 700, fontSize: '14px' }}>
                            <MousePointerClick size={14} style={{ color: 'var(--color-accent)' }} /> {(article.views || 0).toLocaleString('id-ID')}
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
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
                                style={{ fontSize: '11px' }}
                              >
                                {displayStatus === 'published' ? 'Tayang' : displayStatus === 'scheduled' ? 'Terjadwal' : 'Draf'}
                              </span>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <a href={`/article/${articleSlug}`} target="_blank" rel="noreferrer" style={{ background: 'var(--admin-hover-bg)', color: 'var(--admin-text-secondary)', padding: '6px 10px', borderRadius: '6px', textDecoration: 'none', fontSize: '11px' }}>
                              <ExternalLink size={14} /> View
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>



      </main>
    </div>
  );
};

export default AdminDashboard;
