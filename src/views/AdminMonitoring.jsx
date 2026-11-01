"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { 
  Activity, ShieldCheck, ShieldAlert, Users, Newspaper, Eye, 
  Clock, CheckCircle2, FileText, Search, 
  RefreshCw, Download, 
  Award, Flame, ExternalLink, ChevronRight, PenTool,
  Trash2, Radio, ArrowLeft, Layers, ToggleLeft, ToggleRight, Tag
} from 'lucide-react';

// Format waktu relatif (contoh: "5 menit lalu", "2 jam lalu")
const timeAgo = (date) => {
  if (!date) return '-';
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Baru saja';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} hari lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Parser serbaguna untuk Timestamp Firestore / Date / String
const parseDate = (val) => {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const AdminMonitoring = () => {
  const router = useRouter();
  const { userRole, loading: authLoading } = useAuth();

  // State Data Utama
  const [users, setUsers] = useState([]);
  const [articles, setArticles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date());

  // Filter & Navigasi Tab
  const [activeTab, setActiveTab] = useState('kpi'); // 'kpi', 'audit', 'articles'
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'admin', 'editor', 'reporter'
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState(null); // untuk detail drill-down per user

  const fetchMonitoringData = useCallback(async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      // 1. Ambil seluruh data pengguna tim redaksi
      const usersSnap = await getDocs(query(collection(db, 'users')));
      const allUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const staffUsers = allUsers.filter(u => ['superadmin', 'admin', 'editor', 'reporter'].includes(u.role));
      setUsers(staffUsers);

      // 2. Ambil seluruh artikel untuk kalkulasi KPI & timeline
      const articlesSnap = await getDocs(query(collection(db, 'articles'), orderBy('createdAt', 'desc')));
      const allArticles = articlesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setArticles(allArticles);

      // 3. Ambil log aktivitas riil dari koleksi activity_logs
      let recordedLogs = [];
      try {
        const logsSnap = await getDocs(query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(150)));
        recordedLogs = logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.warn("Log koleksi belum ada atau sedang dibuat:", err);
      }
      setLogs(recordedLogs);
      setLastRefreshedAt(new Date());
    } catch (error) {
      console.error("Error fetching monitoring data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Muat data saat Superadmin terverifikasi
  useEffect(() => {
    if (userRole === 'superadmin') {
      fetchMonitoringData();
    }
  }, [userRole, fetchMonitoringData]);

  // Kalkulasi Metrik KPI Per-Staf
  const staffMetrics = useMemo(() => {
    return users.map(user => {
      // Cocokkan artikel dengan user (berdasarkan authorId, author.email, atau author.name)
      const userArticles = articles.filter(art => {
        if (art.authorId && art.authorId === user.id) return true;
        if (art.author?.email && user.email && art.author.email.toLowerCase() === user.email.toLowerCase()) return true;
        if (art.author?.name && user.name && art.author.name.toLowerCase() === user.name.toLowerCase()) return true;
        return false;
      });

      const publishedArticles = userArticles.filter(a => a.status === 'published');
      const draftArticles = userArticles.filter(a => a.status === 'draft' || a.status === 'pending');
      const scheduledArticles = userArticles.filter(a => a.status === 'scheduled');
      const totalViews = userArticles.reduce((acc, a) => acc + (Number(a.views) || 0), 0);

      // Ambil artikel terbaru
      const sortedArticles = [...userArticles].sort((a, b) => {
        const dateA = parseDate(a.updatedAt || a.publishedAt || a.createdAt)?.getTime() || 0;
        const dateB = parseDate(b.updatedAt || b.publishedAt || b.createdAt)?.getTime() || 0;
        return dateB - dateA;
      });
      const latestArticle = sortedArticles[0] || null;

      // Terakhir aktif
      const lastActiveDate = parseDate(user.lastActiveAt) || 
                             parseDate(latestArticle?.updatedAt || latestArticle?.publishedAt || latestArticle?.createdAt) ||
                             parseDate(user.createdAt);

      return {
        ...user,
        totalArticles: userArticles.length,
        publishedCount: publishedArticles.length,
        draftCount: draftArticles.length,
        scheduledCount: scheduledArticles.length,
        totalViews,
        latestArticle,
        lastActiveDate,
        articlesList: userArticles
      };
    }).sort((a, b) => b.publishedCount - a.publishedCount || b.totalViews - a.totalViews);
  }, [users, articles]);

  // Gabungan Aktivitas Riil & Inferred untuk Audit Trail yang Lengkap Sejak Hari Pertama
  const mergedAuditFeed = useMemo(() => {
    const feed = [];

    // 1. Masukkan log resmi dari activity_logs
    logs.forEach(log => {
      feed.push({
        id: log.id,
        type: 'real_log',
        userId: log.userId,
        userName: log.userName || 'Staf',
        userEmail: log.userEmail,
        userRole: log.userRole || 'reporter',
        action: log.action,
        targetTitle: log.targetTitle,
        targetId: log.targetId,
        targetType: log.targetType || 'article',
        details: log.details,
        date: parseDate(log.timestamp || log.createdAt) || new Date(),
      });
    });

    // 2. Tambahkan aktivitas dari artikel (terbit, buat, update) sebagai pelengkap
    articles.forEach(art => {
      const artDate = parseDate(art.publishedAt || art.createdAt);
      if (!artDate) return;

      const isPublished = art.status === 'published';
      feed.push({
        id: `art-${art.id}-${art.status}`,
        type: 'article_activity',
        userId: art.authorId,
        userName: art.author?.name || art.author?.email?.split('@')[0] || 'Jurnalis',
        userEmail: art.author?.email || '',
        userRole: art.author?.role || 'reporter',
        action: isPublished ? 'PUBLISH_ARTICLE' : 'UPDATE_ARTICLE',
        targetTitle: art.title || 'Tanpa Judul',
        targetId: art.id,
        targetType: 'article',
        details: `Kategori: ${art.category || 'Umum'} • Status: ${art.status}`,
        date: artDate,
      });
    });

    // Urutkan dari yang paling baru
    feed.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Hapus duplikasi berdasarkan targetId & action dalam jeda waktu 1 menit
    const unique = [];
    const seen = new Set();
    feed.forEach(item => {
      const key = `${item.targetId}-${item.action}-${Math.floor(item.date.getTime() / 60000)}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });

    return unique;
  }, [logs, articles]);

  // Filter untuk Audit Trail
  const filteredAuditFeed = useMemo(() => {
    return mergedAuditFeed.filter(item => {
      if (roleFilter !== 'all' && item.userRole !== roleFilter) return false;
      if (actionFilter !== 'all') {
        if (actionFilter === 'CATEGORY') {
          if (!item.action?.includes('CATEGORY')) return false;
        } else if (item.action !== actionFilter) {
          return false;
        }
      }
      if (searchQuery) {
        const queryLower = searchQuery.toLowerCase();
        const matchName = item.userName?.toLowerCase().includes(queryLower);
        const matchTitle = item.targetTitle?.toLowerCase().includes(queryLower);
        const matchDetails = item.details?.toLowerCase().includes(queryLower);
        if (!matchName && !matchTitle && !matchDetails) return false;
      }
      return true;
    });
  }, [mergedAuditFeed, roleFilter, actionFilter, searchQuery]);

  // Filter Staf untuk Tab KPI
  const filteredStaff = useMemo(() => {
    return staffMetrics.filter(staff => {
      if (roleFilter !== 'all' && staff.role !== roleFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = staff.name?.toLowerCase().includes(q) || staff.displayName?.toLowerCase().includes(q);
        const matchEmail = staff.email?.toLowerCase().includes(q);
        const matchKab = staff.kabKota?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchKab) return false;
      }
      return true;
    });
  }, [staffMetrics, roleFilter, searchQuery]);

  // Statistik Ringkas Global
  const totalPublished = useMemo(() => articles.filter(a => a.status === 'published').length, [articles]);
  const totalDraft = useMemo(() => articles.filter(a => a.status === 'draft' || a.status === 'pending').length, [articles]);
  const totalAllViews = useMemo(() => articles.reduce((sum, a) => sum + (Number(a.views) || 0), 0), [articles]);
  const topProducer = staffMetrics[0] || null;

  // Fungsi Ekspor Laporan CSV untuk Pimpinan
  const handleExportCSV = () => {
    const headers = ["Nama Staf", "Email", "Peran", "Wilayah", "Nomor HP", "Berita Tayang", "Draft", "Total Views", "Terakhir Aktif"];
    const rows = staffMetrics.map(s => [
      `"${s.name || s.displayName || s.email?.split('@')[0]}"`,
      `"${s.email || ''}"`,
      `"${s.role?.toUpperCase() || ''}"`,
      `"${s.kabKota || '-'}"`,
      `"${s.noHp || '-'}"`,
      s.publishedCount,
      s.draftCount,
      s.totalViews,
      `"${s.lastActiveDate ? s.lastActiveDate.toLocaleDateString('id-ID') : '-'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan-kinerja-redaksi-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper Badge Role
  const renderRoleBadge = (role) => {
    switch (role) {
      case 'superadmin':
        return <span style={{ background: 'rgba(230, 57, 70, 0.2)', color: '#ef4444', border: '1px solid rgba(230, 57, 70, 0.4)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>SUPERADMIN</span>;
      case 'admin':
        return <span style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.4)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>ADMIN</span>;
      case 'editor':
        return <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.4)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>EDITOR</span>;
      case 'reporter':
      default:
        return <span style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.4)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>REPORTER</span>;
    }
  };

  // Helper Action Icon
  const renderActionIcon = (action) => {
    switch (action) {
      case 'PUBLISH_ARTICLE':
        return <div style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={16} /></div>;
      case 'CREATE_ARTICLE':
        return <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PenTool size={16} /></div>;
      case 'UPDATE_ARTICLE':
        return <div style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={16} /></div>;
      case 'DELETE_ARTICLE':
        return <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></div>;
      case 'ACTIVATE_CATEGORY':
        return <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ToggleRight size={16} /></div>;
      case 'DEACTIVATE_CATEGORY':
        return <div style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ToggleLeft size={16} /></div>;
      case 'CREATE_CATEGORY':
        return <div style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Tag size={16} /></div>;
      case 'UPDATE_CATEGORY':
        return <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Layers size={16} /></div>;
      case 'DELETE_CATEGORY':
        return <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></div>;
      default:
        return <div style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Activity size={16} /></div>;
    }
  };

  // 1. Loading State
  if (authLoading || (loading && !refreshing)) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: '16px' }}>
        <div className="spinner"></div>
        <p style={{ color: '#aaa', fontSize: '14px' }}>Menyiapkan Ruang Kendali Superadmin...</p>
      </div>
    );
  }

  // 2. Strict Superadmin Security Guard
  if (userRole !== 'superadmin') {
    return (
      <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px', padding: '40px 24px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
            <ShieldAlert size={36} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>Akses Khusus Superadmin</h2>
          <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
            Halaman ini adalah <strong>Ruang Kendali & Audit Trail Tertutup</strong>. Hanya Pemimpin Redaksi / Superadmin yang memiliki wewenang untuk memantau aktivitas editorial dan performa tim jurnalis.
          </p>
          <button 
            onClick={() => router.push('/admin/dashboard')}
            style={{ padding: '10px 24px', background: '#333', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <ArrowLeft size={16} /> Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  // 3. Tampilan Utama Monitoring Superadmin
  return (
    <div style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto', color: 'var(--admin-text-primary)' }}>
      
      {/* Top Bar Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(230, 57, 70, 0.15)', color: '#ef4444', border: '1px solid rgba(230, 57, 70, 0.3)', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800 }}>
              <ShieldCheck size={13} /> RUANG KENDALI SUPERADMIN
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#22c55e', fontSize: '12px', fontWeight: 600 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 10px #22c55e' }}></span>
              Live Monitoring
            </span>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            Pantau Aktivitas & Kinerja Tim Redaksi
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Audit jejak langkah real-time Admin, Editor, dan Reporter serta evaluasi produktivitas karya berita.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleExportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--admin-hover-bg)', border: '1px solid var(--admin-card-border)', color: 'var(--admin-text-primary)', padding: '9px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            title="Download Rekap Kinerja format CSV"
          >
            <Download size={15} /> Ekspor Laporan
          </button>
          <button
            onClick={fetchMonitoringData}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-accent)', border: 'none', color: '#fff', padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.7 : 1, transition: 'all 0.2s' }}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> 
            {refreshing ? 'Memperbarui...' : 'Muat Ulang'}
          </button>
        </div>
      </div>

      {/* Global Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        
        {/* Card 1: Staf Redaksi */}
        <div style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '14px', padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tim Redaksi Aktif</div>
              <div style={{ fontSize: '28px', fontWeight: 900, marginTop: '4px', color: 'var(--admin-text-primary)' }}>{users.length} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--admin-text-secondary)' }}>Personil</span></div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '14px', fontSize: '11px', color: 'var(--admin-text-secondary)' }}>
            <span>Admin: <strong style={{ color: 'var(--admin-text-primary)' }}>{users.filter(u => u.role === 'admin').length}</strong></span>
            <span>•</span>
            <span>Editor: <strong style={{ color: 'var(--admin-text-primary)' }}>{users.filter(u => u.role === 'editor').length}</strong></span>
            <span>•</span>
            <span>Reporter: <strong style={{ color: 'var(--admin-text-primary)' }}>{users.filter(u => u.role === 'reporter').length}</strong></span>
          </div>
        </div>

        {/* Card 2: Berita Terbit vs Draft */}
        <div style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Produksi Berita</div>
              <div style={{ fontSize: '28px', fontWeight: 900, marginTop: '4px', color: '#16a34a' }}>{totalPublished} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--admin-text-secondary)' }}>Tayang</span></div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Newspaper size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '14px', fontSize: '11px', color: 'var(--admin-text-secondary)' }}>
            <span style={{ color: '#d97706', fontWeight: 600 }}>Draft/Pending: <strong style={{ color: 'var(--admin-text-primary)' }}>{totalDraft}</strong></span>
            <span>•</span>
            <span>Total Arsip: <strong style={{ color: 'var(--admin-text-primary)' }}>{articles.length}</strong></span>
          </div>
        </div>

        {/* Card 3: Total Pembaca (Views) */}
        <div style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Pembaca Karya</div>
              <div style={{ fontSize: '28px', fontWeight: 900, marginTop: '4px', color: '#0284c7' }}>{totalAllViews.toLocaleString('id-ID')} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--admin-text-secondary)' }}>Views</span></div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.1)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Eye size={22} />
            </div>
          </div>
          <div style={{ marginTop: '14px', fontSize: '11px', color: 'var(--admin-text-secondary)' }}>
            Rata-rata <strong style={{ color: 'var(--admin-text-primary)' }}>{articles.length > 0 ? Math.round(totalAllViews / articles.length) : 0}</strong> views per artikel
          </div>
        </div>

        {/* Card 4: Top Reporter / Jurnalis */}
        <div style={{ border: '1px solid var(--admin-card-border)', borderRadius: '14px', padding: '20px', background: 'linear-gradient(135deg, var(--admin-card-bg) 0%, rgba(230, 57, 70, 0.08) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Award size={14} /> Jurnalis Paling Produktif
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '8px', color: 'var(--admin-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                {topProducer ? (topProducer.name || topProducer.displayName || topProducer.email?.split('@')[0]) : '-'}
              </div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(230, 57, 70, 0.2)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Flame size={22} />
            </div>
          </div>
          <div style={{ marginTop: '14px', fontSize: '11px', color: 'var(--admin-text-secondary)' }}>
            Menyumbang <strong style={{ color: 'var(--admin-text-primary)' }}>{topProducer?.publishedCount || 0} artikel</strong> ({topProducer?.totalViews.toLocaleString('id-ID') || 0} views)
          </div>
        </div>

      </div>

      {/* Navigation Tabs & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '16px', marginBottom: '24px' }}>
        
        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { setActiveTab('kpi'); setSelectedStaff(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, border: '1px solid var(--admin-card-border)', cursor: 'pointer', background: activeTab === 'kpi' ? 'var(--color-accent)' : 'var(--admin-card-bg)', color: activeTab === 'kpi' ? '#fff' : 'var(--admin-text-secondary)', transition: 'all 0.2s' }}
          >
            <Award size={16} /> Kinerja & KPI Tim ({staffMetrics.length})
          </button>
          <button
            onClick={() => { setActiveTab('audit'); setSelectedStaff(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, border: '1px solid var(--admin-card-border)', cursor: 'pointer', background: activeTab === 'audit' ? 'var(--color-accent)' : 'var(--admin-card-bg)', color: activeTab === 'audit' ? '#fff' : 'var(--admin-text-secondary)', transition: 'all 0.2s' }}
          >
            <Activity size={16} /> Live Audit Trail ({filteredAuditFeed.length})
          </button>
          <button
            onClick={() => { setActiveTab('articles'); setSelectedStaff(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, border: '1px solid var(--admin-card-border)', cursor: 'pointer', background: activeTab === 'articles' ? 'var(--color-accent)' : 'var(--admin-card-bg)', color: activeTab === 'articles' ? '#fff' : 'var(--admin-text-secondary)', transition: 'all 0.2s' }}
          >
            <Newspaper size={16} /> Matriks Berita Redaksi
          </button>
        </div>

        {/* Search & Role Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-secondary)' }} />
            <input 
              type="text"
              placeholder="Cari nama atau judul..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 34px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '8px', color: 'var(--admin-text-primary)', fontSize: '13px' }}
            />
          </div>

          {/* Role Filter Dropdown */}
          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ padding: '8px 12px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '8px', color: 'var(--admin-text-primary)', fontSize: '13px', cursor: 'pointer' }}
          >
            <option value="all">Semua Peran</option>
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="reporter">Reporter</option>
          </select>

          {/* Action Filter (Hanya tampil di tab Audit) */}
          {activeTab === 'audit' && (
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{ padding: '8px 12px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '8px', color: 'var(--admin-text-primary)', fontSize: '13px', cursor: 'pointer' }}
            >
              <option value="all">Semua Tindakan</option>
              <option value="PUBLISH_ARTICLE">Terbitkan Berita</option>
              <option value="CREATE_ARTICLE">Tulis Berita Baru</option>
              <option value="UPDATE_ARTICLE">Edit / Revisi</option>
              <option value="DELETE_ARTICLE">Hapus Berita</option>
              <option value="CATEGORY">Pengaturan Kategori (Semua)</option>
              <option value="ACTIVATE_CATEGORY">🟢 Aktifkan Kategori</option>
              <option value="DEACTIVATE_CATEGORY">⚪ Nonaktifkan Kategori</option>
              <option value="CREATE_CATEGORY">🏷️ Tambah Kategori Baru</option>
              <option value="DELETE_CATEGORY">🗑️ Hapus Kategori</option>
            </select>
          )}

        </div>

      </div>

      {/* ======================= TAB 1: KINERJA & KPI TIM ======================= */}
      {activeTab === 'kpi' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
            {filteredStaff.map((staff, idx) => {
              const isSelected = selectedStaff?.id === staff.id;
              return (
                <div 
                  key={staff.id}
                  style={{ background: 'var(--admin-card-bg)', border: isSelected ? '2px solid var(--color-accent)' : '1px solid var(--admin-card-border)', borderRadius: '16px', padding: '20px', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                >
                  <div>
                    {/* Header Personil */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {staff.photoURL ? (
                          <img src={staff.photoURL} alt={staff.name || 'Avatar'} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--admin-card-border)' }} />
                        ) : (
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '18px' }}>
                            {(staff.name || staff.displayName || staff.email || 'J')[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--admin-text-primary)', lineHeight: 1.2 }}>
                            {staff.name || staff.displayName || staff.email?.split('@')[0]}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', marginTop: '2px' }}>
                            {staff.email}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {renderRoleBadge(staff.role)}
                        {idx === 0 && (
                          <div style={{ marginTop: '4px', fontSize: '10px', fontWeight: 800, color: '#d97706', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
                            <Award size={12} /> TOP #1
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Meta info tambahan */}
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', padding: '10px 12px', background: 'var(--admin-hover-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '10px', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '16px' }}>
                      <span>Wilayah: <strong style={{ color: 'var(--admin-text-primary)' }}>{staff.kabKota || 'Pusat'}</strong></span>
                      {staff.noHp && <span>WA: <strong style={{ color: 'var(--admin-text-primary)' }}>{staff.noHp}</strong></span>}
                      <span>Aktif: <strong style={{ color: '#16a34a' }}>{timeAgo(staff.lastActiveDate)}</strong></span>
                    </div>

                    {/* Metrik Statistik */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center', marginBottom: '16px' }}>
                      <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '10px 6px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#16a34a' }}>{staff.publishedCount}</div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Tayang</div>
                      </div>
                      <div style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.2)', padding: '10px 6px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#d97706' }}>{staff.draftCount}</div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Draft</div>
                      </div>
                      <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '10px 6px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#0284c7' }}>{staff.totalViews.toLocaleString('id-ID')}</div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Views</div>
                      </div>
                    </div>

                    {/* Berita Terakhir */}
                    {staff.latestArticle ? (
                      <div style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', borderTop: '1px solid var(--admin-card-border)', paddingTop: '12px', marginBottom: '14px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '3px' }}>Tulisan Terakhir:</div>
                        <div style={{ color: 'var(--admin-text-primary)', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          "{staff.latestArticle.title}"
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', fontStyle: 'italic', marginBottom: '14px' }}>
                        Belum ada riwayat penulisan berita.
                      </div>
                    )}
                  </div>

                  {/* Tombol Aksi */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setSelectedStaff(staff);
                        setSearchQuery(staff.name || staff.displayName || staff.email);
                        setActiveTab('articles');
                      }}
                      style={{ flex: 1, padding: '8px 12px', background: 'var(--admin-hover-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '8px', color: 'var(--admin-text-primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <FileText size={14} /> Lihat {staff.totalArticles} Karya
                    </button>
                    <Link
                      href={`/admin/users`}
                      style={{ padding: '8px 12px', background: 'var(--admin-hover-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '8px', color: 'var(--admin-text-secondary)', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Kelola Profil di Tim Jurnalis"
                    >
                      Profil &rarr;
                    </Link>
                  </div>

                </div>
              );
            })}
          </div>

          {filteredStaff.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--admin-text-secondary)' }}>
              <Users size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <div>Tidak ditemukan staf redaksi dengan filter ini.</div>
            </div>
          )}
        </div>
      )}

      {/* ======================= TAB 2: LIVE AUDIT TRAIL ======================= */}
      {activeTab === 'audit' && (
        <div style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '16px', overflow: 'hidden' }}>
          
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--admin-card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={16} style={{ color: '#16a34a' }} /> Linimasa Aktivitas Terkini (Real-Time Feed)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--admin-text-secondary)' }}>
              Menampilkan {filteredAuditFeed.length} aktivitas terakhir
            </div>
          </div>

          <div style={{ padding: '12px 24px' }}>
            {filteredAuditFeed.map((item, idx) => (
              <div 
                key={item.id || idx}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px 0', borderBottom: idx < filteredAuditFeed.length - 1 ? '1px solid var(--admin-card-border)' : 'none' }}
              >
                {/* Action Icon */}
                <div style={{ flexShrink: 0 }}>
                  {renderActionIcon(item.action)}
                </div>

                {/* Content Details */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 800, color: 'var(--admin-text-primary)', fontSize: '13px' }}>
                      {item.userName}
                    </span>
                    {renderRoleBadge(item.userRole)}
                    <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)' }}>•</span>
                    <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {timeAgo(item.date)}
                    </span>
                  </div>

                  <div style={{ fontSize: '14px', color: 'var(--admin-text-primary)', fontWeight: 600, marginBottom: '2px' }}>
                    {item.action === 'PUBLISH_ARTICLE' && '🚀 Menerbitkan berita:'}
                    {item.action === 'CREATE_ARTICLE' && '📝 Menulis berita baru:'}
                    {item.action === 'UPDATE_ARTICLE' && '✏️ Menyunting artikel:'}
                    {item.action === 'DELETE_ARTICLE' && '🗑️ Menghapus berita:'}
                    {item.action === 'ACTIVATE_CATEGORY' && '🟢 Mengaktifkan kategori portal:'}
                    {item.action === 'DEACTIVATE_CATEGORY' && '⚪ Menonaktifkan kategori portal:'}
                    {item.action === 'CREATE_CATEGORY' && '🏷️ Menambahkan kategori baru:'}
                    {item.action === 'UPDATE_CATEGORY' && '🎨 Memperbarui pengaturan kategori:'}
                    {item.action === 'DELETE_CATEGORY' && '🗑️ Menghapus kategori portal:'}
                    {!['PUBLISH_ARTICLE', 'CREATE_ARTICLE', 'UPDATE_ARTICLE', 'DELETE_ARTICLE', 'ACTIVATE_CATEGORY', 'DEACTIVATE_CATEGORY', 'CREATE_CATEGORY', 'UPDATE_CATEGORY', 'DELETE_CATEGORY'].includes(item.action) && '⚡ Aktivitas:'}
                    {' '}
                    <span style={{ color: 'var(--admin-text-primary)', fontWeight: 700 }}>"{item.targetTitle}"</span>
                  </div>

                  {item.details && (
                    <div style={{ fontSize: '12px', color: 'var(--admin-text-secondary)' }}>
                      {item.details}
                    </div>
                  )}
                </div>

                {/* Quick Link to Article / Category */}
                {item.targetId && item.action !== 'DELETE_ARTICLE' && item.action !== 'DELETE_CATEGORY' && (
                  <div style={{ flexShrink: 0 }}>
                    {item.targetType === 'category' || item.action?.includes('CATEGORY') ? (
                      <Link
                        href="/admin/categories"
                        style={{ padding: '6px 12px', background: 'var(--admin-hover-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '6px', color: 'var(--admin-text-primary)', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Buka Kategori Portal"
                      >
                        Buka Kategori <ChevronRight size={12} />
                      </Link>
                    ) : (
                      <Link
                        href={`/admin/editor?id=${item.targetId}`}
                        style={{ padding: '6px 12px', background: 'var(--admin-hover-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '6px', color: 'var(--admin-text-primary)', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Buka di Editor"
                      >
                        Buka Editor <ChevronRight size={12} />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ))}

            {filteredAuditFeed.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--admin-text-secondary)' }}>
                <Activity size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <div>Belum ada log aktivitas yang sesuai dengan filter pencarian.</div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================= TAB 3: MATRIKS BERITA REDAKSI ======================= */}
      {activeTab === 'articles' && (
        <div style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '16px', overflow: 'hidden' }}>
          
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--admin-card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Newspaper size={16} /> Daftar Seluruh Tulisan Berita Tim Redaksi
            </div>
            {searchQuery && (
              <div style={{ fontSize: '12px', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Menampilkan karya terkait: <strong>"{searchQuery}"</strong></span>
                <button 
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', color: 'var(--admin-text-primary)', cursor: 'pointer', textDecoration: 'underline', fontSize: '12px' }}
                >
                  Reset Filter
                </button>
              </div>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-card-border)', color: 'var(--admin-text-secondary)', background: 'var(--admin-hover-bg)' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 700 }}>Judul Berita</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>Penulis / Staf</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>Kategori</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>Pembaca</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>Waktu</th>
                  <th style={{ padding: '14px 20px', fontWeight: 700, textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {articles
                  .filter(art => {
                    if (searchQuery) {
                      const q = searchQuery.toLowerCase();
                      const matchTitle = art.title?.toLowerCase().includes(q);
                      const matchAuthor = art.author?.name?.toLowerCase().includes(q) || art.author?.email?.toLowerCase().includes(q);
                      const matchCat = art.category?.toLowerCase().includes(q);
                      if (!matchTitle && !matchAuthor && !matchCat) return false;
                    }
                    return true;
                  })
                  .slice(0, 50)
                  .map((art) => {
                    const artDate = parseDate(art.publishedAt || art.createdAt);
                    return (
                      <tr key={art.id} style={{ borderBottom: '1px solid var(--admin-card-border)', transition: 'background 0.2s' }}>
                        <td style={{ padding: '14px 20px', maxWidth: '320px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {art.title}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-secondary)' }}>
                            ID: {art.id}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--admin-text-primary)' }}>
                            {art.author?.name || art.author?.email?.split('@')[0] || 'Redaksi'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-secondary)' }}>
                            {art.author?.email}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ background: 'var(--admin-hover-bg)', border: '1px solid var(--admin-card-border)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', color: 'var(--admin-text-primary)' }}>
                            {art.category || 'Umum'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {art.status === 'published' ? (
                            <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '11px', background: 'rgba(34, 197, 94, 0.1)', padding: '3px 8px', borderRadius: '6px' }}>TAYANG</span>
                          ) : (
                            <span style={{ color: '#d97706', fontWeight: 700, fontSize: '11px', background: 'rgba(234, 179, 8, 0.1)', padding: '3px 8px', borderRadius: '6px' }}>DRAFT</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#0284c7', fontWeight: 700 }}>
                          {(Number(art.views) || 0).toLocaleString('id-ID')}
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--admin-text-secondary)', fontSize: '12px' }}>
                          {artDate ? timeAgo(artDate) : '-'}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <Link
                              href={`/admin/editor?id=${art.id}`}
                              style={{ padding: '4px 10px', background: 'var(--admin-hover-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '6px', color: 'var(--admin-text-primary)', fontSize: '11px', textDecoration: 'none' }}
                            >
                              Edit
                            </Link>
                            {art.status === 'published' && (
                              <a
                                href={art.category === 'Video' ? `/watch/${art.slug || art.id}` : `/article/${art.slug || art.id}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ padding: '4px 10px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', color: '#2563eb', fontSize: '11px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                              >
                                Live <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* Footer Info */}
      <div style={{ marginTop: '36px', textAlign: 'center', color: 'var(--admin-text-secondary)', fontSize: '12px', borderTop: '1px solid var(--admin-card-border)', paddingTop: '20px' }}>
        Sistem Pemantauan Terpadu BedainApp • Terakhir disinkronkan: {lastRefreshedAt.toLocaleTimeString('id-ID')} WIB
      </div>

    </div>
  );
};

export default AdminMonitoring;

