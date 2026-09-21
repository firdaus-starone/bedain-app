import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, orderBy, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { MessageSquare, Check, X, Trash2, Clock, User, Newspaper, Filter } from 'lucide-react';

const Navigate = ({to}) => { React.useEffect(() => { if (typeof window !== 'undefined') window.location.href = to; }, [to]); return null; };

const AdminComments = () => {
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [actionLoading, setActionLoading] = useState({});

  const tabs = [
    { key: 'all', label: 'Semua' },
    { key: 'pending', label: 'Menunggu' },
    { key: 'approved', label: 'Disetujui' },
    { key: 'rejected', label: 'Ditolak' },
  ];

  useEffect(() => {
    if (!authLoading && !currentUser) router.push('/admin');
  }, [currentUser, authLoading, router]);

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'comments'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await updateDoc(doc(db, 'comments', id), { status });
      setComments(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    } catch (err) {
      console.error('Error updating comment:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const deleteComment = async (id) => {
    if (!window.confirm('Hapus komentar ini secara permanen?')) return;
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await deleteDoc(doc(db, 'comments', id));
      setComments(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting comment:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filteredComments = activeTab === 'all' ? comments : comments.filter(c => c.status === activeTab);
  const pendingCount = comments.filter(c => c.status === 'pending').length;

  const statusBadge = (status) => {
    const styles = {
      pending: { background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' },
      approved: { background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' },
      rejected: { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' },
    };
    const labels = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };
    return (
      <span style={{ ...styles[status], padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>
        {labels[status] || status}
      </span>
    );
  };

  if (authLoading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--admin-bg)', color: 'var(--admin-text-primary)' }}><div className="spinner" /></div>;
  if (!currentUser) return <Navigate to="/admin" />;

  return (
    <div className="admin-layout">
            <main className="admin-main" style={{ padding: '32px', background: 'var(--admin-bg)', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ color: 'var(--admin-text-primary)', fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MessageSquare size={22} color="#e63946" />
              Moderasi Komentar
            </h1>
            <p style={{ color: 'var(--admin-text-secondary)', fontSize: '14px', marginTop: '4px' }}>
              {pendingCount > 0
                ? <span style={{ color: '#f59e0b' }}>⚠️ {pendingCount} komentar menunggu persetujuan Anda</span>
                : 'Semua komentar sudah ditangani ✅'}
            </p>
          </div>
          <button onClick={fetchComments} style={{ background: 'var(--admin-hover-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🔄 Refresh
          </button>
        </div>

        {/* Stats Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total', count: comments.length, color: 'var(--admin-text-secondary)' },
            { label: 'Menunggu', count: comments.filter(c => c.status === 'pending').length, color: '#f59e0b' },
            { label: 'Disetujui', count: comments.filter(c => c.status === 'approved').length, color: '#22c55e' },
            { label: 'Ditolak', count: comments.filter(c => c.status === 'rejected').length, color: '#ef4444' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ color: s.color, fontSize: '1.8rem', fontWeight: 800 }}>{s.count}</div>
              <div style={{ color: 'var(--admin-text-secondary)', fontSize: '12px', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--admin-card-bg)', padding: '4px', borderRadius: '12px', marginBottom: '20px', width: 'fit-content', border: '1px solid var(--admin-card-border)' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s',
                background: activeTab === tab.key ? '#e63946' : 'transparent',
                color: activeTab === tab.key ? '#fff' : 'var(--admin-text-secondary)',
              }}
            >
              {tab.label}
              {tab.key === 'pending' && pendingCount > 0 && (
                <span style={{ background: '#fff', color: '#e63946', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 800, marginLeft: '6px' }}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Comments Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--admin-text-secondary)' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            Memuat komentar...
          </div>
        ) : filteredComments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--admin-text-secondary)', background: 'var(--admin-card-bg)', borderRadius: '16px', border: '1px solid var(--admin-card-border)' }}>
            <MessageSquare size={48} strokeWidth={1} style={{ marginBottom: '12px', color: 'var(--admin-text-secondary)', opacity: 0.5 }} />
            <p>Tidak ada komentar di kategori ini.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredComments.map(c => (
              <div key={c.id} style={{
                background: 'var(--admin-bg)',
                border: c.status === 'pending' ? '1px solid rgba(245,158,11,0.25)' : '1px solid var(--admin-card-border)',
                borderRadius: '14px', padding: '20px', transition: 'border 0.2s'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  {/* Comment Info */}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(230,57,70,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={14} color="#e63946" />
                      </div>
                      <strong style={{ color: 'var(--admin-text-primary)', fontSize: '14px' }}>{c.authorName}</strong>
                      {c.authorEmail && <span style={{ color: 'var(--admin-text-secondary)', fontSize: '12px' }}>{c.authorEmail}</span>}
                      {statusBadge(c.status)}
                    </div>

                    {/* Comment Content */}
                    <p style={{ color: 'var(--admin-text-secondary)', fontSize: '14px', lineHeight: 1.6, margin: '0 0 10px 42px', padding: '12px', background: 'var(--admin-hover-bg)', borderRadius: '8px', borderLeft: '3px solid var(--admin-border)' }}>
                      {c.content}
                    </p>

                    {/* Article & Time */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: '42px', flexWrap: 'wrap', marginTop: '10px' }}>
                      {c.articleTitle && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--admin-hover-bg)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--admin-border)' }}>
                          <Newspaper size={14} color="var(--admin-text-secondary)" />
                          <span style={{ color: 'var(--admin-text-secondary)', fontSize: '12px', fontWeight: 600 }}>Artikel:</span>
                          <a href={`/article/${c.articleSlug}`} target="_blank" rel="noreferrer" style={{ color: '#0ea5e9', fontSize: '12px', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {c.articleTitle.length > 55 ? c.articleTitle.slice(0, 55) + '…' : c.articleTitle}
                          </a>
                        </div>
                      )}
                      <span style={{ color: 'var(--admin-text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {formatDate(c.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                    {c.status !== 'approved' && (
                      <button
                        onClick={() => updateStatus(c.id, 'approved')}
                        disabled={actionLoading[c.id]}
                        title="Setujui komentar"
                        style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', opacity: actionLoading[c.id] ? 0.5 : 1 }}
                      >
                        <Check size={14} /> Setujui
                      </button>
                    )}
                    {c.status !== 'rejected' && (
                      <button
                        onClick={() => updateStatus(c.id, 'rejected')}
                        disabled={actionLoading[c.id]}
                        title="Tolak komentar"
                        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', opacity: actionLoading[c.id] ? 0.5 : 1 }}
                      >
                        <X size={14} /> Tolak
                      </button>
                    )}
                    <button
                      onClick={() => deleteComment(c.id)}
                      disabled={actionLoading[c.id]}
                      title="Hapus permanen"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', opacity: actionLoading[c.id] ? 0.5 : 1 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminComments;
