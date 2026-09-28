"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { uploadAndCompressImage } from '../lib/uploadImage';
import { User, Mail, Camera, Save, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const AdminProfile = () => {
  const router = useRouter();
  const { currentUser: user, userRole, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    photoURL: '',
    bio: ''
  });
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/admin/login');
      } else {
        fetchUserProfile();
      }
    }
  }, [user, authLoading, router]);

  const fetchUserProfile = async () => {
    try {
      // First set values from auth user
      setFormData({
        name: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
        bio: ''
      });
      
      // Then fetch additional details from Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        setFormData(prev => ({
          ...prev,
          name: data.name || prev.name,
          photoURL: data.photoURL || prev.photoURL,
          bio: data.bio || ''
        }));
      }
    } catch (error) {
      console.error("Gagal mengambil profil:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran foto maksimal 2MB!");
      return;
    }

    setSaving(true);
    try {
      // Upload the new photo
      const newPhotoURL = await uploadAndCompressImage(file, 'users/avatars', user.uid);
      setFormData(prev => ({ ...prev, photoURL: newPhotoURL }));
      alert("Foto profil berhasil diunggah! Jangan lupa klik Simpan Perubahan.");
    } catch (error) {
      console.error("Gagal mengunggah foto profil:", error);
      alert("Gagal mengunggah foto. Silakan coba lagi.");
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // 1. Update Firebase Auth Profile
      await updateProfile(auth.currentUser, {
        displayName: formData.name,
        photoURL: formData.photoURL
      });
      
      // 2. Update Firestore Document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: formData.name,
        photoURL: formData.photoURL,
        bio: formData.bio,
        updatedAt: new Date()
      });
      
      alert("Profil berhasil diperbarui!");
      // Optionally reload the page to refresh the sidebar avatar
      window.location.reload();
    } catch (error) {
      console.error("Gagal menyimpan profil:", error);
      alert("Terjadi kesalahan saat menyimpan profil.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <div className="admin-loading-screen"><div className="spinner"></div><p>Memuat profil...</p></div>;
  }

  return (
    <div className="admin-layout">
      <main className="admin-main profile-main-pad" style={{ padding: '30px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
            <Link href="/admin/dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--admin-card-bg)', border: '1px solid var(--admin-card-border)', color: 'var(--admin-text-primary)', cursor: 'pointer' }}>
              <ArrowLeft size={20} />
            </Link>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0, color: 'var(--admin-text-primary)' }}>Profil Pengguna</h1>
          </div>

          <div style={{ backgroundColor: 'var(--admin-card-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '16px', overflow: 'hidden' }}>
            
            {/* Header Banner */}
            <div style={{ height: '120px', background: 'linear-gradient(135deg, rgba(230, 32, 32, 0.8), rgba(0, 0, 0, 0.9))' }}></div>
            
            <div style={{ padding: '0 30px 30px', position: 'relative' }}>
              
              {/* Avatar Section */}
              <div className="profile-header-avatar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '-50px', marginBottom: '20px' }}>
                <div style={{ position: 'relative' }}>
                  <div 
                    style={{ 
                      width: '100px', height: '100px', borderRadius: '50%', border: '4px solid var(--admin-card-bg)', 
                      backgroundColor: '#2d2d2d', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      overflow: 'hidden', backgroundImage: `url(${formData.photoURL})`, backgroundSize: 'cover', backgroundPosition: 'center',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                    }}
                  >
                    {!formData.photoURL && <User size={40} color="#666" />}
                  </div>
                  
                  <button 
                    onClick={handlePhotoClick}
                    type="button"
                    style={{
                      position: 'absolute', bottom: '0', right: '0', width: '32px', height: '32px',
                      backgroundColor: 'var(--color-accent)', borderRadius: '50%', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      color: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.3)', transition: 'all 0.2s'
                    }}
                    title="Ubah Foto Profil"
                  >
                    <Camera size={16} />
                  </button>
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <ShieldCheck size={16} color="var(--color-accent)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>{userRole}</span>
                </div>
              </div>
              
              {/* Form Section */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>Nama Lengkap</label>
                    <input 
                      type="text" 
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Masukkan nama lengkap Anda"
                      className="admin-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>Alamat Email (Login)</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                      <input 
                        type="email" 
                        name="email"
                        value={formData.email}
                        disabled
                        style={{ paddingLeft: '35px', opacity: 0.7, cursor: 'not-allowed' }}
                        className="admin-input"
                      />
                    </div>
                    <small style={{ color: '#666', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Email digunakan untuk login dan tidak dapat diubah.</small>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>Bio Singkat</label>
                  <textarea 
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Tulis sedikit tentang diri Anda (Opsional)..."
                    className="admin-input"
                    rows="4"
                    style={{ resize: 'vertical' }}
                  ></textarea>
                </div>
                
                <div className="profile-submit-wrap" style={{ marginTop: '10px', paddingTop: '20px', borderTop: '1px solid var(--admin-card-border)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="admin-btn admin-btn-primary"
                    style={{ padding: '10px 24px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '150px', justifyContent: 'center' }}
                  >
                    {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
                
              </form>
            </div>
          </div>
          
        </div>
      </main>
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          .profile-main-pad {
            padding: 15px !important;
          }
          .profile-grid {
            grid-template-columns: 1fr !important;
          }
          .profile-header-avatar {
            flex-direction: column !important;
            align-items: center !important;
            gap: 15px;
          }
          .profile-submit-wrap {
            justify-content: center !important;
          }
          .profile-submit-wrap button {
            width: 100% !important;
          }
        }
      `}} />
    </div>
  );
};

export default AdminProfile;
