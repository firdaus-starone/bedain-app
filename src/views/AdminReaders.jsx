import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, getDocs, doc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { ShieldAlert, Trash2, Search } from 'lucide-react';

const AdminReaders = () => {
  const { userRole, loading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: null, type: 'danger' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const showConfirm = (title, message, onConfirm, type = 'danger') => {
    setConfirmDialog({ show: true, title, message, onConfirm, type });
  };

  const closeConfirm = () => {
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: null, type: 'danger' });
  };

  useEffect(() => {
    if (['superadmin', 'admin'].includes(userRole)) {
      fetchUsers();
    }
  }, [userRole]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'reader'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    } catch (error) {
      console.error("Error fetching readers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    showConfirm(
      'Hapus Pembaca',
      `Yakin ingin menghapus akun pembaca (${userEmail})?`,
      async () => {
        try {
          await deleteDoc(doc(db, 'users', userId));
          setUsers(users.filter(u => u.id !== userId));
          showToast('Akun pembaca berhasil dihapus.', 'success');
        } catch (err) {
          console.error("Error deleting reader:", err);
          showToast('Gagal menghapus pembaca', 'error');
        }
      }
    );
  };

  if (authLoading) return <div className="admin-loading-screen"><div className="spinner"></div><p>Memeriksa akses...</p></div>;

  if (!['superadmin', 'admin'].includes(userRole)) {
    if (typeof window !== 'undefined') window.location.href = "/admin/dashboard";
    return null;
  }

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-layout">
      <main className="admin-main">
        <header className="admin-header">
          <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            <h1>Manajemen Pembaca (User Aplikasi)</h1>
          </div>
          <div>
            <span className="admin-badge" style={{backgroundColor: 'rgba(255, 193, 7, 0.2)', color: '#ffc107', border: '1px solid #ffc107', padding: '5px 10px'}}><ShieldAlert size={14} style={{verticalAlign:'middle', marginRight:'5px'}}/> Akses {userRole === 'superadmin' ? 'Superadmin' : 'Admin'}</span>
          </div>
        </header>

        <div className="admin-content">
          <div className="admin-table-container">
            <div className="admin-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <h2>Daftar Pembaca Terdaftar (Total: {filteredUsers.length})</h2>
              <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', color: 'var(--admin-text-secondary)' }} />
                <input 
                  type="text" 
                  placeholder="Cari email/nama..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="admin-input"
                  style={{ paddingLeft: '32px', width: '250px' }}
                />
              </div>
            </div>
            
            {loading ? (
              <div className="admin-loading">Memuat daftar pembaca...</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nama / Email</th>
                    <th>Tgl Bergabung</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td className="admin-table-title">
                        <div style={{ fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: '3px' }}>
                          {user.name || (user.email ? user.email.split('@')[0] : 'Unknown')}
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'var(--admin-text-secondary)' }}>{user.email || 'No Email'}</div>
                      </td>
                      <td>
                        <span style={{ color: 'var(--admin-text-secondary)', fontSize: '13px' }}>
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID') : '-'}
                        </span>
                      </td>
                      <td className="admin-table-actions">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="admin-btn-icon"
                          title="Hapus Pembaca"
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            border: 'none',
                            padding: '7px',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  )) : (
                     <tr><td colSpan="3" style={{textAlign: 'center', padding: '20px', color: '#666'}}>Tidak ada data pembaca</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {confirmDialog.show && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 9999, padding: '20px', backdropFilter: 'blur(4px)'
          }}>
            <div style={{
              backgroundColor: 'var(--admin-card-bg)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '400px',
              border: '1px solid var(--admin-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', textAlign: 'center'
            }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: confirmDialog.type === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <ShieldAlert size={24} color={confirmDialog.type === 'danger' ? '#ef4444' : '#f59e0b'} />
              </div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: 'var(--admin-text-primary)' }}>{confirmDialog.title}</h3>
              <p style={{ margin: '0 0 24px 0', color: 'var(--admin-text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>{confirmDialog.message}</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <button onClick={closeConfirm} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--admin-border)', backgroundColor: 'transparent', color: 'var(--admin-text-primary)', fontWeight: 600, cursor: 'pointer', flex: 1 }}>Batal</button>
                <button onClick={() => { confirmDialog.onConfirm(); closeConfirm(); }} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: confirmDialog.type === 'danger' ? '#ef4444' : '#f59e0b', color: '#fff', fontWeight: 600, cursor: 'pointer', flex: 1 }}>Ya, Lanjutkan</button>
              </div>
            </div>
          </div>
        )}
        
        {toast.show && (
          <div style={{
            position: 'fixed', bottom: '30px', right: '30px',
            backgroundColor: toast.type === 'success' ? '#10b981' : toast.type === 'warning' ? '#f59e0b' : '#ef4444',
            color: 'white', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 9999, fontWeight: 500, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '10px',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {toast.message}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminReaders;
