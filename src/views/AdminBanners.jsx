import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Trash2, Eye, EyeOff, DollarSign, Sparkles, ExternalLink, Image as ImageIcon, Pencil, Save, UploadCloud } from 'lucide-react';
import { useSiteSettings, saveSiteSettings } from '../hooks/useSiteSettings';
import { uploadAndCompressImage } from '../lib/uploadImage';


const AdminBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', subtitle: '', imageUrl: '', targetUrl: '', slot: 'article', status: 'active' });

  const [uploadingBanner, setUploadingBanner] = useState(false);
  const addBannerInputRef = React.useRef(null);
  const editBannerInputRef = React.useRef(null);

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    targetUrl: '',
    slot: 'article',
    status: 'active'
  });

  // Sticky Ads State
  const { settings: savedSettings, loading: settingsLoading } = useSiteSettings();
  const [stickyForm, setStickyForm] = useState(null);
  const [savingSticky, setSavingSticky] = useState(false);
  const [uploadingLeftAd, setUploadingLeftAd] = useState(false);
  const [uploadingRightAd, setUploadingRightAd] = useState(false);
  const leftAdInputRef = React.useRef(null);
  const rightAdInputRef = React.useRef(null);

  useEffect(() => {
    if (!settingsLoading && savedSettings) {
      setStickyForm({ ...savedSettings });
    }
  }, [settingsLoading, savedSettings]);

  const handleStickyChange = (key, value) => {
    setStickyForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSticky = async () => {
    setSavingSticky(true);
    try {
      await saveSiteSettings(stickyForm);
      alert('Pengaturan banner sticky berhasil disimpan!');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan pengaturan');
    } finally {
      setSavingSticky(false);
    }
  };

  const handleLeftAdUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLeftAd(true);
    try {
      const url = await uploadAndCompressImage(file, 'sticky-ads');
      handleStickyChange('stickyAdLeftImage', url);
    } catch (err) {
      alert('Gagal mengunggah gambar: ' + err.message);
    } finally {
      setUploadingLeftAd(false);
      if (leftAdInputRef.current) leftAdInputRef.current.value = '';
    }
  };

  const handleRightAdUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingRightAd(true);
    try {
      const url = await uploadAndCompressImage(file, 'sticky-ads');
      handleStickyChange('stickyAdRightImage', url);
    } catch (err) {
      alert('Gagal mengunggah gambar: ' + err.message);
    } finally {
      setUploadingRightAd(false);
      if (rightAdInputRef.current) rightAdInputRef.current.value = '';
    }
  };

  const handleBannerUpload = async (e, isEdit) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const url = await uploadAndCompressImage(file, 'banners');
      if (isEdit) {
        setEditForm(prev => ({ ...prev, imageUrl: url }));
      } else {
        setForm(prev => ({ ...prev, imageUrl: url }));
      }
    } catch (err) {
      alert('Gagal mengunggah gambar: ' + err.message);
    } finally {
      setUploadingBanner(false);
      if (isEdit && editBannerInputRef.current) editBannerInputRef.current.value = '';
      if (!isEdit && addBannerInputRef.current) addBannerInputRef.current.value = '';
    }
  };


  const fetchBanners = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'banners'));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBanners(list);
    } catch (err) {
      console.error('Error fetching banners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.imageUrl.trim()) {
      alert('Nama sponsor dan URL gambar banner wajib diisi!');
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, 'banners'), {
        ...form,
        createdAt: serverTimestamp()
      });
      setShowModal(false);
      setForm({
        title: '',
        subtitle: '',
        imageUrl: '',
        targetUrl: '',
        slot: 'article',
        status: 'active'
      });
      fetchBanners();
    } catch (err) {
      console.error('Error saving banner:', err);
      alert('Gagal menyimpan banner sponsor');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setEditForm({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      imageUrl: banner.imageUrl || '',
      targetUrl: banner.targetUrl || '',
      slot: banner.slot || 'article',
      status: banner.status || 'active',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editForm.title.trim() || !editForm.imageUrl.trim()) {
      alert('Nama sponsor dan URL gambar banner wajib diisi!');
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'banners', editingBanner.id), { ...editForm });
      setBanners(prev => prev.map(b => b.id === editingBanner.id ? { ...b, ...editForm } : b));
      setShowEditModal(false);
      setEditingBanner(null);
    } catch (err) {
      console.error('Error updating banner:', err);
      alert('Gagal memperbarui banner');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (banner) => {
    try {
      const newStatus = banner.status === 'active' ? 'inactive' : 'active';
      await updateDoc(doc(db, 'banners', banner.id), { status: newStatus });
      setBanners(banners.map(b => b.id === banner.id ? { ...b, status: newStatus } : b));
    } catch (err) {
      console.error('Error toggling banner status:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus banner sponsor ini?')) return;
    try {
      await deleteDoc(doc(db, 'banners', id));
      setBanners(banners.filter(b => b.id !== id));
    } catch (err) {
      console.error('Error deleting banner:', err);
    }
  };

  return (
    <div className="admin-layout">
            <main className="admin-main">
        <header className="admin-header">
          <h1>Manajemen Iklan & Sponsor</h1>
          <div className="admin-user-menu">
            <span style={{ fontSize: '14px', color: 'var(--admin-text-secondary)', marginRight: '15px' }}>Admin Sponsor</span>
            <div className="user-avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>AS</div>
          </div>
        </header>

        <div className="admin-content" style={{ padding: '24px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: 'var(--admin-text-primary)' }}>
                <DollarSign size={28} color="var(--color-accent, #e63946)" /> Manajemen Iklan & Sponsor Mandiri
              </h1>
              <p style={{ color: 'var(--admin-text-secondary)', margin: '6px 0 0', fontSize: '0.92rem' }}>
                Kelola banner sponsor eksklusif di Header, Tengah Artikel, dan Sidebar Bedain News.
              </p>
            </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: 'var(--color-accent, #e63946)',
            color: '#fff',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '10px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 20px rgba(230,57,70,0.35)'
          }}
        >
          <Plus size={18} /> Tambah Banner Sponsor
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa' }}>Memuat daftar sponsor...</div>
      ) : banners.length === 0 ? (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center'
        }}>
          <Sparkles size={44} color="var(--color-accent, #e63946)" style={{ marginBottom: '14px' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Belum Ada Banner Sponsor Aktif</h3>
          <p style={{ color: '#aaa', maxWidth: '440px', margin: '0 auto 20px', fontSize: '0.9rem' }}>
            Tambahkan banner iklan sponsor lokal atau biarkan placeholder undangan pasang iklan tampil otomatis untuk menarik minat calon sponsor.
          </p>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: 'rgba(230,57,70,0.15)',
              color: 'var(--color-accent, #e63946)',
              border: '1px solid var(--color-accent, #e63946)',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            + Buat Banner Pertama
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {banners.map(b => (
            <div
              key={b.id}
              style={{
                background: '#15151a',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ position: 'relative', height: '150px', background: '#0d0d10' }}>
                  {b.imageUrl ? (
                    <img
                      src={b.imageUrl}
                      alt={b.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                      <ImageIcon size={36} />
                    </div>
                  )}
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(6px)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>
                    Slot: {b.slot}
                  </div>
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: b.status === 'active' ? '#2ec4b6' : '#666',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    {b.status === 'active' ? 'Aktif' : 'Non-aktif'}
                  </div>
                </div>

                <div style={{ padding: '16px' }}>
                  <h3 style={{ margin: '0 0 6px', fontSize: '1.08rem', fontWeight: 700, color: '#fff' }}>{b.title}</h3>
                  {b.subtitle && <p style={{ color: '#aaa', fontSize: '0.82rem', margin: '0 0 10px' }}>{b.subtitle}</p>}
                  {b.targetUrl && (
                    <a
                      href={b.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--color-accent, #e63946)', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                    >
                      Lihat Target URL <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>

              <div style={{
                padding: '12px 16px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                background: 'rgba(0,0,0,0.2)'
              }}>
                <button
                  onClick={() => toggleStatus(b)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {b.status === 'active' ? <><EyeOff size={14} /> Sembunyikan</> : <><Eye size={14} /> Aktifkan</>}
                </button>

                <button
                  onClick={() => handleEdit(b)}
                  style={{
                    background: 'rgba(59,130,246,0.15)',
                    border: '1px solid rgba(59,130,246,0.3)',
                    color: '#60a5fa',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Edit Banner"
                >
                  <Pencil size={14} /> Edit
                </button>

                <button
                  onClick={() => handleDelete(b.id)}
                  style={{
                    background: 'rgba(230,57,70,0.15)',
                    border: 'none',
                    color: 'var(--color-accent, #e63946)',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                  title="Hapus Banner"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STICKY ADS SECTION */}
      {stickyForm && (
        <div style={{ marginTop: '40px', background: '#18181f', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#fff' }}>Pengaturan Banner Sticky (Desktop Kiri & Kanan)</h2>
            <p style={{ color: '#aaa', margin: '8px 0 0', fontSize: '0.9rem' }}>Banner ini akan menempel di sisi kiri dan kanan layar pada perangkat desktop.</p>
          </div>
          
          <div className="admin-sticky-banners-grid">
            {/* KIRI */}
            <div style={{ background: '#101015', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 20px', color: '#e63946' }}>KIRI: Banner Sticky</h3>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#aaa', marginBottom: '6px' }}>Status Banner Kiri</label>
                <select 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#18181f', color: '#fff' }} 
                  value={stickyForm.stickyAdLeftStatus || 'nonaktif'} 
                  onChange={e => handleStickyChange('stickyAdLeftStatus', e.target.value)}
                >
                  <option value="aktif">Aktif (Tampilkan Banner)</option>
                  <option value="nonaktif">Nonaktif (Sembunyikan)</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#aaa', marginBottom: '6px' }}>Label / Badge</label>
                <input 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#18181f', color: '#fff' }} 
                  value={stickyForm.stickyAdLeftBadge || ''} 
                  onChange={e => handleStickyChange('stickyAdLeftBadge', e.target.value)} 
                  placeholder="Contoh: IKLAN PREMIUM" 
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#aaa', marginBottom: '6px' }}>Judul Banner</label>
                <input 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#18181f', color: '#fff' }} 
                  value={stickyForm.stickyAdLeftTitle || ''} 
                  onChange={e => handleStickyChange('stickyAdLeftTitle', e.target.value)} 
                  placeholder="Contoh: JANGKAU JUTAAN AUDIENS" 
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#aaa', marginBottom: '6px' }}>Deskripsi Singkat</label>
                <textarea 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#18181f', color: '#fff', minHeight: '80px' }} 
                  value={stickyForm.stickyAdLeftDesc || ''} 
                  onChange={e => handleStickyChange('stickyAdLeftDesc', e.target.value)} 
                  placeholder="Promosikan brand & produk Anda..." 
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#aaa', marginBottom: '6px' }}>Teks Tombol CTA</label>
                <input 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#18181f', color: '#fff' }} 
                  value={stickyForm.stickyAdLeftCtaText || ''} 
                  onChange={e => handleStickyChange('stickyAdLeftCtaText', e.target.value)} 
                  placeholder="Contoh: Pasang Sekarang" 
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#aaa', marginBottom: '6px' }}>Tautan URL CTA</label>
                <input 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#18181f', color: '#fff' }} 
                  value={stickyForm.stickyAdLeftUrl || ''} 
                  onChange={e => handleStickyChange('stickyAdLeftUrl', e.target.value)} 
                  placeholder="https://..." 
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#aaa', marginBottom: '6px' }}>Gambar Poster (Menggantikan Teks di atas)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#18181f', color: '#fff' }} 
                    value={stickyForm.stickyAdLeftImage || ''} 
                    onChange={e => handleStickyChange('stickyAdLeftImage', e.target.value)} 
                    placeholder="URL gambar..." 
                  />
                  <button onClick={() => leftAdInputRef.current?.click()} disabled={uploadingLeftAd} style={{ padding: '0 16px', backgroundColor: '#e63946', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UploadCloud size={16} />
                  </button>
                  <input ref={leftAdInputRef} type="file" accept="image/*" onChange={handleLeftAdUpload} style={{ display: 'none' }} />
                </div>
                {stickyForm.stickyAdLeftImage && (
                  <div style={{ marginTop: '12px' }}>
                    <img src={stickyForm.stickyAdLeftImage} alt="Preview" style={{ height: '80px', objectFit: 'contain', borderRadius: '4px' }} />
                    <button onClick={() => handleStickyChange('stickyAdLeftImage', '')} style={{ marginLeft: '12px', padding: '6px 12px', background: 'transparent', color: '#e63946', border: '1px solid #e63946', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Hapus Gambar</button>
                  </div>
                )}
              </div>
            </div>

            {/* KANAN */}
            <div style={{ background: '#101015', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 20px', color: '#e63946' }}>KANAN: Banner Sticky</h3>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#aaa', marginBottom: '6px' }}>Status Banner Kanan</label>
                <select 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#18181f', color: '#fff' }} 
                  value={stickyForm.stickyAdRightStatus || 'nonaktif'} 
                  onChange={e => handleStickyChange('stickyAdRightStatus', e.target.value)}
                >
                  <option value="aktif">Aktif (Tampilkan Banner)</option>
                  <option value="nonaktif">Nonaktif (Sembunyikan)</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#aaa', marginBottom: '6px' }}>Label / Badge</label>
                <input 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#18181f', color: '#fff' }} 
                  value={stickyForm.stickyAdRightBadge || ''} 
                  onChange={e => handleStickyChange('stickyAdRightBadge', e.target.value)} 
                  placeholder="Contoh: IKLAN PREMIUM" 
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#aaa', marginBottom: '6px' }}>Judul Banner</label>
                <input 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#18181f', color: '#fff' }} 
                  value={stickyForm.stickyAdRightTitle || ''} 
                  onChange={e => handleStickyChange('stickyAdRightTitle', e.target.value)} 
                  placeholder="Contoh: JANGKAU JUTAAN AUDIENS" 
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#aaa', marginBottom: '6px' }}>Deskripsi Singkat</label>
                <textarea 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#18181f', color: '#fff', minHeight: '80px' }} 
                  value={stickyForm.stickyAdRightDesc || ''} 
                  onChange={e => handleStickyChange('stickyAdRightDesc', e.target.value)} 
                  placeholder="Promosikan brand & produk Anda..." 
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#aaa', marginBottom: '6px' }}>Teks Tombol CTA</label>
                <input 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#18181f', color: '#fff' }} 
                  value={stickyForm.stickyAdRightCtaText || ''} 
                  onChange={e => handleStickyChange('stickyAdRightCtaText', e.target.value)} 
                  placeholder="Contoh: Pasang Sekarang" 
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#aaa', marginBottom: '6px' }}>Tautan URL CTA</label>
                <input 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#18181f', color: '#fff' }} 
                  value={stickyForm.stickyAdRightUrl || ''} 
                  onChange={e => handleStickyChange('stickyAdRightUrl', e.target.value)} 
                  placeholder="https://..." 
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#aaa', marginBottom: '6px' }}>Gambar Poster (Menggantikan Teks di atas)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#18181f', color: '#fff' }} 
                    value={stickyForm.stickyAdRightImage || ''} 
                    onChange={e => handleStickyChange('stickyAdRightImage', e.target.value)} 
                    placeholder="URL gambar..." 
                  />
                  <button onClick={() => rightAdInputRef.current?.click()} disabled={uploadingRightAd} style={{ padding: '0 16px', backgroundColor: '#e63946', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UploadCloud size={16} />
                  </button>
                  <input ref={rightAdInputRef} type="file" accept="image/*" onChange={handleRightAdUpload} style={{ display: 'none' }} />
                </div>
                {stickyForm.stickyAdRightImage && (
                  <div style={{ marginTop: '12px' }}>
                    <img src={stickyForm.stickyAdRightImage} alt="Preview" style={{ height: '80px', objectFit: 'contain', borderRadius: '4px' }} />
                    <button onClick={() => handleStickyChange('stickyAdRightImage', '')} style={{ marginLeft: '12px', padding: '6px 12px', background: 'transparent', color: '#e63946', border: '1px solid #e63946', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Hapus Gambar</button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div style={{ padding: '24px 32px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={handleSaveSticky} 
              disabled={savingSticky}
              style={{
                background: 'var(--color-accent, #e63946)',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: savingSticky ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Save size={18} /> {savingSticky ? 'Menyimpan...' : 'Simpan Pengaturan Sticky'}
            </button>
          </div>
        </div>
      )}

      {/* Modal Add Banner */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#18181f',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            padding: '28px'
          }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '1.3rem', fontWeight: 800 }}>Tambah Banner Sponsor</h2>

            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#aaa', marginBottom: '6px' }}>
                  Nama Sponsor / Usaha *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Dealer Yamaha Daerah atau UMKM Kopi Kita"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: '#101015',
                    color: '#fff'
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#aaa', marginBottom: '6px' }}>
                  Keterangan Singkat (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Misal: Promo Diskon 30% Bulan Ini"
                  value={form.subtitle}
                  onChange={e => setForm({ ...form, subtitle: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: '#101015',
                    color: '#fff'
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#aaa', marginBottom: '6px' }}>
                  URL Gambar Banner *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="url"
                    required
                    placeholder="https://..."
                    value={form.imageUrl}
                    onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: '#101015',
                      color: '#fff'
                    }}
                  />
                  <button 
                    type="button" 
                    onClick={() => addBannerInputRef.current?.click()} 
                    disabled={uploadingBanner} 
                    style={{ padding: '0 16px', backgroundColor: '#e63946', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <UploadCloud size={16} />
                  </button>
                  <input ref={addBannerInputRef} type="file" accept="image/*" onChange={(e) => handleBannerUpload(e, false)} style={{ display: 'none' }} />
                </div>
                {form.imageUrl && (
                  <div style={{ marginTop: '10px' }}>
                    <img src={form.imageUrl} alt="Preview" style={{ height: '60px', objectFit: 'contain', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#aaa', marginBottom: '6px' }}>
                  URL Target Link (Saat Dklik)
                </label>
                <input
                  type="url"
                  placeholder="https://wa.me/... atau https://website-sponsor.com"
                  value={form.targetUrl}
                  onChange={e => setForm({ ...form, targetUrl: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: '#101015',
                    color: '#fff'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#aaa', marginBottom: '6px' }}>
                  Posisi Slot Iklan
                </label>
                <select
                  value={form.slot}
                  onChange={e => setForm({ ...form, slot: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: '#101015',
                    color: '#fff'
                  }}
                >
                  <option value="article">Tengah Artikel Berita (Paling Sering Dilihat)</option>
                  <option value="header">Header Atas Portal</option>
                  <option value="sidebar">Sidebar Kanan</option>
                </select>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#4ade80' }}>
                  {form.slot === 'article' && '💡 Rekomendasi: Persegi panjang (rasio 16:9). Contoh: 800x450 piksel.'}
                  {form.slot === 'header' && '💡 Rekomendasi: Memanjang horizontal (rasio 8:1 atau 4:1). Contoh: 728x90 piksel.'}
                  {form.slot === 'sidebar' && '💡 Rekomendasi: Persegi atau vertikal (rasio 1:1 atau 1:2). Contoh: 300x250 atau 300x600 piksel.'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#aaa',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: 'var(--color-accent, #e63946)',
                    border: 'none',
                    color: '#fff',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Menyimpan...' : 'Simpan Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Banner */}
      {showEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: '#18181f', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '28px'
          }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>Edit Banner Sponsor</h2>
            <form onSubmit={handleUpdate}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#aaa', marginBottom: '6px' }}>Nama Sponsor / Usaha *</label>
                <input type="text" required value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#101015', color: '#fff' }} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#aaa', marginBottom: '6px' }}>Keterangan Singkat (Opsional)</label>
                <input type="text" value={editForm.subtitle} onChange={e => setEditForm({ ...editForm, subtitle: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#101015', color: '#fff' }} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#aaa', marginBottom: '6px' }}>URL Gambar Banner *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="url" required value={editForm.imageUrl} onChange={e => setEditForm({ ...editForm, imageUrl: e.target.value })}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#101015', color: '#fff' }} />
                  <button type="button" onClick={() => editBannerInputRef.current?.click()} disabled={uploadingBanner} style={{ padding: '0 16px', backgroundColor: '#e63946', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UploadCloud size={16} />
                  </button>
                  <input ref={editBannerInputRef} type="file" accept="image/*" onChange={(e) => handleBannerUpload(e, true)} style={{ display: 'none' }} />
                </div>
                {editForm.imageUrl && (
                  <div style={{ marginTop: '10px' }}>
                    <img src={editForm.imageUrl} alt="Preview" style={{ height: '60px', objectFit: 'contain', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                )}
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#aaa', marginBottom: '6px' }}>URL Target Link (Saat Diklik)</label>
                <input type="url" value={editForm.targetUrl} onChange={e => setEditForm({ ...editForm, targetUrl: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#101015', color: '#fff' }} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#aaa', marginBottom: '6px' }}>Posisi Slot Iklan</label>
                <select value={editForm.slot} onChange={e => setEditForm({ ...editForm, slot: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#101015', color: '#fff' }}>
                  <option value="article">Tengah Artikel Berita (Paling Sering Dilihat)</option>
                  <option value="header">Header Atas Portal</option>
                  <option value="sidebar">Sidebar Kanan</option>
                </select>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#4ade80' }}>
                  {editForm.slot === 'article' && '💡 Rekomendasi: Persegi panjang (rasio 16:9). Contoh: 800x450 piksel.'}
                  {editForm.slot === 'header' && '💡 Rekomendasi: Memanjang horizontal (rasio 8:1 atau 4:1). Contoh: 728x90 piksel.'}
                  {editForm.slot === 'sidebar' && '💡 Rekomendasi: Persegi atau vertikal (rasio 1:1 atau 1:2). Contoh: 300x250 atau 300x600 piksel.'}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => { setShowEditModal(false); setEditingBanner(null); }}
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#aaa', padding: '10px 18px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: '10px 22px', borderRadius: '8px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      </main>
    </div>
  );
};

export default AdminBanners;
