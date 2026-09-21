"use client";
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Mail, Search, Trash2, Download, Users } from 'lucide-react';

export default function AdminNewsletter() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'newsletter_subscribers'), orderBy('subscribedAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setSubscribers(data);
    } catch (err) {
      console.error('Gagal mengambil data pelanggan newsletter:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus pelanggan email ini dari daftar newsletter?')) return;
    try {
      await deleteDoc(doc(db, 'newsletter_subscribers', id));
      setSubscribers(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Gagal menghapus pelanggan:', err);
    }
  };

  const handleExportCSV = () => {
    if (subscribers.length === 0) return;
    
    // Create CSV content
    const headers = ['Email', 'Tanggal Daftar', 'Status'];
    const rows = subscribers.map(sub => [
      sub.email || '',
      sub.subscribedAt?.toDate ? sub.subscribedAt.toDate().toLocaleString('id-ID') : '',
      sub.status || 'active'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(field => `"${field}"`).join(','))
    ].join('\n');

    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `newsletter_subscribers_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredSubscribers = subscribers.filter(item => {
    return !searchQuery.trim() || item.email?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="admin-layout">
      <main className="admin-main" style={{ padding: '2rem 2.5rem', background: 'var(--admin-bg)', minHeight: '100vh' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: '0 0 0.3rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Mail color="#3b82f6" size={30} />
              <span>Daftar Pelanggan Newsletter</span>
              <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontSize: '0.85rem', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 800 }}>
                {subscribers.length} Email
              </span>
            </h1>
            <p style={{ color: 'var(--admin-text-secondary)', margin: 0, fontSize: '0.95rem' }}>
              Kelola dan unduh daftar email pelanggan yang berlangganan newsletter
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Search Box */}
            <div style={{ position: 'relative', minWidth: '280px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-secondary)' }} />
              <input
                type="text"
                placeholder="Cari email pelanggan..."
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
            
            <button
              onClick={handleExportCSV}
              disabled={subscribers.length === 0}
              style={{
                backgroundColor: '#10b981',
                color: '#fff',
                border: 'none',
                padding: '0 1.5rem',
                borderRadius: '10px',
                fontWeight: 700,
                cursor: subscribers.length === 0 ? 'not-allowed' : 'pointer',
                opacity: subscribers.length === 0 ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
            >
              <Download size={18} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Table / Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--admin-text-secondary)' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p>Memuat daftar pelanggan newsletter...</p>
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div style={{
            backgroundColor: 'var(--admin-card-bg)',
            border: '1px dashed var(--admin-border)',
            borderRadius: '16px',
            padding: '4rem 2rem',
            textAlign: 'center',
            color: 'var(--admin-text-secondary)'
          }}>
            <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <h3 style={{ color: 'var(--admin-text-primary)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Belum Ada Pelanggan</h3>
            <p style={{ maxWidth: '400px', margin: '0 auto' }}>
              Email pengunjung yang berlangganan newsletter akan muncul di sini.
            </p>
          </div>
        ) : (
          <div style={{ backgroundColor: 'var(--admin-card-bg)', borderRadius: '16px', border: '1px solid var(--admin-border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', backgroundColor: 'var(--admin-hover-bg)' }}>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>Email</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>Tanggal Daftar</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontWeight: 600, fontSize: '0.9rem', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscribers.map((sub) => (
                  <tr key={sub.id} style={{ borderBottom: '1px solid var(--admin-border)', transition: 'background 0.2s' }} className="admin-table-row">
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-primary)', fontWeight: 600 }}>
                      {sub.email}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.9rem' }}>
                      {sub.subscribedAt?.toDate ? sub.subscribedAt.toDate().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }) : 'Tidak diketahui'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ 
                        backgroundColor: sub.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                        color: sub.status === 'active' ? '#10b981' : '#ef4444', 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '6px', 
                        fontSize: '0.8rem', 
                        fontWeight: 700 
                      }}>
                        {sub.status === 'active' ? 'AKTIF' : 'NON-AKTIF'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDelete(sub.id)}
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          color: '#ef4444',
                          border: 'none',
                          padding: '0.5rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Hapus Pelanggan"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
