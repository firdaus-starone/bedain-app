import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useSiteSettings } from '../hooks/useSiteSettings';
import SEO from '../components/SEO';
 // Reusing global styles, but we will add specific admin styles

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { settings } = useSiteSettings();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/admin/dashboard');
    } catch (err) {
      setError('Gagal login: Periksa kembali email dan password Anda.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderLogoText = () => {
    if (settings?.siteName) {
      const cleanName = settings.siteName.replace(/\s+/g, '');
      const match = cleanName.match(/^(.*?)(house)$/i);
      if (match) {
        return <>{match[1]}<span style={{ color: 'var(--color-accent)' }}>{match[2]}</span></>;
      }
      const parts = settings.siteName.trim().split(/\s+/);
      if (parts.length > 1) {
        return <>{parts[0]}<span style={{ color: 'var(--color-accent)' }}>{parts.slice(1).join('')}</span></>;
      }
      return cleanName;
    }
    return <>BEDAIN<span>NEWS</span></>;
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--color-bg-primary)' }}>
      <SEO title="Login Admin" />
      <style>{`
        .admin-split-left {
          flex: 1.2;
          position: relative;
          display: none;
        }
        @media (min-width: 768px) {
          .admin-split-left {
            display: block;
          }
        }
        .admin-split-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px;
          position: relative;
        }
        .admin-login-card {
          width: 100%;
          max-width: 420px;
          animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .admin-input-modern {
          width: 100%;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid var(--color-border);
          background: var(--color-bg-secondary);
          color: var(--color-text-primary);
          font-size: 15px;
          transition: all 0.2s ease;
          outline: none;
          margin-top: 8px;
        }
        .admin-input-modern:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
          background: var(--color-bg-primary);
        }
        .admin-btn-modern {
          width: 100%;
          padding: 14px 24px;
          border-radius: 12px;
          background: var(--color-accent);
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
        }
        .admin-btn-modern:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
        }
        .admin-btn-modern:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
      
      {/* Left Side: Hero Image */}
      <div className="admin-split-left">
        <img 
          src="https://images.unsplash.com/photo-1495020689067-958852a7765e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" 
          alt="News Room" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.4) 100%)' }}></div>
        
        <div style={{ position: 'absolute', bottom: '60px', left: '60px', color: '#fff', maxWidth: '500px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '100px', marginBottom: '24px', fontSize: '13px', fontWeight: 600, letterSpacing: '1px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></div>
            SISTEM REDAKSI AKTIF
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '16px', lineHeight: 1.2, fontFamily: 'var(--font-heading)' }}>
            Menginspirasi Indonesia Lewat Kata
          </h2>
          <p style={{ fontSize: '1.1rem', opacity: 0.85, lineHeight: 1.6 }}>
            Ruang redaksi eksklusif Bedain News. Tempat di mana akurasi, kecepatan, dan ketajaman jurnalistik berpadu untuk menyajikan berita terbaik ke seluruh pelosok Nusantara.
          </p>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="admin-split-right">
        <div className="admin-login-card">
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '40px' }}>
            <img src="/logo.png" alt="Bedain Logo" style={{ height: '60px', objectFit: 'contain', marginBottom: '20px', alignSelf: 'flex-start' }} />
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
              Selamat Datang Kembali
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>Silakan masuk ke ruang manajemen redaksi.</p>
          </div>
          
          {error && (
            <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', color: '#ef4444', borderRadius: '0 8px 8px 0', marginBottom: '24px', fontSize: '14px', fontWeight: 500 }}>
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Email Redaksi</label>
              <input 
                type="email" 
                className="admin-input-modern"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="redaksi@bedainnews.com"
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Kata Sandi</label>
              <input 
                type="password" 
                className="admin-input-modern"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="••••••••"
              />
            </div>
            
            <button type="submit" className="admin-btn-modern" disabled={loading}>
              {loading ? (
                <>
                  <svg className="animate-spin" style={{ width: '20px', height: '20px', color: 'white' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Otentikasi...
                </>
              ) : 'Masuk ke Dasbor'}
            </button>
          </form>
          
          <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            &copy; {new Date().getFullYear()} Bedain News. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
