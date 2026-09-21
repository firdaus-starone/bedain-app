import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { uploadAndCompressImage } from '../lib/uploadImage';
import { useSiteSettings, saveSiteSettings, DEFAULT_SETTINGS } from '../hooks/useSiteSettings';
import {
  LayoutDashboard, PenTool, Globe, LogOut, Users, Image as ImageIcon,
  Settings, Save, RefreshCw, UploadCloud, Check, AlertCircle, FileText
} from 'lucide-react';


const Section = ({ title, icon, children }) => (
  <div style={{
    backgroundColor: 'var(--admin-card-bg)',
    border: '1px solid var(--admin-card-border)',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px'
  }}>
    <h2 style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      fontSize: '1rem', fontWeight: '700', color: 'var(--admin-text-primary)',
      textTransform: 'uppercase', letterSpacing: '1px',
      marginBottom: '20px', paddingBottom: '12px',
      borderBottom: '1px solid var(--admin-card-border)'
    }}>
      {icon} {title}
    </h2>
    {children}
  </div>
);

const Field = ({ label, children, hint }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '13px', color: 'var(--admin-text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
      {label}
    </label>
    {children}
    {hint && <p style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', marginTop: '4px' }}>{hint}</p>}
  </div>
);

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  backgroundColor: 'var(--admin-hover-bg)',
  border: '1px solid var(--admin-border)',
  borderRadius: '8px',
  color: 'var(--admin-text-primary)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

const AdminSettings = () => {
  const { userRole, loading: authLoading } = useAuth();
  const { settings: savedSettings, loading: settingsLoading } = useSiteSettings();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error'
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingSeoImg, setUploadingSeoImg] = useState(false);
  const [uploadingLeftAd, setUploadingLeftAd] = useState(false);
  const [uploadingRightAd, setUploadingRightAd] = useState(false);
  const logoInputRef = useRef(null);
  const faviconInputRef = useRef(null);
  const seoImgInputRef = useRef(null);
  const leftAdInputRef = useRef(null);
  const rightAdInputRef = useRef(null);

  // Initialize form when settings load
  React.useEffect(() => {
    if (!settingsLoading && savedSettings) {
      setForm({ ...savedSettings });
    }
  }, [settingsLoading, savedSettings]);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      await saveSiteSettings(form);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadAndCompressImage(file, 'site/logo');
      setForm(prev => ({ ...prev, logoUrl: url }));
    } catch (err) {
      alert('Gagal mengunggah logo: ' + err.message);
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleFaviconUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFavicon(true);
    try {
      const url = await uploadAndCompressImage(file, 'site/favicon');
      setForm(prev => ({ ...prev, faviconUrl: url }));
    } catch (err) {
      alert('Gagal mengunggah favicon: ' + err.message);
    } finally {
      setUploadingFavicon(false);
      if (faviconInputRef.current) faviconInputRef.current.value = '';
    }
  };

  const handleSeoImgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingSeoImg(true);
    try {
      const url = await uploadAndCompressImage(file, 'site/seo');
      setForm(prev => ({ ...prev, seoDefaultImage: url }));
    } catch (err) {
      alert('Gagal mengunggah gambar SEO: ' + err.message);
    } finally {
      setUploadingSeoImg(false);
      if (seoImgInputRef.current) seoImgInputRef.current.value = '';
    }
  };

  const handleLeftAdUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLeftAd(true);
    try {
      const url = await uploadAndCompressImage(file, 'site/ads');
      setForm(prev => ({ ...prev, stickyAdLeftImage: url }));
    } catch (err) {
      alert('Gagal mengunggah iklan kiri: ' + err.message);
    } finally {
      setUploadingLeftAd(false);
      if (leftAdInputRef.current) leftAdInputRef.current.value = '';
    }
  };

  const handleRightAdUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingRightAd(true);
    try {
      const url = await uploadAndCompressImage(file, 'site/ads');
      setForm(prev => ({ ...prev, stickyAdRightImage: url }));
    } catch (err) {
      alert('Gagal mengunggah iklan kanan: ' + err.message);
    } finally {
      setUploadingRightAd(false);
      if (rightAdInputRef.current) rightAdInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset semua pengaturan ke default?')) {
      setForm({ ...DEFAULT_SETTINGS });
    }
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (e) { console.error(e); }
  };

  if (authLoading || settingsLoading || !form) {
    return <div className="admin-loading-screen"><div className="spinner"></div><p>Memuat pengaturan...</p></div>;
  }

  return (
    <div className="admin-layout">
      
      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Settings size={22} />
            <h1>Pengaturan Website</h1>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {saveStatus === 'success' && (
              <span style={{ color: '#4caf50', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
                <Check size={16} /> Tersimpan!
              </span>
            )}
            {saveStatus === 'error' && (
              <span style={{ color: '#f44336', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
                <AlertCircle size={16} /> Gagal menyimpan
              </span>
            )}
            <button onClick={handleReset} className="admin-btn" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <RefreshCw size={16} /> Reset Default
            </button>
            <button onClick={handleSave} disabled={saving} className="admin-btn admin-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </header>

        <div className="admin-content">
          {/* Identitas Website */}
          <Section title="🏷️ Identitas Website" icon={null}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="Nama Website" hint="Tampil di logo dan tab browser">
                <input style={inputStyle} value={form.siteName || ''} onChange={e => handleChange('siteName', e.target.value)} placeholder="PioneerHouse" />
              </Field>
              <Field label="Tagline / Slogan" hint="Ditampilkan di bawah nama website">
                <input style={inputStyle} value={form.tagline || ''} onChange={e => handleChange('tagline', e.target.value)} placeholder="Berita Terpercaya..." />
              </Field>
            </div>
            
            <Field label="Biodata Redaksi Default" hint="Ditampilkan di profil penulis pada halaman artikel jika penulis tidak memiliki biodata spesifik">
              <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }} value={form.defaultAuthorBio || ''} onChange={e => handleChange('defaultAuthorBio', e.target.value)} placeholder="Jurnalis dan editor terkemuka di BEDAIN NEWS..." />
            </Field>

            <Field label="Logo Website" hint="Disarankan ukuran lebar, format PNG/WebP dengan latar transparan">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="Logo" style={{ height: '50px', objectFit: 'contain', backgroundColor: 'var(--admin-hover-bg)', padding: '8px', borderRadius: '8px' }} />
                ) : (
                  <div style={{ width: '80px', height: '50px', backgroundColor: 'var(--admin-bg)', border: '1px dashed var(--admin-border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-text-secondary)', fontSize: '11px' }}>
                    No Logo
                  </div>
                )}
                <button onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}
                  style={{ padding: '8px 16px', backgroundColor: 'var(--admin-hover-bg)', color: 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <UploadCloud size={16} /> {uploadingLogo ? 'Mengunggah...' : 'Ganti Logo'}
                </button>
                {form.logoUrl && (
                  <button onClick={() => handleChange('logoUrl', '')}
                    style={{ padding: '8px 12px', backgroundColor: 'rgba(244,67,54,0.1)', color: '#f44336', border: '1px solid rgba(244,67,54,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    Hapus
                  </button>
                )}
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
              </div>
            </Field>

            <Field label="Favicon Website" hint="Ikon kecil di tab browser. Disarankan ukuran kotak 1:1, format PNG atau ICO dengan latar transparan">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {form.faviconUrl ? (
                  <img src={form.faviconUrl} alt="Favicon Preview" style={{ height: '32px', width: '32px', objectFit: 'contain', backgroundColor: 'var(--admin-hover-bg)', padding: '4px', borderRadius: '4px' }} />
                ) : (
                  <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--admin-bg)', border: '1px dashed var(--admin-border)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-text-secondary)', fontSize: '10px' }}>
                    No Icon
                  </div>
                )}
                <button onClick={() => faviconInputRef.current?.click()} disabled={uploadingFavicon}
                  style={{ padding: '8px 16px', backgroundColor: 'var(--admin-hover-bg)', color: 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <UploadCloud size={16} /> {uploadingFavicon ? 'Mengunggah...' : 'Ganti Favicon'}
                </button>
                {form.faviconUrl && (
                  <button onClick={() => handleChange('faviconUrl', '')}
                    style={{ padding: '8px 12px', backgroundColor: 'rgba(244,67,54,0.1)', color: '#f44336', border: '1px solid rgba(244,67,54,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    Hapus
                  </button>
                )}
                <input ref={faviconInputRef} type="file" accept="image/png, image/x-icon, image/ico" onChange={handleFaviconUpload} style={{ display: 'none' }} />
              </div>
            </Field>
          </Section>

          {/* Warna Tema */}
          <Section title="🎨 Warna Tema" icon={null}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="Warna Aksen Utama" hint="Warna dominan: link, tombol, highlight">
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input type="color" value={form.accentColor || '#3b82f6'} onChange={e => handleChange('accentColor', e.target.value)}
                    style={{ width: '50px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: 'transparent' }} />
                  <input style={{ ...inputStyle, flex: 1 }} value={form.accentColor || ''} onChange={e => handleChange('accentColor', e.target.value)} placeholder="#e63946" />
                </div>
              </Field>
              <Field label="Warna Alert / Breaking News" hint="Warna label merah untuk berita urgent">
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input type="color" value={form.alertColor || '#f44336'} onChange={e => handleChange('alertColor', e.target.value)}
                    style={{ width: '50px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: 'transparent' }} />
                  <input style={{ ...inputStyle, flex: 1 }} value={form.alertColor || ''} onChange={e => handleChange('alertColor', e.target.value)} placeholder="#f4a261" />
                </div>
              </Field>
            </div>
            {/* Live Preview */}
            <div style={{ marginTop: '8px', padding: '16px', backgroundColor: 'var(--admin-hover-bg)', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)' }}>Preview:</span>
              <span style={{ backgroundColor: form.accentColor, color: '#fff', padding: '4px 14px', borderRadius: '4px', fontSize: '13px', fontWeight: '600' }}>Aksen</span>
              <span style={{ backgroundColor: form.alertColor, color: '#fff', padding: '4px 14px', borderRadius: '4px', fontSize: '13px', fontWeight: '600' }}>Breaking News</span>
              <a href="#" style={{ color: form.accentColor, fontSize: '13px', textDecoration: 'underline' }}>Contoh Link</a>
            </div>
          </Section>

          {/* Ticker / Running Text */}
          <Section title="📢 Running Ticker" icon={null}>
            <Field label="Aktifkan Ticker">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <div onClick={() => handleChange('tickerEnabled', !form.tickerEnabled)} style={{
                  width: '44px', height: '24px', borderRadius: '12px', position: 'relative', cursor: 'pointer',
                  backgroundColor: form.tickerEnabled ? form.accentColor : 'var(--admin-border)', transition: 'background-color 0.2s'
                }}>
                  <div style={{
                    position: 'absolute', top: '2px', left: form.tickerEnabled ? '22px' : '2px',
                    width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.5)'
                  }} />
                </div>
                <span style={{ color: 'var(--admin-text-secondary)', fontSize: '14px' }}>{form.tickerEnabled ? 'Aktif' : 'Nonaktif'}</span>
              </label>
            </Field>
            <Field label="Teks Ticker / Marquee" hint="Teks yang berjalan di bagian atas website. Pisahkan beberapa teks dengan tanda |">
              <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                value={form.tickerText || ''}
                onChange={e => handleChange('tickerText', e.target.value)}
                placeholder="Breaking News: Teks berjalan di sini..." />
            </Field>
          </Section>

          {/* SEO Default */}
          <Section title="🔍 SEO & Meta Default" icon={null}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="Default Meta Title" hint="Judul standar jika halaman tidak memiliki judul spesifik">
                <input style={inputStyle} value={form.seoDefaultTitle || ''} onChange={e => handleChange('seoDefaultTitle', e.target.value)} placeholder="Berita Terkini - PioneerHouse" />
              </Field>
              <Field label="Default Meta Description" hint="Deskripsi standar untuk mesin pencari">
                <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }} value={form.seoDefaultDescription || ''} onChange={e => handleChange('seoDefaultDescription', e.target.value)} placeholder="Portal berita terkini..." />
              </Field>
            </div>
            <Field label="Default Open Graph Image" hint="Gambar yang muncul saat link dibagikan (WhatsApp, FB, X) jika tidak ada gambar spesifik">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {form.seoDefaultImage ? (
                  <img src={form.seoDefaultImage} alt="SEO Preview" style={{ height: '60px', objectFit: 'contain', backgroundColor: 'var(--admin-hover-bg)', padding: '8px', borderRadius: '8px' }} />
                ) : (
                  <div style={{ width: '100px', height: '60px', backgroundColor: 'var(--admin-bg)', border: '1px dashed var(--admin-border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-text-secondary)', fontSize: '11px', textAlign: 'center' }}>
                    No Image
                  </div>
                )}
                <button onClick={() => seoImgInputRef.current?.click()} disabled={uploadingSeoImg}
                  style={{ padding: '8px 16px', backgroundColor: 'var(--admin-hover-bg)', color: 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <UploadCloud size={16} /> {uploadingSeoImg ? 'Mengunggah...' : 'Pilih Gambar'}
                </button>
                {form.seoDefaultImage && (
                  <button onClick={() => handleChange('seoDefaultImage', '')}
                    style={{ padding: '8px 12px', backgroundColor: 'rgba(244,67,54,0.1)', color: '#f44336', border: '1px solid rgba(244,67,54,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    Hapus
                  </button>
                )}
                <input ref={seoImgInputRef} type="file" accept="image/*" onChange={handleSeoImgUpload} style={{ display: 'none' }} />
              </div>
            </Field>
          </Section>

          {/* Monetisasi & AdSense */}
          <Section title="💰 Monetisasi & Google AdSense" icon={null}>
            <Field label="Google AdSense Publisher ID" hint="Format: ca-pub-XXXX... Masukkan ID AdSense akun Anda untuk menampilkan iklan otomatis dari Google.">
              <input 
                style={inputStyle} 
                value={form.adsenseClientId || ''} 
                onChange={e => handleChange('adsenseClientId', e.target.value)} 
                placeholder="ca-pub-6752045445074470" 
              />
            </Field>
          </Section>
          {/* Kontak & Sosial Media */}
          <Section title="📬 Kontak & Sosial Media" icon={null}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="Email Redaksi">
                <input style={inputStyle} value={form.contactEmail} onChange={e => handleChange('contactEmail', e.target.value)} placeholder="redaksi@bedainnews.com" />
              </Field>
              <Field label="WhatsApp (dengan kode negara)" hint="Contoh: 6281112345678 (tanpa tanda + atau spasi)">
                <input style={inputStyle} value={form.contactWhatsapp || ''} onChange={e => handleChange('contactWhatsapp', e.target.value)} placeholder="6281112345678" />
              </Field>
              <Field label="Nomor Telepon / Hotline Format Tampilan" hint="Contoh: +62 811-1234-5678">
                <input style={inputStyle} value={form.contactPhone || ''} onChange={e => handleChange('contactPhone', e.target.value)} placeholder="+62 811-1234-5678" />
              </Field>
              <Field label="Alamat Kantor Redaksi" hint="Tampil di halaman Kontak dan Footer">
                <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }} value={form.contactAddress || ''} onChange={e => handleChange('contactAddress', e.target.value)} placeholder="Gedung BEDAIN NEWS Digital Hub..." />
              </Field>
              <Field label="Jam Operasional" hint="Contoh: Senin - Jumat (09:00 - 17:00 WIB)">
                <input style={inputStyle} value={form.contactHours || ''} onChange={e => handleChange('contactHours', e.target.value)} placeholder="Senin - Jumat (09:00 - 17:00 WIB)" />
              </Field>
              <Field label="Google News Preferred Source URL" hint="Link halaman/pencarian Google News resmi Bedain News">
                <input style={inputStyle} value={form.googleNewsUrl || ''} onChange={e => handleChange('googleNewsUrl', e.target.value)} placeholder="https://news.google.com/search?q=bedainnews.com..." />
              </Field>
              <Field label="WhatsApp Channel URL" hint="Link saluran resmi WhatsApp Bedain News (https://whatsapp.com/channel/...)">
                <input style={inputStyle} value={form.waChannelUrl || ''} onChange={e => handleChange('waChannelUrl', e.target.value)} placeholder="https://whatsapp.com/channel/..." />
              </Field>
              <Field label="Facebook URL">
                <input style={inputStyle} value={form.facebookUrl} onChange={e => handleChange('facebookUrl', e.target.value)} placeholder="https://facebook.com/..." />
              </Field>
              <Field label="Twitter / X URL">
                <input style={inputStyle} value={form.twitterUrl} onChange={e => handleChange('twitterUrl', e.target.value)} placeholder="https://twitter.com/..." />
              </Field>
              <Field label="Instagram URL">
                <input style={inputStyle} value={form.instagramUrl} onChange={e => handleChange('instagramUrl', e.target.value)} placeholder="https://instagram.com/..." />
              </Field>
              <Field label="YouTube URL">
                <input style={inputStyle} value={form.youtubeUrl || ''} onChange={e => handleChange('youtubeUrl', e.target.value)} placeholder="https://youtube.com/..." />
              </Field>
              <Field label="LinkedIn URL">
                <input style={inputStyle} value={form.linkedinUrl || ''} onChange={e => handleChange('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/..." />
              </Field>
              <Field label="TikTok URL">
                <input style={inputStyle} value={form.tiktokUrl || ''} onChange={e => handleChange('tiktokUrl', e.target.value)} placeholder="https://tiktok.com/..." />
              </Field>
              <Field label="Threads URL">
                <input style={inputStyle} value={form.threadsUrl || ''} onChange={e => handleChange('threadsUrl', e.target.value)} placeholder="https://threads.net/..." />
              </Field>
            </div>
          </Section>


          {/* Footer */}
          <Section title="📄 Footer" icon={null}>
            <Field label="Teks Copyright Footer" hint="Teks yang tampil di bagian bawah website">
              <input style={inputStyle} value={form.footerText} onChange={e => handleChange('footerText', e.target.value)} placeholder="© 2025 PioneerHouse..." />
            </Field>
          </Section>

          {/* Save button at bottom */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingBottom: '40px' }}>
            <button onClick={handleSave} disabled={saving} className="admin-btn admin-btn-primary"
              style={{ padding: '12px 32px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Save size={18} /> {saving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminSettings;
