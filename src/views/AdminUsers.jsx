import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import Link from 'next/link';
import { initializeApp, deleteApp } from 'firebase/app';
import { signOut, getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, getDocs, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, PenTool, Globe, LogOut, Users, ArrowLeft, ShieldAlert, Image as ImageIcon, Settings, Tag, FileText, UserPlus, X, Trash2, Mail, User } from 'lucide-react';


const Navigate = ({to}) => { React.useEffect(() => { if (typeof window !== 'undefined') window.location.href = to; }, [to]); return null; };

const AdminUsers = () => {
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // State untuk Tambah Jurnalis
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('reporter');
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('reporter');

  // State untuk Notifikasi & Konfirmasi
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: null, type: 'danger' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
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
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (userRole === 'admin') {
        data = data.filter(user => user.role !== 'superadmin');
      }
      
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    showConfirm(
      'Ubah Hak Akses',
      `Yakin ingin mengubah role pengguna ini menjadi ${newRole.toUpperCase()}?`,
      async () => {
        try {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, { role: newRole });
          setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
          showToast('Role berhasil diperbarui!', 'success');
        } catch (error) {
          console.error("Error updating role:", error);
          showToast('Gagal memperbarui role', 'error');
        }
      },
      'warning'
    );
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword.trim()) {
      showToast('Email dan Password jurnalis wajib diisi', 'warning');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password minimal 6 karakter', 'warning');
      return;
    }
    setSaving(true);
    let secondaryApp;
    try {
      const emailLower = newEmail.trim().toLowerCase();
      
      // Buat Firebase app instance kedua supaya admin tidak ter-logout
      secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
      const secondaryAuth = getAuth(secondaryApp);
      
      let uid;
      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, emailLower, newPassword);
        uid = userCredential.user.uid;
      } catch (authErr) {
        if (authErr.code === 'auth/email-already-in-use') {
          // Akun nyangkut di Auth: coba login untuk mengambil UID-nya
          const userCredential = await signInWithEmailAndPassword(secondaryAuth, emailLower, newPassword);
          uid = userCredential.user.uid;
        } else {
          throw authErr;
        }
      }
      
      // Logout dari instance kedua agar clean
      await secondaryAuth.signOut();

      const newUser = {
        email: emailLower,
        name: newName.trim() || emailLower.split('@')[0],
        role: newRole,
        createdAt: new Date().toISOString()
      };
      
      // Simpan menggunakan UID sebagai document ID
      await setDoc(doc(db, 'users', uid), newUser);
      
      setUsers(prev => [...prev, { id: uid, ...newUser }]);
      setShowAddModal(false);
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setNewRole('reporter');
      showToast(`Berhasil menambahkan jurnalis ${newUser.name} (${newUser.email}) sebagai ${newUser.role.toUpperCase()}!`, 'success');
    } catch (err) {
      console.error("Error adding user:", err);
      showToast('Gagal menambahkan jurnalis: ' + (err.message || 'Error tidak diketahui'), 'error');
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch (e) { console.error("Error deleting secondary app:", e); }
      }
      setSaving(false);
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditName(user.name || '');
    setEditRole(user.role || 'reporter');
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, { name: editName.trim(), role: editRole });
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, name: editName.trim(), role: editRole } : u));
      setEditingUser(null);
      showToast('Data jurnalis berhasil diperbarui!', 'success');
    } catch (err) {
      console.error("Error editing user:", err);
      showToast('Gagal memperbarui data jurnalis', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    showConfirm(
      'Hapus Akses Jurnalis',
      `Yakin ingin menghapus akses jurnalis (${userEmail}) dari tim redaksi? Tindakan ini tidak dapat dibatalkan.`,
      async () => {
        try {
          await deleteDoc(doc(db, 'users', userId));
          setUsers(users.filter(u => u.id !== userId));
          showToast('Jurnalis berhasil dihapus dari daftar tim redaksi.', 'success');
        } catch (err) {
          console.error("Error deleting user:", err);
          showToast('Gagal menghapus jurnalis', 'error');
        }
      }
    );
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (authLoading) {
    return <div className="admin-loading-screen"><div className="spinner"></div><p>Memeriksa akses...</p></div>;
  }

  // Proteksi: Hanya Superadmin dan Admin yang boleh masuk halaman ini
  if (!['superadmin', 'admin'].includes(userRole)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <div className="admin-layout">
      
      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            <h1>Kelola Akses Tim Redaksi</h1>
          </div>
          <div>
            <span className="admin-badge" style={{backgroundColor: 'rgba(255, 193, 7, 0.2)', color: '#ffc107', border: '1px solid #ffc107', padding: '5px 10px'}}><ShieldAlert size={14} style={{verticalAlign:'middle', marginRight:'5px'}}/> Akses {userRole === 'superadmin' ? 'Superadmin' : 'Admin'}</span>
          </div>
        </header>

        <div className="admin-content">
          <div className="admin-table-container">
            <div className="admin-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <h2>Daftar Pengguna / Wartawan</h2>
              <button 
                onClick={() => setShowAddModal(true)}
                className="admin-btn admin-btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <UserPlus size={18} />
                Tambah Jurnalis
              </button>
            </div>
            
            {loading ? (
              <div className="admin-loading">Memuat daftar pengguna...</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Jurnalis / Email</th>
                    <th>Role Saat Ini</th>
                    <th>Hak Akses & Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td className="admin-table-title">
                        <div style={{ fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: '3px' }}>
                          {user.name || (user.email ? user.email.split('@')[0] : 'Unknown')}
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'var(--admin-text-secondary)' }}>{user.email || 'No Email'}</div>
                      </td>
                      <td>
                        <span className={`status-badge ${(user.role || '').toLowerCase() === 'superadmin' ? 'status-published' : (user.role || '').toLowerCase() === 'editor' ? 'status-draft' : ''}`}>
                          {(user.role || 'reporter').toUpperCase()}
                        </span>
                      </td>
                      <td className="admin-table-actions">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {user.id !== currentUser.uid ? (
                            <select 
                              value={user.role || 'reporter'} 
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              className="admin-input"
                              style={{padding: '6px 10px', width: 'auto', fontSize: '13px', borderRadius: '6px'}}
                            >
                              <option value="reporter">Reporter (Hanya Draf)</option>
                              <option value="editor">Editor (Bisa Tayang/Hapus)</option>
                              <option value="admin">Admin (Kelola Tim)</option>
                              {userRole === 'superadmin' && <option value="superadmin">Superadmin (Dewa)</option>}
                            </select>
                          ) : (
                            <span style={{color: 'var(--admin-text-secondary)', fontSize:'13px', fontStyle:'italic', marginRight: '5px'}}>It's you</span>
                          )}

                          <button
                            onClick={() => openEditModal(user)}
                            className="admin-btn-icon"
                            title="Edit Data Jurnalis"
                            style={{
                              background: 'rgba(59, 130, 246, 0.15)',
                              color: '#3b82f6',
                              border: 'none',
                              padding: '7px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <PenTool size={15} />
                          </button>

                          {user.id !== currentUser.uid && (
                            <button
                              onClick={() => handleDeleteUser(user.id, user.email)}
                              className="admin-btn-icon"
                              title="Hapus Jurnalis"
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
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal Tambah Jurnalis */}
        {showAddModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            backdropFilter: 'blur(4px)'
          }}>
            <div style={{
              backgroundColor: 'var(--admin-card-bg)',
              borderRadius: '14px',
              padding: '28px',
              width: '100%',
              maxWidth: '460px',
              border: '1px solid var(--admin-card-border)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <UserPlus size={20} color="#3b82f6" />
                  Tambah Jurnalis Baru
                </h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--admin-text-secondary)', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddUser}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--admin-text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
                    Email Jurnalis *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      required
                      placeholder="contoh: wartawan@bedainnews.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="admin-input"
                      style={{ width: '100%', padding: '10px 12px' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--admin-text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="admin-input"
                    style={{ width: '100%', padding: '10px 12px' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--admin-text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
                    Nama Lengkap Jurnalis
                  </label>
                  <input
                    type="text"
                    placeholder="contoh: Ahmad Jurnalis"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="admin-input"
                    style={{ width: '100%', padding: '10px 12px' }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--admin-text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
                    Role / Jabatan Redaksi
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="admin-input"
                    style={{ width: '100%', padding: '10px 12px' }}
                  >
                    <option value="reporter">Reporter (Menulis & Simpan Draf Berita)</option>
                    <option value="editor">Editor (Bisa Tayangkan & Edit Semua Berita)</option>
                    <option value="admin">Admin Redaksi (Kelola Jurnalis & Kategori)</option>
                    {userRole === 'superadmin' && <option value="superadmin">Superadmin Redaksi</option>}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="admin-btn"
                    style={{ backgroundColor: 'var(--admin-hover-bg)', color: 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', padding: '10px 16px', borderRadius: '8px' }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="admin-btn admin-btn-primary"
                    style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: 600 }}
                  >
                    {saving ? 'Menyimpan...' : 'Simpan & Tambah Akses'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Edit Jurnalis */}
        {editingUser && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            backdropFilter: 'blur(4px)'
          }}>
            <div style={{
              backgroundColor: 'var(--admin-card-bg)',
              borderRadius: '14px',
              padding: '28px',
              width: '100%',
              maxWidth: '460px',
              border: '1px solid var(--admin-card-border)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <PenTool size={20} color="#3b82f6" />
                  Edit Data Jurnalis
                </h3>
                <button 
                  onClick={() => setEditingUser(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--admin-text-secondary)', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleEditUser}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--admin-text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
                    Email Jurnalis (Tidak bisa diubah)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={editingUser.email}
                    className="admin-input"
                    style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--admin-hover-bg)', color: 'var(--admin-text-secondary)', cursor: 'not-allowed' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--admin-text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
                    Nama Lengkap Jurnalis
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Lengkap"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="admin-input"
                    style={{ width: '100%', padding: '10px 12px' }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--admin-text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
                    Role / Jabatan Redaksi
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="admin-input"
                    disabled={editingUser?.id === currentUser.uid}
                    style={{ 
                      width: '100%', 
                      padding: '10px 12px',
                      opacity: editingUser?.id === currentUser.uid ? 0.6 : 1,
                      cursor: editingUser?.id === currentUser.uid ? 'not-allowed' : 'default'
                    }}
                  >
                    <option value="reporter">Reporter (Menulis & Simpan Draf Berita)</option>
                    <option value="editor">Editor (Bisa Tayangkan & Edit Semua Berita)</option>
                    <option value="admin">Admin Redaksi (Kelola Jurnalis & Kategori)</option>
                    {userRole === 'superadmin' && <option value="superadmin">Superadmin Redaksi</option>}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="admin-btn"
                    style={{ backgroundColor: 'var(--admin-hover-bg)', color: 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', padding: '10px 16px', borderRadius: '8px' }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="admin-btn admin-btn-primary"
                    style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: 600 }}
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* UI Modal Konfirmasi */}
        {confirmDialog.show && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999,
            backdropFilter: 'blur(4px)'
          }}>
            <div style={{
              backgroundColor: 'var(--admin-card-bg)',
              borderRadius: '16px',
              padding: '30px 24px',
              width: '100%',
              maxWidth: '380px',
              border: '1px solid var(--admin-card-border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              textAlign: 'center',
              animation: 'scaleIn 0.2s ease-out'
            }}>
              <div style={{
                width: '56px', height: '56px',
                borderRadius: '50%',
                backgroundColor: confirmDialog.type === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: confirmDialog.type === 'danger' ? '#ef4444' : '#f59e0b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px'
              }}>
                {confirmDialog.type === 'danger' ? <Trash2 size={28} /> : <ShieldAlert size={28} />}
              </div>
              <h3 style={{ margin: '0 0 12px 0', color: 'var(--admin-text-primary)', fontSize: '1.25rem', fontWeight: 600 }}>{confirmDialog.title}</h3>
              <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.95rem', marginBottom: '28px', lineHeight: '1.5' }}>
                {confirmDialog.message}
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={closeConfirm}
                  className="admin-btn"
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: 'var(--admin-hover-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', fontWeight: 500 }}
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    confirmDialog.onConfirm();
                    closeConfirm();
                  }}
                  className="admin-btn"
                  style={{ 
                    flex: 1, padding: '12px', borderRadius: '10px', fontWeight: 600,
                    backgroundColor: confirmDialog.type === 'danger' ? '#ef4444' : '#f59e0b',
                    color: '#fff',
                    border: 'none',
                    boxShadow: confirmDialog.type === 'danger' ? '0 4px 12px rgba(239,68,68,0.3)' : '0 4px 12px rgba(245,158,11,0.3)'
                  }}
                >
                  Ya, Lanjutkan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* UI Toast Notifikasi */}
        {toast.show && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: toast.type === 'error' ? '#ef4444' : toast.type === 'warning' ? '#f59e0b' : '#10b981',
            color: '#fff',
            padding: '14px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: 500,
            animation: 'slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            {toast.type === 'error' && <X size={20} />}
            {toast.type === 'warning' && <ShieldAlert size={20} />}
            {toast.message}
          </div>
        )}

        <style>{`
          @keyframes scaleIn {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </main>
    </div>
  );
};

export default AdminUsers;
