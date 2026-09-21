import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Mail, MessageSquare, Trash2, Eye, CheckCircle2, AlertCircle, 
  Search, Phone, Briefcase, Calendar, ArrowLeft, Send, Sparkles, Filter
} from 'lucide-react';

export default function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDept, setActiveDept] = useState('all'); // all, partnership, editorial, correction, technical
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);

  const deptMap = {
    partnership: { label: '🤝 Kerja Sama / Iklan', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
    editorial: { label: '📰 Redaksi / Siaran Pers', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
    correction: { label: '⚖️ Hak Jawab / Koreksi', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
    technical: { label: '🐛 Kendala Teknis / Bug', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'contact_messages'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setMessages(data);
    } catch (err) {
      console.error('Gagal mengambil pesan kontak:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleOpenDetail = async (msg) => {
    setSelectedMessage(msg);
    if (msg.status === 'unread') {
      try {
        await updateDoc(doc(db, 'contact_messages', msg.id), { status: 'read' });
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'read' } : m));
      } catch (err) {
        console.error('Gagal update status read:', err);
      }
    }
  };

  const handleDelete = async (msgId) => {
    if (!window.confirm('Hapus permanen pesan ini?')) return;
    try {
      await deleteDoc(doc(db, 'contact_messages', msgId));
      setMessages(prev => prev.filter(item => item.id !== msgId));
      if (selectedMessage && selectedMessage.id === msgId) {
        setSelectedMessage(null);
      }
    } catch (err) {
      console.error('Gagal menghapus pesan:', err);
    }
  };

  const filteredMessages = messages.filter(item => {
    const matchesDept = activeDept === 'all' || item.department === activeDept;
    const matchesSearch = !searchQuery.trim() || 
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.emailOrPhone?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const unreadCount = messages.filter(m => m.status === 'unread').length;

  return (
    <div className="admin-layout">
      
      <main className="admin-main" style={{ padding: '2rem 2.5rem', background: 'var(--admin-bg)', minHeight: '100vh' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', margin: '0 0 0.3rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <MessageSquare color="#E62020" size={30} />
              <span>Kotak Masuk Pesan & Kemitraan</span>
              {unreadCount > 0 && (
                <span style={{ backgroundColor: '#E62020', color: '#fff', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 800 }}>
                  {unreadCount} Baru
                </span>
              )}
            </h1>
            <p style={{ color: '#a1a1aa', margin: 0, fontSize: '0.95rem' }}>
              Daftar pesan masuk, penawaran iklan banner, siaran pers, dan pengaduan dari halaman Kontak (`/kontak`)
            </p>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '280px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
            <input
              type="text"
              placeholder="Cari nama, email, atau subjek..."
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

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveDept('all')}
            style={{
              padding: '0.55rem 1.1rem',
              borderRadius: '10px',
              border: activeDept === 'all' ? '1px solid #E62020' : '1px solid rgba(255,255,255,0.08)',
              backgroundColor: activeDept === 'all' ? 'rgba(230, 32, 32, 0.15)' : '#18181b',
              color: activeDept === 'all' ? '#ff4d4d' : '#a1a1aa',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Semua Pesan ({messages.length})
          </button>

          {Object.entries(deptMap).map(([key, info]) => {
            const count = messages.filter(m => m.department === key).length;
            return (
              <button
                key={key}
                onClick={() => setActiveDept(key)}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '10px',
                  border: activeDept === key ? `1px solid ${info.color}` : '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: activeDept === key ? info.bg : '#18181b',
                  color: activeDept === key ? info.color : '#a1a1aa',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {info.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Messages Table/Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#71717a' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p>Memuat kotak masuk pesan kontak...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div style={{
            backgroundColor: '#18181b',
            border: '1px dashed rgba(255,255,255,0.12)',
            borderRadius: '16px',
            padding: '4rem 2rem',
            textAlign: 'center',
            color: '#71717a'
          }}>
            <Mail size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Belum Ada Pesan Masuk</h3>
            <p style={{ maxWidth: '400px', margin: '0 auto' }}>
              Saat pengunjung mengirimkan pesan melalui form di halaman Kontak (`/kontak`), seluruh pesannya akan masuk dan tersimpan di sini.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredMessages.map(msg => {
              const deptInfo = deptMap[msg.department] || { label: 'Umum', color: '#a1a1aa', bg: 'rgba(255,255,255,0.08)' };
              const isUnread = msg.status === 'unread';

              return (
                <div
                  key={msg.id}
                  onClick={() => handleOpenDetail(msg)}
                  style={{
                    backgroundColor: isUnread ? '#1e1e24' : '#18181b',
                    border: isUnread ? '1.5px solid #E62020' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isUnread ? '0 4px 20px rgba(230,32,32,0.15)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1, overflow: 'hidden' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      backgroundColor: deptInfo.bg,
                      color: deptInfo.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontWeight: 800
                    }}>
                      <Mail size={22} />
                    </div>

                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: '#fff', fontWeight: isUnread ? 800 : 600, fontSize: '1.05rem' }}>
                          {msg.name}
                        </span>
                        {isUnread && (
                          <span style={{ backgroundColor: '#E62020', color: '#fff', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>
                            BARU
                          </span>
                        )}
                        <span style={{ color: deptInfo.color, backgroundColor: deptInfo.bg, fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 700 }}>
                          {deptInfo.label}
                        </span>
                      </div>

                      <div style={{ color: '#e4e4e7', fontWeight: isUnread ? 700 : 500, fontSize: '0.95rem', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {msg.subject || 'Tanpa Subjek'}
                      </div>

                      <div style={{ color: '#71717a', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {msg.message}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right', color: '#71717a', fontSize: '0.8rem' }}>
                      <div>{msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Baru saja'}</div>
                      <div>{msg.emailOrPhone}</div>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        color: '#ef4444',
                        border: 'none',
                        padding: '0.6rem',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                      title="Hapus Pesan"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Message Detail Modal */}
        {selectedMessage && (
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
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '700px',
              maxHeight: '90vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
              overflow: 'hidden'
            }}>
              {/* Modal Header */}
              <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#121214' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button onClick={() => setSelectedMessage(null)} style={{ backgroundColor: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '0.2rem' }}>
                    <ArrowLeft size={20} />
                  </button>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    Detail Pesan Masuk
                  </h3>
                </div>

                <div style={{
                  backgroundColor: (deptMap[selectedMessage.department] || {}).bg || 'rgba(255,255,255,0.1)',
                  color: (deptMap[selectedMessage.department] || {}).color || '#fff',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.82rem'
                }}>
                  {(deptMap[selectedMessage.department] || {}).label || selectedMessage.department}
                </div>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Sender Banner */}
                <div style={{ backgroundColor: '#0f0f12', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h4 style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.3rem' }}>{selectedMessage.name}</h4>
                    <div style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>Email / Kontak: <strong style={{ color: '#fff' }}>{selectedMessage.emailOrPhone}</strong></div>
                  </div>
                  
                  <div style={{ textAlign: 'right', color: '#71717a', fontSize: '0.82rem' }}>
                    <div>Waktu Pengiriman:</div>
                    <div style={{ color: '#fff', fontWeight: 600 }}>
                      {selectedMessage.createdAt?.toDate ? selectedMessage.createdAt.toDate().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }) : 'Baru saja'}
                    </div>
                  </div>
                </div>

                {/* Subject & Message Content */}
                <div>
                  <div style={{ color: '#71717a', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.3rem' }}>Subjek Pesan:</div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', margin: '0 0 1rem' }}>
                    {selectedMessage.subject || 'Tanpa Subjek'}
                  </h3>

                  <div style={{ color: '#71717a', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.3rem' }}>Isi Pesan:</div>
                  <div style={{ color: '#e4e4e7', lineHeight: 1.8, fontSize: '1.05rem', whiteSpace: 'pre-wrap', backgroundColor: '#0f0f12', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {selectedMessage.message}
                  </div>
                </div>

              </div>

              {/* Modal Footer (Reply Buttons) */}
              <div style={{ padding: '1.25rem 1.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#121214', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <button
                  onClick={() => handleDelete(selectedMessage.id)}
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'none', padding: '0.7rem 1.25rem', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Trash2 size={16} />
                  <span>Hapus</span>
                </button>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {selectedMessage.emailOrPhone?.includes('@') ? (
                    <a
                      href={`mailto:${selectedMessage.emailOrPhone}?subject=Balasan dari BEDAIN NEWS: ${encodeURIComponent(selectedMessage.subject || 'Pesan Anda')}`}
                      style={{ backgroundColor: '#3b82f6', color: '#fff', textDecoration: 'none', padding: '0.7rem 1.5rem', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <Mail size={16} />
                      <span>Balas via Email</span>
                    </a>
                  ) : null}

                  <a
                    href={`https://wa.me/${selectedMessage.emailOrPhone.replace(/[^0-9]/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(`Halo ${selectedMessage.name}, kami dari tim Redaksi/Bisnis BEDAIN NEWS membalas pesan Anda terkait "${selectedMessage.subject || 'Pesan Kontak'}"...`)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ backgroundColor: '#10b981', color: '#fff', textDecoration: 'none', padding: '0.7rem 1.5rem', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <Phone size={16} />
                    <span>Balas via WhatsApp</span>
                  </a>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
