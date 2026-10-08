"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { uploadAndCompressImage } from '../lib/uploadImage';
import { User, Mail, Camera, Save, ArrowLeft, Loader2, ShieldCheck, Download, Smartphone } from 'lucide-react';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import IdCard from '../components/IdCard';

const AdminProfile = () => {
  const router = useRouter();
  const { currentUser: user, userRole, loading: authLoading } = useAuth();
  const { settings } = useSiteSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    photoURL: '',
    bio: '',
    regNumber: '',
    roleTitle: '',
    region: 'NASIONAL',
    kabKota: '',
    noHp: ''
  });
  
  const fileInputRef = useRef(null);
  const idCardRef = useRef(null);

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
          bio: data.bio || '',
          regNumber: data.regNumber || '',
          roleTitle: data.roleTitle || '',
          region: data.region || 'NASIONAL',
          kabKota: data.kabKota || '',
          noHp: data.noHp || ''
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
    setFormData(prev => ({ ...prev, [name]: value.toUpperCase() })); // Convert to uppercase for ID card feel
  };

  const handleDownloadIdCard = async () => {
    if (!idCardRef.current) return;
    
    // Simpan transform asli dan hapus sebelum capture agar text width tidak salah hitung
    const parent = idCardRef.current.parentElement;
    const originalTransform = parent.style.transform;
    parent.style.transform = 'none';

    try {
      const canvas = await html2canvas(idCardRef.current, {
        scale: 2, // High resolution
        useCORS: true, // Allow cross-origin images (like avatars)
        backgroundColor: null
      });
      
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `ID-CARD-${formData.name || 'JURNALIS'}.png`;
      link.click();
    } catch (error) {
      console.error("Gagal mengunduh ID Card:", error);
      alert("Gagal mengunduh ID Card. Pastikan foto profil Anda sudah terunggah dengan benar.");
    } finally {
      // Kembalikan transform seperti semula
      parent.style.transform = originalTransform;
    }
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
      await setDoc(userRef, {
        name: formData.name,
        photoURL: formData.photoURL,
        bio: formData.bio,
        regNumber: formData.regNumber,
        roleTitle: formData.roleTitle,
        region: formData.region,
        kabKota: formData.kabKota,
        noHp: formData.noHp,
        updatedAt: new Date()
      }, { merge: true });
      
      alert("Profil berhasil diperbarui!");
      setIsEditing(false);
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
        <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link href={['admin', 'superadmin', 'editor', 'reporter'].includes(userRole) ? "/admin/dashboard" : "/"} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--admin-card-bg)', border: '1px solid var(--admin-card-border)', color: 'var(--admin-text-primary)', cursor: 'pointer' }}>
                <ArrowLeft size={18} />
              </Link>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: 0, color: 'var(--admin-text-primary)' }}>Profil Pengguna</h1>
            </div>
            {settings?.nativeAppUrl && (
              <a href={settings.nativeAppUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold' }}>
                <Smartphone size={18} />
                Download di Play Store
              </a>
            )}
          </div>

          <div className="profile-layout-grid" style={{ display: 'grid', gridTemplateColumns: ['admin', 'superadmin', 'editor', 'reporter'].includes(userRole) ? '1fr 300px' : '1fr', gap: '30px', alignItems: 'start' }}>
            
            {/* Form Column */}
            <div style={{ backgroundColor: 'var(--admin-card-bg)', border: '1px solid var(--admin-card-border)', borderRadius: '16px', overflow: 'hidden' }}>
              
              {/* Header Banner */}
              <div style={{ height: '80px', background: 'linear-gradient(135deg, rgba(230, 32, 32, 0.8), rgba(0, 0, 0, 0.9))' }}></div>
            
            <div style={{ padding: '0 25px 25px', position: 'relative' }}>
              
              {/* Avatar Section */}
              <div className="profile-header-avatar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '-40px', marginBottom: '15px' }}>
                <div style={{ position: 'relative' }}>
                  <div 
                    style={{ 
                      width: '80px', height: '80px', borderRadius: '50%', border: '4px solid var(--admin-card-bg)', 
                      backgroundColor: '#2d2d2d', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      overflow: 'hidden', backgroundImage: `url(${formData.photoURL})`, backgroundSize: 'cover', backgroundPosition: 'center',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                    }}
                  >
                    {!formData.photoURL && <User size={40} color="#666" />}
                  </div>
                  
                  {isEditing && (
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
                  )}
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <ShieldCheck size={16} color="var(--color-accent)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>{userRole}</span>
                </div>
              </div>
              
              {/* Form Section */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>Nama Lengkap</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="Masukkan nama lengkap Anda"
                        className="admin-input"
                      />
                    ) : (
                      <div style={{ color: '#fff', fontSize: '0.95rem', padding: '10px 15px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {formData.name || '-'}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>Alamat Email (Login)</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                      {isEditing ? (
                        <input 
                          type="email" 
                          name="email"
                          value={formData.email}
                          disabled
                          style={{ paddingLeft: '35px', opacity: 0.7, cursor: 'not-allowed' }}
                          className="admin-input"
                        />
                      ) : (
                        <div style={{ color: '#fff', fontSize: '0.95rem', padding: '10px 15px 10px 35px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          {formData.email || '-'}
                        </div>
                      )}
                    </div>
                    {isEditing && <small style={{ color: '#666', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Email digunakan untuk login dan tidak dapat diubah.</small>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>Kabupaten / Kota</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        name="kabKota"
                        value={formData.kabKota}
                        onChange={handleChange}
                        placeholder="Cth: Kota Makassar"
                        className="admin-input"
                      />
                    ) : (
                      <div style={{ color: '#fff', fontSize: '0.95rem', padding: '10px 15px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {formData.kabKota || '-'}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>Nomor HP / WhatsApp</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        name="noHp"
                        value={formData.noHp}
                        onChange={handleChange}
                        placeholder="Cth: 081234567890"
                        className="admin-input"
                      />
                    ) : (
                      <div style={{ color: '#fff', fontSize: '0.95rem', padding: '10px 15px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {formData.noHp || '-'}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>Bio Singkat</label>
                  {isEditing ? (
                    <textarea 
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      placeholder="Tulis sedikit tentang diri Anda (Opsional)..."
                      className="admin-input"
                      rows="2"
                      style={{ resize: 'vertical' }}
                    ></textarea>
                  ) : (
                    <div style={{ color: '#fff', fontSize: '0.95rem', padding: '10px 15px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', minHeight: '60px' }}>
                      {formData.bio || '-'}
                    </div>
                  )}
                </div>
                
                {['admin', 'superadmin', 'editor', 'reporter'].includes(userRole) && (
                <div style={{ padding: '15px', backgroundColor: 'rgba(212, 175, 55, 0.05)', border: '1px solid rgba(212, 175, 55, 0.2)', borderRadius: '8px', marginTop: '5px' }}>
                  <h3 style={{ fontSize: '0.95rem', color: '#d4af37', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} /> Detail ID Card (Kartu Pers)
                  </h3>
                  <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--admin-text-secondary)', marginBottom: '5px' }}>Nomor Registrasi (NO. REG)</label>
                      {isEditing ? (
                        <input 
                          type="text" 
                          name="regNumber"
                          value={formData.regNumber}
                          onChange={handleChange}
                          placeholder="Cth: B-26.10-001"
                          className="admin-input"
                        />
                      ) : (
                        <div style={{ color: '#fff', fontSize: '0.9rem', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          {formData.regNumber || '-'}
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--admin-text-secondary)', marginBottom: '5px' }}>Jabatan Redaksi</label>
                      {isEditing ? (
                        <input 
                          type="text" 
                          name="roleTitle"
                          value={formData.roleTitle}
                          onChange={handleChange}
                          placeholder="Cth: PEMIMPIN REDAKSI"
                          className="admin-input"
                        />
                      ) : (
                        <div style={{ color: '#fff', fontSize: '0.9rem', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          {formData.roleTitle || '-'}
                        </div>
                      )}
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--admin-text-secondary)', marginBottom: '5px' }}>Wilayah Tugas</label>
                      {isEditing ? (
                        <input 
                          type="text" 
                          name="region"
                          value={formData.region}
                          onChange={handleChange}
                          placeholder="Cth: NASIONAL / JAWA BARAT"
                          className="admin-input"
                        />
                      ) : (
                        <div style={{ color: '#fff', fontSize: '0.9rem', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          {formData.region || '-'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                )}
                
                <div className="profile-submit-wrap" style={{ marginTop: '10px', paddingTop: '20px', borderTop: '1px solid var(--admin-card-border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  {!isEditing ? (
                    <button 
                      type="button" 
                      onClick={(e) => { e.preventDefault(); setIsEditing(true); }}
                      className="admin-btn admin-btn-primary"
                      style={{ padding: '10px 24px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '150px', justifyContent: 'center' }}
                    >
                      Edit Profil
                    </button>
                  ) : (
                    <>
                      <button 
                        type="button" 
                        disabled={saving}
                        onClick={(e) => { e.preventDefault(); setIsEditing(false); fetchUserProfile(); }}
                        className="admin-btn"
                        style={{ padding: '10px 24px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '8px' }}
                      >
                        Batal
                      </button>
                      <button 
                        type="submit" 
                        disabled={saving}
                        className="admin-btn admin-btn-primary"
                        style={{ padding: '10px 24px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '150px', justifyContent: 'center' }}
                      >
                        {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
                        {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                      </button>
                    </>
                  )}
                </div>
                
              </form>
            </div>
          </div>
          
          {/* ID Card Preview Column - Temporarily Hidden */}
          {['admin', 'superadmin', 'editor', 'reporter'].includes(userRole) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', width: '100%' }}>
             <div style={{ width: '300px', height: '525px', position: 'relative' }}>
               <div style={{ position: 'absolute', top: 0, left: 0, transform: 'scale(0.75)', transformOrigin: 'top left' }}>
                 <IdCard data={formData} idRef={idCardRef} />
               </div>
             </div>
             
             <button 
               onClick={handleDownloadIdCard}
               className="admin-btn"
               style={{ 
                 padding: '12px 24px', 
                 backgroundColor: '#d4af37', 
                 color: '#000', 
                 border: 'none', 
                 borderRadius: '8px',
                 fontWeight: 'bold',
                 fontSize: '1rem',
                 display: 'flex',
                 alignItems: 'center',
                 gap: '8px',
                 cursor: 'pointer',
                 boxShadow: '0 4px 10px rgba(212, 175, 55, 0.3)',
                 width: '100%',
                 justifyContent: 'center'
               }}
             >
               <Download size={20} /> Unduh ID Card
             </button>
          </div>
          )}
          
        </div>
      </div>
    </main>
    <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          .profile-main-pad {
            padding: 15px !important;
          }
          .profile-grid, .profile-layout-grid {
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
